import type { Engine, Failure, GradeResult, LoadedExercise, RunResult, SourceFiles, SourceLine } from './types';
import { firstDiffIndex } from './compare';
import { locateCrash } from './crashLine';
import { definesMain, findForbidden } from './forbidden';
import { classifyLinkError } from './clangErrors';

export const TIMEOUT_MS = 2000;

function splitSources(ex: LoadedExercise, userFiles: SourceFiles): { sources: SourceFiles; headers: SourceFiles } {
  const sources: SourceFiles = {};
  const headers: SourceFiles = {};
  for (const name of ex.expectedFiles) {
    const content = userFiles[name] ?? '';
    if (name.endsWith('.h')) headers[name] = content;
    else if (name.endsWith('.c')) sources[name] = content;
  }
  // O exame usa os próprios headers: o fornecido vence um header do cadete com o mesmo nome.
  Object.assign(headers, ex.provided);
  return { sources, headers };
}

/** Arquivos que o cadete escreveu (os do exame, como o header fornecido, ficam de fora). */
function cadetFiles(ex: LoadedExercise, extra: SourceFiles = {}): string[] {
  return [...ex.expectedFiles.filter((name) => !(ex.provided && name in ex.provided)), ...Object.keys(extra)];
}

type PrepFailure = Extract<Failure, { kind: 'compile' | 'link' | 'forbidden' }>;

async function build(
  ex: LoadedExercise,
  userFiles: SourceFiles,
  extra: SourceFiles,
  engine: Engine,
  checkForbidden: boolean,
): Promise<{ failure: PrepFailure } | { wasm: Uint8Array }> {
  const { sources, headers } = splitSources(ex, userFiles);
  const compiled = await engine.compileObjects(sources, headers);
  if (!compiled.ok) return { failure: { kind: 'compile', stderr: compiled.stderr } };
  const hasMain = definesMain(await engine.definedSymbols(compiled.objects));
  if (ex.kind === 'function' && hasMain) {
    return { failure: { kind: 'link', reason: 'duplicate-main', stderr: '' } };
  }
  // O runtime wasi referencia main de forma fraca: sem main o link "passa" e o programa trava.
  // No exame real (gcc) isso é erro de link, então reproduzimos aqui.
  if (ex.kind === 'program' && !hasMain) {
    return { failure: { kind: 'link', reason: 'missing-symbol', symbol: 'main', stderr: '' } };
  }
  if (checkForbidden) {
    const symbols = await engine.undefinedSymbols(compiled.objects);
    const functions = findForbidden(symbols, ex.allowedFunctions, Object.values(sources));
    if (functions.length > 0) return { failure: { kind: 'forbidden', functions } };
  }
  const linked = await engine.link(compiled.objects, extra, headers);
  if (!linked.ok) {
    const c = classifyLinkError(linked.stderr);
    const failure: PrepFailure = { kind: 'link', reason: c.reason, stderr: linked.stderr };
    if (c.symbol !== undefined) failure.symbol = c.symbol;
    return { failure };
  }
  return { wasm: linked.wasm };
}

export async function grade(
  ex: LoadedExercise,
  userFiles: SourceFiles,
  engine: Engine,
  opts: { timeoutMs?: number; onProgress?(done: number, total: number): void } = {},
): Promise<GradeResult> {
  const total = ex.tests.length;
  const extra: SourceFiles = ex.kind === 'function' && ex.harness !== undefined ? { '__harness.c': ex.harness } : {};
  const built = await build(ex, userFiles, extra, engine, true);
  if ('failure' in built) return { passed: 0, total, failure: built.failure };

  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const session = engine.openRunSession(built.wasm, './' + ex.id);
  let passed = 0;
  try {
    for (let index = 0; index < total; index++) {
      const test = ex.tests[index];
      const r = await session.run({ args: test.args, stdin: test.stdin }, timeoutMs);
      if (r.outcome === 'timeout') return { passed, total, failure: { kind: 'timeout', test, index } };
      if (r.outcome === 'crash') {
        const failure: Extract<Failure, { kind: 'crash' }> = { kind: 'crash', test, index, trapMessage: r.trapMessage ?? '' };
        const line = await locateCrash(engine, built.wasm, r.trapStack, cadetFiles(ex));
        if (line) failure.line = line;
        return { passed, total, failure };
      }
      const expected = ex.expected[test.id]?.stdout ?? '';
      const diffIndex = firstDiffIndex(expected, r.stdout);
      if (diffIndex !== -1 || r.truncated) {
        return {
          passed,
          total,
          failure: {
            kind: 'wrong-output',
            test,
            index,
            expected,
            actual: r.stdout,
            diffIndex: diffIndex === -1 ? Math.min(expected.length, r.stdout.length) : diffIndex,
            truncated: r.truncated === true,
          },
        };
      }
      passed++;
      opts.onProgress?.(passed, total);
    }
  } finally {
    session.dispose();
  }
  return { passed, total, failure: null };
}

export async function runOnce(
  ex: LoadedExercise,
  userFiles: SourceFiles,
  scratch: { mainC?: string; args: string[]; stdin?: string },
  engine: Engine,
): Promise<{ failure: Extract<Failure, { kind: 'compile' | 'link' }> | null; run?: RunResult; line?: SourceLine }> {
  const extra: SourceFiles = ex.kind === 'function' && scratch.mainC !== undefined ? { 'main.c': scratch.mainC } : {};
  const built = await build(ex, userFiles, extra, engine, false);
  if ('failure' in built) return { failure: built.failure as Extract<Failure, { kind: 'compile' | 'link' }> };
  const session = engine.openRunSession(built.wasm, './' + ex.id);
  try {
    const run = await session.run({ args: scratch.args, stdin: scratch.stdin }, TIMEOUT_MS);
    if (run.outcome !== 'crash') return { failure: null, run };
    // o main.c do rascunho também é do cadete
    const line = await locateCrash(engine, built.wasm, run.trapStack, cadetFiles(ex, extra));
    return line ? { failure: null, run, line } : { failure: null, run };
  } finally {
    session.dispose();
  }
}

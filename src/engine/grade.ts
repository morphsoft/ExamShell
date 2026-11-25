import type { Engine, Failure, GradeResult, LoadedExercise, RunResult, SourceFiles } from './types';
import { firstDiffIndex } from './compare';
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
  return { sources, headers };
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
  if (ex.kind === 'function' && definesMain(await engine.definedSymbols(compiled.objects))) {
    return { failure: { kind: 'link', reason: 'duplicate-main', stderr: '' } };
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
        return { passed, total, failure: { kind: 'crash', test, index, trapMessage: r.trapMessage ?? '' } };
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
): Promise<{ failure: Extract<Failure, { kind: 'compile' | 'link' }> | null; run?: RunResult }> {
  const extra: SourceFiles = ex.kind === 'function' && scratch.mainC !== undefined ? { 'main.c': scratch.mainC } : {};
  const built = await build(ex, userFiles, extra, engine, false);
  if ('failure' in built) return { failure: built.failure as Extract<Failure, { kind: 'compile' | 'link' }> };
  const session = engine.openRunSession(built.wasm, './' + ex.id);
  try {
    const run = await session.run({ args: scratch.args, stdin: scratch.stdin }, TIMEOUT_MS);
    return { failure: null, run };
  } finally {
    session.dispose();
  }
}

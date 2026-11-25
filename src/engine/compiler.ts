import type { Command, Tree } from '@yowasp/clang';
import { parseNmUndefined } from './forbidden';
import { PRELUDE, PRELUDE_HEADER, restoreLongInDiagnostics, rewriteLong } from './rewriteLong';
import type { CompileOutcome, Engine, LinkOutcome, SourceFiles } from './types';

export interface ClangModule {
  runClang: Command;
  runLLVM: Command;
}

export const COMPILE_FLAGS = ['-std=gnu17', '-O0', '-g', '-Wall', '-Wextra', '-Werror',
  '-Wno-deprecated-non-prototype', '-fno-color-diagnostics',
  '-fsanitize=null,bounds', '-fsanitize-trap=all', '-include', PRELUDE_HEADER];
export const LINK_FLAGS = ['-Wl,-z,stack-size=8388608', '-Wl,--stack-first'];

const decoder = new TextDecoder();

/** Erro `Exit` do @yowasp (saída não-zero do programa); qualquer outro erro é propagado. */
function isExit(e: unknown): boolean {
  return e instanceof Error && typeof (e as { code?: unknown }).code === 'number';
}

function collector() {
  let text = '';
  return {
    callback: (chunk: Uint8Array | null) => {
      if (chunk) text += decoder.decode(chunk, { stream: true });
    },
    get text() {
      return text;
    },
  };
}

function rewriteAll(sources: SourceFiles): SourceFiles {
  const out: SourceFiles = {};
  for (const [name, src] of Object.entries(sources)) out[name] = rewriteLong(src);
  return out;
}

const usesLongLong = (...groups: SourceFiles[]) =>
  groups.some((g) => Object.values(g).some((s) => /\blong\s+long\b/.test(s)));

export function createCompiler(clang: ClangModule): Pick<Engine, 'compileObjects' | 'undefinedSymbols' | 'link'> {
  const quiet = { fetchProgress: () => {} };

  async function compileObjects(sources: SourceFiles, headers: SourceFiles): Promise<CompileOutcome> {
    const tree: Tree = { ...rewriteAll(headers), ...rewriteAll(sources), [PRELUDE_HEADER]: PRELUDE };
    const err = collector();
    let out: Tree | undefined;
    try {
      out = (await clang.runClang(['clang', ...COMPILE_FLAGS, '-c', ...Object.keys(sources)], tree, {
        ...quiet,
        stderr: err.callback,
      })) as Tree | undefined;
    } catch (e) {
      if (!isExit(e)) throw e;
    }
    const stderr = restoreLongInDiagnostics(err.text, usesLongLong(sources, headers));
    if (!out) return { ok: false, stderr };
    const objects: Record<string, Uint8Array> = {};
    for (const [name, value] of Object.entries(out)) {
      if (name.endsWith('.o') && value instanceof Uint8Array) objects[name] = value;
    }
    return { ok: true, objects, stderr };
  }

  async function undefinedSymbols(objects: Record<string, Uint8Array>): Promise<string[]> {
    const out = collector();
    await clang.runLLVM(['nm', '-u', ...Object.keys(objects)], { ...objects }, { ...quiet, stdout: out.callback });
    return parseNmUndefined(out.text);
  }

  async function link(
    objects: Record<string, Uint8Array>,
    extraSources: SourceFiles,
    headers: SourceFiles,
  ): Promise<LinkOutcome> {
    const tree: Tree = { ...rewriteAll(headers), ...objects, ...rewriteAll(extraSources), [PRELUDE_HEADER]: PRELUDE };
    const err = collector();
    let out: Tree | undefined;
    try {
      out = (await clang.runClang(
        ['clang', ...COMPILE_FLAGS, '-Wno-unused-command-line-argument', ...Object.keys(extraSources),
          ...Object.keys(objects), '-o', 'a.out', ...LINK_FLAGS],
        tree,
        { ...quiet, stderr: err.callback },
      )) as Tree | undefined;
    } catch (e) {
      if (!isExit(e)) throw e;
    }
    const stderr = restoreLongInDiagnostics(err.text, usesLongLong(extraSources, headers));
    const wasm = out?.['a.out'];
    if (!(wasm instanceof Uint8Array)) return { ok: false, stderr };
    return { ok: true, wasm, stderr };
  }

  return { compileObjects, undefinedSymbols, link };
}

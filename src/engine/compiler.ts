import type { Command, Tree } from '@yowasp/clang';
import { codeSectionStart, parseAddr2line } from './crashLine';
import { parseNmDefined, parseNmUndefined } from './forbidden';
import { PRELUDE, PRELUDE_HEADER, restoreLongInDiagnostics, rewriteLong } from './rewriteLong';
import type { CompileOutcome, Engine, LinkOutcome, SourceFiles, SourceLine } from './types';

export interface ClangModule {
  runClang: Command;
  runLLVM: Command;
}

export const COMPILE_FLAGS = ['-std=gnu17', '-O0', '-g', '-Wall', '-Wextra', '-Werror',
  '-Wno-deprecated-non-prototype', '-Wno-empty-body', '-fno-color-diagnostics',
  '-fsanitize=null,bounds', '-fsanitize-trap=all', '-include', PRELUDE_HEADER];
export const LINK_FLAGS = ['-Wl,-z,stack-size=8388608', '-Wl,--stack-first'];

/** Erro `Exit` do @yowasp (saída não-zero do programa); qualquer outro erro é propagado. */
function isExit(e: unknown): boolean {
  return e instanceof Error && typeof (e as { code?: unknown }).code === 'number';
}

/** Junta a saída de um comando. Um decoder por coletor: no modo stream ele guarda bytes pela metade. */
function collector() {
  const decoder = new TextDecoder();
  let text = '';
  return {
    callback: (chunk: Uint8Array | null) => {
      if (chunk) text += decoder.decode(chunk, { stream: true });
    },
    get text() {
      text += decoder.decode(); // descarrega o que tiver ficado pela metade no último pedaço
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

/** Linhas de erro (`a.c:2:5: error: …`, `clang: error: …`); as do trecho de código começam com espaço. */
const ERROR_LINE = /^\S.*\berror: /;

/**
 * `%ld`/`%lu` com um `long` que a reescrita virou `long long` (direto ou via typedef: `'t' (aka 'long long')`).
 * O gcc do exame (x86-64, `long` de 64 bits) aceita; aqui o clang reprova pelo -Wformat.
 */
const REWRITE_FORMAT_ERROR =
  /: error: format specifies type '(?:unsigned )?long' but the argument has type '(?:[^']*' \(aka ')?(?:unsigned )?long long'\)? \[-Werror,-Wformat\]$/;

/** Todos os erros são o -Wformat causado pela reescrita do `long`? (texto cru, antes de restaurar o `long`) */
function onlyRewriteFormatErrors(stderr: string): boolean {
  const errors = stderr.split('\n').filter((l) => ERROR_LINE.test(l));
  return errors.length > 0 && errors.every((l) => REWRITE_FORMAT_ERROR.test(l));
}

export function createCompiler(
  clang: ClangModule,
): Required<Pick<Engine, 'compileObjects' | 'undefinedSymbols' | 'definedSymbols' | 'link' | 'addr2line'>> {
  const quiet = { fetchProgress: () => {} };

  async function runClang(args: string[], tree: Tree): Promise<{ out: Tree | undefined; stderr: string }> {
    const err = collector();
    let out: Tree | undefined;
    try {
      out = (await clang.runClang(args, tree, { ...quiet, stderr: err.callback })) as Tree | undefined;
    } catch (e) {
      if (!isExit(e)) throw e;
    }
    return { out, stderr: err.text };
  }

  /**
   * Roda o clang; se o único problema for o -Wformat da reescrita do `long`, roda de novo com -Wno-format.
   * Só se o cadete não escreveu `long long` (aí não dá para saber de onde veio o tipo) e com um arquivo:
   * com vários, o driver para no primeiro que falha e os outros nem passaram pelo -Wformat.
   */
  async function compileWithFormatFallback(
    args: (extra: string[]) => string[],
    tree: Tree,
    sourceCount: number,
    userWroteLongLong: boolean,
  ) {
    const first = await runClang(args([]), tree);
    if (first.out || sourceCount !== 1 || userWroteLongLong || !onlyRewriteFormatErrors(first.stderr)) return first;
    return runClang(args(['-Wno-format']), tree);
  }

  async function compileObjects(sources: SourceFiles, headers: SourceFiles): Promise<CompileOutcome> {
    const tree: Tree = { ...rewriteAll(headers), ...rewriteAll(sources), [PRELUDE_HEADER]: PRELUDE };
    const names = Object.keys(sources);
    const longLong = usesLongLong(sources, headers);
    const { out, stderr: raw } = await compileWithFormatFallback(
      (extra) => ['clang', ...COMPILE_FLAGS, ...extra, '-c', ...names],
      tree,
      names.length,
      longLong,
    );
    const stderr = restoreLongInDiagnostics(raw, longLong);
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

  async function definedSymbols(objects: Record<string, Uint8Array>): Promise<string[]> {
    const out = collector();
    await clang.runLLVM(['nm', '--defined-only', ...Object.keys(objects)], { ...objects }, { ...quiet, stdout: out.callback });
    return parseNmDefined(out.text);
  }

  async function link(
    objects: Record<string, Uint8Array>,
    extraSources: SourceFiles,
    headers: SourceFiles,
  ): Promise<LinkOutcome> {
    const tree: Tree = { ...rewriteAll(headers), ...objects, ...rewriteAll(extraSources), [PRELUDE_HEADER]: PRELUDE };
    const names = Object.keys(extraSources);
    const longLong = usesLongLong(extraSources, headers);
    const { out, stderr: raw } = await compileWithFormatFallback(
      (extra) => ['clang', ...COMPILE_FLAGS, '-Wno-unused-command-line-argument', ...extra, ...names,
        ...Object.keys(objects), '-o', 'a.out', ...LINK_FLAGS],
      tree,
      names.length,
      longLong,
    );
    const stderr = restoreLongInDiagnostics(raw, longLong);
    const wasm = out?.['a.out'];
    if (!(wasm instanceof Uint8Array)) return { ok: false, stderr };
    return { ok: true, wasm, stderr };
  }

  /** Linha de um offset do módulo (o da pilha do trap), pelo DWARF que o `-g` gera. */
  async function addr2line(wasm: Uint8Array, moduleOffset: number): Promise<SourceLine | null> {
    const start = codeSectionStart(wasm);
    if (start === null || moduleOffset < start) return null;
    const address = '0x' + (moduleOffset - start).toString(16);
    const out = collector();
    try {
      await clang.runLLVM(['addr2line', '-i', '-e', 'a.out', address], { 'a.out': wasm }, { ...quiet, stdout: out.callback, stderr: collector().callback });
    } catch (e) {
      if (!isExit(e)) throw e;
      return null;
    }
    return parseAddr2line(out.text);
  }

  return { compileObjects, undefinedSymbols, definedSymbols, link, addr2line };
}

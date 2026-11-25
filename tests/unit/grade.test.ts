import { describe, expect, it, vi } from 'vitest';
import { grade, runOnce } from '../../src/engine/grade';
import type { Engine, LoadedExercise, RunResult } from '../../src/engine/types';

function makeEx(over: Partial<LoadedExercise> = {}): LoadedExercise {
  return {
    id: 'first_word',
    level: 1,
    summary: '',
    kind: 'program',
    expectedFiles: ['first_word.c'],
    allowedFunctions: ['write'],
    tests: [
      { id: 't01', args: ['a'], category: 'basico' },
      { id: 't02', args: ['b'], category: 'espacos' },
      { id: 't03', args: ['c'], category: 'vazio' },
    ],
    hints: {},
    subject: { en: '', pt: '' },
    expected: { t01: { stdout: 'a\n' }, t02: { stdout: 'b\n' }, t03: { stdout: 'c\n' } },
    ...over,
  };
}

const ok = (stdout: string): RunResult => ({ stdout, outcome: 'exit', exitCode: 0 });

function fake(runs: RunResult[], over: Partial<Engine> = {}) {
  const calls = { link: vi.fn(), run: vi.fn(), dispose: vi.fn(), open: vi.fn(), compile: vi.fn() };
  let i = 0;
  const engine: Engine = {
    async compileObjects(s, h) {
      calls.compile(s, h);
      return { ok: true, objects: { 'x.o': new Uint8Array() }, stderr: '' };
    },
    async undefinedSymbols() {
      return ['write'];
    },
    async definedSymbols() {
      return ['__main_argc_argv'];
    },
    async link(o, e, h) {
      calls.link(o, e, h);
      return { ok: true, wasm: new Uint8Array(), stderr: '' };
    },
    openRunSession(w, name) {
      calls.open(name);
      return {
        async run(t, ms) {
          calls.run(t, ms);
          return runs[i++];
        },
        dispose: calls.dispose,
      };
    },
    ...over,
  };
  return { engine, calls };
}

const files = { 'first_word.c': 'int x;' };

describe('grade', () => {
  it('compile falha: sem link', async () => {
    const { engine, calls } = fake([], { compileObjects: async () => ({ ok: false, stderr: 'boom' }) });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toEqual({ kind: 'compile', stderr: 'boom' });
    expect(r.passed).toBe(0);
    expect(calls.link).not.toHaveBeenCalled();
  });

  it('função proibida', async () => {
    const { engine } = fake([], { undefinedSymbols: async () => ['write', 'printf'] });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toEqual({ kind: 'forbidden', functions: ['printf'] });
  });

  it('main duplicado', async () => {
    const { engine } = fake([], { link: async () => ({ ok: false, stderr: 'wasm-ld: error: duplicate symbol: main' }) });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'duplicate-main' });
  });

  it('para na primeira saída errada', async () => {
    const { engine, calls } = fake([ok('a\n'), ok('x\n'), ok('c\n')]);
    const r = await grade(makeEx(), files, engine);
    expect(r.passed).toBe(1);
    expect(r.failure).toMatchObject({ kind: 'wrong-output', index: 1, diffIndex: 0, truncated: false });
    expect((r.failure as { test: { id: string } }).test.id).toBe('t02');
    expect(calls.run).toHaveBeenCalledTimes(2);
    expect(calls.dispose).toHaveBeenCalledTimes(1);
  });

  it('saída truncada é saída errada', async () => {
    const { engine } = fake([{ stdout: 'a\n', truncated: true, outcome: 'exit' }]);
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toMatchObject({ kind: 'wrong-output', truncated: true });
  });

  it('timeout e crash', async () => {
    let f = fake([{ stdout: '', outcome: 'timeout' }]);
    expect((await grade(makeEx(), files, f.engine)).failure).toMatchObject({ kind: 'timeout', index: 0 });
    expect(f.calls.dispose).toHaveBeenCalledTimes(1);
    f = fake([{ stdout: '', outcome: 'crash', trapMessage: 'oob' }]);
    expect((await grade(makeEx(), files, f.engine)).failure).toMatchObject({ kind: 'crash', trapMessage: 'oob' });
    expect(f.calls.dispose).toHaveBeenCalledTimes(1);
  });

  it('todos passam', async () => {
    const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')]);
    const progress = vi.fn();
    const r = await grade(makeEx(), files, engine, { onProgress: progress });
    expect(r).toEqual({ passed: 3, total: 3, failure: null });
    expect(progress).toHaveBeenLastCalledWith(3, 3);
    expect(calls.dispose).toHaveBeenCalledTimes(1);
    expect(calls.open).toHaveBeenCalledWith('./first_word');
  });

  it('função: harness entra como __harness.c', async () => {
    const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')], { definedSymbols: async () => ['f'] });
    await grade(makeEx({ kind: 'function', harness: 'int main(){}' }), files, engine);
    expect(calls.link.mock.calls[0][1]).toEqual({ '__harness.c': 'int main(){}' });
  });

  it('só expectedFiles; .h vira header', async () => {
    const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')]);
    await grade(
      makeEx({ expectedFiles: ['a.c', 'a.h'] }),
      { 'a.c': 'A', 'a.h': 'H', 'extra.c': 'X', 'main.c': 'M' },
      engine,
    );
    expect(calls.compile).toHaveBeenCalledWith({ 'a.c': 'A' }, { 'a.h': 'H' });
  });
});

describe('runOnce', () => {
  it('program: sem extraSources, usa args', async () => {
    const { engine, calls } = fake([ok('hi')]);
    const r = await runOnce(makeEx(), files, { args: ['z'], stdin: 's' }, engine);
    expect(r.failure).toBeNull();
    expect(r.run?.stdout).toBe('hi');
    expect(calls.link.mock.calls[0][1]).toEqual({});
    expect(calls.run.mock.calls[0][0]).toEqual({ args: ['z'], stdin: 's' });
    expect(calls.dispose).toHaveBeenCalledTimes(1);
  });

  it('function com mainC', async () => {
    const { engine, calls } = fake([ok('')], { definedSymbols: async () => ['f'] });
    await runOnce(makeEx({ kind: 'function', harness: 'H' }), files, { mainC: 'MAIN', args: [] }, engine);
    expect(calls.link.mock.calls[0][1]).toEqual({ 'main.c': 'MAIN' });
  });

  it('compile falha', async () => {
    const { engine } = fake([], { compileObjects: async () => ({ ok: false, stderr: 'e' }) });
    const r = await runOnce(makeEx(), files, { args: [] }, engine);
    expect(r.failure).toEqual({ kind: 'compile', stderr: 'e' });
  });
});

describe('linha do travamento', () => {
  const STACK = 'RuntimeError: unreachable\n    at a.out.main (wasm://wasm/x:wasm-function[6]:0x1b2)';
  const crash: RunResult = { stdout: '', outcome: 'crash', trapMessage: 'unreachable', trapStack: STACK };
  const at = (file: string, line: number) => vi.fn(async () => ({ file, line }));

  it('grade: arquivo do cadete vira failure.line', async () => {
    const addr2line = at('first_word.c', 7);
    const { engine } = fake([ok('a\n'), crash], { addr2line });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toEqual({
      kind: 'crash',
      test: makeEx().tests[1],
      index: 1,
      trapMessage: 'unreachable',
      line: { file: 'first_word.c', line: 7 },
    });
    expect(addr2line).toHaveBeenCalledTimes(1);
    expect(addr2line).toHaveBeenCalledWith(expect.any(Uint8Array), 0x1b2);
  });

  it('grade: o harness não é do cadete', async () => {
    const ex = makeEx({ kind: 'function', expectedFiles: ['ft_strlen.c'], harness: 'H' });
    const { engine } = fake([crash], { definedSymbols: async () => ['ft_strlen'], addr2line: at('__harness.c', 5) });
    const r = await grade(ex, { 'ft_strlen.c': 'int x;' }, engine);
    expect(r.failure).toMatchObject({ kind: 'crash', index: 0 });
    expect(r.failure).not.toHaveProperty('line');
  });

  it('grade: header fornecido pelo exame não é do cadete', async () => {
    const ex = makeEx({ expectedFiles: ['a.c', 'list.h'], provided: { 'list.h': 'X' } });
    const { engine } = fake([crash], { addr2line: at('list.h', 3) });
    const r = await grade(ex, { 'a.c': 'A', 'list.h': 'CADETE' }, engine);
    expect(r.failure).not.toHaveProperty('line');
  });

  it('grade: sem travamento não chama addr2line', async () => {
    const addr2line = at('first_word.c', 7);
    const { engine } = fake([ok('a\n'), ok('x\n')], { addr2line });
    await grade(makeEx(), files, engine);
    expect(addr2line).not.toHaveBeenCalled();
  });

  it('runOnce: o main.c do rascunho é do cadete nos exercícios de função', async () => {
    const ex = makeEx({ kind: 'function', expectedFiles: ['ft_strlen.c'], harness: 'H' });
    const { engine } = fake([crash], { definedSymbols: async () => ['ft_strlen'], addr2line: at('main.c', 6) });
    const r = await runOnce(ex, { 'ft_strlen.c': 'int x;' }, { mainC: 'MAIN', args: [] }, engine);
    expect(r).toEqual({ failure: null, run: crash, line: { file: 'main.c', line: 6 } });
  });

  it('runOnce: num programa, main.c não é arquivo do cadete', async () => {
    const { engine } = fake([crash], { addr2line: at('main.c', 6) });
    const r = await runOnce(makeEx(), files, { args: [] }, engine);
    expect(r).toEqual({ failure: null, run: crash });
  });

  it('runOnce: arquivo do cadete', async () => {
    const { engine } = fake([crash], { addr2line: at('first_word.c', 9) });
    const r = await runOnce(makeEx(), files, { args: [] }, engine);
    expect(r.line).toEqual({ file: 'first_word.c', line: 9 });
  });
});

describe('main definido pelo cadete em exercício de função', () => {
  const fnEx = () =>
    makeEx({ kind: 'function', expectedFiles: ['ft_strlen.c'], harness: 'int main(int c,char**v){return 0;}' });
  const fnFiles = { 'ft_strlen.c': 'int x;' };
  const dup = { definedSymbols: async () => ['ft_strlen', '__original_main'] };

  it('grade: duplicate-main sem chamar link', async () => {
    const { engine, calls } = fake([], dup);
    const r = await grade(fnEx(), fnFiles, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'duplicate-main' });
    expect(calls.link).not.toHaveBeenCalled();
  });

  it('grade: programa com __main_argc_argv segue normalmente', async () => {
    const { engine } = fake([ok('a\n'), ok('b\n'), ok('c\n')], { definedSymbols: async () => ['__main_argc_argv'] });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toBeNull();
  });

  it('runOnce: duplicate-main', async () => {
    const { engine, calls } = fake([], dup);
    const r = await runOnce(fnEx(), fnFiles, { mainC: 'int main(void){return 0;}', args: [] }, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'duplicate-main' });
    expect(calls.link).not.toHaveBeenCalled();
  });
});

describe('programa sem main', () => {
  const noMain = { definedSymbols: async () => ['helper'] };

  it('grade: link missing-symbol main, sem forbidden nem link', async () => {
    const undef = vi.fn(async () => ['write']);
    const { engine, calls } = fake([], { ...noMain, undefinedSymbols: undef });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'missing-symbol', symbol: 'main' });
    expect(calls.link).not.toHaveBeenCalled();
    expect(undef).not.toHaveBeenCalled();
  });

  it('grade: __main_argc_argv segue para o link', async () => {
    const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')], { definedSymbols: async () => ['__main_argc_argv'] });
    const r = await grade(makeEx(), files, engine);
    expect(r.failure).toBeNull();
    expect(calls.link).toHaveBeenCalled();
  });

  it('runOnce: mesmo erro', async () => {
    const { engine, calls } = fake([], noMain);
    const r = await runOnce(makeEx(), files, { args: [] }, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'missing-symbol', symbol: 'main' });
    expect(calls.link).not.toHaveBeenCalled();
  });

  it('exercício de função sem main não é missing-main', async () => {
    const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')], { definedSymbols: async () => ['ft_strlen'] });
    const ex = makeEx({ kind: 'function', expectedFiles: ['ft_strlen.c'], harness: 'int main(void){return 0;}' });
    const r = await grade(ex, { 'ft_strlen.c': 'int x;' }, engine);
    expect(r.failure).toBeNull();
    expect(calls.link).toHaveBeenCalled();
  });
  describe('headers fornecidos pelo exame', () => {
    const fn = (over: Partial<LoadedExercise> = {}) =>
      makeEx({ kind: 'function', expectedFiles: ['sort_list.c'], harness: 'int main(void){return 0;}', ...over });
    const run = { definedSymbols: async () => ['sort_list'] };

    it('compileObjects e link recebem ex.provided', async () => {
      const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')], run);
      const r = await grade(fn({ provided: { 'list.h': 'X' } }), { 'sort_list.c': 'int x;' }, engine);
      expect(r.failure).toBeNull();
      expect(calls.compile.mock.calls[0][1]).toEqual({ 'list.h': 'X' });
      expect(calls.link.mock.calls[0][2]).toEqual({ 'list.h': 'X' });
    });

    it('um list.h do cadete fora de expectedFiles é ignorado', async () => {
      const { engine, calls } = fake([ok('a\n'), ok('b\n'), ok('c\n')], run);
      await grade(fn({ provided: { 'list.h': 'X' } }), { 'sort_list.c': 'int x;', 'list.h': 'CADETE' }, engine);
      expect(calls.compile.mock.calls[0][1]).toEqual({ 'list.h': 'X' });
      expect(calls.compile.mock.calls[0][0]).toEqual({ 'sort_list.c': 'int x;' });
    });

    it('provided vence um header de mesmo nome em expectedFiles (grade e runOnce)', async () => {
      const ex = fn({ expectedFiles: ['sort_list.c', 'list.h'], provided: { 'list.h': 'X' } });
      const a = fake([ok('a\n'), ok('b\n'), ok('c\n')], run);
      await grade(ex, { 'sort_list.c': 'int x;', 'list.h': 'CADETE' }, a.engine);
      expect(a.calls.compile.mock.calls[0][1]).toEqual({ 'list.h': 'X' });
      const b = fake([ok('')], run);
      await runOnce(ex, { 'sort_list.c': 'int x;', 'list.h': 'CADETE' }, { mainC: 'int main(void){}', args: [] }, b.engine);
      expect(b.calls.link.mock.calls[0][2]).toEqual({ 'list.h': 'X' });
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { grade, runOnce } from '../../src/engine/grade';
import type { Engine, LoadedExercise, RunResult } from '../../src/engine/types';

function makeEx(over: Partial<LoadedExercise> = {}): LoadedExercise {
  return {
    id: 'first_word',
    level: 1,
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
});

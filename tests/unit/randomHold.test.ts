import { describe, expect, it } from 'vitest';
import type { Level } from '../../src/engine/types';
import { reduceSession, startSession, type RandomSession } from '../../src/state/randomSession';
import { holdExit } from '../../src/ui/randomHold';

const pool: Record<Level, string[]> = { 1: ['a', 'b'], 2: ['c'], 3: ['d'], 4: ['e'] };
const pass = (now: number) => ({ type: 'attempt', passed: true, now }) as const;

/** Passa nos níveis 1..n, como o reducer faz ao corrigir (sem código: só a ação). */
function passed(n: number): RandomSession {
  let s = startSession(pool, 1, 0);
  for (let i = 0; i < n; i++) s = reduceSession(s, pass(10 + i), pool);
  return s;
}

describe('holdExit', () => {
  it('sem exercício segurado, não há ação', () => {
    expect(holdExit(passed(1), null)).toBeNull();
  });

  it('segurado com a sessão em andamento: ir para o próximo nível', () => {
    const s = passed(1);
    expect(s.finishedAt).toBeNull();
    const exit = holdExit(s, { exerciseId: s.levels[0].exerciseId!, level: 1 });
    expect(exit).toEqual({ kind: 'next-level', level: 2, label: 'Ir para o nível 2' });
  });

  it('segurado no nível 3: o próximo é o 4', () => {
    const s = passed(3);
    expect(holdExit(s, { exerciseId: 'd', level: 3 })).toEqual({
      kind: 'next-level',
      level: 4,
      label: 'Ir para o nível 4',
    });
  });

  it('segurado com a sessão encerrada (passou no nível 4): ver o resumo', () => {
    const s = passed(4);
    expect(s.finishedAt).toBe(13);
    expect(holdExit(s, { exerciseId: 'e', level: 4 })).toEqual({ kind: 'summary', label: 'Ver resumo' });
  });

  it('a sessão terminou sem nível seguinte com exercício: também é o resumo', () => {
    const thin: Record<Level, string[]> = { 1: ['a'], 2: [], 3: [], 4: [] };
    const s = reduceSession(startSession(thin, 1, 0), pass(5), thin);
    expect(s.finishedAt).toBe(5);
    expect(holdExit(s, { exerciseId: 'a', level: 1 })).toEqual({ kind: 'summary', label: 'Ver resumo' });
  });
});

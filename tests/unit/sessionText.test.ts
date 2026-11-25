import { describe, expect, it } from 'vitest';
import { startSession } from '../../src/state/randomSession';
import { encouragement, formatClock, levelLabel, plural } from '../../src/ui/sessionText';

const pool = { 1: ['a'], 2: ['b'], 3: [], 4: [] };

describe('sessionText', () => {
  it('formata o relógio', () => {
    expect(formatClock(10800000)).toBe('3:00:00');
    expect(formatClock(61000)).toBe('0:01:01');
    expect(formatClock(-5000)).toBe('0:00:00');
  });
  it('pluraliza', () => {
    expect(plural(1, 'troca', 'trocas')).toBe('1 troca');
    expect(plural(0, 'troca', 'trocas')).toBe('0 trocas');
    expect(plural(2, 'troca', 'trocas')).toBe('2 trocas');
  });
  it('rotula níveis: parou aqui só no atual pendente, não chegou nos demais', () => {
    const s = startSession(pool, 1, 0);
    expect(levelLabel(s, s.levels[0]).kind).toBe('stopped');
    expect(levelLabel(s, s.levels[1]).kind).toBe('unreached');
    const passed = { ...s.levels[0], outcome: 'passed' as const };
    expect(levelLabel(s, passed)).toEqual({ kind: 'passed', exerciseId: 'a' });
    expect(levelLabel(s, { ...s.levels[0], outcome: 'skipped' }).kind).toBe('skipped');
  });
  it('tem incentivo para 0 a 4 níveis', () => {
    const all = [0, 1, 2, 3, 4].map(encouragement);
    expect(new Set(all).size).toBe(5);
  });
});

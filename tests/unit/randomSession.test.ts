import { describe, expect, it } from 'vitest';
import {
  EXAM_DURATION_MS, canSwap, reduceSession, remainingMs, startSession,
} from '../../src/state/randomSession';
import type { Level } from '../../src/engine/types';

const pool: Record<Level, string[]> = { 1: ['a', 'b'], 2: ['c'], 3: ['d'], 4: ['e'] };
const fail = { type: 'attempt', passed: false, now: 5 } as const;
const pass = { type: 'attempt', passed: true, now: 9 } as const;

describe('randomSession', () => {
  it('mesmo seed, mesmo sorteio', () => {
    const s1 = startSession(pool, 42, 0);
    const s2 = startSession(pool, 42, 0);
    expect(s1.levels[0].exerciseId).toBe(s2.levels[0].exerciseId);
    expect(['a', 'b']).toContain(s1.levels[0].exerciseId);
  });
  it('canSwap só depois de reprovar', () => {
    const s = startSession(pool, 1, 0);
    expect(canSwap(s, pool)).toBe(false);
    const f = reduceSession(s, fail, pool);
    expect(f.levels[0].attempts).toBe(1);
    expect(canSwap(f, pool)).toBe(true);
  });
  it('swap troca o exercício', () => {
    const f = reduceSession(startSession(pool, 1, 0), fail, pool);
    const prev = f.levels[0].exerciseId;
    const w = reduceSession(f, { type: 'swap' }, pool);
    expect(w.levels[0].exerciseId).not.toBe(prev);
    expect(w.levels[0].swappedFrom).toEqual([prev]);
    expect(w.levels[0].lastAttemptFailed).toBe(false);
    expect(w.levels[0].attempts).toBe(1);
  });
  it('nível com uma opção não troca', () => {
    let s = reduceSession(startSession(pool, 1, 0), pass, pool);
    expect(s.currentLevel).toBe(2);
    s = reduceSession(s, fail, pool);
    expect(canSwap(s, pool)).toBe(false);
  });
  it('aprovar avança e o nível 4 encerra', () => {
    let s = reduceSession(startSession(pool, 1, 0), pass, pool);
    expect(s.levels[0].outcome).toBe('passed');
    expect(s.levels[1].exerciseId).toBe('c');
    s = reduceSession(s, pass, pool);
    s = reduceSession(s, pass, pool);
    s = reduceSession(s, { type: 'attempt', passed: true, now: 77 }, pool);
    expect(s.finishedAt).toBe(77);
  });
  it('skip pula e avança', () => {
    const s = reduceSession(startSession(pool, 1, 0), { type: 'skip', now: 3 }, pool);
    expect(s.levels[0].outcome).toBe('skipped');
    expect(s.currentLevel).toBe(2);
  });
  it('finish encerra e mantém o resto pending', () => {
    const s = reduceSession(startSession(pool, 1, 0), { type: 'finish', now: 8 }, pool);
    expect(s.finishedAt).toBe(8);
    expect(s.levels[1].outcome).toBe('pending');
  });
  it('hint soma no nível atual', () => {
    const s = reduceSession(startSession(pool, 1, 0), { type: 'hint' }, pool);
    expect(s.levels[0].hintsUsed).toBe(1);
  });
  it('sessão encerrada ignora ações', () => {
    const s = reduceSession(startSession(pool, 1, 0), { type: 'finish', now: 8 }, pool);
    expect(reduceSession(s, { type: 'hint' }, pool)).toBe(s);
  });
  it('nível sem exercícios é pulado', () => {
    const p = { ...pool, 2: [] };
    const s = reduceSession(startSession(p, 1, 0), pass, p);
    expect(s.levels[1].outcome).toBe('skipped');
    expect(s.currentLevel).toBe(3);
  });
  it('saveDraft guarda rascunho', () => {
    const s = reduceSession(startSession(pool, 1, 0), { type: 'saveDraft', exerciseId: 'a', files: { 'a.c': 'x' } }, pool);
    expect(s.drafts.a).toEqual({ 'a.c': 'x' });
  });
  it('remainingMs', () => {
    expect(remainingMs({ startedAt: 0 } as never, 1000)).toBe(EXAM_DURATION_MS - 1000);
  });
  it('remainingMs pode ficar negativo', () => {
    expect(remainingMs({ startedAt: 0 } as never, EXAM_DURATION_MS + 5000)).toBe(-5000);
  });
});

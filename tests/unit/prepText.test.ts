import { describe, expect, it } from 'vitest';
import type { Failure } from '../../src/engine/types';
import { looksLikeCode } from '../../src/hints/looksLikeCode';
import { attemptBars, PASS_PHRASES, passPhrase, readiness, statusView, streakText, testDots } from '../../src/ui/prepText';

describe('prepText', () => {
  it('readiness nos limites', () => {
    expect([0, 3, 4, 7, 8, 11, 12].map((p) => readiness(p, 12))).toEqual([
      'ainda não começou', 'começando', 'pegando o jeito', 'pegando o jeito', 'quase pronto', 'quase pronto', 'pronto para a prova',
    ]);
    expect(readiness(0, 0)).toBe('ainda não começou');
  });
  it('attemptBars', () => {
    expect(attemptBars(2, 5)).toEqual(['ok', 'ok', 'bad', 'skip', 'skip']);
    expect(attemptBars(5, 5)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
    expect(attemptBars(0, 2)).toEqual(['bad', 'skip']);
  });
  it('statusView', () => {
    expect(statusView(false, 0)).toEqual({ tone: 'new', text: 'novo' });
    expect(statusView(false, 3)).toEqual({ tone: 'tried', text: 'ainda não passou · tentativa 3' });
    expect(statusView(true, 3)).toEqual({ tone: 'passed', text: 'passou ✓' });
  });
  it('streakText', () => expect([0, 1, 4].map(streakText)).toEqual(['comece hoje', '1 dia', '4 dias']));
  it('testDots', () => {
    expect(testDots({ passed: 2, total: 4, failure: { kind: 'wrong-output', index: 2 } as Failure })).toEqual(['ok', 'ok', 'bad', 'skip']);
    expect(testDots({ passed: 0, total: 3, failure: { kind: 'compile', stderr: '' } })).toEqual(['skip', 'skip', 'skip']);
    expect(testDots({ passed: 3, total: 3, failure: null })).toEqual(['ok', 'ok', 'ok']);
  });
  it('PASS_PHRASES: 5 frases sem código', () => {
    expect(PASS_PHRASES).toHaveLength(5);
    for (const p of PASS_PHRASES) expect(looksLikeCode(p)).toBe(false);
    expect(passPhrase(7)).toBe(PASS_PHRASES[2]);
  });
});

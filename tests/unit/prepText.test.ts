import { describe, expect, it } from 'vitest';
import { attemptBars, readiness, statusView, streakText } from '../../src/ui/prepText';

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
});

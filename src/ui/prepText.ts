import type { GradeResult } from '../engine/types';

export type Dot = 'ok' | 'bad' | 'skip';

export function readiness(passed: number, total: number): string {
  if (total <= 0 || passed <= 0) return 'ainda não começou';
  if (passed >= total) return 'pronto para a prova';
  if (passed * 3 < total) return 'começando';
  if (passed * 3 < total * 2) return 'pegando o jeito';
  return 'quase pronto';
}

export function streakText(days: number): string {
  if (days <= 0) return 'comece hoje';
  return days === 1 ? '1 dia' : `${days} dias`;
}

export function attemptBars(passed: number, total: number): Dot[] {
  return Array.from({ length: Math.max(0, total) }, (_, i): Dot => {
    if (i < passed) return 'ok';
    return i === passed ? 'bad' : 'skip';
  });
}

export function statusView(passed: boolean, attempts: number): { tone: 'new' | 'tried' | 'passed'; text: string } {
  if (passed) return { tone: 'passed', text: 'passou ✓' };
  if (attempts > 0) return { tone: 'tried', text: `ainda não passou · tentativa ${attempts}` };
  return { tone: 'new', text: 'novo' };
}

/** Um ponto por teste: passou tudo, ou os que passaram, o que falhou e os que nem rodaram. */
export function testDots(r: GradeResult): Dot[] {
  const f = r.failure;
  if (f === null) return Array.from({ length: Math.max(0, r.total) }, (): Dot => 'ok');
  if ('index' in f) return attemptBars(f.index, r.total);
  return Array.from({ length: Math.max(0, r.total) }, (): Dot => 'skip');
}

export const PASS_PHRASES: readonly string[] = [
  'Mandou bem!',
  'Isso aí, um a mais no bolso.',
  'Boa, o treino está rendendo.',
  'Passou! Dá para sentir o jeito vindo.',
  'Muito bem, continue assim.',
];

export function passPhrase(n: number): string {
  return PASS_PHRASES[Math.abs(Math.trunc(n)) % PASS_PHRASES.length];
}

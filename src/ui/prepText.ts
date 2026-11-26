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

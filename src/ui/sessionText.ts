import type { LevelRun, RandomSession } from '../state/randomSession';

/** H:MM:SS; tempos negativos viram 0:00:00. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export type LevelLabel =
  | { kind: 'passed'; exerciseId: string }
  | { kind: 'skipped' }
  | { kind: 'stopped' }
  | { kind: 'unreached' };

/** Como o resumo descreve cada nível: passou, pulado, parou aqui (nível atual ao encerrar) ou não chegou. */
export function levelLabel(s: RandomSession, run: LevelRun): LevelLabel {
  if (run.outcome === 'passed' && run.exerciseId) return { kind: 'passed', exerciseId: run.exerciseId };
  if (run.outcome === 'skipped') return { kind: 'skipped' };
  return run.level === s.currentLevel ? { kind: 'stopped' } : { kind: 'unreached' };
}

const ENCOURAGEMENT = [
  'Cada tentativa é treino de verdade. Respire, volte quando quiser e tente de novo: você já sabe por onde começar.',
  'Você abriu o caminho: o primeiro nível costuma ser o que mais pesa. Mais uma sessão e ele vai ficar bem mais leve.',
  'Dois níveis no bolso, e isso é progresso sólido. Os próximos ficam mais perto a cada sessão.',
  'Três níveis! Você já está quase lá. Falta pouco para fechar a sequência inteira.',
  'Os quatro níveis, do começo ao fim. É assim que se chega preparado na prova. Parabéns!',
];

export function encouragement(passed: number): string {
  return ENCOURAGEMENT[Math.min(4, Math.max(0, passed))];
}

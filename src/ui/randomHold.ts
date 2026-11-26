import type { Level } from '../engine/types';
import type { RandomSession } from '../state/randomSession';

/** O exercício que acabou de passar: a tela o segura até o cadete pedir o próximo nível (o reducer já avançou). */
export type Hold = { exerciseId: string; level: Level };

/** Como sair do exercício segurado: o próximo nível ou, se a sessão já acabou, o resumo. */
export type HoldExit = { kind: 'next-level'; level: Level; label: string } | { kind: 'summary'; label: string };

export function holdExit(session: RandomSession, hold: Hold | null): HoldExit | null {
  if (hold === null) return null;
  if (session.finishedAt !== null) return { kind: 'summary', label: 'Ver resumo' };
  return { kind: 'next-level', level: session.currentLevel, label: `Ir para o nível ${session.currentLevel}` };
}

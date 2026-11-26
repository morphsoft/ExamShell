import type { ExerciseStatus } from '../../state/progress';

export type Filter = 'all' | 'todo' | 'passed';

/** Minúsculas, sem acento, '_' vira espaço: "Função_X" e "funcao x" se encontram. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/_/g, ' ');
}

export function matchesQuery(ex: { id: string; summary: string }, query: string): boolean {
  const q = normalize(query).trim();
  if (q === '') return true;
  return normalize(ex.id).includes(q) || normalize(ex.summary).includes(q);
}

/** "todo" = ainda não passou. */
export function matchesFilter(status: ExerciseStatus, f: Filter): boolean {
  if (f === 'todo') return status !== 'passed';
  if (f === 'passed') return status === 'passed';
  return true;
}

/** Sorteia entre os que ainda não passaram; se todos passaram, entre todos. `exclude` só sai se houver outra opção. */
export function drawFromLevel(
  ids: string[],
  progress: Record<string, ExerciseStatus>,
  rand: () => number,
  exclude?: string,
): string | null {
  if (ids.length === 0) return null;
  const others = ids.filter((id) => id !== exclude);
  let pool = others.filter((id) => progress[id] !== 'passed');
  if (pool.length === 0) pool = others;
  if (pool.length === 0) pool = ids;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

export function levelCounts(
  ids: string[],
  progress: Record<string, ExerciseStatus>,
): { passed: number; tried: number; total: number } {
  return {
    passed: ids.filter((id) => progress[id] === 'passed').length,
    tried: ids.filter((id) => progress[id] === 'tried').length,
    total: ids.length,
  };
}

/** Frase curta do quanto o cadete já avançou no nível. */
export function readiness(c: { passed: number; total: number }): string {
  const r = c.total === 0 ? 0 : c.passed / c.total;
  if (r === 0) return 'ainda não começou';
  if (r < 0.34) return 'começando';
  if (r < 0.67) return 'pegando o jeito';
  if (r < 1) return 'quase pronto';
  return 'pronto para a prova';
}

/** O exercício do cartão "continuar": o último aberto, se ele ainda existir no catálogo. */
export function continueTarget(lastOpened: { id: string } | null, existingIds: ReadonlySet<string>): string | null {
  return lastOpened !== null && existingIds.has(lastOpened.id) ? lastOpened.id : null;
}

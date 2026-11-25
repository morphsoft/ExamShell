import type { Level, SourceFiles } from '../engine/types';
import { mulberry32 } from './rng';
import { KEY_PREFIX, readJson, removeKey, writeJson } from './storage';

export const EXAM_DURATION_MS = 10800000;

export type LevelRun = {
  level: Level;
  exerciseId: string | null;
  outcome: 'pending' | 'passed' | 'skipped';
  attempts: number;
  hintsUsed: number;
  swappedFrom: string[];
  lastAttemptFailed: boolean;
};

export type RandomSession = {
  seed: number;
  draws: number;
  startedAt: number;
  currentLevel: Level;
  levels: LevelRun[];
  finishedAt: number | null;
  drafts: Record<string, SourceFiles>;
};

export type RandomAction =
  | { type: 'attempt'; passed: boolean; now: number }
  | { type: 'hint' }
  | { type: 'swap' }
  | { type: 'skip'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'saveDraft'; exerciseId: string; files: SourceFiles };

type Pool = Record<Level, string[]>;

const SESSION_KEY = `${KEY_PREFIX}session`;
const LEVELS: Level[] = [1, 2, 3, 4];

function candidates(run: LevelRun, pool: Pool): string[] {
  const all = pool[run.level] ?? [];
  const strict = all.filter((id) => id !== run.exerciseId && !run.swappedFrom.includes(id));
  return strict.length > 0 ? strict : all.filter((id) => id !== run.exerciseId);
}

function draw(s: RandomSession, run: LevelRun, pool: Pool): { id: string | null; draws: number } {
  const c = candidates(run, pool);
  if (c.length === 0) return { id: null, draws: s.draws };
  const id = c[Math.floor(mulberry32(s.seed + s.draws)() * c.length)];
  return { id, draws: s.draws + 1 };
}

// Entra no nível `level`, sorteando; níveis sem exercícios são pulados.
function enterLevel(s: RandomSession, level: number, pool: Pool, now: number): RandomSession {
  let cur = s;
  for (let l = level; l <= 4; l++) {
    const idx = l - 1;
    const run = cur.levels[idx];
    const { id, draws } = draw(cur, run, pool);
    const levels = cur.levels.slice();
    if (id === null) {
      levels[idx] = { ...run, outcome: 'skipped' };
      cur = { ...cur, levels, currentLevel: l as Level };
      continue;
    }
    levels[idx] = { ...run, exerciseId: id };
    return { ...cur, levels, draws, currentLevel: l as Level };
  }
  return { ...cur, finishedAt: now };
}

export function startSession(pool: Pool, seed: number, now: number): RandomSession {
  const levels: LevelRun[] = LEVELS.map((level) => ({
    level,
    exerciseId: null,
    outcome: 'pending',
    attempts: 0,
    hintsUsed: 0,
    swappedFrom: [],
    lastAttemptFailed: false,
  }));
  return enterLevel(
    { seed, draws: 0, startedAt: now, currentLevel: 1, levels, finishedAt: null, drafts: {} },
    1,
    pool,
    now,
  );
}

function patchCurrent(s: RandomSession, patch: Partial<LevelRun>): RandomSession {
  const levels = s.levels.slice();
  const i = s.currentLevel - 1;
  levels[i] = { ...levels[i], ...patch };
  return { ...s, levels };
}

export function canSwap(s: RandomSession, pool: Pool): boolean {
  if (s.finishedAt !== null) return false;
  const run = s.levels[s.currentLevel - 1];
  return run.lastAttemptFailed && candidates(run, pool).length > 0;
}

export function reduceSession(s: RandomSession, a: RandomAction, pool: Pool): RandomSession {
  if (s.finishedAt !== null) return s;
  const run = s.levels[s.currentLevel - 1];
  switch (a.type) {
    case 'attempt': {
      const withAttempt = patchCurrent(s, { attempts: run.attempts + 1, lastAttemptFailed: !a.passed });
      if (!a.passed) return withAttempt;
      return enterLevel(patchCurrent(withAttempt, { outcome: 'passed' }), s.currentLevel + 1, pool, a.now);
    }
    case 'hint':
      return patchCurrent(s, { hintsUsed: run.hintsUsed + 1 });
    case 'swap': {
      if (!canSwap(s, pool)) return s;
      const { id, draws } = draw(s, run, pool);
      if (id === null) return s;
      const next = patchCurrent(s, {
        exerciseId: id,
        swappedFrom: run.exerciseId ? [...run.swappedFrom, run.exerciseId] : run.swappedFrom,
        lastAttemptFailed: false,
      });
      return { ...next, draws };
    }
    case 'skip':
      return enterLevel(patchCurrent(s, { outcome: 'skipped' }), s.currentLevel + 1, pool, a.now);
    case 'finish':
      return { ...s, finishedAt: a.now };
    case 'saveDraft':
      return { ...s, drafts: { ...s.drafts, [a.exerciseId]: a.files } };
  }
}

export function remainingMs(s: RandomSession, now: number): number {
  // Pode ser negativo: o relógio é informativo, o candidato pode continuar.
  return EXAM_DURATION_MS - (now - s.startedAt);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validLevel(r: unknown, i: number): boolean {
  if (!r || typeof r !== 'object') return false;
  const l = r as Record<string, unknown>;
  return (
    l.level === i + 1 &&
    (l.outcome === 'pending' || l.outcome === 'passed' || l.outcome === 'skipped') &&
    (l.exerciseId === null || typeof l.exerciseId === 'string') &&
    isNum(l.attempts) &&
    isNum(l.hintsUsed) &&
    typeof l.lastAttemptFailed === 'boolean' &&
    Array.isArray(l.swappedFrom)
  );
}

export function loadSession(): RandomSession | null {
  const s = readJson<unknown>(SESSION_KEY, null);
  if (!s || typeof s !== 'object') return null;
  const o = s as Record<string, unknown>;
  const ok =
    isNum(o.seed) &&
    isNum(o.draws) &&
    isNum(o.startedAt) &&
    (o.currentLevel === 1 || o.currentLevel === 2 || o.currentLevel === 3 || o.currentLevel === 4) &&
    (o.finishedAt === null || isNum(o.finishedAt)) &&
    !!o.drafts && typeof o.drafts === 'object' && !Array.isArray(o.drafts) &&
    Array.isArray(o.levels) && o.levels.length === 4 && o.levels.every(validLevel);
  return ok ? (s as RandomSession) : null;
}

export function saveSession(s: RandomSession | null): void {
  if (s === null) removeKey(SESSION_KEY);
  else writeJson(SESSION_KEY, s);
}

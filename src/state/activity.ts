import { readJson, writeJson } from './storage';

export type Streak = { last: string; count: number };
export type AttemptRecord = { passed: number; total: number; count: number };
export type Activity = {
  lastOpened: { id: string; at: number } | null;
  lastAttempt: Record<string, AttemptRecord>;
  streak: Streak | null;
};

const KEY = 'examshell:v1:activity';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' no fuso local (nunca UTC). */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function yesterdayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

export function nextStreak(prev: Streak | null, today: string): Streak {
  if (!prev) return { last: today, count: 1 };
  if (prev.last === today) return prev;
  if (prev.last === yesterdayOf(today)) return { last: today, count: prev.count + 1 };
  return { last: today, count: 1 };
}

export function streakDays(s: Streak | null, today: string): number {
  if (!s) return 0;
  return s.last === today || s.last === yesterdayOf(today) ? s.count : 0;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function getActivity(): Activity {
  const raw = readJson<unknown>(KEY, null);
  const out: Activity = { lastOpened: null, lastAttempt: {}, streak: null };
  if (!isObj(raw)) return out;
  const lo = raw.lastOpened;
  if (isObj(lo) && typeof lo.id === 'string' && isNum(lo.at)) out.lastOpened = { id: lo.id, at: lo.at };
  if (isObj(raw.lastAttempt)) {
    for (const [id, v] of Object.entries(raw.lastAttempt)) {
      if (isObj(v) && isNum(v.passed) && isNum(v.total) && isNum(v.count)) {
        out.lastAttempt[id] = { passed: v.passed, total: v.total, count: v.count };
      }
    }
  }
  const s = raw.streak;
  if (isObj(s) && typeof s.last === 'string' && DAY.test(s.last) && isNum(s.count)) {
    out.streak = { last: s.last, count: s.count };
  }
  return out;
}

export function recordOpened(id: string, now: number): void {
  writeJson(KEY, { ...getActivity(), lastOpened: { id, at: now } });
}

export function recordGrade(id: string, r: { passed: number; total: number }, now: Date): void {
  const a = getActivity();
  const count = (a.lastAttempt[id]?.count ?? 0) + 1;
  a.lastAttempt[id] = { passed: r.passed, total: r.total, count };
  a.streak = nextStreak(a.streak, localDay(now));
  writeJson(KEY, a);
}

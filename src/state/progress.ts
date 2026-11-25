import type { SourceFiles } from '../engine/types';
import { KEY_PREFIX, readJson, removeAll, writeJson } from './storage';

export type ExerciseStatus = 'untried' | 'tried' | 'passed';
export type Theme = 'system' | 'light' | 'dark';
export type Settings = { vim: boolean; subjectLang: 'en' | 'pt'; theme: Theme };

const PROGRESS_KEY = `${KEY_PREFIX}progress`;
const SETTINGS_KEY = `${KEY_PREFIX}settings`;
const draftKey = (id: string) => `${KEY_PREFIX}draft:${id}`;
const DEFAULT_SETTINGS: Settings = { vim: false, subjectLang: 'en', theme: 'system' };

const STATUSES: readonly unknown[] = ['untried', 'tried', 'passed'] satisfies ExerciseStatus[];

/** Status por exercício; entradas com valor desconhecido (mexidas à mão, de outra versão) são ignoradas. */
export function getProgress(): Record<string, ExerciseStatus> {
  const p = readJson<unknown>(PROGRESS_KEY, {});
  if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
  return Object.fromEntries(
    Object.entries(p).filter((e): e is [string, ExerciseStatus] => STATUSES.includes(e[1])),
  );
}

export function markAttempt(id: string, passed: boolean): void {
  const p = getProgress();
  if (p[id] === 'passed') return;
  p[id] = passed ? 'passed' : 'tried';
  writeJson(PROGRESS_KEY, p);
}

export function loadDraft(id: string): SourceFiles | null {
  const d = readJson<SourceFiles | null>(draftKey(id), null);
  return d && typeof d === 'object' ? d : null;
}

export function saveDraft(id: string, files: SourceFiles): void {
  writeJson(draftKey(id), files);
}

export function clearProgress(): void {
  removeAll();
}

export function getSettings(): Settings {
  const s = readJson<Partial<Settings> | null>(SETTINGS_KEY, null);
  return {
    vim: typeof s?.vim === 'boolean' ? s.vim : DEFAULT_SETTINGS.vim,
    subjectLang: s?.subjectLang === 'pt' || s?.subjectLang === 'en' ? s.subjectLang : DEFAULT_SETTINGS.subjectLang,
    theme: s?.theme === 'light' || s?.theme === 'dark' || s?.theme === 'system' ? s.theme : DEFAULT_SETTINGS.theme,
  };
}

export function saveSettings(s: Settings): void {
  writeJson(SETTINGS_KEY, s);
}

import type { CatalogEntry, ExerciseContent, Level, LoadedExercise } from '../engine/types';
import { RANK02_CATALOG } from './rank02Catalog';

// Tudo entra no bundle em tempo de build. O formato é validado por tests/content (schema.ts).
const exerciseJson = import.meta.glob<ExerciseContent>('/content/rank02/*/exercise.json', {
  eager: true,
  import: 'default',
});
const expectedJson = import.meta.glob<LoadedExercise['expected']>('/content/rank02/*/expected.json', {
  eager: true,
  import: 'default',
});
const subjectTxt = import.meta.glob<string>('/content/rank02/*/subject.{en,pt}.txt', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const harnessC = import.meta.glob<string>('/content/rank02/*/harness.c', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function load(entry: CatalogEntry): LoadedExercise | undefined {
  const dir = `/content/rank02/${entry.id}/`;
  const content = exerciseJson[dir + 'exercise.json'];
  if (content === undefined) return undefined;
  const subject = { en: subjectTxt[dir + 'subject.en.txt'] ?? '', pt: subjectTxt[dir + 'subject.pt.txt'] ?? '' };
  const expected = expectedJson[dir + 'expected.json'] ?? {};
  const harness = harnessC[dir + 'harness.c'];
  const ex: LoadedExercise = { ...entry, ...content, subject, expected };
  if (harness !== undefined) ex.harness = harness;
  return ex;
}

const EXERCISES: LoadedExercise[] = RANK02_CATALOG.flatMap((entry) => load(entry) ?? []);

/** Exercícios que já têm conteúdo, na ordem do catálogo. */
export function loadExercises(): LoadedExercise[] {
  return [...EXERCISES];
}

export function getExercise(id: string): LoadedExercise | undefined {
  return EXERCISES.find((ex) => ex.id === id);
}

export function byLevel(list: LoadedExercise[]): Record<Level, LoadedExercise[]> {
  const groups: Record<Level, LoadedExercise[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const ex of list) groups[ex.level].push(ex);
  return groups;
}

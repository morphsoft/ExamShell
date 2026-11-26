// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LoadedExercise } from '../../src/engine/types';
import type { ExerciseStatus } from '../../src/state/progress';
import { LevelSection } from '../../src/ui/home/LevelSection';
import { readiness } from '../../src/ui/prepText';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Só o que a seção lê de cada exercício.
const exercises = Array.from(
  { length: 12 },
  (_, i) => ({ id: `ex${i}`, level: 1, kind: 'program', summary: `exercício ${i}` }) as unknown as LoadedExercise,
);

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function headText(passed: number): string {
  const progress: Record<string, ExerciseStatus> = Object.fromEntries(
    exercises.slice(0, passed).map((e) => [e.id, 'passed' as const]),
  );
  act(() =>
    root.render(
      <LevelSection
        level={1}
        all={exercises}
        visible={exercises}
        progress={progress}
        narrowed={false}
        query=""
        filter="all"
        expanded={false}
        onExpand={() => {}}
        onOpen={() => {}}
        onDraw={() => {}}
        onClearQuery={() => {}}
      />,
    ),
  );
  return container.querySelector('.lvl-prog span')!.textContent ?? '';
}

describe('LevelSection', () => {
  it('o status do nível é o mesmo de "Sua preparação" (limites em 1/3 e 2/3)', () => {
    expect(headText(4)).toBe('4 de 12 já passaram · pegando o jeito');
    expect(headText(8)).toBe('8 de 12 já passaram · quase pronto');
    for (let p = 0; p <= 12; p++) expect(headText(p), `${p} de 12`).toContain(`· ${readiness(p, 12)}`);
  });
});

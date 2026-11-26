// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Level } from '../../src/engine/types';
import { reduceSession, startSession, type RandomSession } from '../../src/state/randomSession';
import { SessionBar } from '../../src/ui/components/SessionBar';
import { holdExit, type HoldExit } from '../../src/ui/randomHold';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pool: Record<Level, string[]> = { 1: ['a', 'b'], 2: ['c'], 3: ['d'], 4: ['e'] };

function passed(n: number): RandomSession {
  let s = startSession(pool, 1, 0);
  for (let i = 0; i < n; i++) s = reduceSession(s, { type: 'attempt', passed: true, now: 10 + i }, pool);
  return s;
}

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

const q = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);

function render(session: RandomSession, exit: HoldExit | null, onExit = vi.fn(), onFinish = vi.fn()) {
  act(() =>
    root.render(
      <SessionBar
        session={session}
        canSwap={false}
        onSwap={() => {}}
        onSkip={() => {}}
        onFinish={onFinish}
        exit={exit}
        onExit={onExit}
      />,
    ),
  );
  return { onExit, onFinish };
}

describe('SessionBar', () => {
  it('sem exercício segurado: pular e sair, sem avançar', () => {
    render(passed(0), null);
    expect(q('skip')).not.toBeNull();
    expect(q('exit-session')).not.toBeNull();
    expect(q('bar-next-level')).toBeNull();
    expect(q('bar-summary')).toBeNull();
  });

  it('segurado: o próximo nível fica na barra (o cartão de "passou" pode ter sumido)', () => {
    const s = passed(1);
    const { onExit } = render(s, holdExit(s, { exerciseId: s.levels[0].exerciseId!, level: 1 }));
    const next = q('bar-next-level');
    expect(next?.textContent).toBe('Ir para o nível 2');
    expect(q('skip')).toBeNull();
    expect(q('swap')).toBeNull();
    expect(q('exit-session')).not.toBeNull();
    act(() => next!.click());
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('segurado com a sessão encerrada: "Ver resumo" e nada de "a sessão continua"', () => {
    const s = passed(4);
    const { onExit } = render(s, holdExit(s, { exerciseId: 'e', level: 4 }));
    const summary = q('bar-summary');
    expect(summary?.textContent).toBe('Ver resumo');
    expect(q('bar-next-level')).toBeNull();
    expect(q('exit-session')).toBeNull();
    expect(container.textContent).not.toContain('a sessão continua');
    expect(q('finish')).toBeNull();
    act(() => summary!.click());
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

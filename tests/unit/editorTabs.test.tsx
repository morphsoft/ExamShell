// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorTabs } from '../../src/ui/components/EditorTabs';
import { MobileTabs } from '../../src/ui/components/MobileTabs';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
const byText = (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent === text);

describe('EditorTabs: recomeçar', () => {
  function render(onReset = vi.fn()) {
    act(() =>
      root.render(
        <EditorTabs
          tabs={[{ key: 'a.c', label: 'a.c' }]}
          active="a.c"
          onSelect={() => {}}
          onReset={onReset}
          vim={false}
          onToggleVim={() => {}}
        />,
      ),
    );
    return onReset;
  }

  it('a pergunta recebe o foco em "cancelar"; cancelar devolve o foco ao "recomeçar"', () => {
    const onReset = render();
    const trigger = q('editor-reset')!;
    trigger.focus();
    act(() => trigger.click());
    expect(document.activeElement).toBe(byText('cancelar'));
    act(() => byText('cancelar')!.click());
    expect(q('reset-confirm')).toBeNull();
    expect(document.activeElement).toBe(q('editor-reset'));
    expect(onReset).not.toHaveBeenCalled();
  });

  it('confirmar recomeça e devolve o foco ao "recomeçar"', () => {
    const onReset = render();
    act(() => q('editor-reset')!.click());
    act(() => q('reset-confirm')!.click());
    expect(onReset).toHaveBeenCalledWith('a.c');
    expect(document.activeElement).toBe(q('editor-reset'));
  });
});

describe('MobileTabs', () => {
  it('o ponto de novo é anunciado por texto escondido, não por aria-label num span', () => {
    act(() => root.render(<MobileTabs tab="subject" onSelect={() => {}} dot />));
    const tab = q('mtab-result')!;
    expect(tab.querySelector('[aria-label]')).toBeNull();
    const hidden = tab.querySelector('.sr-only');
    expect(hidden?.textContent?.trim()).toBe('novo');
    expect(q('result-dot')).not.toBeNull();
  });
});

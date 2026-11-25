// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '../../src/ui/components/ThemeToggle';
import { getSettings } from '../../src/state/progress';
import { applyTheme, toggledTheme } from '../../src/ui/theme';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('theme', () => {
  it('applyTheme: dark/light põem data-theme; system tira', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
  it('toggledTheme troca o que está na tela', () => {
    expect(toggledTheme('system', true)).toBe('light');
    expect(toggledTheme('system', false)).toBe('dark');
    expect(toggledTheme('light', true)).toBe('dark');
    expect(toggledTheme('dark', false)).toBe('light');
  });
  it('ThemeToggle: clicar com o sistema claro liga o escuro e grava', () => {
    act(() => root.render(<ThemeToggle />));
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]')!;
    expect(btn.getAttribute('aria-label')).toBe('usar tema escuro');
    act(() => btn.click());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getSettings().theme).toBe('dark');
    expect(btn.getAttribute('aria-label')).toBe('usar tema claro');
  });
});

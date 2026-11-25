import type { Theme } from '../state/progress';

/** 'system' tira o atributo e deixa o `prefers-color-scheme` decidir; claro/escuro fixam o tema. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;
}

/** O tema que o botão liga: o oposto do que está na tela agora. */
export function toggledTheme(theme: Theme, systemDark: boolean): 'light' | 'dark' {
  const showingDark = theme === 'system' ? systemDark : theme === 'dark';
  return showingDark ? 'light' : 'dark';
}

import type { Level } from '../engine/types';

/** Título e subtítulo de cada nível, como aparecem na tela de início. */
export const LEVEL_INFO: Record<Level, { title: string; subtitle: string }> = {
  1: { title: 'Primeiros passos', subtitle: 'strings, write e laços' },
  2: { title: 'Strings e bits', subtitle: 'funções da libc, bits e malloc' },
  3: { title: 'Números e listas', subtitle: 'matemática, bases e listas encadeadas' },
  4: { title: 'Algoritmos', subtitle: 'split, ordenação e flood fill' },
};

import { describe, expect, it } from 'vitest';
import { parseHash } from '../../src/ui/router';

describe('parseHash', () => {
  it('home', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/xyz')).toEqual({ name: 'home' });
  });
  it('treino', () => {
    expect(parseHash('#/treino')).toEqual({ name: 'home', section: 'exercicios' });
    expect(parseHash('#/treino/first_word')).toEqual({ name: 'exercise', id: 'first_word' });
  });
  it('aleatório', () => {
    expect(parseHash('#/aleatorio?seed=42')).toEqual({ name: 'random', seed: 42 });
    expect(parseHash('#/aleatorio')).toEqual({ name: 'random' });
    expect(parseHash('#/aleatorio/resumo')).toEqual({ name: 'summary' });
  });
});

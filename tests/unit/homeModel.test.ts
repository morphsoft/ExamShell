import { describe, expect, it } from 'vitest';
import { drawFromLevel, levelCounts, matchesFilter, matchesQuery, normalize } from '../../src/ui/home/homeModel';

const strlen = { id: 'ft_strlen', summary: 'Devolve o tamanho de uma string.' };

describe('homeModel', () => {
  it('normalize: minúsculas, sem acento, _ vira espaço', () => {
    expect(normalize('Função_ÇÃO')).toBe('funcao cao');
  });
  it('busca ignora maiúscula, acento e _', () => {
    expect(matchesQuery(strlen, 'STRING')).toBe(true);
    expect(matchesQuery(strlen, 'ft strlen')).toBe(true);
    expect(matchesQuery({ id: 'x', summary: 'Uma função simples.' }, 'funcao')).toBe(true);
    expect(matchesQuery(strlen, '  ')).toBe(true);
    expect(matchesQuery(strlen, 'xyz')).toBe(false);
  });
  it('sorteio: entre os não passados; todos passados → entre todos; exclude', () => {
    const p = { a: 'passed', b: 'passed' } as const;
    expect(drawFromLevel(['a', 'b', 'c'], p, () => 0)).toBe('c');
    expect(drawFromLevel(['a', 'b'], p, () => 0.99)).toBe('b');
    expect(drawFromLevel(['a', 'b', 'c'], p, () => 0, 'c')).toBe('a');
    expect(drawFromLevel(['a'], {}, () => 0, 'a')).toBe('a');
    expect(drawFromLevel([], {}, () => 0)).toBeNull();
  });
  it('matchesFilter', () => {
    expect(matchesFilter('passed', 'all')).toBe(true);
    expect(matchesFilter('passed', 'todo')).toBe(false);
    expect(matchesFilter('tried', 'todo')).toBe(true);
    expect(matchesFilter('untried', 'todo')).toBe(true);
    expect(matchesFilter('tried', 'passed')).toBe(false);
    expect(matchesFilter('passed', 'passed')).toBe(true);
  });
  it('levelCounts', () => {
    expect(levelCounts(['a', 'b', 'c', 'd'], { a: 'passed', b: 'tried', z: 'passed' })).toEqual({
      passed: 1,
      tried: 1,
      total: 4,
    });
  });
});

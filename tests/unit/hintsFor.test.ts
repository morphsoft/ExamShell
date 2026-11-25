import { describe, expect, it } from 'vitest';
import type { Failure, LoadedExercise, TestCase } from '../../src/engine/types';
import { GENERIC_HINTS } from '../../src/hints/genericHints';
import { hintsFor } from '../../src/hints/hintsFor';
import { looksLikeCode } from '../../src/hints/looksLikeCode';

const ladder: [string, string, string] = ['q?', 'conceito', 'direto'];
const ex = { hints: { espacos: ladder } } as unknown as LoadedExercise;
const test = (category: string): TestCase => ({ id: 't01', args: [], category });
const wrong = (category: string, expected: string, actual: string): Failure => ({
  kind: 'wrong-output', test: test(category), index: 0, expected, actual, diffIndex: 0, truncated: false,
});

describe('hintsFor', () => {
  it('escada do exercício', () => {
    expect(hintsFor(wrong('espacos', 'a\n', 'b\n'), ex)).toBe(ladder);
  });
  it('categoria sem escada: genérica', () => {
    expect(hintsFor(wrong('outra', 'a\n', 'b\n'), ex)).toBe(GENERIC_HINTS['wrong-output']);
  });
  it('só \\n difere', () => {
    expect(hintsFor(wrong('outra', 'a\n', 'a'), ex)).toBe(GENERIC_HINTS.newline);
  });
  it('crash, compile, forbidden, timeout, link', () => {
    expect(hintsFor({ kind: 'crash', test: test('x'), index: 0, trapMessage: '' }, ex)).toBe(GENERIC_HINTS.crash);
    expect(hintsFor({ kind: 'compile', stderr: '' }, ex)).toBe(GENERIC_HINTS.compile);
    expect(hintsFor({ kind: 'forbidden', functions: ['printf'] }, ex)).toBe(GENERIC_HINTS.forbidden);
    expect(hintsFor({ kind: 'timeout', test: test('x'), index: 0 }, ex)).toBe(GENERIC_HINTS.timeout);
    expect(hintsFor({ kind: 'link', reason: 'duplicate-main', stderr: '' }, ex)).toBe(GENERIC_HINTS['duplicate-main']);
    expect(hintsFor({ kind: 'link', reason: 'missing-symbol', symbol: 'f', stderr: '' }, ex)).toBe(GENERIC_HINTS['missing-symbol']);
  });
  it('missing-symbol: main usa escada própria', () => {
    expect(hintsFor({ kind: 'link', reason: 'missing-symbol', symbol: 'main', stderr: '' }, ex)).toBe(GENERIC_HINTS['missing-main']);
    expect(hintsFor({ kind: 'link', reason: 'missing-symbol', symbol: 'ft_strlen', stderr: '' }, ex)).toBe(GENERIC_HINTS['missing-symbol']);
  });
});

describe('looksLikeCode', () => {
  it('detecta código', () => {
    expect(looksLikeCode('while (i < n)')).toBe(true);
    expect(looksLikeCode('i++')).toBe(true);
    expect(looksLikeCode('E se a string começar com espaços?')).toBe(false);
  });
  it('escadas genéricas: 3 textos, sem código', () => {
    for (const ladder of Object.values(GENERIC_HINTS)) {
      expect(ladder).toHaveLength(3);
      for (const t of ladder) {
        expect(t.trim()).not.toBe('');
        expect(looksLikeCode(t)).toBe(false);
      }
    }
  });
  it('travou: avisa que, na prova, acessos fora da memória que aqui passam podem derrubar o programa', () => {
    const [, concept, direct] = GENERIC_HINTS.crash;
    expect(`${concept} ${direct}`).toMatch(/na prova.*aqui/i);
  });
});

import { describe, expect, it } from 'vitest';
import { catE, firstDiffIndex, onlyNewlineDiff } from '../../src/engine/compare';

describe('compare', () => {
  it('firstDiffIndex', () => {
    expect(firstDiffIndex('abc\n', 'abc\n')).toBe(-1);
    expect(firstDiffIndex('abc\n', 'abd\n')).toBe(2);
    expect(firstDiffIndex('abc\n', 'abc')).toBe(3);
    expect(firstDiffIndex('', 'x')).toBe(0);
  });
  it('onlyNewlineDiff', () => {
    expect(onlyNewlineDiff('lorem\n', 'lorem')).toBe(true);
    expect(onlyNewlineDiff('lorem\n', 'lorem\n\n')).toBe(true);
    expect(onlyNewlineDiff('a\n', 'b\n')).toBe(false);
    expect(onlyNewlineDiff('a\n', 'a\n')).toBe(false);
  });
  it('catE', () => {
    expect(catE('a\tb\n')).toBe('a^Ib$\n');
    expect(catE('\0')).toBe('^@');
    expect(catE('\x7f')).toBe('^?');
    expect(catE('é')).toBe('M-i');
    expect(catE('\x8a')).toBe('M-^J');
    expect(catE('\x80')).toBe('M-^@');
    expect(catE('\x9f')).toBe('M-^_');
    expect(catE('\xff')).toBe('M-^?');
    expect(catE('\xa0')).toBe('M- ');
  });
});

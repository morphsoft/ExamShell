// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readJson, writeJson } from '../../src/state/storage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('storage', () => {
  it('JSON corrompido devolve o fallback', () => {
    localStorage.setItem('examshell:v1:x', '{bad');
    expect(readJson('examshell:v1:x', 7)).toBe(7);
  });
  it('setItem que lança devolve false sem lançar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(writeJson('examshell:v1:y', { a: 1 })).toBe(false);
  });
  it('localStorage indefinido devolve o fallback', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readJson('k', 'fb')).toBe('fb');
    expect(writeJson('k', 1)).toBe(false);
  });
});

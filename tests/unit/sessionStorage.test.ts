// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { loadSession, saveSession, startSession } from '../../src/state/randomSession';
import type { Level } from '../../src/engine/types';

const pool: Record<Level, string[]> = { 1: ['a', 'b'], 2: ['c'], 3: ['d'], 4: ['e'] };
const KEY = 'examshell:v1:session';

beforeEach(() => localStorage.clear());

describe('loadSession/saveSession', () => {
  it('ida e volta', () => {
    const s = startSession(pool, 3, 10);
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });
  it('currentLevel inválido devolve null', () => {
    saveSession({ ...startSession(pool, 3, 10), currentLevel: 7 as Level });
    expect(loadSession()).toBeNull();
  });
  it('nível sem attempts devolve null', () => {
    const s = startSession(pool, 3, 10);
    const bad = JSON.parse(JSON.stringify(s));
    delete bad.levels[2].attempts;
    localStorage.setItem(KEY, JSON.stringify(bad));
    expect(loadSession()).toBeNull();
  });
  it('saveSession(null) limpa', () => {
    saveSession(startSession(pool, 3, 10));
    saveSession(null);
    expect(loadSession()).toBeNull();
  });
});

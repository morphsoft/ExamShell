// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActivity, localDay, nextStreak, recordGrade, recordOpened, streakDays,
} from '../../src/state/activity';
import { clearProgress } from '../../src/state/progress';

beforeEach(() => localStorage.clear());

describe('activity', () => {
  it('localDay usa a data local', () => {
    expect(localDay(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
  });
  it('nextStreak: primeiro dia, mesmo dia, dia seguinte, intervalo', () => {
    expect(nextStreak(null, '2026-11-25')).toEqual({ last: '2026-11-25', count: 1 });
    expect(nextStreak({ last: '2026-11-25', count: 3 }, '2026-11-25')).toEqual({ last: '2026-11-25', count: 3 });
    expect(nextStreak({ last: '2026-11-25', count: 3 }, '2026-11-26')).toEqual({ last: '2026-11-26', count: 4 });
    expect(nextStreak({ last: '2026-11-25', count: 3 }, '2026-11-28')).toEqual({ last: '2026-11-28', count: 1 });
    expect(nextStreak({ last: '2026-11-30', count: 3 }, '2026-12-01')).toEqual({ last: '2026-12-01', count: 4 });
  });
  it('meia-noite local: 23:30 e 00:10 do dia seguinte dão 2 dias', () => {
    recordGrade('first_word', { passed: 1, total: 8 }, new Date(2026, 10, 25, 23, 30));
    recordGrade('first_word', { passed: 8, total: 8 }, new Date(2026, 10, 26, 0, 10));
    expect(getActivity().streak).toEqual({ last: '2026-11-26', count: 2 });
    expect(getActivity().lastAttempt.first_word).toEqual({ passed: 8, total: 8, count: 2 });
  });
  it('streakDays: hoje ou ontem contam; antes disso, 0', () => {
    expect(streakDays({ last: '2026-11-25', count: 3 }, '2026-11-25')).toBe(3);
    expect(streakDays({ last: '2026-11-24', count: 3 }, '2026-11-25')).toBe(3);
    expect(streakDays({ last: '2026-11-23', count: 3 }, '2026-11-25')).toBe(0);
    expect(streakDays(null, '2026-11-25')).toBe(0);
  });
  it('dados estragados viram o padrão, campo por campo', () => {
    localStorage.setItem('examshell:v1:activity', JSON.stringify({ lastOpened: 5, lastAttempt: [], streak: { last: 3 } }));
    expect(getActivity()).toEqual({ lastOpened: null, lastAttempt: {}, streak: null });
    localStorage.setItem('examshell:v1:activity', '"x"');
    expect(getActivity()).toEqual({ lastOpened: null, lastAttempt: {}, streak: null });
  });
  it('mantém os campos válidos e descarta só as tentativas malformadas', () => {
    localStorage.setItem('examshell:v1:activity', JSON.stringify({
      lastOpened: { id: 'a', at: 7 },
      lastAttempt: { ok: { passed: 1, total: 2, count: 3 }, bad: { passed: 'x' }, neg: null },
      streak: 'lixo',
    }));
    expect(getActivity()).toEqual({
      lastOpened: { id: 'a', at: 7 },
      lastAttempt: { ok: { passed: 1, total: 2, count: 3 } },
      streak: null,
    });
  });
  it('recordOpened grava; clearProgress apaga a atividade', () => {
    recordOpened('ft_strlen', 123);
    expect(getActivity().lastOpened).toEqual({ id: 'ft_strlen', at: 123 });
    recordGrade('ft_strlen', { passed: 1, total: 2 }, new Date(2026, 10, 25, 10));
    clearProgress();
    expect(getActivity()).toEqual({ lastOpened: null, lastAttempt: {}, streak: null });
  });
});

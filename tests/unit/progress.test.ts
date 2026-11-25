// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearProgress, getProgress, getSettings, loadDraft, markAttempt, saveDraft, saveSettings,
} from '../../src/state/progress';

beforeEach(() => localStorage.clear());

describe('progress', () => {
  it('tried -> passed e passed é permanente', () => {
    markAttempt('a', false);
    expect(getProgress().a).toBe('tried');
    markAttempt('a', true);
    expect(getProgress().a).toBe('passed');
    markAttempt('a', false);
    expect(getProgress().a).toBe('passed');
  });
  it('ignora entradas com estado desconhecido (localStorage mexido à mão ou de outra versão)', () => {
    localStorage.setItem(
      'examshell:v1:progress',
      JSON.stringify({ a: 'passed', b: 'tried', c: 'untried', d: 'feito', e: 1, f: null, g: { x: 1 } }),
    );
    expect(getProgress()).toEqual({ a: 'passed', b: 'tried', c: 'untried' });
    markAttempt('d', false);
    expect(getProgress()).toEqual({ a: 'passed', b: 'tried', c: 'untried', d: 'tried' });
  });
  it('draft ida e volta', () => {
    expect(loadDraft('a')).toBeNull();
    saveDraft('a', { 'a.c': 'int x;' });
    expect(loadDraft('a')).toEqual({ 'a.c': 'int x;' });
  });
  it('clearProgress esvazia', () => {
    markAttempt('a', true);
    clearProgress();
    expect(getProgress()).toEqual({});
  });
  it('settings padrão e persistência', () => {
    expect(getSettings()).toEqual({ vim: false, subjectLang: 'en', theme: 'system' });
    saveSettings({ vim: true, subjectLang: 'pt', theme: 'dark' });
    expect(getSettings()).toEqual({ vim: true, subjectLang: 'pt', theme: 'dark' });
  });
});

describe('settings.theme', () => {
  it('configurações antigas, sem theme, ficam como estavam e o tema vira system', () => {
    localStorage.setItem('examshell:v1:settings', JSON.stringify({ vim: true, subjectLang: 'pt' }));
    expect(getSettings()).toEqual({ vim: true, subjectLang: 'pt', theme: 'system' });
  });
  it('tema inválido vira system', () => {
    localStorage.setItem('examshell:v1:settings', JSON.stringify({ theme: 'blue' }));
    expect(getSettings().theme).toBe('system');
  });
});

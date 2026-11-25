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
    expect(getSettings()).toEqual({ vim: false, subjectLang: 'en' });
    saveSettings({ vim: true, subjectLang: 'pt' });
    expect(getSettings()).toEqual({ vim: true, subjectLang: 'pt' });
  });
});

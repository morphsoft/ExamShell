import { describe, expect, it, vi } from 'vitest';
import { createLowMemoryWatch, ENGINE_INIT_MARK, LOW_MEMORY_TIMEOUT_MS } from '../../src/ui/lowMemory';

function setup(initial?: string) {
  const data = new Map<string, string>(initial ? [[ENGINE_INIT_MARK, initial]] : []);
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  const timers: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  const setTimer = (fn: () => void, ms: number) => {
    const t = { fn, ms, cancelled: false };
    timers.push(t);
    return () => void (t.cancelled = true);
  };
  const onSuspect = vi.fn();
  return { data, storage, timers, onSuspect, make: () => createLowMemoryWatch({ storage, setTimer, onSuspect }) };
}

describe('createLowMemoryWatch', () => {
  it('sem marca: crashedBefore false e nada gravado ainda', () => {
    const s = setup();
    expect(s.make().crashedBefore).toBe(false);
    expect(s.data.size).toBe(0);
  });
  it('com a marca já gravada: crashedBefore true', () => {
    expect(setup('1').make().crashedBefore).toBe(true);
  });
  it('onDownloaded grava a marca e arma um timer de 60 s; disparar chama onSuspect', () => {
    const s = setup();
    s.make().onDownloaded();
    expect(s.data.get(ENGINE_INIT_MARK)).toBe('1');
    expect(s.timers).toHaveLength(1);
    expect(s.timers[0].ms).toBe(LOW_MEMORY_TIMEOUT_MS);
    s.timers[0].fn();
    expect(s.onSuspect).toHaveBeenCalledTimes(1);
  });
  it('onSettled antes do disparo apaga a marca e cancela o timer', () => {
    const s = setup();
    const w = s.make();
    w.onDownloaded();
    w.onSettled();
    expect(s.data.has(ENGINE_INIT_MARK)).toBe(false);
    expect(s.timers[0].cancelled).toBe(true);
  });
  it('onDownloaded duas vezes arma um timer só', () => {
    const s = setup();
    const w = s.make();
    w.onDownloaded();
    w.onDownloaded();
    expect(s.timers).toHaveLength(1);
  });
  it('storage null (bloqueado): não lança e crashedBefore é false', () => {
    const w = createLowMemoryWatch({ storage: null, setTimer: () => () => {}, onSuspect: () => {} });
    expect(w.crashedBefore).toBe(false);
    expect(() => {
      w.onDownloaded();
      w.onSettled();
    }).not.toThrow();
  });
});

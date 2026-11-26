import { useSyncExternalStore } from 'react';
import { createLowMemoryWatch, isDownloadComplete } from './lowMemory';
import { createBrowserEngine, type BrowserEngine, type EngineStatus, type LoadProgress } from '../engine/browserEngine';

/** `error`: a mensagem do motivo, quando `status` é 'error'. */
type Snapshot = { status: EngineStatus; progress: LoadProgress | null; error: string | null; lowMemory: boolean };

/** Porcentagem inteira (0–100) do download do compilador. */
export function loadPercent(p: LoadProgress | null): number {
  if (!p || p.totalBytes <= 0) return 0;
  return Math.min(100, Math.floor((100 * p.loadedBytes) / p.totalBytes));
}

// Uma instância só para o site inteiro, criada quando a primeira tela de exercício pede o motor.
let engine: BrowserEngine | null = null;
let snapshot: Snapshot = { status: 'loading', progress: null, error: null, lowMemory: false };
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function getEngine(): BrowserEngine {
  if (engine) return engine;
  let storage: Storage | null = null;
  try {
    storage = sessionStorage; // pode lançar (modo privado, dados bloqueados)
  } catch {
    storage = null;
  }
  const watch = createLowMemoryWatch({
    storage,
    setTimer(fn, ms) {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
    onSuspect: () => publish({ ...snapshot, lowMemory: true }),
  });
  // a aba morreu na carga anterior: não inicia o compilador, espera o "tentar de novo"
  if (watch.crashedBefore) snapshot = { ...snapshot, status: 'error', lowMemory: true };
  engine = createBrowserEngine({
    clangBaseUrl: new URL('clang/', location.href).href,
    deferStart: watch.crashedBefore,
    onStatus(status) {
      if (status === snapshot.status) return; // o 'loading' inicial chega durante o render: nada a avisar
      if (status !== 'loading') watch.onSettled();
      publish({
        status,
        progress: status === 'loading' ? null : snapshot.progress,
        error: null,
        lowMemory: status === 'loading' ? false : snapshot.lowMemory && status === 'error',
      });
      if (status !== 'error') return;
      // o motivo vem na rejeição do ready(); só vale se ninguém tentou de novo nesse meio-tempo
      engine?.ready().catch((e: unknown) => {
        if (snapshot.status === 'error') publish({ ...snapshot, error: e instanceof Error ? e.message : String(e) });
      });
    },
    onProgress(progress) {
      if (isDownloadComplete(progress)) watch.onDownloaded();
      // só re-renderiza quando a porcentagem inteira (ou a origem) muda
      const prev = snapshot.progress;
      if (prev && prev.fromCache === progress.fromCache && loadPercent(prev) === loadPercent(progress)) return;
      publish({ ...snapshot, progress });
    },
  });
  return engine;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;

/** O motor do navegador (um só), com o estado da carga do compilador. */
export function useEngine(): {
  engine: BrowserEngine;
  status: EngineStatus;
  progress: LoadProgress | null;
  error: string | null;
  lowMemory: boolean;
} {
  const e = getEngine();
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return { engine: e, status: s.status, progress: s.progress, error: s.error, lowMemory: s.lowMemory };
}

/** Marca gravada quando o compilador começa a gastar memória; some quando ele termina (bem ou mal). */
export const ENGINE_INIT_MARK = 'examshell:v1:engine-init';
export const LOW_MEMORY_TIMEOUT_MS = 60000;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Detecta aparelho sem memória: se a aba morreu na fase pesada (preparar o compilador, depois do download),
 * a marca continua gravada na próxima carga. A marca só nasce depois do download, para quem recarrega no meio dele.
 */
export function createLowMemoryWatch(o: {
  storage: Store | null;
  setTimer(fn: () => void, ms: number): () => void;
  onSuspect(): void;
}): { crashedBefore: boolean; onDownloaded(): void; onSettled(): void } {
  const crashedBefore = safe(() => o.storage?.getItem(ENGINE_INIT_MARK) != null, false);
  let cancel: (() => void) | null = null;
  return {
    crashedBefore,
    onDownloaded() {
      if (cancel) return;
      safe(() => o.storage?.setItem(ENGINE_INIT_MARK, '1'), undefined);
      cancel = o.setTimer(o.onSuspect, LOW_MEMORY_TIMEOUT_MS);
    },
    onSettled() {
      cancel?.();
      cancel = null;
      safe(() => o.storage?.removeItem(ENGINE_INIT_MARK), undefined);
    },
  };
}

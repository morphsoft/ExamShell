import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 820px)';

const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null);

function subscribe(onChange: () => void): () => void {
  const mq = query();
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

/** Celular: a tela tem até 820px. Acompanha redimensionar e girar a tela. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false);
}

import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home'; section?: 'exercicios' }
  | { name: 'exercise'; id: string }
  | { name: 'random'; seed?: number }
  | { name: 'summary' };

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'treino') {
    if (parts.length === 1) return { name: 'home', section: 'exercicios' };
    if (parts.length === 2) return { name: 'exercise', id: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'aleatorio') {
    if (parts.length === 1) {
      const seed = new URLSearchParams(query).get('seed');
      const n = seed === null || seed === '' ? NaN : Number(seed);
      return Number.isFinite(n) ? { name: 'random', seed: n } : { name: 'random' };
    }
    if (parts.length === 2 && parts[1] === 'resumo') return { name: 'summary' };
  }
  return { name: 'home' };
}

export function navigate(hash: string): void {
  window.location.hash = hash;
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parseHash(hash);
}

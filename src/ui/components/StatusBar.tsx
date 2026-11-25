import type { ReactNode } from 'react';

export function StatusBar({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <footer className="statusbar">
      {items.map((it) => (
        <span key={it.label}>
          {it.label} <b>{it.value}</b>
        </span>
      ))}
    </footer>
  );
}

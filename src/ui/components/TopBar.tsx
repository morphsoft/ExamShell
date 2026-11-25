import type { ReactNode } from 'react';

export function TopBar({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <header className="topbar">
      <span className="topbar-left">{left}</span>
      <span className="topbar-right">{right}</span>
    </header>
  );
}

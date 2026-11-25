import { useEffect, useState } from 'react';
import { remainingMs, type RandomSession } from '../../state/randomSession';
import { formatClock } from '../sessionText';

/** Relógio informativo da prova: o candidato pode continuar depois que acaba. */
export function Timer({ session }: { session: RandomSession }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = remainingMs(session, now);
  return (
    <span data-testid="timer" className={left < 0 ? 'timer-over' : undefined}>
      {left < 0 ? 'tempo esgotado, mas pode continuar' : formatClock(left)}
    </span>
  );
}

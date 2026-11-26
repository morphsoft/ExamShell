import { useEffect, useState } from 'react';

const TOAST_MS = 4000;

/** Aviso curto que some sozinho depois de 4 s. */
export function Toast({ message }: { message: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), TOAST_MS);
    return () => window.clearTimeout(t);
  }, []);
  if (!open) return null;
  return (
    <div className="toast" role="status" data-testid="pass-toast">
      {message}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { LoadedExercise } from '../../engine/types';
import type { ExerciseStatus } from '../../state/progress';
import { levelStyle } from './LevelSection';

const STATUS_FACT: Record<ExerciseStatus, string> = { passed: 'já passou ✓', tried: 'em andamento', untried: 'ainda não fez' };
const PRIMARY: Record<ExerciseStatus, string> = { passed: 'Praticar de novo', tried: 'Continuar', untried: 'Começar' };

export function ExerciseDetail(props: {
  exercise: LoadedExercise;
  status: ExerciseStatus;
  drawn: boolean;
  onClose(): void;
  onRedraw(): void;
}) {
  const { exercise: e, status, drawn } = props;
  const sheetRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLAnchorElement>(null);
  // quem tinha o foco quando o detalhe abriu (lido no 1º render, antes de o foco entrar na folha)
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  const onClose = useRef(props.onClose);
  onClose.current = props.onClose;

  useEffect(() => {
    startRef.current?.focus();
  }, [e.id]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose.current();
      } else if (ev.key === 'Tab' && sheetRef.current) {
        const items = [...sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (ev.shiftKey && active === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && active === last) {
          ev.preventDefault();
          first.focus();
        } else if (!sheetRef.current.contains(active)) {
          ev.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.body.contains(opener)) opener.focus();
    };
  }, [opener]);

  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div
        className="sheet detail"
        ref={sheetRef}
        data-testid="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-name"
        style={levelStyle(e.level)}
      >
        <span className="grab" aria-hidden="true" />
        <div className="eyebrow">
          {drawn && <span className="dice" data-testid="drawn-badge">caiu no sorteio</span>}
          <span>Nível {e.level} · {e.kind === 'program' ? 'programa' : 'função'}</span>
          <button type="button" className="iconbtn close" data-testid="detail-close" aria-label="Fechar" onClick={props.onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <h3 id="detail-name">{e.id}</h3>
        <p className="desc">{e.summary}</p>
        <div className="facts">
          <span>{e.tests.length} testes</span>
          <span>arquivo {e.expectedFiles[0]}</span>
          <span>permitidas: {e.allowedFunctions.length > 0 ? e.allowedFunctions.join(', ') : 'nenhuma'}</span>
          <span>{STATUS_FACT[status]}</span>
        </div>
        <div className="btnrow">
          <a className="btn primary" ref={startRef} data-testid="detail-start" href={`#/treino/${encodeURIComponent(e.id)}`}>
            {PRIMARY[status]}
          </a>
          {drawn && (
            <button type="button" className="btn" data-testid="detail-redraw" onClick={props.onRedraw}>
              Sortear outro
            </button>
          )}
        </div>
      </div>
    </>
  );
}

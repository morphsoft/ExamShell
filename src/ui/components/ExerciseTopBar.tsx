import type { Level } from '../../engine/types';
import { ThemeToggle } from './ThemeToggle';

export type ExerciseStatus = { tone: 'new' | 'tried' | 'passed'; text: string };

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Topo da tela do exercício: voltar com a marca, nível, nome, tipo, situação e tema. */
export function ExerciseTopBar({
  backHref,
  level,
  levelLabel,
  id,
  kind,
  status,
}: {
  backHref: string;
  level: Level;
  levelLabel: string;
  id: string;
  kind: 'program' | 'function';
  status: ExerciseStatus;
}) {
  return (
    <header className="top gut">
      <div className="in">
        <a className="back" href={backHref} aria-label="Voltar" data-testid="back">
          <BackIcon />
          <span className="brand">
            <span className="mark">&gt;_</span>
          </span>
        </a>
        <div className="crumb">
          <span className="lv" data-level={level}>
            {levelLabel}
          </span>
          <h1 data-testid="exercise-name">{id}</h1>
          <span className="kind">{kind === 'function' ? 'função' : 'programa'}</span>
        </div>
        <div className="right">
          <span className="status" data-testid="ex-status" data-tone={status.tone}>
            {status.text}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

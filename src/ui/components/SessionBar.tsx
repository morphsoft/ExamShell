import { useEffect, useState } from 'react';
import { remainingMs, type RandomSession } from '../../state/randomSession';
import { formatClock } from '../sessionText';

const WARN_MS = 30 * 60 * 1000;

type StepState = 'current' | 'passed' | 'skipped' | 'future';

function stepState(s: RandomSession, i: number): StepState {
  const run = s.levels[i];
  if (run.outcome === 'passed') return 'passed';
  if (run.outcome === 'skipped') return 'skipped';
  return s.finishedAt === null && run.level === s.currentLevel ? 'current' : 'future';
}

const STEP_TEXT: Record<StepState, string> = {
  current: 'em andamento',
  passed: 'passou',
  skipped: 'pulado',
  future: 'ainda não chegou',
};

/** Relógio informativo da prova: o cadete pode continuar depois que acaba. */
function Clock({ session }: { session: RandomSession }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = remainingMs(session, now);
  if (left < 0) {
    return (
      <span className="clock over" data-testid="timer">
        tempo esgotado, mas pode continuar
      </span>
    );
  }
  return (
    <span className={left < WARN_MS ? 'clock warn' : 'clock'} data-testid="timer">
      {formatClock(left)}
      <small>restantes</small>
    </span>
  );
}

/**
 * Barra do simulado: níveis, relógio e ações. `held` (o cartão de "passou" ainda na tela) desliga trocar e
 * pular, que valeriam para o próximo nível, ainda não aberto.
 */
export function SessionBar({
  session,
  canSwap,
  onSwap,
  onSkip,
  onFinish,
  held = false,
}: {
  session: RandomSession;
  canSwap: boolean;
  onSwap(): void;
  onSkip(): void;
  onFinish(): void;
  held?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="session-bar" data-testid="session-bar">
      <ol className="steps" aria-label="Níveis da prova">
        {session.levels.map((run, i) => {
          const state = stepState(session, i);
          return (
            <li key={run.level} className="step" data-testid={`level-step-${run.level}`} data-state={state}>
              <span aria-hidden="true">{run.level}</span>
              <span className="sr-only">
                nível {run.level}: {STEP_TEXT[state]}
              </span>
            </li>
          );
        })}
      </ol>
      <Clock session={session} />
      <span className="acts">
        {confirming ? (
          <>
            <button type="button" className="btn primary" data-testid="finish-confirm" onClick={onFinish}>
              Encerrar e ver o resumo
            </button>
            <button type="button" className="btn quiet" onClick={() => setConfirming(false)}>
              cancelar
            </button>
          </>
        ) : (
          <>
            {canSwap && !held && (
              <button type="button" className="btn" data-testid="swap" onClick={onSwap}>
                Sortear outro
              </button>
            )}
            {!held && (
              <button type="button" className="btn" data-testid="skip" onClick={onSkip}>
                Pular nível
              </button>
            )}
            <button type="button" className="btn quiet" data-testid="finish" onClick={() => setConfirming(true)}>
              Encerrar
            </button>
            <a className="btn quiet" data-testid="exit-session" href="#/">
              Sair (a sessão continua)
            </a>
          </>
        )}
      </span>
    </div>
  );
}

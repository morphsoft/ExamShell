import { useEffect, useRef, useState } from 'react';
import { remainingMs, type RandomSession } from '../../state/randomSession';
import type { HoldExit } from '../randomHold';
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
 * Barra do simulado: níveis, relógio e ações. Com um exercício segurado (`exit`, o cartão de "passou"), trocar e
 * pular somem, porque valeriam para o próximo nível, ainda não aberto; no lugar fica a saída do exercício
 * segurado ("Ir para o nível N" ou "Ver resumo"), que continua aqui mesmo se o cartão sumir com outra correção.
 * Com a sessão já encerrada, só sobra "Ver resumo".
 */
export function SessionBar({
  session,
  canSwap,
  onSwap,
  onSkip,
  onFinish,
  exit = null,
  onExit,
}: {
  session: RandomSession;
  canSwap: boolean;
  onSwap(): void;
  onSkip(): void;
  onFinish(): void;
  exit?: HoldExit | null;
  onExit?(): void;
}) {
  const [confirming, setConfirming] = useState(false);
  // a confirmação troca o botão focado: o foco vai para "cancelar" e, ao cancelar, volta ao "Encerrar"
  const cancelRef = useRef<HTMLButtonElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (refocus.current) finishRef.current?.focus();
    refocus.current = false;
  }, [confirming]);
  const cancel = () => {
    refocus.current = true;
    setConfirming(false);
  };
  const held = exit !== null;
  const finished = session.finishedAt !== null;
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
            <button type="button" className="btn quiet" ref={cancelRef} onClick={cancel}>
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
            {exit !== null && (
              <button
                type="button"
                className="btn primary"
                data-testid={exit.kind === 'summary' ? 'bar-summary' : 'bar-next-level'}
                onClick={onExit}
              >
                {exit.label}
              </button>
            )}
            {!finished && (
              <button type="button" className="btn quiet" data-testid="finish" ref={finishRef} onClick={() => setConfirming(true)}>
                Encerrar
              </button>
            )}
            {!finished && (
              <a className="btn quiet" data-testid="exit-session" href="#/">
                Sair (a sessão continua)
              </a>
            )}
          </>
        )}
      </span>
    </div>
  );
}

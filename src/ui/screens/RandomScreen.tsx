import { useEffect, useRef, useState } from 'react';
import { byLevel, getExercise, loadExercises } from '../../content/loadExercises';
import type { Level } from '../../engine/types';
import {
  canSwap,
  loadSession,
  reduceSession,
  saveSession,
  startSession,
  type RandomAction,
  type RandomSession,
} from '../../state/randomSession';
import { StatusBar } from '../components/StatusBar';
import { Timer } from '../components/Timer';
import { TopBar } from '../components/TopBar';
import { navigate } from '../router';
import { plural } from '../sessionText';
import { ExerciseScreen } from './ExerciseScreen';

type Pool = Record<Level, string[]>;

function buildPool(): Pool {
  const groups = byLevel(loadExercises());
  const ids = (l: Level) => groups[l].map((e) => e.id);
  return { 1: ids(1), 2: ids(2), 3: ids(3), 4: ids(4) };
}

/** Retoma a sessão salva (se não terminou); senão começa uma, com a semente da rota. */
function initSession(pool: Pool, seed: number | undefined): RandomSession {
  const stored = loadSession();
  if (stored !== null && stored.finishedAt === null) return stored;
  return startSession(pool, seed ?? Date.now(), Date.now());
}

export function RandomScreen({ seed }: { seed?: number }) {
  const [pool] = useState(buildPool);
  const [session, setSession] = useState(() => initSession(pool, seed));
  const ref = useRef(session);

  // Grava a sessão recém-criada (ou a retomada, sem mudança).
  useEffect(() => {
    saveSession(ref.current);
  }, []);

  useEffect(() => {
    if (session.finishedAt !== null) navigate('#/aleatorio/resumo');
  }, [session.finishedAt]);

  // Usa o ref, não o estado: a descarga do rascunho ao desmontar chega com closures antigas.
  const dispatch = (action: RandomAction) => {
    const next = reduceSession(ref.current, action, pool);
    if (next === ref.current) return;
    ref.current = next;
    setSession(next);
    saveSession(next);
  };

  const finish = () => {
    if (window.confirm('Encerrar a sessão agora? Você vê o resumo do que fez até aqui.')) {
      dispatch({ type: 'finish', now: Date.now() });
    }
  };

  const run = session.levels[session.currentLevel - 1];
  const exercise = run.exerciseId ? getExercise(run.exerciseId) : undefined;

  if (!exercise || session.finishedAt !== null) {
    return (
      <>
        <TopBar left="examshell · rank 02" right="modo aleatório" />
        <main className="page">
          <h1>Modo aleatório</h1>
          <p className="muted">
            {session.finishedAt !== null
              ? 'Sessão encerrada, abrindo o resumo…'
              : 'Não achei o exercício desta sessão. Encerre para ver o resumo e começar outra.'}
          </p>
          {session.finishedAt === null && (
            <button type="button" className="chip" data-testid="finish" onClick={finish}>
              encerrar sessão
            </button>
          )}
        </main>
        <StatusBar items={[{ label: 'modo', value: 'aleatório' }]} />
      </>
    );
  }

  const id = exercise.id; // fixo na closure: a descarga do rascunho pode chegar depois da troca
  return (
    <ExerciseScreen
      exercise={exercise}
      mode="random"
      initialFiles={session.drafts[id] ?? {}}
      onFilesChange={(files) => dispatch({ type: 'saveDraft', exerciseId: id, files })}
      onGraded={(r) => dispatch({ type: 'attempt', passed: r.failure === null, now: Date.now() })}
      onHintUsed={() => dispatch({ type: 'hint' })}
      statusItems={[
        { label: 'tempo', value: <Timer session={session} /> },
        { label: 'tentativas', value: String(run.attempts) },
        { label: 'modo', value: 'aleatório' },
        { label: 'nível', value: `${session.currentLevel}/4` },
      ]}
      actions={
        <>
          {canSwap(session, pool) && (
            <button type="button" className="chip" data-testid="swap" onClick={() => dispatch({ type: 'swap' })}>
              sortear outro deste nível
            </button>
          )}
          <button
            type="button"
            className="chip"
            data-testid="skip"
            onClick={() => dispatch({ type: 'skip', now: Date.now() })}
          >
            pular para o próximo nível
          </button>
          <button type="button" className="chip" data-testid="finish" onClick={finish}>
            encerrar sessão
          </button>
          {run.swappedFrom.length > 0 && (
            <span className="muted">{plural(run.swappedFrom.length, 'troca', 'trocas')} neste nível</span>
          )}
        </>
      }
    />
  );
}

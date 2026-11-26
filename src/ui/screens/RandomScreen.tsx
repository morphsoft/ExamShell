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
import { SessionBar } from '../components/SessionBar';
import { StatusBar } from '../components/StatusBar';
import { TopBar } from '../components/TopBar';
import { navigate } from '../router';
import { passPhrase, statusView } from '../prepText';
import { holdExit, type Hold } from '../randomHold';
import { ExerciseScreen } from './ExerciseScreen';
import { RandomStart } from './RandomStart';

type Pool = Record<Level, string[]>;

function buildPool(): Pool {
  const groups = byLevel(loadExercises());
  const ids = (l: Level) => groups[l].map((e) => e.id);
  return { 1: ids(1), 2: ids(2), 3: ids(3), 4: ids(4) };
}

/** A sessão salva, se ainda não terminou; sessão terminada conta como nenhuma. */
function runningSession(): RandomSession | null {
  const stored = loadSession();
  return stored !== null && stored.finishedAt === null ? stored : null;
}

export function RandomScreen({ seed }: { seed?: number }) {
  const [pool] = useState(buildPool);
  const [session, setSession] = useState<RandomSession | null>(runningSession);
  const ref = useRef(session);
  const [hold, setHoldState] = useState<Hold | null>(null);
  const holdRef = useRef<Hold | null>(null);
  const setHold = (h: Hold | null) => {
    holdRef.current = h;
    setHoldState(h);
  };

  const finished = session !== null && session.finishedAt !== null;
  useEffect(() => {
    if (finished && hold === null) navigate('#/aleatorio/resumo');
  }, [finished, hold]);

  const start = () => {
    const next = startSession(pool, seed ?? Date.now(), Date.now());
    ref.current = next;
    setSession(next);
    saveSession(next);
  };

  // Usa o ref, não o estado: a descarga do rascunho ao desmontar chega com closures antigas.
  const dispatch = (action: RandomAction) => {
    if (ref.current === null) return;
    const next = reduceSession(ref.current, action, pool);
    if (next === ref.current) return;
    ref.current = next;
    setSession(next);
    saveSession(next);
  };

  // Uma ação do cadete (dica, troca, pulo, encerrar) solta o cartão de "passou".
  const act = (action: RandomAction) => {
    setHold(null);
    dispatch(action);
  };

  if (session === null) return <RandomStart onStart={start} />;

  const heldLevel = hold?.level ?? session.currentLevel;
  const run = session.levels[heldLevel - 1];
  const exerciseId = hold?.exerciseId ?? run.exerciseId;
  const exercise = exerciseId ? getExercise(exerciseId) : undefined;

  if (!exercise || (session.finishedAt !== null && hold === null)) {
    return (
      <>
        <TopBar left="examshell · rank 02" right="simulado" />
        <main className="page">
          <h1>Simulado</h1>
          <p className="muted">
            {session.finishedAt !== null
              ? 'Sessão encerrada, abrindo o resumo…'
              : 'Não achei o exercício desta sessão. Encerre para ver o resumo e começar outra.'}
          </p>
          {session.finishedAt === null && (
            <button type="button" className="chip" data-testid="finish" onClick={() => act({ type: 'finish', now: Date.now() })}>
              encerrar sessão
            </button>
          )}
        </main>
        <StatusBar items={[{ label: 'modo', value: 'simulado' }]} />
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
      onGraded={(r) => {
        if (holdRef.current !== null) return; // nova correção do exercício segurado: o nível já fechou
        const cur = ref.current;
        if (cur === null) return;
        const passed = r.failure === null;
        if (passed) setHold({ exerciseId: id, level: cur.currentLevel });
        dispatch({ type: 'attempt', passed, now: Date.now() });
      }}
      onHintUsed={() => {
        if (holdRef.current === null) dispatch({ type: 'hint' });
      }}
      afterPass={() => {
        const h = holdRef.current;
        const cur = ref.current;
        const exit = cur === null ? null : holdExit(cur, h);
        if (h === null || cur === null || exit === null) return { message: passPhrase(run.attempts), actions: [] };
        const attempts = cur.levels[h.level - 1].attempts;
        return {
          message: `Nível ${h.level} de 4 concluído. ${passPhrase(attempts)}`,
          actions: [
            {
              label: exit.label,
              testId: exit.kind === 'summary' ? 'pass-summary' : 'pass-next-level',
              primary: true,
              onClick: () => setHold(null),
            },
          ],
        };
      }}
      backHref="#/"
      levelLabel={`nível ${heldLevel} de 4`}
      status={statusView(run.outcome === 'passed', run.attempts)}
      sessionBar={
        <SessionBar
          session={session}
          exit={holdExit(session, hold)}
          onExit={() => setHold(null)}
          canSwap={canSwap(session, pool)}
          onSwap={() => act({ type: 'swap' })}
          onSkip={() => act({ type: 'skip', now: Date.now() })}
          onFinish={() => act({ type: 'finish', now: Date.now() })}
        />
      }
    />
  );
}

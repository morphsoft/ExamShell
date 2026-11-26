import { useEffect } from 'react';
import { loadSession, saveSession, type LevelRun, type RandomSession } from '../../state/randomSession';
import { AppTopBar } from '../components/AppTopBar';
import { navigate } from '../router';
import { encouragement, formatClock, levelLabel, plural } from '../sessionText';

/** Exercícios que valem treino: os trocados e o do nível pulado ou parado (sem repetir). */
function toTrain(run: LevelRun, label: ReturnType<typeof levelLabel>): string[] {
  const ids = [...run.swappedFrom];
  if ((label.kind === 'skipped' || label.kind === 'stopped') && run.exerciseId) ids.push(run.exerciseId);
  return [...new Set(ids)];
}

function LevelRow({ session, run }: { session: RandomSession; run: LevelRun }) {
  const label = levelLabel(session, run);
  const train = toTrain(run, label);
  return (
    <li className="sum-level" data-testid={`sum-level-${run.level}`}>
      <span className="k">nível {run.level}</span>
      <span className="what">
        {label.kind === 'passed' && (
          <>
            <span className="ok" aria-hidden="true">✓ </span>
            <b>{label.exerciseId}</b> <span className="muted">passou</span>
          </>
        )}
        {label.kind === 'skipped' && <span className="tried">pulado</span>}
        {label.kind === 'stopped' && <span className="tried">parou aqui</span>}
        {label.kind === 'unreached' && <span className="muted">não chegou</span>}
      </span>
      {label.kind !== 'unreached' && (
        <span className="muted sum-stats">
          {run.swappedFrom.length > 0 && <>trocou: {run.swappedFrom.join(', ')} · </>}
          {plural(run.attempts, 'tentativa', 'tentativas')} · {plural(run.hintsUsed, 'dica', 'dicas')}
        </span>
      )}
      {train.length > 0 && (
        <span className="sum-train">
          {train.map((id) => (
            <a key={id} className="btn" data-testid={`train-${id}`} href={`#/treino/${encodeURIComponent(id)}`}>
              Treinar {id}
            </a>
          ))}
        </span>
      )}
    </li>
  );
}

export function SummaryScreen() {
  const session = loadSession();
  const done = session !== null && session.finishedAt !== null;

  useEffect(() => {
    if (!done) navigate(session ? '#/aleatorio' : '#/');
  }, [done, session]);
  if (!session || session.finishedAt === null) return null;

  const passed = session.levels.filter((l) => l.outcome === 'passed').length;
  const leave = (to: string) => {
    saveSession(null);
    navigate(to);
  };

  return (
    <>
      <AppTopBar active="simulado" />
      <main className="rand-page gut" data-testid="summary">
        <h1>Resumo do simulado</h1>
        <p className="lead">
          passou em {passed} de 4 níveis · tempo total <b data-testid="summary-time">{formatClock(session.finishedAt - session.startedAt)}</b>
        </p>
        <ul className="sum-levels">
          {session.levels.map((run) => (
            <LevelRow key={run.level} session={session} run={run} />
          ))}
        </ul>
        <p className="cheer">{encouragement(passed)}</p>
        <div className="sum-actions">
          <button type="button" className="btn primary" data-testid="new-simulado" onClick={() => leave('#/aleatorio')}>
            Novo simulado
          </button>
          <button type="button" className="btn" data-testid="summary-home" onClick={() => leave('#/')}>
            Voltar ao início
          </button>
        </div>
      </main>
    </>
  );
}

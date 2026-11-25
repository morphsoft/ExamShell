import { useEffect } from 'react';
import { loadSession, saveSession, type LevelRun } from '../../state/randomSession';
import { StatusBar } from '../components/StatusBar';
import { TopBar } from '../components/TopBar';
import { navigate } from '../router';
import { encouragement, formatClock, levelLabel, plural } from '../sessionText';

const newSeed = () => Math.floor(Math.random() * 1e9);

function LevelRow({ run, label }: { run: LevelRun; label: ReturnType<typeof levelLabel> }) {
  return (
    <li className="sum-level">
      <span className="k">nível {run.level}</span>
      {label.kind === 'passed' && (
        <span>
          <span className="ok" aria-hidden="true">✓ </span>
          <b>{label.exerciseId}</b> <span className="muted">passou</span>
        </span>
      )}
      {label.kind === 'skipped' && <span className="mark-tried">pulado</span>}
      {label.kind === 'stopped' && <span className="mark-tried">parou aqui</span>}
      {label.kind === 'unreached' && <span className="muted">não chegou</span>}
      {label.kind !== 'unreached' && (
        <span className="muted sum-stats">
          {plural(run.attempts, 'tentativa', 'tentativas')} · {plural(run.swappedFrom.length, 'troca', 'trocas')} ·{' '}
          {plural(run.hintsUsed, 'dica', 'dicas')}
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
      <TopBar left="examshell · rank 02" right="resumo da sessão" />
      <main className="page" data-testid="summary">
        <h1>Resumo da sessão</h1>
        <p className="lead">
          {passed} de 4 níveis · tempo total <b>{formatClock(session.finishedAt - session.startedAt)}</b>
        </p>
        <ul className="sum-levels">
          {session.levels.map((run) => (
            <LevelRow key={run.level} run={run} label={levelLabel(session, run)} />
          ))}
        </ul>
        <p className="cheer">{encouragement(passed)}</p>
        <div className="sum-actions">
          <button type="button" className="btn btn-primary" onClick={() => leave(`#/aleatorio?seed=${newSeed()}`)}>
            nova sessão
          </button>
          <button type="button" className="btn" onClick={() => leave('#/')}>
            voltar ao início
          </button>
        </div>
      </main>
      <StatusBar items={[{ label: 'modo', value: 'aleatório' }, { label: 'níveis', value: `${passed}/4` }]} />
    </>
  );
}

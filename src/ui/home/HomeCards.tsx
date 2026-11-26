import { LEVEL_INFO } from '../../content/levels';
import type { Level } from '../../engine/types';
import type { Activity } from '../../state/activity';
import type { RandomSession } from '../../state/randomSession';
import { EXAM_DURATION_MS, remainingMs } from '../../state/randomSession';
import type { ExerciseStatus } from '../../state/progress';
import { attemptBars, streakText } from '../prepText';
import { formatClock } from '../sessionText';
import { continueTarget, drawFromLevel } from './homeModel';
import type { DetailRequest } from './ExerciseList';

type Known = { id: string; level: Level };

export function ContinueCard(props: {
  activity: Activity;
  streak: number;
  exercises: Known[];
  progress: Record<string, ExerciseStatus>;
  onDetail(r: DetailRequest): void;
}) {
  const { activity, streak, exercises, progress } = props;
  const targetId = continueTarget(activity.lastOpened, new Set(exercises.map((e) => e.id)));
  const target = exercises.find((e) => e.id === targetId);
  const level: Level = target?.level ?? 1;
  const attempt = target ? activity.lastAttempt[target.id] : undefined;

  const draw = () => {
    const ids = exercises.filter((e) => e.level === level).map((e) => e.id);
    const id = drawFromLevel(ids, progress, Math.random, target?.id);
    if (id !== null) props.onDetail({ id, drawn: true });
  };

  return (
    <section className="card cont" data-testid="continue-card" aria-labelledby="c-h">
      <span className="eyebrow" id="c-h">
        {target ? 'Continuar de onde parou' : 'Por onde começar'}
      </span>
      {target ? (
        <>
          <span className="name">{target.id}</span>
          <span className="meta">
            Nível {level}
            {attempt && ` · na última tentativa passou em ${attempt.passed} de ${attempt.total} testes`}
          </span>
          {attempt && (
            <span className="tests" data-testid="attempt-bars" aria-hidden="true">
              {attemptBars(attempt.passed, attempt.total).map((d, i) => (
                <i key={i} className={d === 'skip' ? undefined : d} />
              ))}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="name">Comece pelo nível 1</span>
          <span className="meta">{LEVEL_INFO[1].title} · {LEVEL_INFO[1].subtitle}</span>
        </>
      )}
      {streak > 0 && <span className="meta">Sequência: {streakText(streak)}</span>}
      <div className="btnrow">
        {target && (
          <a className="btn primary" data-testid="continue-open" href={`#/treino/${encodeURIComponent(target.id)}`}>
            Abrir {target.id}
          </a>
        )}
        <button type="button" className={target ? 'btn' : 'btn primary'} data-testid="continue-draw" onClick={draw}>
          {target ? `Sortear outro do nível ${level}` : 'Sortear um do nível 1'}
        </button>
      </div>
    </section>
  );
}

export function SimulateCard({ session, now }: { session: RandomSession | null; now: number }) {
  const ongoing = session !== null && session.finishedAt === null;
  return (
    <section className="card sim" data-testid="simulate-card" aria-labelledby="s-h">
      <div className="sim-body">
        <h2 id="s-h">Simular a prova</h2>
        <p>Um exercício sorteado de cada nível, na ordem, como na prova de verdade.</p>
        <div className="facts">
          <span>4 níveis</span>
          <span>relógio de {EXAM_DURATION_MS / 3600000}h</span>
          <span>dicas liberadas</span>
        </div>
      </div>
      {ongoing ? (
        <a className="btn" data-testid="continue-random" href="#/aleatorio">
          Continuar simulado · nível {session.currentLevel} · {formatClock(remainingMs(session, now))} restantes
        </a>
      ) : (
        <a className="btn" data-testid="start-simulado" href="#/aleatorio">
          Começar simulado
        </a>
      )}
    </section>
  );
}

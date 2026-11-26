import type { CSSProperties } from 'react';
import type { LoadedExercise, Level } from '../../engine/types';
import { LEVEL_INFO } from '../../content/levels';
import type { ExerciseStatus } from '../../state/progress';
import { readiness } from '../prepText';
import { levelCounts, type Filter } from './homeModel';
import { CheckIcon, DiceIcon } from './icons';

const SHOWN = 6;
const STATUS_TEXT: Record<ExerciseStatus, string> = { passed: 'passou', tried: 'em andamento', untried: 'ainda não fez' };

export function levelStyle(level: Level): CSSProperties {
  return { '--c': `var(--l${level})`, '--cs': `var(--l${level}s)` } as CSSProperties;
}

export function LevelSection(props: {
  level: Level;
  /** Todos os exercícios do nível (para os números e o sorteio). */
  all: LoadedExercise[];
  /** Os que passam na busca e no filtro. */
  visible: LoadedExercise[];
  progress: Record<string, ExerciseStatus>;
  /** Busca ou filtro ativos: mostra tudo e ajusta o estado vazio. */
  narrowed: boolean;
  query: string;
  filter: Filter;
  expanded: boolean;
  onExpand(): void;
  onOpen(id: string): void;
  onDraw(): void;
  onClearQuery(): void;
}) {
  const { level, all, visible, progress, narrowed, query, filter, expanded } = props;
  const info = LEVEL_INFO[level];
  const counts = levelCounts(all.map((e) => e.id), progress);
  const open = expanded || narrowed;
  const shown = open ? visible : visible.slice(0, SHOWN);
  const pct = (n: number) => (counts.total === 0 ? 0 : (100 * n) / counts.total);

  let empty: JSX.Element | null = null;
  if (shown.length === 0) {
    if (query.trim() !== '') {
      empty = (
        <p className="empty">
          Nenhum exercício com “{query.trim()}”.{' '}
          <button type="button" className="more" onClick={props.onClearQuery}>
            limpar busca
          </button>
        </p>
      );
    } else if (all.length === 0) {
      empty = <p className="empty">Exercícios chegando em breve.</p>;
    } else if (filter === 'passed') {
      empty = <p className="empty">Você ainda não passou em nenhum deste nível.</p>;
    } else {
      empty = <p className="empty">Você já passou em todos deste nível.</p>;
    }
  }

  return (
    <section className="lvl" id={`nivel-${level}`} data-testid={`level-${level}`} style={levelStyle(level)} aria-labelledby={`lh${level}`}>
      <div className="lvl-head">
        <span className="badge" aria-hidden="true">{level}</span>
        <div className="lvl-title">
          <h2 id={`lh${level}`}>Nível {level} · {info.title}</h2>
          <p>{info.subtitle}</p>
        </div>
        <div className="lvl-prog">
          <span>
            <b>{counts.passed} de {counts.total}</b> já passaram · {readiness(counts.passed, counts.total)}
          </span>
          <span className="bar" aria-hidden="true">
            <i className="p" style={{ width: `${pct(counts.passed)}%` }} />
            <i className="t" style={{ width: `${pct(counts.tried)}%` }} />
          </span>
        </div>
        <button type="button" className="draw" data-testid={`draw-${level}`} onClick={props.onDraw} disabled={all.length === 0}>
          <DiceIcon />Sortear um do nível {level}
        </button>
      </div>
      {empty ?? (
        <div className="ex-grid">
          {shown.map((e) => {
            const status = progress[e.id] ?? 'untried';
            return (
              <button
                key={e.id}
                type="button"
                className={`ex ${status}`}
                data-testid={`ex-${e.id}`}
                data-status={status}
                onClick={() => props.onOpen(e.id)}
              >
                <span className="st" aria-hidden="true">{status === 'passed' && <CheckIcon />}</span>
                <span className="nm">
                  <span>{e.id}</span>
                  <span className="k">{e.kind === 'program' ? 'programa' : 'função'}</span>
                </span>
                <span className="ds">{e.summary}</span>
                <span className="sr-only">{STATUS_TEXT[status]}</span>
              </button>
            );
          })}
        </div>
      )}
      {!open && visible.length > SHOWN && (
        <button type="button" className="more" data-testid={`show-all-${level}`} onClick={props.onExpand}>
          Ver todos os {visible.length} do nível {level}
        </button>
      )}
    </section>
  );
}

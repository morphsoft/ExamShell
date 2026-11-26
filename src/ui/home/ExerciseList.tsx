import { useMemo, useState } from 'react';
import { byLevel, getExercise, loadExercises } from '../../content/loadExercises';
import type { Level } from '../../engine/types';
import { getProgress } from '../../state/progress';
import { ExerciseDetail } from './ExerciseDetail';
import { LevelSection } from './LevelSection';
import { drawFromLevel, matchesFilter, matchesQuery, type Filter } from './homeModel';
import { SearchIcon } from './icons';

const LEVELS: Level[] = [1, 2, 3, 4];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'todo', label: 'Faltam' },
  { id: 'passed', label: 'Já passei' },
];

/** O detalhe é controlado por quem usa: o início também o abre pelo cartão "continuar". */
export type DetailRequest = { id: string; drawn: boolean };

export function ExerciseList(props: { detail: DetailRequest | null; onDetail(r: DetailRequest | null): void }) {
  const { detail, onDetail } = props;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const groups = useMemo(() => byLevel(loadExercises()), []);
  const progress = getProgress();
  const narrowed = query.trim() !== '' || filter !== 'all';

  const draw = (level: Level, exclude?: string) => {
    const id = drawFromLevel(groups[level].map((e) => e.id), progress, Math.random, exclude);
    if (id !== null) onDetail({ id, drawn: true });
  };

  const shown = detail ? getExercise(detail.id) : undefined;

  return (
    <div className="home-list">
      <div className="tools">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            data-testid="search"
            placeholder="Buscar exercício"
            aria-label="Buscar exercício"
            autoComplete="off"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
          />
        </label>
        <span className="seg" role="group" aria-label="Mostrar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              data-testid={`filter-${f.id}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </span>
      </div>
      <div className="levels-stack">
        {LEVELS.map((level) => (
          <LevelSection
            key={level}
            level={level}
            all={groups[level]}
            visible={groups[level].filter(
              (e) => matchesQuery(e, query) && matchesFilter(progress[e.id] ?? 'untried', filter),
            )}
            progress={progress}
            narrowed={narrowed}
            query={query}
            filter={filter}
            expanded={expanded[level] === true}
            onExpand={() => setExpanded((x) => ({ ...x, [level]: true }))}
            onOpen={(id) => onDetail({ id, drawn: false })}
            onDraw={() => draw(level)}
            onClearQuery={() => setQuery('')}
          />
        ))}
      </div>
      {detail && shown && (
        <ExerciseDetail
          exercise={shown}
          status={progress[shown.id] ?? 'untried'}
          drawn={detail.drawn}
          onClose={() => onDetail(null)}
          onRedraw={() => draw(shown.level, shown.id)}
        />
      )}
    </div>
  );
}

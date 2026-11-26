import { LEVEL_INFO } from '../../content/levels';
import type { Level } from '../../engine/types';
import type { ExerciseStatus } from '../../state/progress';
import { readiness } from '../prepText';
import { levelCounts } from './homeModel';
import { levelStyle } from './LevelSection';

const LEVELS: Level[] = [1, 2, 3, 4];

/** Rola até a seção do nível, sem animação se o visitante pediu menos movimento. */
function jumpTo(level: Level) {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(`nivel-${level}`)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

export function PrepList({ idsByLevel, progress }: { idsByLevel: Record<Level, string[]>; progress: Record<string, ExerciseStatus> }) {
  return (
    <section className="prep" aria-labelledby="p-h">
      <h2 id="p-h">Sua preparação</h2>
      <div className="prep-grid">
        {LEVELS.map((level) => {
          const c = levelCounts(idsByLevel[level], progress);
          const pct = (n: number) => (c.total === 0 ? 0 : (100 * n) / c.total);
          return (
            <button
              key={level}
              type="button"
              className="prep-item"
              data-testid={`prep-${level}`}
              style={levelStyle(level)}
              title={LEVEL_INFO[level].title}
              onClick={() => jumpTo(level)}
            >
              <span className="lv">
                Nível {level}
                <span>{c.passed}/{c.total}</span>
              </span>
              <span className="bar" aria-hidden="true">
                <i className="p" style={{ width: `${pct(c.passed)}%` }} />
                <i className="t" style={{ width: `${pct(c.tried)}%` }} />
              </span>
              <small>{readiness(c.passed, c.total)}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

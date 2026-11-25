import { byLevel, loadExercises } from '../../content/loadExercises';
import { RANK02_CATALOG } from '../../content/rank02Catalog';
import { getProgress, type ExerciseStatus } from '../../state/progress';
import type { Level } from '../../engine/types';
import { StatusBar } from '../components/StatusBar';
import { TopBar } from '../components/TopBar';

const LEVELS: Level[] = [1, 2, 3, 4];
const MARK: Record<ExerciseStatus, { glyph: string; label: string }> = {
  untried: { glyph: '·', label: 'não tentado' },
  tried: { glyph: '~', label: 'tentado' },
  passed: { glyph: '✓', label: 'passou' },
};

export function PracticeList() {
  const progress = getProgress();
  const groups = byLevel(loadExercises());
  return (
    <>
      <TopBar left="examshell · rank 02" right={<a href="#/">início</a>} />
      <main className="page">
        <h1>Treino livre</h1>
        <p className="lead">
          <span className="mark-passed">✓</span> passou · <span className="mark-tried">~</span> tentado · · não tentado
        </p>
        {LEVELS.map((level) => {
          const total = RANK02_CATALOG.filter((e) => e.level === level).length;
          const passed = groups[level].filter((e) => progress[e.id] === 'passed').length;
          return (
            <section key={level} className="level">
              <h2>
                Nível {level} <span className="k">{passed}/{total}</span>
              </h2>
              {groups[level].length === 0 ? (
                <p className="muted">Exercícios chegando em breve.</p>
              ) : (
                <ul className="exlist">
                  {groups[level].map((ex) => {
                    const status = progress[ex.id] ?? 'untried';
                    const m = MARK[status];
                    return (
                      <li key={ex.id}>
                        <a
                          className="ex"
                          href={`#/treino/${ex.id}`}
                          data-testid={`ex-${ex.id}`}
                          data-status={status}
                        >
                          <span className={`mark mark-${status}`} aria-hidden="true">
                            {m.glyph}
                          </span>
                          <span className="ex-id">{ex.id}</span>
                          <span className="sr-only">{m.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </main>
      <StatusBar
        items={[
          { label: 'modo', value: 'treino' },
          { label: 'passou', value: String(Object.values(progress).filter((s) => s === 'passed').length) },
        ]}
      />
    </>
  );
}

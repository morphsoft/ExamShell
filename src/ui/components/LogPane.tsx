import { useEffect, useRef, useState, type ReactNode } from 'react';
import { catE } from '../../engine/compare';
import type { runOnce } from '../../engine/grade';
import type { LoadedExercise, RunResult, SourceLine } from '../../engine/types';
import { SCRATCH_TAB } from './EditorTabs';
import {
  crashText,
  FailureView,
  gradeTitle,
  ResultCard,
  TIMEOUT_TEXT,
  TRUNCATED_TEXT,
  type GradeEntry,
  type PassView,
} from './ResultCard';

export type RunOutcome = Awaited<ReturnType<typeof runOnce>>;

/** Uma linha do mini terminal: uma execução do "rodar" ou um grademe. */
export type LogEntry =
  | { kind: 'run'; id: number; command: string; state: 'running' | 'done'; outcome?: RunOutcome; error?: string }
  | GradeEntry;

function RunOutput({ run, line }: { run: RunResult; line?: SourceLine }) {
  const empty = run.stdout === '';
  return (
    <>
      {(!empty || run.outcome === 'exit') && (
        <pre className="out">{empty ? <span className="muted">(nenhuma saída)</span> : catE(run.stdout)}</pre>
      )}
      {run.truncated && <p className="muted">{TRUNCATED_TEXT}</p>}
      {run.outcome === 'crash' && <p className="fail-text">{crashText(line)}</p>}
      {run.outcome === 'timeout' && <p className="fail-text">{TIMEOUT_TEXT}</p>}
      {run.outcome === 'exit' && run.exitCode !== undefined && run.exitCode !== 0 && (
        <p className="muted">(código de saída {run.exitCode})</p>
      )}
    </>
  );
}

function Prompt({ children }: { children: ReactNode }) {
  return (
    <p className="cmdline">
      <span className="prompt">examshell&gt;</span> {children}
    </p>
  );
}

export function LogPane({
  exercise,
  entries,
  onHint,
  afterPass,
}: {
  exercise: LoadedExercise;
  entries: LogEntry[];
  onHint(entryId: number): void;
  afterPass(): PassView;
}) {
  const end = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    if (entries.length > 0) end.current?.scrollIntoView({ block: 'nearest' });
  }, [entries]);

  const lastGrade = [...entries].reverse().find((e) => e.kind === 'grade');

  return (
    <div className="log" data-testid="log" role="log" aria-label="log do terminal" tabIndex={0}>
      <p className="log-intro">
        {exercise.kind === 'function'
          ? `# escreva a função no editor. "rodar" usa o seu main da aba ${SCRATCH_TAB.label}; "grademe" corrige com o main de teste do site.`
          : '# escreva o programa no editor. "rodar" executa com os argumentos que você digitar; "grademe" corrige com os testes da prova.'}
      </p>
      {entries.map((e) => {
        if (e.kind === 'run') {
          return (
            <div key={e.id} className="entry" data-testid="run-result" data-state={e.state}>
              <Prompt>{e.command}</Prompt>
              {e.state === 'running' && <p className="muted">compilando e rodando…</p>}
              {e.error !== undefined && <p className="fail-text">{e.error}</p>}
              {e.outcome?.failure && (
                <div className="run-fail">
                  <FailureView ex={exercise} failure={e.outcome.failure} total={0} />
                </div>
              )}
              {e.outcome?.run && <RunOutput run={e.outcome.run} line={e.outcome.line} />}
            </div>
          );
        }
        const latest = e === lastGrade;
        const collapsed = !latest && e.state === 'done' && !opened.has(e.id);
        return (
          <div key={e.id} className="entry">
            <Prompt>grademe</Prompt>
            {collapsed ? (
              <button
                type="button"
                className="old"
                data-testid="older-grade"
                aria-expanded="false"
                onClick={() => setOpened((s) => new Set(s).add(e.id))}
              >
                ▸ grademe anterior: {gradeTitle(e)}
              </button>
            ) : (
              <ResultCard
                exercise={exercise}
                entry={e}
                latest={latest}
                afterPass={afterPass}
                onHint={() => onHint(e.id)}
              />
            )}
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

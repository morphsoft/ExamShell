import { useEffect, useRef, type ReactNode } from 'react';
import { catE } from '../../engine/compare';
import { explainClangError } from '../../engine/clangErrors';
import { TIMEOUT_MS, type runOnce } from '../../engine/grade';
import { formatArgs } from '../../engine/parseArgs';
import type { Failure, GradeResult, LoadedExercise, RunResult, SourceLine, TestCase } from '../../engine/types';
import { hintsFor } from '../../hints/hintsFor';
import { SCRATCH_TAB } from './EditorTabs';
import { HintBlock } from './HintBlock';

export type RunOutcome = Awaited<ReturnType<typeof runOnce>>;

/** Uma linha do mini terminal: uma execução do "rodar" ou um grademe. */
export type LogEntry =
  | { kind: 'run'; id: number; command: string; state: 'running' | 'done'; outcome?: RunOutcome; error?: string }
  | {
      kind: 'grade';
      id: number;
      state: 'running' | 'done';
      done: number;
      total: number;
      result?: GradeResult;
      error?: string;
      hintsShown: number;
    };

const TIMEOUT_TEXT = `tempo esgotado (${TIMEOUT_MS / 1000} s)`;
const TRUNCATED_TEXT = '(saída cortada em 64 KB)';

/** A linha só aparece quando o motor a acha num arquivo do cadete; senão fica o aviso de sempre. */
const crashText = (line?: SourceLine) =>
  'o programa travou (segfault)' + (line ? ` na linha ${line.line} de ${line.file}` : '');

/** O comando do teste, pronto para colar no "rodar"; nos exercícios de função, a chamada (`display`). */
function testCommand(ex: LoadedExercise, test: TestCase): string {
  if (ex.kind === 'function' && test.display) return test.display;
  const args = formatArgs(test.args);
  return `./${ex.id}${args ? ' ' + args : ''}`;
}

function codeList(names: string[]): ReactNode {
  const items = names.map((n) => <code key={n}>`{n}`</code>);
  if (items.length === 1) return items[0];
  return (
    <>
      {items.slice(0, -1).map((item, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {item}
        </span>
      ))}{' '}
      e {items[items.length - 1]}
    </>
  );
}

/** A saída em `cat -e`, com o primeiro caractere diferente destacado. */
function CatText({ text, diffIndex }: { text: string; diffIndex?: number }) {
  if (diffIndex === undefined) return <>{catE(text)}</>;
  const before = catE(text.slice(0, diffIndex));
  if (diffIndex >= text.length) {
    return (
      <>
        {before}
        <mark className="diff diff-end" title="a saída termina aqui">
          {' '}
        </mark>
        {text === '' && <span className="muted"> (nenhuma saída)</span>}
      </>
    );
  }
  return (
    <>
      {before}
      <mark className="diff">{catE(text[diffIndex])}</mark>
      {catE(text.slice(diffIndex + 1))}
    </>
  );
}

function FailHead({ children }: { children: ReactNode }) {
  return <p className="fail-head">✗ {children}</p>;
}

function TestHead({ ex, test, index, total }: { ex: LoadedExercise; test: TestCase; index: number; total: number }) {
  return (
    <FailHead>
      teste {index + 1}/{total} <span className="fail-cmd">{testCommand(ex, test)}</span>
    </FailHead>
  );
}

function Stderr({ stderr }: { stderr: string }) {
  const explained = explainClangError(stderr);
  return (
    <>
      {stderr.trim() !== '' && <pre className="stderr">{stderr.replace(/\s+$/, '')}</pre>}
      {explained.map((text) => (
        <p key={text} className="explain">
          → {text}
        </p>
      ))}
    </>
  );
}

function FailureView({ ex, failure, total }: { ex: LoadedExercise; failure: Failure; total: number }) {
  switch (failure.kind) {
    case 'wrong-output':
      return (
        <>
          <TestHead ex={ex} test={failure.test} index={failure.index} total={total} />
          <div className="io">
            <span className="k">esperado:</span>
            <pre>
              <CatText text={failure.expected} diffIndex={failure.diffIndex} />
            </pre>
            <span className="k">recebido:</span>
            <pre>
              <CatText text={failure.actual} diffIndex={failure.diffIndex} />
            </pre>
          </div>
          {failure.truncated && <p className="muted">{TRUNCATED_TEXT}</p>}
        </>
      );
    case 'crash':
      return (
        <>
          <TestHead ex={ex} test={failure.test} index={failure.index} total={total} />
          <p className="fail-text">{crashText(failure.line)}</p>
        </>
      );
    case 'timeout':
      return (
        <>
          <TestHead ex={ex} test={failure.test} index={failure.index} total={total} />
          <p className="fail-text">{TIMEOUT_TEXT}</p>
        </>
      );
    case 'compile':
      return (
        <>
          <FailHead>erro de compilação</FailHead>
          <Stderr stderr={failure.stderr} />
        </>
      );
    case 'forbidden': {
      const many = failure.functions.length > 1;
      return (
        <FailHead>
          você usou {codeList(failure.functions)}, que não {many ? 'estão permitidas' : 'está permitida'} aqui
        </FailHead>
      );
    }
    case 'link':
      if (failure.reason === 'duplicate-main') {
        return <FailHead>neste exercício não se entrega main; use a aba {SCRATCH_TAB.label} para testar</FailHead>;
      }
      if (failure.reason === 'missing-symbol' && failure.symbol === 'main') {
        return (
          <>
            <FailHead>não encontrei a função main — todo programa precisa dela para começar</FailHead>
            <Stderr stderr={failure.stderr} />
          </>
        );
      }
      if (failure.reason === 'missing-symbol') {
        return (
          <>
            <FailHead>
              não encontrei {failure.symbol ? <code>`{failure.symbol}`</code> : 'uma função'} na hora de montar o
              programa
            </FailHead>
            <Stderr stderr={failure.stderr} />
          </>
        );
      }
      return (
        <>
          <FailHead>
            {/wasm-ld/.test(failure.stderr) ? 'não consegui montar o programa' : 'erro de compilação'}
          </FailHead>
          <Stderr stderr={failure.stderr} />
        </>
      );
  }
}

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

function GradeView({ ex, entry }: { ex: LoadedExercise; entry: Extract<LogEntry, { kind: 'grade' }> }) {
  const { result } = entry;
  let body: ReactNode;
  let tone = '';
  if (entry.state === 'running') {
    body = (
      <p className="muted">
        corrigindo… {entry.done}/{entry.total}
      </p>
    );
  } else if (entry.error !== undefined) {
    tone = 'grade-fail';
    body = <FailHead>algo deu errado ao corrigir ({entry.error}). Tente de novo.</FailHead>;
  } else if (result && result.failure === null) {
    tone = 'grade-ok';
    body = (
      <p className="ok-line">
        ✓ passou nos {result.total} testes <span className="muted">· mandou bem!</span>
      </p>
    );
  } else if (result?.failure) {
    tone = 'grade-fail';
    body = <FailureView ex={ex} failure={result.failure} total={result.total} />;
  }
  return (
    <div className={`grade-result ${tone}`} data-testid="grade-result" data-state={entry.state}>
      {body}
    </div>
  );
}

export function LogPane({
  exercise,
  entries,
  onHint,
}: {
  exercise: LoadedExercise;
  entries: LogEntry[];
  onHint(entryId: number): void;
}) {
  const end = useRef<HTMLDivElement>(null);
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
      {entries.map((e) =>
        e.kind === 'run' ? (
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
        ) : (
          <div key={e.id} className="entry">
            <Prompt>grademe</Prompt>
            <GradeView ex={exercise} entry={e} />
            {e.result?.failure && (
              <HintBlock
                ladder={hintsFor(e.result.failure, exercise)}
                shown={e.hintsShown}
                onAsk={e === lastGrade ? () => onHint(e.id) : undefined}
              />
            )}
          </div>
        ),
      )}
      <div ref={end} />
    </div>
  );
}

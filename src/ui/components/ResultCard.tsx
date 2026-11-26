import { createContext, useContext, useState, type ReactNode } from 'react';
import { catE } from '../../engine/compare';
import { explainClangError } from '../../engine/clangErrors';
import { TIMEOUT_MS } from '../../engine/grade';
import { formatArgs } from '../../engine/parseArgs';
import type { Failure, GradeResult, LoadedExercise, SourceLine, TestCase } from '../../engine/types';
import { hintsFor } from '../../hints/hintsFor';
import { testDots, type Dot } from '../prepText';
import { SCRATCH_TAB } from './EditorTabs';
import { Toast } from './Toast';

export const TIMEOUT_TEXT = `tempo esgotado (${TIMEOUT_MS / 1000} s)`;
export const TRUNCATED_TEXT = '(saída cortada em 64 KB)';

/** A linha só aparece quando o motor a acha num arquivo do cadete; senão fica o aviso de sempre. */
export const crashText = (line?: SourceLine) =>
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

/** Dentro do cartão o título já leva o ✗; nas execuções do "rodar" cada cabeça leva o seu. */
const InCard = createContext(false);

function FailHead({ children }: { children: ReactNode }) {
  const inCard = useContext(InCard);
  return (
    <p className="fail-head">
      {!inCard && '✗ '}
      {children}
    </p>
  );
}

function TestHead({ ex, test, index, total }: { ex: LoadedExercise; test: TestCase; index: number; total: number }) {
  if (useContext(InCard)) return <p className="cmd">{testCommand(ex, test)}</p>;
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

export function FailureView({ ex, failure, total }: { ex: LoadedExercise; failure: Failure; total: number }) {
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


export interface PassAction {
  label: string;
  testId: string;
  primary?: boolean;
  href?: string;
  onClick?(): void;
}
export interface PassView {
  message: string;
  actions: PassAction[];
}

/** O que o log guarda de um grademe. */
export interface GradeEntry {
  kind: 'grade';
  id: number;
  state: 'running' | 'done';
  done: number;
  total: number;
  result?: GradeResult;
  error?: string;
  hintsShown: number;
}

/** Título do cartão (e do "grademe anterior"). */
export function gradeTitle(entry: GradeEntry): string {
  if (entry.state === 'running') return `corrigindo… ${entry.done} de ${entry.total}`;
  if (entry.error !== undefined) return '✗ Algo deu errado ao corrigir';
  const r = entry.result;
  if (!r) return '';
  const f = r.failure;
  if (f === null) return `✓ Passou nos ${r.total} testes`;
  switch (f.kind) {
    case 'wrong-output':
    case 'crash':
    case 'timeout':
      return `✗ Falhou no teste ${f.index + 1} de ${r.total}`;
    case 'compile':
      return '✗ Não compilou';
    case 'forbidden':
      return '✗ Usou função proibida';
    case 'link':
      return '✗ Não deu para montar o programa';
  }
}

function Dots({ states }: { states: Dot[] }) {
  return (
    <span className="dots" data-testid="test-dots" aria-hidden="true">
      {states.map((d, i) => (
        <i key={i} className={d} data-state={d} />
      ))}
    </span>
  );
}

function Actions({ actions }: { actions: PassAction[] }) {
  return (
    <div className="next">
      {actions.map((a) => {
        const cls = `btn${a.primary ? ' primary' : ''}`;
        return a.href !== undefined ? (
          <a key={a.testId} className={cls} href={a.href} data-testid={a.testId} onClick={a.onClick}>
            {a.label}
          </a>
        ) : (
          <button key={a.testId} type="button" className={cls} data-testid={a.testId} onClick={a.onClick}>
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

/** Só existe quando o cartão de "passou" aparece: o `afterPass` roda uma vez, já com o progresso novo. */
function PassBody({ afterPass }: { afterPass: () => PassView }) {
  const [view] = useState(afterPass);
  return (
    <>
      <p className="pass-msg">{view.message}</p>
      <Actions actions={view.actions} />
      <Toast message={view.message} />
    </>
  );
}

/** Faixa de dicas: as já reveladas e, só no grademe mais recente, o botão da próxima. */
function HintStrip({
  failure,
  ex,
  shown,
  onAsk,
}: {
  failure: Failure;
  ex: LoadedExercise;
  shown: number;
  onAsk?: () => void;
}) {
  const ladder = hintsFor(failure, ex);
  if (shown === 0 && !onAsk) return null;
  return (
    <div className="hint">
      {ladder.slice(0, shown).map((text, i) => (
        <p key={i}>
          <b>
            Dica {i + 1} de {ladder.length}
          </b>{' '}
          · {text}
        </p>
      ))}
      {onAsk && shown >= ladder.length && (
        <p className="hint-done">Essas são todas as dicas. O resto é com você, e você consegue!</p>
      )}
      {onAsk && shown < ladder.length && (
        <button type="button" className="btn" data-testid="hint" onClick={onAsk}>
          {shown === 0 ? 'Pedir dica' : `Próxima dica (${shown + 1}/${ladder.length})`}
        </button>
      )}
    </div>
  );
}

/**
 * O resultado de um grademe: título, um ponto por teste, onde quebrou, dicas e, ao passar, o progresso.
 * `latest` é o grademe mais recente: só ele pede dica e mostra o aviso de "passou".
 */
export function ResultCard({
  exercise,
  entry,
  latest,
  afterPass,
  onHint,
}: {
  exercise: LoadedExercise;
  entry: GradeEntry;
  latest: boolean;
  afterPass: () => PassView;
  onHint: () => void;
}) {
  const { result } = entry;
  const ok = entry.state === 'done' && entry.error === undefined && result !== undefined;
  const failure = ok ? result.failure : null;
  const passed = ok && result.failure === null;
  const state = entry.state === 'running' ? 'running' : passed ? 'pass' : 'fail';
  let dots: Dot[] = [];
  if (entry.state === 'running') {
    dots = Array.from({ length: entry.total }, (_, i): Dot => (i < entry.done ? 'ok' : 'skip'));
  } else if (ok) {
    dots = testDots(result);
  }
  return (
    <div className={`result ${state}`} data-testid="grade-result" data-state={entry.state}>
      <div className="head">
        <span className="title">{gradeTitle(entry)}</span>
        {dots.length > 0 && <Dots states={dots} />}
      </div>
      {entry.error !== undefined && <p className="body fail-text">{entry.error}. Tente de novo.</p>}
      {failure && (
        <div className="body">
          <InCard.Provider value>
            <FailureView ex={exercise} failure={failure} total={result!.total} />
          </InCard.Provider>
        </div>
      )}
      {passed && latest && <PassBody afterPass={afterPass} />}
      {failure && (
        <HintStrip failure={failure} ex={exercise} shown={entry.hintsShown} onAsk={latest ? onHint : undefined} />
      )}
    </div>
  );
}

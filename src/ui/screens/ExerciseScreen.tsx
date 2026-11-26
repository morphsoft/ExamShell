import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { grade, runOnce } from '../../engine/grade';
import { parseArgs, ParseArgsError } from '../../engine/parseArgs';
import type { GradeResult, LoadedExercise, SourceFiles } from '../../engine/types';
import { recordGrade } from '../../state/activity';
import { getSettings, markAttempt, saveSettings, type Settings } from '../../state/progress';
import type { CodeEditorHandle } from '../components/CodeEditor';
import { CompilerLoader } from '../components/CompilerLoader';
import { EDITOR_PANEL_ID, EditorTabs, providedTab, SCRATCH_TAB, tabId, type EditorTab } from '../components/EditorTabs';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MobileTabs, type MobileTab } from '../components/MobileTabs';
import { LogPane, type LogEntry } from '../components/LogPane';
import type { PassView } from '../components/ResultCard';
import { RunBar, shortcutLabels } from '../components/RunBar';
import { SubjectPane } from '../components/SubjectPane';
import { SymbolBar } from '../components/SymbolBar';
import { ExerciseTopBar, type ExerciseStatus } from '../components/ExerciseTopBar';
import { useEngine } from '../engineContext';
import { useIsMobile } from '../useIsMobile';
import { useKeyboardInset } from '../useKeyboardInset';

export type { PassAction, PassView } from '../components/ResultCard';

export interface ExerciseScreenProps {
  exercise: LoadedExercise;
  mode: 'practice' | 'random';
  initialFiles: SourceFiles;
  /**
   * Os arquivos do exercício, com debounce de 500 ms. Pode ser chamada mais uma vez quando a tela
   * desmonta (o rascunho pendente é gravado), já depois de o pai trocar de exercício: o pai deve
   * fixar o id do exercício na própria closure, não ler o "exercício atual".
   */
  onFilesChange(files: SourceFiles): void;
  /** Só é chamada se a tela ainda estiver montada quando o grademe termina. */
  onGraded(r: GradeResult): void;
  /** Chamada a cada dica pedida (o simulado conta as dicas). */
  onHintUsed?(): void;
  /** Chamada ao montar o cartão de "passou", depois de `onGraded`: já vê o progresso novo. */
  afterPass(): PassView;
  /** Para onde o "voltar" do topo leva. */
  backHref: string;
  /** 'nível 1' no treino, 'nível 1 de 4' no simulado. */
  levelLabel: string;
  status: ExerciseStatus;
  /** Barra do simulado, logo abaixo do topo (relógio, trocar, pular, encerrar, aviso de "passou"). */
  sessionBar?: ReactNode;
}

// O CodeMirror vem num pedaço à parte: a home e a lista não precisam dele.
const CodeEditor = lazy(() => import('../components/CodeEditor').then((m) => ({ default: m.CodeEditor })));
const SHORTCUTS = shortcutLabels();

const SAVE_DEBOUNCE_MS = 500;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Tela do exercício. Trocar de exercício recomeça tudo (editor, log, dicas). */
export function ExerciseScreen(props: ExerciseScreenProps) {
  return <Workspace key={props.exercise.id} {...props} />;
}

function Workspace({
  exercise,
  mode,
  initialFiles,
  onFilesChange,
  onGraded,
  onHintUsed,
  afterPass,
  backHref,
  levelLabel,
  status: exerciseStatus,
  sessionBar,
}: ExerciseScreenProps) {
  const { engine, status, progress, error: engineError, lowMemory } = useEngine();
  const isFunction = exercise.kind === 'function';

  const tabs = useMemo<EditorTab[]>(
    () => [
      ...exercise.expectedFiles.map((f) => ({ key: f, label: f })),
      ...Object.keys(exercise.provided ?? {}).map(providedTab),
      ...(isFunction ? [SCRATCH_TAB] : []),
    ],
    [exercise, isFunction],
  );

  // Conteúdo dos arquivos: um ref (o editor muda a cada tecla), não estado.
  const files = useRef<SourceFiles>(
    Object.fromEntries(
      tabs.filter((t) => !t.readOnly).map((t) => [t.key, initialFiles[t.key] ?? exercise.starter?.[t.key] ?? '']),
    ),
  );
  const [active, setActive] = useState(tabs[0].key);
  const [scratchEmpty, setScratchEmpty] = useState(() => (files.current[SCRATCH_TAB.key] ?? '').trim() === '');
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState('');
  const editor = useRef<CodeEditorHandle>(null);
  const isMobile = useIsMobile();
  useKeyboardInset();
  const [mtab, setMtab] = useState<MobileTab>('subject');
  const [resultDot, setResultDot] = useState(false);
  const mtabRef = useRef(mtab);
  mtabRef.current = mtab;
  const selectMtab = (t: MobileTab) => {
    setMtab(t);
    if (t === 'result') setResultDot(false);
  };
  // rodar e grademe levam ao Resultado; se o cadete sair de lá antes de terminar, o ponto avisa quando chegar
  const showResult = () => selectMtab('result');
  const resultArrived = () => {
    if (mtabRef.current !== 'result') setResultDot(true);
  };
  const busyRef = useRef(false); // trava síncrona: um duplo clique não dispara duas execuções
  const nextId = useRef(1);

  // Falso depois que a tela desmonta. Como o Workspace tem key={exercise.id}, trocar de exercício
  // também desmonta: um grademe/rodar que termine depois disso não vale mais para nada.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // As callbacks do pai mais recentes, sem recriar handlers.
  const parent = useRef({ onFilesChange, onGraded, onHintUsed });
  parent.current = { onFilesChange, onGraded, onHintUsed };

  // --- salvar com debounce; o que faltar vai no pagehide ou ao sair da tela
  const saveTimer = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (saveTimer.current === null) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    parent.current.onFilesChange({ ...files.current });
  }, []);
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const onEdit = useCallback((key: string, text: string) => {
    files.current = { ...files.current, [key]: text };
    if (key === SCRATCH_TAB.key) setScratchEmpty(text.trim() === '');
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      parent.current.onFilesChange({ ...files.current });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // --- log
  const append = (entry: LogEntry) => setEntries((es) => [...es, entry]);
  const patch = (id: number, p: Partial<LogEntry>) =>
    setEntries((es) => es.map((e) => (e.id === id ? ({ ...e, ...p } as LogEntry) : e)));

  const begin = (): boolean => {
    if (busyRef.current || engine.status() !== 'ready') return false;
    busyRef.current = true;
    setBusy(true);
    flush();
    return true;
  };
  const end = () => {
    busyRef.current = false;
    setBusy(false);
  };

  const onGrade = async () => {
    if (!begin()) return;
    showResult();
    const id = nextId.current++;
    append({ kind: 'grade', id, state: 'running', done: 0, total: exercise.tests.length, hintsShown: 0 });
    try {
      const result = await grade(exercise, { ...files.current }, engine, {
        onProgress: (done) => alive.current && patch(id, { done }),
      });
      if (!alive.current) return; // a tela fechou: sem tentativa, sem onGraded
      patch(id, { state: 'done', result });
      markAttempt(exercise.id, result.failure === null);
      recordGrade(exercise.id, result, new Date());
      parent.current.onGraded(result);
    } catch (e) {
      if (alive.current) patch(id, { state: 'done', error: errorMessage(e) });
    } finally {
      if (alive.current) {
        end();
        resultArrived();
      }
    }
  };

  const canRun = status === 'ready' && !busy && !(isFunction && scratchEmpty);
  const onRun = async (line: string) => {
    if (isFunction && (files.current[SCRATCH_TAB.key] ?? '').trim() === '') return;
    const trimmed = line.trim();
    const command = `./${exercise.id}${trimmed ? ' ' + trimmed : ''}`;
    let args: string[];
    try {
      args = parseArgs(line);
    } catch (e) {
      if (!(e instanceof ParseArgsError)) throw e;
      showResult();
      append({
        kind: 'run',
        id: nextId.current++,
        command,
        state: 'done',
        error: `${e.message}: feche cada " ou ' que você abriu`,
      });
      return;
    }
    if (!begin()) return;
    showResult();
    const id = nextId.current++;
    append({ kind: 'run', id, command, state: 'running' });
    try {
      const mainC = isFunction ? files.current[SCRATCH_TAB.key] : undefined;
      const outcome = await runOnce(exercise, { ...files.current }, { mainC, args }, engine);
      if (alive.current) patch(id, { state: 'done', outcome });
    } catch (e) {
      if (alive.current)
        patch(id, { state: 'done', error: `algo deu errado ao rodar (${errorMessage(e)}). Tente de novo.` });
    } finally {
      if (alive.current) {
        end();
        resultArrived();
      }
    }
  };

  // Ctrl/Cmd+Enter corrige e Ctrl/Cmd+Shift+Enter roda, de qualquer lugar da tela. Na captura, na window:
  // o CodeMirror liga Mod-Enter a "inserir linha em branco" e não pode ver essa tecla. Os mesmos
  // portões dos botões valem (compilador pronto, sem execução em andamento, rascunho não vazio).
  const shortcut = useRef({ onRun, onGrade, line });
  shortcut.current = { onRun, onGrade, line };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (e.shiftKey) void shortcut.current.onRun(shortcut.current.line);
      else void shortcut.current.onGrade();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const resetFile = (key: string) => editor.current?.setDoc(key, exercise.starter?.[key] ?? '');
  const generateMain = () => {
    if (!exercise.sampleMain) return;
    editor.current?.setDoc(SCRATCH_TAB.key, exercise.sampleMain);
    setActive(SCRATCH_TAB.key);
  };

  const hintsShown = useRef(new Map<number, number>()); // síncrono, como o busyRef
  const onHint = (entryId: number) => {
    const n = hintsShown.current.get(entryId) ?? 0;
    if (n >= 3) return;
    hintsShown.current.set(entryId, n + 1);
    patch(entryId, { hintsShown: n + 1 });
    parent.current.onHintUsed?.();
  };

  // --- settings
  // Sempre sobre as configurações salvas agora: o tema pode ter mudado no botão do topo desde a montagem.
  const updateSettings = (change: Partial<Settings>) => {
    const next = { ...getSettings(), ...change };
    saveSettings(next);
    setSettings(next);
  };
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  const runHint =
    status !== 'ready'
      ? 'o compilador ainda está carregando'
      : busy
        ? 'espere a execução atual terminar'
        : `escreva um main na aba ${SCRATCH_TAB.label} para rodar`;

  return (
    <div className="exercise-screen">
      <ExerciseTopBar
        backHref={backHref}
        level={exercise.level}
        levelLabel={levelLabel}
        id={exercise.id}
        kind={exercise.kind}
        status={exerciseStatus}
      />
      {sessionBar && (
        <div className="session gut">
          <div className="in">{sessionBar}</div>
        </div>
      )}
      <main className="work" data-mtab={isMobile ? mtab : undefined}>
        {isMobile && <MobileTabs tab={mtab} onSelect={selectMtab} dot={resultDot} />}
        <section className="pane pane-subject" aria-label="enunciado">
          <SubjectPane exercise={exercise} lang={settings.subjectLang} onSetLang={(l) => updateSettings({ subjectLang: l })} />
        </section>
        <section className="pane pane-work" aria-label="editor e terminal">
          <EditorTabs
            tabs={tabs}
            active={active}
            onSelect={setActive}
            onReset={resetFile}
            vim={settings.vim}
            onToggleVim={() => updateSettings({ vim: !settings.vim })}
          />
          <div className="editor" role="tabpanel" id={EDITOR_PANEL_ID} aria-labelledby={tabId(activeTab.key)}>
            {/* se o pedaço do editor não baixar, o aviso fica só aqui: o enunciado e o log seguem de pé */}
            <ErrorBoundary variant="inline">
              <Suspense fallback={<p className="editor-loading">carregando o editor…</p>}>
                <CodeEditor
                  ref={editor}
                  docKey={activeTab.key}
                  doc={
                    activeTab.readOnly
                      ? (exercise.provided?.[activeTab.key.slice('provided/'.length)] ?? '')
                      : (files.current[activeTab.key] ?? '')
                  }
                  readOnly={activeTab.readOnly}
                  vim={settings.vim}
                  label={`editor: ${activeTab.label}`}
                  placeholder={
                    activeTab.key === SCRATCH_TAB.key && isFunction
                      ? '// escreva aqui um main que chama a sua função, e use "rodar" para testar'
                      : undefined
                  }
                  onChange={onEdit}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
          <RunBar
            program={`./${exercise.id}`}
            placeholder={isFunction ? 'argumentos (opcional)' : 'ex.: "  lorem ipsum"'}
            line={line}
            onLineChange={setLine}
            shortcutLabel={SHORTCUTS}
            showHelp={isFunction && scratchEmpty}
            onSampleMain={exercise.sampleMain ? generateMain : undefined}
            hideActions={isMobile}
            canRun={canRun}
            canGrade={status === 'ready' && !busy}
            runHint={runHint}
            onRun={onRun}
            onGrade={onGrade}
          />
          <CompilerLoader status={status} progress={progress} error={engineError} lowMemory={lowMemory} onRetry={() => engine.retry()} />
          <LogPane exercise={exercise} entries={entries} onHint={onHint} afterPass={afterPass} />
        </section>
      </main>
      {isMobile && (
        <div className="mfoot" data-testid="mobile-footer" data-mtab={mtab}>
          {mtab === 'code' && <SymbolBar onInsert={(text) => editor.current?.insertText(text)} />}
          <div className="mbar">
            <button
              type="button"
              className="btn run-m"
              data-testid="run"
              disabled={!canRun}
              title={canRun ? undefined : runHint}
              onClick={() => void onRun(line)}
            >
              Rodar
            </button>
            <button type="button" className="btn primary" data-testid="grademe" disabled={status !== 'ready' || busy} onClick={() => void onGrade()}>
              Grademe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { grade, runOnce } from '../../engine/grade';
import { parseArgs, ParseArgsError } from '../../engine/parseArgs';
import type { GradeResult, LoadedExercise, SourceFiles } from '../../engine/types';
import { getSettings, markAttempt, saveSettings, type Settings } from '../../state/progress';
import { CompilerLoader } from '../components/CompilerLoader';
import { EDITOR_PANEL_ID, EditorTabs, SCRATCH_TAB, tabId, type EditorTab } from '../components/EditorTabs';
import { LogPane, type LogEntry } from '../components/LogPane';
import { RunBar } from '../components/RunBar';
import { StatusBar } from '../components/StatusBar';
import { SubjectPane } from '../components/SubjectPane';
import { TopBar } from '../components/TopBar';
import { useEngine } from '../engineContext';

export interface ExerciseScreenProps {
  exercise: LoadedExercise;
  mode: 'practice' | 'random';
  initialFiles: SourceFiles;
  onFilesChange(files: SourceFiles): void;
  onGraded(r: GradeResult): void;
  onHintUsed(): void;
  statusItems: { label: string; value: string }[];
  actions?: ReactNode;
}

// O CodeMirror vem num pedaço à parte: a home e a lista não precisam dele.
const CodeEditor = lazy(() => import('../components/CodeEditor').then((m) => ({ default: m.CodeEditor })));

const SAVE_DEBOUNCE_MS = 500;
const ENGINE_LABEL = { loading: 'carregando', ready: 'pronto', error: 'com erro' } as const;

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
  statusItems,
  actions,
}: ExerciseScreenProps) {
  const { engine, status, progress } = useEngine();
  const isFunction = exercise.kind === 'function';

  const tabs = useMemo<EditorTab[]>(
    () => [...exercise.expectedFiles.map((f) => ({ key: f, label: f })), ...(isFunction ? [SCRATCH_TAB] : [])],
    [exercise, isFunction],
  );

  // Conteúdo dos arquivos: um ref (o editor muda a cada tecla), não estado.
  const files = useRef<SourceFiles>(
    Object.fromEntries(tabs.map((t) => [t.key, initialFiles[t.key] ?? exercise.starter?.[t.key] ?? ''])),
  );
  const [active, setActive] = useState(tabs[0].key);
  const [scratchEmpty, setScratchEmpty] = useState(() => (files.current[SCRATCH_TAB.key] ?? '').trim() === '');
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // trava síncrona: um duplo clique não dispara duas execuções
  const nextId = useRef(1);

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
    const id = nextId.current++;
    append({ kind: 'grade', id, state: 'running', done: 0, total: exercise.tests.length, hintsShown: 0 });
    try {
      const result = await grade(exercise, { ...files.current }, engine, {
        onProgress: (done) => patch(id, { done }),
      });
      patch(id, { state: 'done', result });
      if (mode === 'practice') markAttempt(exercise.id, result.failure === null);
      parent.current.onGraded(result);
    } catch (e) {
      patch(id, { state: 'done', error: errorMessage(e) });
    } finally {
      end();
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
    const id = nextId.current++;
    append({ kind: 'run', id, command, state: 'running' });
    try {
      const mainC = isFunction ? files.current[SCRATCH_TAB.key] : undefined;
      const outcome = await runOnce(exercise, { ...files.current }, { mainC, args }, engine);
      patch(id, { state: 'done', outcome });
    } catch (e) {
      patch(id, { state: 'done', error: `algo deu errado ao rodar (${errorMessage(e)}). Tente de novo.` });
    } finally {
      end();
    }
  };

  const hintsShown = useRef(new Map<number, number>()); // síncrono, como o busyRef
  const onHint = (entryId: number) => {
    const n = hintsShown.current.get(entryId) ?? 0;
    if (n >= 3) return;
    hintsShown.current.set(entryId, n + 1);
    patch(entryId, { hintsShown: n + 1 });
    parent.current.onHintUsed();
  };

  // --- settings
  const updateSettings = (next: Settings) => {
    saveSettings(next);
    setSettings(next);
  };
  const vimToggle = (
    <button
      type="button"
      role="switch"
      aria-checked={settings.vim}
      className="chip"
      data-testid="vim-toggle"
      onClick={() => updateSettings({ ...settings, vim: !settings.vim })}
    >
      vim{' '}
      <span className={settings.vim ? 'switch-on' : 'switch-off'} aria-hidden="true">
        {settings.vim ? 'on' : 'off'}
      </span>
    </button>
  );

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  const runHint =
    status !== 'ready'
      ? 'o compilador ainda está carregando'
      : busy
        ? 'espere a execução atual terminar'
        : `escreva um main na aba ${SCRATCH_TAB.label} para rodar`;

  return (
    <div className="exercise-screen">
      <TopBar left="examshell · rank 02" right={`nível ${exercise.level}/4 · ${exercise.id}`} />
      <main className="exercise">
        <section className="pane pane-subject" aria-label="enunciado">
          <SubjectPane
            subject={exercise.subject}
            lang={settings.subjectLang}
            onToggleLang={() =>
              updateSettings({ ...settings, subjectLang: settings.subjectLang === 'en' ? 'pt' : 'en' })
            }
            actions={actions}
          />
        </section>
        <section className="pane pane-work" aria-label="editor e terminal">
          <EditorTabs tabs={tabs} active={active} onSelect={setActive} extra={vimToggle} />
          <div className="editor" role="tabpanel" id={EDITOR_PANEL_ID} aria-labelledby={tabId(activeTab.key)}>
            <Suspense fallback={<p className="editor-loading">carregando o editor…</p>}>
              <CodeEditor
                docKey={activeTab.key}
                doc={files.current[activeTab.key] ?? ''}
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
          </div>
          <RunBar
            program={`./${exercise.id}`}
            placeholder={isFunction ? 'argumentos (opcional)' : 'ex.: "  lorem ipsum"'}
            canRun={canRun}
            canGrade={status === 'ready' && !busy}
            runHint={runHint}
            onRun={onRun}
            onGrade={onGrade}
          />
          <CompilerLoader status={status} progress={progress} onRetry={() => engine.retry()} />
          <LogPane exercise={exercise} entries={entries} onHint={onHint} />
        </section>
      </main>
      <StatusBar items={[...statusItems, { label: 'compilador', value: ENGINE_LABEL[status] }]} />
    </div>
  );
}

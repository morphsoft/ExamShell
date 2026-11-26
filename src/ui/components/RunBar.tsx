import type { FormEvent } from 'react';

/** `⌘↵`/`⌘⇧↵` no Mac e no iOS; `Ctrl↵`/`Ctrl⇧↵` nos outros. */
export function shortcutLabels(userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return /Mac|iPhone|iPad/.test(userAgent)
    ? { run: '⌘⇧↵', grade: '⌘↵' }
    : { run: 'Ctrl⇧↵', grade: 'Ctrl↵' };
}

/** `$> ./<id> [argumentos] [Rodar] [Grademe]`, mais a ajuda do rascunho nos exercícios de função. */
export function RunBar({
  program,
  placeholder,
  line,
  onLineChange,
  canRun,
  canGrade,
  runHint,
  shortcutLabel,
  showHelp,
  onSampleMain,
  onRun,
  onGrade,
  hideActions = false,
}: {
  program: string;
  placeholder: string;
  line: string;
  onLineChange(v: string): void;
  canRun: boolean;
  canGrade: boolean;
  runHint?: string; // por que "rodar" está desabilitado, quando está
  shortcutLabel: { run: string; grade: string };
  /** exercício de função com o rascunho vazio */
  showHelp: boolean;
  /** só existe se o exercício tem `sampleMain` */
  onSampleMain?: () => void;
  onRun(line: string): void;
  onGrade(): void;
  /** celular: rodar e grademe ficam no rodapé fixo */
  hideActions?: boolean;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canRun) onRun(line);
  };
  return (
    <form className="runbar" onSubmit={submit}>
      <label className="pr" htmlFor="run-args">
        $&gt; {program}
      </label>
      <input
        id="run-args"
        data-testid="run-args"
        value={line}
        onChange={(e) => onLineChange(e.target.value)}
        placeholder={placeholder}
        aria-label={`argumentos para ${program}`}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {!hideActions && (
        <span className="run-desk">
          <button type="submit" className="btn" data-testid="run" disabled={!canRun} title={canRun ? undefined : runHint}>
            Rodar <kbd>{shortcutLabel.run}</kbd>
          </button>
          <button type="button" className="btn primary" data-testid="grademe" disabled={!canGrade} onClick={onGrade}>
            Grademe <kbd>{shortcutLabel.grade}</kbd>
          </button>
        </span>
      )}
      {showHelp && (
        <p className="help" data-testid="run-help">
          para rodar, escreva um main na aba main.c (rascunho)
          {onSampleMain && (
            <>
              {' '}
              <button type="button" className="btn quiet" data-testid="sample-main" onClick={onSampleMain}>
                gerar main de exemplo
              </button>
            </>
          )}
        </p>
      )}
    </form>
  );
}

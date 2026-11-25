import { useState, type FormEvent } from 'react';

/** `examshell> ./<id> [argumentos] [rodar] [grademe]` */
export function RunBar({
  program,
  placeholder,
  canRun,
  canGrade,
  runHint,
  onRun,
  onGrade,
}: {
  program: string;
  placeholder: string;
  canRun: boolean;
  canGrade: boolean;
  runHint?: string; // por que "rodar" está desabilitado, quando está
  onRun(line: string): void;
  onGrade(): void;
}) {
  const [line, setLine] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canRun) onRun(line);
  };
  return (
    <form className="runbar" onSubmit={submit}>
      <label className="runbar-cmd" htmlFor="run-args">
        <span className="prompt">examshell&gt;</span> {program}
      </label>
      <input
        id="run-args"
        className="runbar-args"
        data-testid="run-args"
        value={line}
        onChange={(e) => setLine(e.target.value)}
        placeholder={placeholder}
        aria-label={`argumentos para ${program}`}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <span className="runbar-buttons">
        <button type="submit" className="btn" data-testid="run" disabled={!canRun} title={canRun ? undefined : runHint}>
          rodar
        </button>
        <button type="button" className="btn btn-primary" data-testid="grademe" disabled={!canGrade} onClick={onGrade}>
          grademe
        </button>
      </span>
    </form>
  );
}

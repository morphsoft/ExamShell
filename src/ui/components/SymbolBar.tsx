export const SYMBOLS: readonly string[] = ['{', '}', '(', ')', '[', ']', ';', '*', '&', "'", '"', '\\', '|', '<', '\t'];

/**
 * Símbolos de C que o teclado do celular esconde. Os botões não tomam o foco (nem no toque nem no mouse):
 * o editor continua focado e o teclado continua aberto.
 */
export function SymbolBar({ onInsert }: { onInsert(text: string): void }) {
  const keep = (e: { preventDefault(): void }) => e.preventDefault();
  return (
    <div className="mkeys" data-testid="symbol-bar" role="group" aria-label="Símbolos">
      {SYMBOLS.map((s) => (
        <button
          key={s}
          type="button"
          tabIndex={-1}
          data-sym={s}
          className={s === '\t' ? 'w2' : undefined}
          aria-label={s === '\t' ? 'tab' : undefined}
          onPointerDown={keep}
          onMouseDown={keep}
          onClick={() => onInsert(s)}
        >
          {s === '\t' ? 'tab ⇥' : s}
        </button>
      ))}
    </div>
  );
}

import type { HintLadder } from '../../engine/types';

/**
 * As dicas já reveladas (`dica k/3 · …`), em âmbar. Com `onAsk`, mostra o botão "pedir dica",
 * que revela o próximo degrau e fica desabilitado no último.
 */
export function HintBlock({ ladder, shown, onAsk }: { ladder: HintLadder; shown: number; onAsk?: () => void }) {
  if (shown === 0 && !onAsk) return null;
  return (
    <div className="hint-block">
      {ladder.slice(0, shown).map((text, i) => (
        <p key={i} className="hint-line">
          <span className="hint-step">
            dica {i + 1}/{ladder.length}
          </span>{' '}
          · {text}
        </p>
      ))}
      {onAsk && shown >= ladder.length && (
        <p className="hint-done">essas são todas as dicas. o resto é com você, e você consegue!</p>
      )}
      {onAsk && (
        <button
          type="button"
          className="btn btn-hint"
          data-testid="hint"
          disabled={shown >= ladder.length}
          onClick={onAsk}
        >
          pedir dica
        </button>
      )}
    </div>
  );
}

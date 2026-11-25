import type { EngineStatus, LoadProgress } from '../../engine/browserEngine';
import { loadPercent } from '../engineContext';

export function CompilerLoader({
  status,
  progress,
  error,
  onRetry,
}: {
  status: EngineStatus;
  progress: LoadProgress | null;
  /** O motivo da falha, quando `status` é 'error'. */
  error?: string | null;
  onRetry(): void;
}) {
  if (status === 'ready') return null;

  if (status === 'error') {
    return (
      <div className="loader loader-error" data-testid="compiler-loader" role="alert">
        <span>Não consegui baixar o compilador. Verifique a conexão e tente de novo.</span>
        <button type="button" className="btn" data-testid="compiler-retry" onClick={onRetry}>
          tentar de novo
        </button>
        <span className="loader-help">Se tentar de novo não resolver, recarregue a página.</span>
        {error && (
          <details className="loader-details">
            <summary>detalhes do erro</summary>
            <pre>{error}</pre>
          </details>
        )}
      </div>
    );
  }

  const pct = loadPercent(progress);
  // do cache (ou já baixado), o que falta é só preparar o compilador
  const preparing = progress !== null && (progress.fromCache || pct >= 100);
  return (
    <div className="loader" data-testid="compiler-loader" role="status">
      <span>{preparing ? 'preparando o compilador…' : `baixando o compilador, só na primeira vez · ${pct}%`}</span>
      <span className="loader-bar" aria-hidden="true">
        <span className="loader-fill" style={{ width: `${preparing ? 100 : pct}%` }} />
      </span>
    </div>
  );
}

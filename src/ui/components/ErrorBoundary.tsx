import { Component, type ReactNode } from 'react';
import { TopBar } from './TopBar';

type Props = {
  children: ReactNode;
  /** 'page' (padrão): ocupa a tela inteira. 'inline': fica só no lugar do pedaço que quebrou. */
  variant?: 'page' | 'inline';
};

/**
 * Em vez de tela em branco quando algo quebra ao renderizar (ex.: o pedaço do editor não baixou depois
 * de um deploy novo, ou sem conexão), mostra um aviso com "recarregar".
 */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error('erro desconhecido') };
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    const fallback = <ErrorFallback message={error instanceof Error ? error.message : String(error)} />;
    if (this.props.variant === 'inline') return fallback;
    // sem link para o início: a tela continuaria quebrada até recarregar
    return (
      <>
        <TopBar left="examshell · rank 02" right={null} />
        <main className="page">{fallback}</main>
      </>
    );
  }
}

function ErrorFallback({ message }: { message: string }) {
  return (
    <div className="error-fallback" data-testid="error-fallback" role="alert">
      <p>Algo deu errado ao carregar esta parte do site. Recarregue a página para continuar.</p>
      <button type="button" className="btn primary" onClick={() => location.reload()}>
        recarregar
      </button>
      {message && (
        <details>
          <summary>detalhes do erro</summary>
          <pre>{message}</pre>
        </details>
      )}
    </div>
  );
}

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/ui/components/ErrorBoundary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Boom(): never {
  throw new Error('o pedaço do editor não baixou');
}

// O React de dev relança o erro num evento e o jsdom o imprime como "não tratado": silencia o ruído.
const swallow = (e: ErrorEvent) => e.preventDefault();

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  window.addEventListener('error', swallow);
  vi.spyOn(console, 'error').mockImplementation(() => {}); // o React também loga o erro capturado
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.removeEventListener('error', swallow);
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('sem erro, mostra os filhos', () => {
    act(() => root.render(<ErrorBoundary>tudo certo</ErrorBoundary>));
    expect(container.textContent).toBe('tudo certo');
  });

  it('com erro, mostra a tela de aviso com "recarregar" e o detalhe', () => {
    act(() =>
      root.render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      ),
    );
    const fallback = container.querySelector('[data-testid="error-fallback"]');
    expect(fallback?.getAttribute('role')).toBe('alert');
    expect(fallback?.textContent).toContain(
      'Algo deu errado ao carregar esta parte do site. Recarregue a página para continuar.',
    );
    expect(container.querySelector('.topbar')).not.toBeNull();
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['recarregar']);
    expect(container.querySelector('details')?.textContent).toContain('o pedaço do editor não baixou');
  });

  it('inline: só o aviso, sem a barra superior', () => {
    act(() =>
      root.render(
        <ErrorBoundary variant="inline">
          <Boom />
        </ErrorBoundary>,
      ),
    );
    expect(container.querySelector('[data-testid="error-fallback"]')).not.toBeNull();
    expect(container.querySelector('.topbar')).toBeNull();
  });
});

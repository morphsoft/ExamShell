import { useState } from 'react';
import { EXAM_DURATION_MS, loadSession } from '../../state/randomSession';
import { AppTopBar } from '../components/AppTopBar';

/** Tela de início. Se o último simulado terminou (e ainda está salvo), o resumo dele continua a um clique. */
export function RandomStart({ onStart }: { onStart(): void }) {
  const [lastFinished] = useState(() => loadSession()?.finishedAt != null);
  return (
    <>
      <AppTopBar active="simulado" />
      <main className="rand-page gut" data-testid="random-start">
        <section className="rand-card">
          <h1>Simular a prova</h1>
          <p>Cai um exercício sorteado de cada um dos 4 níveis, como na prova.</p>
          <p>O relógio de 3h só informa: dá para trocar de exercício, pular nível e pedir dicas.</p>
          <div className="facts">
            <span>4 níveis</span>
            <span>relógio de {EXAM_DURATION_MS / 3600000}h</span>
            <span>dicas liberadas</span>
          </div>
          <button type="button" className="btn primary big" data-testid="start-random" onClick={onStart}>
            Começar simulado (o relógio começa agora)
          </button>
          {lastFinished && (
            <a className="btn last-summary" data-testid="last-summary" href="#/aleatorio/resumo">
              Ver resumo do último simulado
            </a>
          )}
        </section>
      </main>
    </>
  );
}

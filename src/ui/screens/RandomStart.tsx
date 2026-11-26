import { EXAM_DURATION_MS } from '../../state/randomSession';
import { AppTopBar } from '../components/AppTopBar';

export function RandomStart({ onStart }: { onStart(): void }) {
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
        </section>
      </main>
    </>
  );
}

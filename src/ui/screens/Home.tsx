import { useEffect, useState } from 'react';
import { RANK02_CATALOG } from '../../content/rank02Catalog';
import { loadExercises } from '../../content/loadExercises';
import { clearProgress, getProgress } from '../../state/progress';
import { loadSession } from '../../state/randomSession';
import type { Level } from '../../engine/types';
import { ExerciseList, type DetailRequest } from '../home/ExerciseList';
import { StatusBar } from '../components/StatusBar';
import { TopBar } from '../components/TopBar';

const LEVELS: Level[] = [1, 2, 3, 4];

export function Home({ section }: { section?: 'exercicios' }) {
  const [version, setVersion] = useState(0);
  const [detail, setDetail] = useState<DetailRequest | null>(null);
  void version;
  const progress = getProgress();
  const session = loadSession();
  const available = new Set(loadExercises().map((e) => e.id));
  const ongoing = session !== null && session.finishedAt === null;

  useEffect(() => {
    if (section !== 'exercicios') return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('exercicios')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, [section]);

  const onClear = () => {
    if (window.confirm('Limpar todo o progresso e rascunhos deste navegador? Isso não pode ser desfeito.')) {
      clearProgress();
      setVersion((v) => v + 1);
    }
  };

  return (
    <>
      <TopBar left="examshell · rank 02" right="simulador de prática" />
      <main className="page">
        <h1>
          <span className="prompt">$</span> examshell
        </h1>
        <p className="lead">Treine para o Rank 02 no mesmo ambiente da prova, sem a pressão. Escolha por onde começar.</p>

        <div className="modes">
          <a className="mode" href="#/treino" data-testid="mode-practice">
            <span className="mode-title">Treino livre</span>
            <span className="muted">Escolha qualquer exercício, no seu ritmo, com dicas.</span>
          </a>
          <a
            className="mode"
            href={`#/aleatorio?seed=${Math.floor(Math.random() * 1e9)}`}
            data-testid="mode-random"
          >
            <span className="mode-title">Modo aleatório</span>
            <span className="muted">Um exercício por nível, sorteado, com tempo de prova.</span>
          </a>
        </div>

        {ongoing && (
          <p className="resume">
            Você tem uma sessão em andamento.{' '}
            <a href="#/aleatorio" data-testid="continue-random">
              continuar sessão
            </a>
          </p>
        )}

        <h2>Seu progresso</h2>
        <ul className="levels">
          {LEVELS.map((level) => {
            const entries = RANK02_CATALOG.filter((e) => e.level === level);
            const passed = entries.filter((e) => available.has(e.id) && progress[e.id] === 'passed').length;
            return (
              <li key={level}>
                <span className="k">nível {level}</span> · <b>{passed}/{entries.length}</b>{' '}
                {passed === entries.length && <span className="ok">✓</span>}
              </li>
            );
          })}
        </ul>

        <section id="exercicios" className="exercicios" aria-label="Exercícios">
          <ExerciseList detail={detail} onDetail={setDetail} />
        </section>

        <button type="button" className="link-btn" data-testid="clear-progress" onClick={onClear}>
          limpar progresso
        </button>
      </main>
      <StatusBar items={[{ label: 'rank', value: '02' }, { label: 'exercícios', value: String(available.size) }]} />
    </>
  );
}

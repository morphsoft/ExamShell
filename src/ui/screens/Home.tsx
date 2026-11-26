import { useEffect, useRef, useState } from 'react';
import { byLevel, loadExercises } from '../../content/loadExercises';
import { getActivity, localDay, streakDays } from '../../state/activity';
import { clearProgress, getProgress } from '../../state/progress';
import { loadSession } from '../../state/randomSession';
import { AppTopBar } from '../components/AppTopBar';
import { ContinueCard, SimulateCard } from '../home/HomeCards';
import { ExerciseList, type DetailRequest } from '../home/ExerciseList';
import { PrepList } from '../home/PrepList';
import { applyTheme } from '../theme';

function ClearConfirm({ onCancel, onConfirm }: { onCancel(): void; onConfirm(): void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onCancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.body.contains(opener)) opener.focus();
    };
  }, [opener]);

  return (
    <>
      <div className="scrim" onClick={onCancel} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="clear-q" data-testid="clear-dialog">
        <span className="grab" aria-hidden="true" />
        <h3 id="clear-q" className="clear-q">Apagar todo o progresso, rascunhos e configurações?</h3>
        <p className="muted">Isso vale só para este navegador e não dá para desfazer.</p>
        <div className="btnrow">
          <button type="button" className="btn" ref={cancelRef} onClick={onCancel}>
            cancelar
          </button>
          <button type="button" className="btn danger" data-testid="clear-confirm" onClick={onConfirm}>
            Apagar tudo
          </button>
        </div>
      </div>
    </>
  );
}

export function Home({ section }: { section?: 'exercicios' }) {
  const [, setVersion] = useState(0);
  const [detail, setDetail] = useState<DetailRequest | null>(null);
  const [confirming, setConfirming] = useState(false);
  const progress = getProgress();
  const activity = getActivity();
  const exercises = loadExercises();
  const groups = byLevel(exercises);
  const idsByLevel = { 1: groups[1].map((e) => e.id), 2: groups[2].map((e) => e.id), 3: groups[3].map((e) => e.id), 4: groups[4].map((e) => e.id) };
  const days = streakDays(activity.streak, localDay(new Date()));

  useEffect(() => {
    if (section !== 'exercicios') return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('exercicios')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, [section]);

  const onClear = () => {
    clearProgress();
    applyTheme('system');
    setConfirming(false);
    setDetail(null);
    setVersion((v) => v + 1);
  };

  return (
    <>
      <AppTopBar active={section === 'exercicios' ? 'exercicios' : 'inicio'} />
      <main className="home gut" id="inicio">
        <div className="in">
          <div>
            <h1>Bora treinar para o Rank 02</h1>
            <p className="sub">Na prova cai um exercício sorteado de cada nível. Aqui você vê o quanto está pronto para cada um.</p>
          </div>

          <div className="actions">
            <ContinueCard
              activity={activity}
              streak={days}
              exercises={exercises}
              progress={progress}
              onDetail={setDetail}
            />
            <SimulateCard session={loadSession()} now={Date.now()} />
          </div>

          <PrepList idsByLevel={idsByLevel} progress={progress} />

          <section id="exercicios" className="exercicios" aria-label="Exercícios">
            <ExerciseList detail={detail} onDetail={setDetail} />
          </section>

          <footer className="home-foot">
            <button type="button" className="link-btn" data-testid="clear-progress" onClick={() => setConfirming(true)}>
              limpar progresso
            </button>
          </footer>
        </div>
      </main>
      {confirming && <ClearConfirm onCancel={() => setConfirming(false)} onConfirm={onClear} />}
    </>
  );
}

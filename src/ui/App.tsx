import { useEffect, useState } from 'react';
import { getExercise } from '../content/loadExercises';
import { getActivity, recordOpened } from '../state/activity';
import { getProgress, loadDraft, saveDraft } from '../state/progress';
import { useRoute } from './router';
import { Home } from './screens/Home';
import { ExerciseScreen } from './screens/ExerciseScreen';
import { RandomScreen } from './screens/RandomScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { statusView } from './prepText';

function Placeholder({ title, text = 'Esta tela ainda está a caminho.' }: { title: string; text?: string }) {
  return (
    <>
      <TopBar left="examshell · rank 02" right={<a href="#/">início</a>} />
      <main className="page">
        <h1>{title}</h1>
        <p className="muted">{text}</p>
      </main>
      <StatusBar items={[{ label: 'modo', value: 'em construção' }]} />
    </>
  );
}

/** Treino livre: rascunho e progresso no localStorage. */
function PracticeExercise({ id }: { id: string }) {
  const [initialFiles] = useState(() => loadDraft(id) ?? {});
  const [, setGraded] = useState(0); // re-renderiza para mostrar o estado novo depois do grademe
  const exercise = getExercise(id);
  useEffect(() => {
    if (exercise) recordOpened(exercise.id, Date.now());
  }, [exercise]);
  if (!exercise) {
    return (
      <Placeholder
        title="Exercício não encontrado"
        text={`Não achei o exercício "${id}". Ele pode ainda não ter conteúdo.`}
      />
    );
  }
  // Progresso salvo antes de existir a contagem de tentativas: "tentado" vale pelo menos 1 tentativa.
  const passed = getProgress()[exercise.id] === 'passed';
  const attempts = Math.max(getActivity().lastAttempt[exercise.id]?.count ?? 0, getProgress()[exercise.id] === 'tried' ? 1 : 0);
  return (
    <ExerciseScreen
      exercise={exercise}
      mode="practice"
      initialFiles={initialFiles}
      onFilesChange={(files) => saveDraft(exercise.id, files)}
      onGraded={() => setGraded((n) => n + 1)}
      onHintUsed={() => {}}
      backHref="#/treino"
      levelLabel={`nível ${exercise.level}`}
      status={statusView(passed, attempts)}
    />
  );
}

export function App() {
  const route = useRoute();
  switch (route.name) {
    case 'home':
      return <Home section={route.section} />;
    case 'exercise':
      return <PracticeExercise key={route.id} id={route.id} />;
    case 'random':
      return <RandomScreen seed={route.seed} />;
    case 'summary':
      return <SummaryScreen />;
  }
}

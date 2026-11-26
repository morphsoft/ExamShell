import { useState } from 'react';
import { getExercise } from '../content/loadExercises';
import { getProgress, loadDraft, saveDraft, type ExerciseStatus } from '../state/progress';
import { useRoute } from './router';
import { Home } from './screens/Home';
import { ExerciseScreen } from './screens/ExerciseScreen';
import { RandomScreen } from './screens/RandomScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';

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

const STATUS_LABEL: Record<ExerciseStatus, string> = { untried: 'não tentado', tried: 'tentado', passed: 'passou' };

/** Treino livre: rascunho e progresso no localStorage. */
function PracticeExercise({ id }: { id: string }) {
  const [initialFiles] = useState(() => loadDraft(id) ?? {});
  const [hints, setHints] = useState(0);
  const [, setGraded] = useState(0); // re-renderiza para mostrar o estado novo depois do grademe
  const exercise = getExercise(id);
  if (!exercise) {
    return (
      <Placeholder
        title="Exercício não encontrado"
        text={`Não achei o exercício "${id}". Ele pode ainda não ter conteúdo.`}
      />
    );
  }
  const status = getProgress()[exercise.id] ?? 'untried';
  return (
    <ExerciseScreen
      exercise={exercise}
      mode="practice"
      initialFiles={initialFiles}
      onFilesChange={(files) => saveDraft(exercise.id, files)}
      onGraded={() => setGraded((n) => n + 1)}
      onHintUsed={() => setHints((n) => n + 1)}
      statusItems={[
        { label: 'modo', value: 'treino' },
        { label: 'estado', value: STATUS_LABEL[status] },
        { label: 'dicas', value: String(hints) },
      ]}
      actions={
        <a href="#/treino">
          <span aria-hidden="true">← </span>voltar à lista
        </a>
      }
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

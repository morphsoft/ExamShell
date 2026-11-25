import { useRoute } from './router';
import { Home } from './screens/Home';
import { PracticeList } from './screens/PracticeList';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <TopBar left="examshell · rank 02" right={<a href="#/">início</a>} />
      <main className="page">
        <h1>{title}</h1>
        <p className="muted">Esta tela ainda está a caminho.</p>
      </main>
      <StatusBar items={[{ label: 'modo', value: 'em construção' }]} />
    </>
  );
}

export function App() {
  const route = useRoute();
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'practice':
      return <PracticeList />;
    case 'exercise':
      return <Placeholder title={route.id} />;
    case 'random':
      return <Placeholder title="Modo aleatório" />;
    case 'summary':
      return <Placeholder title="Resumo da sessão" />;
  }
}

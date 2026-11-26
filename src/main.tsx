import { createRoot } from 'react-dom/client';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/exercise.css';
import './ui/styles/home.css';
import './ui/styles/random.css';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { getSettings } from './state/progress';
import { applyTheme } from './ui/theme';

applyTheme(getSettings().theme); // antes do primeiro desenho, para não piscar o tema errado

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

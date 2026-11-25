import { createRoot } from 'react-dom/client';
import './ui/theme.css';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

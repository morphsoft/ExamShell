import { RANK02_CATALOG } from '../../content/rank02Catalog';
import { loadExercises } from '../../content/loadExercises';
import { getActivity, localDay, streakDays } from '../../state/activity';
import { getProgress } from '../../state/progress';
import { streakText } from '../prepText';
import { ThemeToggle } from './ThemeToggle';

export type NavSection = 'inicio' | 'exercicios' | 'simulado';

const NAV: { id: NavSection; label: string; href: string; icon: 'home' | 'list' | 'clock' }[] = [
  { id: 'inicio', label: 'início', href: '#/', icon: 'home' },
  { id: 'exercicios', label: 'exercícios', href: '#/treino', icon: 'list' },
  { id: 'simulado', label: 'simulado', href: '#/aleatorio', icon: 'clock' },
];

function Icon({ name }: { name: 'home' | 'list' | 'clock' | 'fire' | 'check' }) {
  const p = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const;
  switch (name) {
    case 'home':
      return (
        <svg {...p}>
          <path d="M4 11l8-6.5 8 6.5V20H4z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...p}>
          <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 9v4l3 2M9 2.5h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'list':
      return (
        <svg {...p}>
          <path d="M5 20V11M12 20V5M19 20v-7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...p}>
          <path d="M12 2.5c1 3.2 4.8 5 4.8 10a4.8 4.8 0 01-9.6 0c0-2.3 1.2-3.7 2.3-4.7.2 1.5.9 2.4 1.8 2.9-.4-3.3.1-5.7.7-8.2z" fill="currentColor" />
        </svg>
      );
    case 'check':
      return (
        <svg {...p}>
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

/** Topo do app (marca, navegação, sequência, passados, tema); no celular a navegação vai para baixo. */
export function AppTopBar({ active }: { active: NavSection }) {
  const days = streakDays(getActivity().streak, localDay(new Date()));
  const progress = getProgress();
  const available = new Set(loadExercises().map((e) => e.id));
  const passed = RANK02_CATALOG.filter((e) => available.has(e.id) && progress[e.id] === 'passed').length;

  return (
    <>
      <header className="appbar gut">
        <div className="in">
          <a className="brand" href="#/">
            <span className="mark">&gt;_</span>examshell <small>rank 02</small>
          </a>
          <nav className="top-nav" aria-label="Seções">
            {NAV.map((n) => (
              <a key={n.id} href={n.href} aria-current={n.id === active ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <span className="right">
            <span className="pill streak" title="dias seguidos treinando">
              <Icon name="fire" />
              <span data-testid="streak">{streakText(days)}</span>
            </span>
            <span className="pill done-pill">
              <Icon name="check" />
              <span data-testid="passed-count">
                <b>{passed}/{RANK02_CATALOG.length}</b> passaram
              </span>
            </span>
            <ThemeToggle />
          </span>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Navegação">
        {NAV.map((n) => (
          <a key={n.id} href={n.href} className={n.id === active ? 'on' : undefined} aria-current={n.id === active ? 'page' : undefined}>
            <Icon name={n.icon} />
            {n.label}
          </a>
        ))}
      </nav>
    </>
  );
}

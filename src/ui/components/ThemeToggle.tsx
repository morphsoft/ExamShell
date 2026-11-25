import { useEffect, useState } from 'react';
import { getSettings, saveSettings, type Theme } from '../../state/progress';
import { applyTheme, toggledTheme } from '../theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function Icon({ name }: { name: 'sun' | 'moon' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      {name === 'sun' ? (
        <>
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path
            d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getSettings().theme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const next = toggledTheme(theme, systemDark);
  const toggle = () => {
    applyTheme(next);
    saveSettings({ ...getSettings(), theme: next });
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="iconbtn"
      data-testid="theme-toggle"
      aria-label={next === 'dark' ? 'usar tema escuro' : 'usar tema claro'}
      onClick={toggle}
    >
      <Icon name={next === 'dark' ? 'moon' : 'sun'} />
    </button>
  );
}

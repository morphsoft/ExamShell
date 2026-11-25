import type { ReactNode } from 'react';
import type { Settings } from '../../state/progress';

type Lang = Settings['subjectLang'];

const SWITCH: Record<Lang, { label: string; lang: string }> = {
  en: { label: 'ver em português', lang: 'pt-BR' },
  pt: { label: 'view in English', lang: 'en' },
};

/** O enunciado no formato da prova: cabeçalho `rótulo : valor`, a régua de traços e o texto. */
function renderSubject(text: string): ReactNode[] {
  const lines = text.replace(/\s+$/, '').split('\n');
  const rule = lines.findIndex((l) => /^-{10,}\s*$/.test(l));
  return lines.map((line, i) => {
    if (i === rule) {
      return (
        <span key={i} className="subject-rule" aria-hidden="true">
          {line}
        </span>
      );
    }
    const field = i < rule ? /^([^:]*:)(.*)$/.exec(line) : null;
    if (field) {
      return (
        <span key={i}>
          <span className="k">{field[1]}</span>
          {i === 0 ? <span className="subject-name">{field[2]}</span> : field[2]}
          {'\n'}
        </span>
      );
    }
    return line + '\n';
  });
}

export function SubjectPane({
  subject,
  lang,
  onToggleLang,
  actions,
}: {
  subject: { en: string; pt: string };
  lang: Lang;
  onToggleLang(): void;
  actions?: ReactNode;
}) {
  const other = SWITCH[lang];
  return (
    <>
      <div className="subject-head">
        <div className="subject-actions">{actions}</div>
        <button type="button" className="chip" data-testid="subject-lang" lang={other.lang} onClick={onToggleLang}>
          {other.label}
        </button>
      </div>
      <pre className="subject" data-testid="subject" lang={lang === 'pt' ? 'pt-BR' : 'en'}>
        {renderSubject(subject[lang] || subject.en)}
      </pre>
    </>
  );
}

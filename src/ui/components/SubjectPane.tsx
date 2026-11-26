import type { LoadedExercise } from '../../engine/types';
import type { Settings } from '../../state/progress';
import { formatSubject, type SubjectBlock } from '../subjectFormat';

type Lang = Settings['subjectLang'];

function Block({ block }: { block: SubjectBlock }) {
  switch (block.kind) {
    case 'prose':
      return <p>{block.text}</p>;
    case 'heading':
      return <h2>{block.text}</h2>;
    case 'code':
      return <pre className="code">{block.text}</pre>;
    case 'terminal':
      return (
        <pre className="examples">
          {block.lines.map((l, i) =>
            l.kind === 'cmd' ? (
              <span key={i} className="line">
                <span className="pr">$&gt;</span>
                {l.text ? ' ' : ''}
                <span className="cmd">{l.text}</span>
                {'\n'}
              </span>
            ) : (
              <span key={i} className="out">
                {l.text}
                {'\n'}
              </span>
            ),
          )}
        </pre>
      );
  }
}

/** O enunciado: fatos do exercício, escolha de idioma e o texto em parágrafos e blocos de terminal. */
export function SubjectPane({
  exercise,
  lang,
  onSetLang,
}: {
  exercise: LoadedExercise;
  lang: Lang;
  onSetLang(lang: Lang): void;
}) {
  const text = exercise.subject[lang] || exercise.subject.en;
  const allowed = exercise.allowedFunctions.join(', ') || 'nenhuma';
  return (
    <>
      <div className="subject-top">
        <div className="facts">
          <span>
            arquivo <b>{exercise.expectedFiles.join(', ')}</b>
          </span>
          <span>
            permitidas <b>{allowed}</b>
          </span>
          <span>
            {exercise.tests.length} {exercise.tests.length === 1 ? 'teste' : 'testes'}
          </span>
        </div>
        <span className="langs" role="group" aria-label="Idioma do enunciado" data-testid="subject-lang">
          {(['en', 'pt'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} data-testid={`lang-${l}`} onClick={() => onSetLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </span>
      </div>
      <div className="subject-body" data-testid="subject" lang={lang === 'pt' ? 'pt-BR' : 'en'}>
        {formatSubject(text).map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </>
  );
}

export type MobileTab = 'subject' | 'code' | 'result';

const TABS: { id: MobileTab; label: string }[] = [
  { id: 'subject', label: 'Enunciado' },
  { id: 'code', label: 'Código' },
  { id: 'result', label: 'Resultado' },
];

/** Enunciado, Código e Resultado no celular. O ponto em Resultado avisa que chegou algo novo. */
export function MobileTabs({ tab, onSelect, dot }: { tab: MobileTab; onSelect(t: MobileTab): void; dot: boolean }) {
  return (
    <div className="mtabs" role="tablist" aria-label="Partes do exercício">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          data-testid={`mtab-${t.id}`}
          aria-selected={tab === t.id}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
          {t.id === 'result' && dot && (
            <span className="badge" data-testid="result-dot">
              <span className="sr-only"> novo</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

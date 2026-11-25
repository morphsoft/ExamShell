import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type EditorTab = { key: string; label: string };

/** A aba de rascunho dos exercícios de função: o main do cadete para "rodar"; o grademe a ignora. */
export const SCRATCH_TAB: EditorTab = { key: 'main.c', label: 'main.c (rascunho)' };

export const tabId = (key: string) => `tab-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
export const EDITOR_PANEL_ID = 'editor-panel';

/** Uma aba por arquivo; setas esquerda/direita trocam de aba. `extra` fica à direita, fora da lista. */
export function EditorTabs({
  tabs,
  active,
  onSelect,
  extra,
}: {
  tabs: EditorTab[];
  active: string;
  onSelect(key: string): void;
  extra?: ReactNode;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.key === active);
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onSelect(next.key);
    refs.current.get(next.key)?.focus();
  };

  return (
    <div className="editor-head">
      <div className="tabs" role="tablist" aria-label="arquivos" onKeyDown={onKeyDown}>
        {tabs.map((t) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              ref={(el) => {
                if (el) refs.current.set(t.key, el);
                else refs.current.delete(t.key);
              }}
              type="button"
              role="tab"
              id={tabId(t.key)}
              aria-selected={selected}
              aria-controls={EDITOR_PANEL_ID}
              tabIndex={selected ? 0 : -1}
              className="tab"
              onClick={() => onSelect(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {extra}
    </div>
  );
}

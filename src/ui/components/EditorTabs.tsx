import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export type EditorTab = { key: string; label: string; readOnly?: boolean };

/** Aba de um header fornecido pelo exame: somente leitura, nunca salva nem entregue. */
export const providedTab = (name: string): EditorTab => ({
  key: `provided/${name}`,
  label: `${name} (fornecido)`,
  readOnly: true,
});

/** A aba de rascunho dos exercícios de função: o main do cadete para "rodar"; o grademe a ignora. */
export const SCRATCH_TAB: EditorTab = { key: 'main.c', label: 'main.c (rascunho)' };

export const tabId = (key: string) => `tab-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
export const EDITOR_PANEL_ID = 'editor-panel';

/**
 * Uma aba por arquivo; setas esquerda/direita trocam de aba. À direita ficam "recomeçar" (com a
 * confirmação aqui mesmo, sem modal) e o vim.
 */
export function EditorTabs({
  tabs,
  active,
  onSelect,
  onReset,
  vim,
  onToggleVim,
}: {
  tabs: EditorTab[];
  active: string;
  onSelect(key: string): void;
  onReset(key: string): void;
  vim: boolean;
  onToggleVim(): void;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [active]); // a pergunta é sobre o arquivo da aba ativa
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

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
    <div className="tabs-ed">
      <div className="tabs-list" role="tablist" aria-label="arquivos" onKeyDown={onKeyDown}>
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
              
              onClick={() => onSelect(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <span className="sp">
        {confirming ? (
          <span className="reset-ask" role="group" aria-label="recomeçar o arquivo">
            <span>Recomeçar {activeTab.label.split(' ')[0]}? O código volta ao início.</span>
            <button
              type="button"
              className="danger"
              data-testid="reset-confirm"
              onClick={() => {
                setConfirming(false);
                onReset(active);
              }}
            >
              recomeçar
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              cancelar
            </button>
          </span>
        ) : (
          !activeTab.readOnly && (
            <button
              type="button"
              data-testid="editor-reset"
              title="Recomeçar o arquivo"
              onClick={() => setConfirming(true)}
            >
              recomeçar
            </button>
          )
        )}
        <button
          type="button"
          role="switch"
          aria-checked={vim}
          data-testid="vim-toggle"
          title="Ativar modo vim"
          onClick={onToggleVim}
        >
          vim{' '}
          <span className={vim ? 'switch-on' : 'switch-off'} aria-hidden="true">
            {vim ? 'on' : 'off'}
          </span>
        </button>
      </span>
    </div>
  );
}

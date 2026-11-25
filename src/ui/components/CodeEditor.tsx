import { useEffect, useRef } from 'react';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';
import { tags as t } from '@lezer/highlight';

const examHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier, t.definitionKeyword], color: '#7fd4ff' },
  { tag: [t.typeName, t.standard(t.typeName)], color: '#7fd4ff' },
  { tag: [t.string, t.character, t.special(t.string)], color: '#f2b84b' },
  { tag: t.escape, color: '#ffd68a' },
  { tag: [t.number, t.bool, t.null], color: '#c3a6ff' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#8397aa', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.meta], color: '#00babc' },
]);

const examTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '13.5px' },
    '&.cm-focused': { outline: 'none' }, // o foco aparece na borda do painel (.editor:focus-within)
    '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, monospace", lineHeight: '1.6' },
    '.cm-content': { caretColor: 'var(--cyan)', padding: '10px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cyan)', borderLeftWidth: '2px' },
    '.cm-gutters': { backgroundColor: 'var(--bg)', color: '#4f6377', border: 'none' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 14px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--label)' },
    '.cm-activeLine': { backgroundColor: '#121e2b' },
    '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: '#1d3b55',
    },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      backgroundColor: 'rgba(0, 186, 188, 0.18)',
      outline: '1px solid rgba(0, 186, 188, 0.45)',
    },
    '.cm-placeholder': { color: 'var(--label)', fontStyle: 'italic' },
    '.cm-fat-cursor': { background: 'rgba(0, 186, 188, 0.55) !important', color: 'var(--bg) !important' },
    '&:not(.cm-focused) .cm-fat-cursor': { background: 'none !important', outline: '1px solid var(--cyan)' },
    '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--text)', borderTop: '1px solid var(--border)' },
    '.cm-vim-panel, .cm-vim-panel input': { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '12px' },
  },
  { dark: true },
);

// O modo vim só é baixado quando alguém o liga.
let vimFactory: (() => Extension) | null = null;
let vimLoading: Promise<unknown> | null = null;
function loadVim(): Promise<unknown> {
  vimLoading ??= import('@replit/codemirror-vim').then(
    (m) => (vimFactory = () => m.vim()),
    () => (vimLoading = null), // sem rede: o vim fica desligado; tenta de novo no próximo pedido
  );
  return vimLoading;
}

/**
 * O editor de C (CodeMirror 6). Um só EditorView; cada arquivo (`docKey`) guarda o próprio
 * EditorState, com desfazer separado. `doc` só é lido quando o arquivo aparece pela 1ª vez.
 */
export function CodeEditor({
  docKey,
  doc,
  vim,
  label,
  placeholder,
  onChange,
}: {
  docKey: string;
  doc: string;
  vim: boolean;
  label: string;
  placeholder?: string;
  onChange(key: string, text: string): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const states = useRef(new Map<string, EditorState>());
  const vimConf = useRef(new Compartment());
  const current = useRef({ key: docKey, vim, onChange });
  current.current.onChange = onChange;

  const vimExt = (): Extension => (current.current.vim && vimFactory ? vimFactory() : []);
  const applyVim = () => {
    const v = view.current;
    if (!v) return;
    if (current.current.vim && !vimFactory) void loadVim().then(() => vimFactory && applyVim());
    else v.dispatch({ effects: vimConf.current.reconfigure(vimExt()) });
  };

  const makeState = (text: string, hint: string | undefined, ariaLabel: string) =>
    EditorState.create({
      doc: text,
      extensions: [
        vimConf.current.of(vimExt()), // antes dos outros atalhos, como pede o vim
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        syntaxHighlighting(examHighlight),
        cpp(),
        EditorState.tabSize.of(4),
        indentUnit.of('\t'),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        hint ? placeholderExt(hint) : [],
        EditorView.updateListener.of((u) => {
          if (u.docChanged) current.current.onChange(current.current.key, u.state.doc.toString());
        }),
        examTheme,
      ],
    });

  // O EditorView é criado uma vez; trocas de arquivo e de vim vêm pelos efeitos abaixo.
  useEffect(() => {
    const v = new EditorView({ state: makeState(doc, placeholder, label), parent: host.current! });
    view.current = v;
    applyVim();
    return () => {
      v.destroy();
      view.current = null;
    };
  }, []);

  useEffect(() => {
    const v = view.current;
    if (!v || current.current.key === docKey) return;
    states.current.set(current.current.key, v.state);
    current.current.key = docKey;
    v.setState(states.current.get(docKey) ?? makeState(doc, placeholder, label));
    applyVim(); // o estado guardado pode ter sido criado com o vim em outra posição
  }, [docKey]);

  useEffect(() => {
    if (current.current.vim === vim) return;
    current.current.vim = vim;
    applyVim();
  }, [vim]);

  return <div className="cm-host" ref={host} />;
}

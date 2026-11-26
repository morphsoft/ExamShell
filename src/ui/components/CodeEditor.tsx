import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
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
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier, t.definitionKeyword], color: 'var(--kw)' },
  { tag: [t.typeName, t.standard(t.typeName)], color: 'var(--kw)' },
  { tag: [t.string, t.character, t.special(t.string)], color: 'var(--str)' },
  { tag: t.escape, color: 'var(--str)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--num)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--com)', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.meta], color: 'var(--accent-ink)' },
]);

// Só variáveis do tema: claro e escuro vêm do CSS, sem `dark` aqui.
const examTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--code-bg)', color: 'var(--ink)', fontSize: '14px' },
  '&.cm-focused': { outline: 'none' }, // o foco aparece na borda do painel (.editor:focus-within)
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '10px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--code-ln)', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 14px' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
  '.cm-activeLine': { backgroundColor: 'var(--raise)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--accent-soft)',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--accent-soft)',
    outline: '1px solid var(--accent)',
  },
  '.cm-placeholder': { color: 'var(--soft)', fontStyle: 'italic' },
  '.cm-fat-cursor': { background: 'var(--accent) !important', color: 'var(--code-bg) !important' },
  '&:not(.cm-focused) .cm-fat-cursor': { background: 'none !important', outline: '1px solid var(--accent)' },
  '.cm-panels': { backgroundColor: 'var(--surface)', color: 'var(--ink)', borderTop: '1px solid var(--line)' },
  '.cm-vim-panel, .cm-vim-panel input': { fontFamily: 'var(--mono)', fontSize: '12px' },
});

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
export interface CodeEditorHandle {
  /** Troca a seleção principal pelo texto, com o cursor depois dele. Não mexe no foco. */
  insertText(text: string): void;
  /** Substitui o conteúdo do arquivo `key` (desfazível se for o ativo) e chama onChange(key, text) uma vez. */
  setDoc(key: string, text: string): void;
  focus(): void;
}

export interface CodeEditorProps {
  docKey: string;
  doc: string;
  vim: boolean;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange(key: string, text: string): void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { docKey, doc, vim, label, placeholder, readOnly = false, onChange },
  ref,
) {
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

  const makeState = (text: string, hint: string | undefined, ariaLabel: string, ro: boolean) =>
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
        EditorView.contentAttributes.of({
          'aria-label': ariaLabel,
          autocapitalize: 'off',
          autocorrect: 'off',
          spellcheck: 'false',
        }),
        hint ? placeholderExt(hint) : [],
        EditorView.updateListener.of((u) => {
          if (u.docChanged) current.current.onChange(current.current.key, u.state.doc.toString());
        }),
        ro ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [],
        examTheme,
      ],
    });

  // O EditorView é criado uma vez; trocas de arquivo e de vim vêm pelos efeitos abaixo.
  useEffect(() => {
    const v = new EditorView({ state: makeState(doc, placeholder, label, readOnly), parent: host.current! });
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
    v.setState(states.current.get(docKey) ?? makeState(doc, placeholder, label, readOnly));
    applyVim(); // o estado guardado pode ter sido criado com o vim em outra posição
  }, [docKey]);

  useEffect(() => {
    if (current.current.vim === vim) return;
    current.current.vim = vim;
    applyVim();
  }, [vim]);

  useImperativeHandle(ref, () => ({
    insertText(text) {
      const v = view.current;
      if (!v || v.state.readOnly) return;
      const { from, to } = v.state.selection.main; // só a seleção principal: as outras ficam como estão
      v.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        scrollIntoView: true,
        userEvent: 'input',
      });
    },
    setDoc(key, text) {
      const v = view.current;
      if (v && key === current.current.key) {
        if (v.state.doc.toString() === text) current.current.onChange(key, text);
        else v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text }, userEvent: 'input' }); // o listener chama onChange
      } else {
        states.current.delete(key); // a próxima troca monta o estado do texto novo
        current.current.onChange(key, text);
      }
    },
    focus() {
      view.current?.focus();
    },
  }));

  return <div className="cm-host" ref={host} />;
});

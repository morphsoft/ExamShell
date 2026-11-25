export const LONG_MACRO = '_L64';
export const PRELUDE_HEADER = '__examshell.h';
export const PRELUDE = '#define _L64 long long\n';

interface Token {
  text: string;
  start: number;
  end: number;
}

const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);

/** Tokens significativos (sem espaços nem comentários); strings e chars viram um token só. */
function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && next === '*') {
      const close = src.indexOf('*/', i + 2);
      i = close === -1 ? src.length : close + 2;
    } else if (c === '"' || c === "'") {
      const start = i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      i = Math.min(i + 1, src.length);
      tokens.push({ text: src.slice(start, i), start, end: i });
    } else if (isIdentStart(c) || /[0-9]/.test(c)) {
      const start = i++;
      while (i < src.length && isIdentPart(src[i])) i++;
      tokens.push({ text: src.slice(start, i), start, end: i });
    } else if (/\s/.test(c)) {
      i++;
    } else {
      tokens.push({ text: c, start: i, end: i + 1 });
      i++;
    }
  }
  return tokens;
}

/** Troca o tipo `long` (sozinho) por `_L64`, preservando linhas e colunas. */
export function rewriteLong(src: string): string {
  const tokens = tokenize(src);
  let out = '';
  let pos = 0;
  tokens.forEach((t, k) => {
    if (t.text !== 'long') return;
    const prev = tokens[k - 1]?.text;
    const next = tokens[k + 1]?.text;
    if (prev === 'long' || next === 'long' || next === 'double') return;
    out += src.slice(pos, t.start) + LONG_MACRO;
    pos = t.end;
  });
  return out + src.slice(pos);
}

/** Desfaz os efeitos do prelúdio nas mensagens do compilador. */
export function restoreLongInDiagnostics(stderr: string, userWroteLongLong: boolean): string {
  const kept: string[] = [];
  let skippingSnippet = false;
  for (const line of stderr.split('\n')) {
    if (line.includes(PRELUDE_HEADER)) {
      skippingSnippet = true;
      continue;
    }
    if (skippingSnippet && /^\s*\d*\s*\|/.test(line)) continue;
    skippingSnippet = false;
    kept.push(line);
  }
  let out = kept.join('\n').split(LONG_MACRO).join('long');
  if (!userWroteLongLong) {
    out = out.replace(/unsigned long long/g, 'unsigned long').replace(/'long long'/g, "'long'");
  }
  return out;
}

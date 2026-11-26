export type TermLine = { kind: 'cmd' | 'out'; text: string };
export type SubjectBlock =
  | { kind: 'prose'; text: string }
  | { kind: 'heading'; text: string } // "Examples:" → "Examples"
  | { kind: 'code'; text: string } // linhas como estão
  | { kind: 'terminal'; lines: TermLine[] };

const RULE = /^-{10,}\s*$/;
const PROMPT = /^\$>\s?/;

function terminal(lines: string[]): SubjectBlock {
  const out: TermLine[] = [];
  let pending: string | null = null; // comando que continua na linha seguinte
  for (const line of lines) {
    if (pending !== null) {
      const more = / \\$/.test(line);
      pending += ' ' + (more ? line.slice(0, -2) : line);
      if (!more) {
        out.push({ kind: 'cmd', text: pending });
        pending = null;
      }
      continue;
    }
    if (PROMPT.test(line)) {
      const cmd = line.replace(PROMPT, '');
      if (/ \\$/.test(cmd)) pending = cmd.slice(0, -2);
      else out.push({ kind: 'cmd', text: cmd });
    } else out.push({ kind: 'out', text: line });
  }
  if (pending !== null) out.push({ kind: 'cmd', text: pending });
  return { kind: 'terminal', lines: out };
}

const CALL = /^[A-Za-z_]\w*\(/; // ft_strpbrk("Hello", "o") devolve…
const CALL_ANYWHERE = /\b[A-Za-z_]\w*\(/;
const TOKEN = /^\S+$/; // uma linha de grade: 11111111
const CHAR_LITERAL = /^'(\\.|[^'])'/; // 'a' vira 'z', 'Z' vira 'A'

/**
 * Conteúdo feito de linhas, que não pode virar parágrafo: código (recuo, `;`, `{`, `#`, `typedef`), exemplos de
 * chamada (uma linha que começa com `nome(`, ou todas as linhas com uma chamada), grades (toda linha é um token
 * só) e tabelas de troca (toda linha começa com um caractere entre aspas simples).
 */
function looksLikeCodeBlock(lines: string[]): boolean {
  const many = lines.length >= 2;
  return (
    lines.some((l) => /^(\t| {2,})/.test(l) || /[;{}]$/.test(l.trimEnd()) || /^(typedef|struct|#)/.test(l)) ||
    lines.some((l) => CALL.test(l)) ||
    (many && lines.every((l) => CALL_ANYWHERE.test(l))) ||
    (many && lines.every((l) => TOKEN.test(l.trim()))) ||
    (many && lines.every((l) => CHAR_LITERAL.test(l)))
  );
}

/** Um rótulo como "Examples:" ou "Exemplos:" (uma ou duas palavras); uma frase como "Write the following function:" fica prosa. */
const LABEL = /^\p{Lu}\p{Ll}*( \p{Ll}+)?\s?:$/u;

const BULLET = /^[-*] /;

/** Parágrafo, título ou código; uma lista com "- " vira um parágrafo por item (a continuação recuada se junta ao item). */
function textBlocks(lines: string[]): SubjectBlock[] {
  if (lines.some((l) => BULLET.test(l))) {
    const segments: string[][] = [];
    for (const l of lines) {
      if (BULLET.test(l) || segments.length === 0) segments.push([l]);
      else segments[segments.length - 1].push(l);
    }
    return segments.flatMap((seg) =>
      BULLET.test(seg[0])
        ? [{ kind: 'prose' as const, text: seg.map((l) => l.trim()).join(' ') }]
        : textBlocks(seg),
    );
  }
  if (lines.length === 1 && LABEL.test(lines[0].trim())) {
    return [{ kind: 'heading', text: lines[0].trim().slice(0, -1).trimEnd() }];
  }
  if (looksLikeCodeBlock(lines)) return [{ kind: 'code', text: lines.join('\n') }];
  return [{ kind: 'prose', text: lines.map((l) => l.trim()).join(' ') }];
}

/** O enunciado do exame em parágrafos, títulos, código e blocos de terminal. O cabeçalho antes da régua some. */
export function formatSubject(text: string): SubjectBlock[] {
  const all = text.replace(/\r\n?/g, '\n').replace(/\s+$/, '').split('\n');
  const rule = all.findIndex((l) => RULE.test(l));
  const body = rule >= 0 ? all.slice(rule + 1) : all;

  const groups: string[][] = [];
  let cur: string[] = [];
  for (const line of body) {
    if (line.trim() === '') {
      if (cur.length) groups.push(cur);
      cur = [];
    } else cur.push(line);
  }
  if (cur.length) groups.push(cur);

  const blocks: SubjectBlock[] = [];
  for (const lines of groups) {
    // "Examples:" colado no primeiro "$>", sem linha em branco entre os dois
    const at = lines.findIndex((l) => PROMPT.test(l));
    if (at > 0) {
      blocks.push(...textBlocks(lines.slice(0, at)));
      blocks.push(terminal(lines.slice(at)));
    } else if (at === 0) blocks.push(terminal(lines));
    else blocks.push(...textBlocks(lines));
  }
  return blocks;
}

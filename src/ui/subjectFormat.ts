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

function looksLikeCodeBlock(lines: string[]): boolean {
  return (
    lines.some((l) => /^(\t| {2,})/.test(l) || /[;{}]$/.test(l.trimEnd()) || /^(typedef|struct|#)/.test(l)) ||
    lines.every((l) => /^[A-Za-z_]\w*\(/.test(l))
  );
}

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
  if (lines.length === 1 && lines[0].endsWith(':') && lines[0].length <= 30) {
    return [{ kind: 'heading', text: lines[0].slice(0, -1) }];
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

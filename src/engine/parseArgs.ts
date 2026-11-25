/** A linha do campo "rodar" tem aspas que não fecham. */
export class ParseArgsError extends Error {
  constructor() {
    super('aspas sem fechar');
    this.name = 'ParseArgsError';
  }
}

const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  a: '\x07',
  b: '\b',
  e: '\x1b',
  E: '\x1b',
  f: '\f',
  v: '\v',
  '\\': '\\',
  "'": "'",
  '"': '"',
  '?': '?',
};

/** Uma sequência `\…` dentro de `$'…'`; `j` aponta para o caractere depois da barra. */
function ansiEscape(line: string, j: number): [text: string, next: number] {
  const c = line[j];
  if (c in SIMPLE_ESCAPES) return [SIMPLE_ESCAPES[c], j + 1];
  if (c === 'x') {
    const m = /^[0-9a-fA-F]{1,2}/.exec(line.slice(j + 1));
    if (m) return [String.fromCharCode(parseInt(m[0], 16)), j + 1 + m[0].length];
  }
  const oct = /^[0-7]{1,3}/.exec(line.slice(j));
  if (oct) return [String.fromCharCode(parseInt(oct[0], 8) & 0xff), j + oct[0].length];
  return ['\\' + c, j + 1]; // como o bash: sequência desconhecida fica como está
}

const isBlank = (c: string) => c === ' ' || c === '\t' || c === '\n';

/**
 * Separa a linha em argumentos como o bash faria: espaços separam; `"…"` guarda espaços
 * (a barra só escapa `" \ $ \``); `'…'` é literal; `$'…'` entende `\t`, `\n`, `\xHH`…;
 * fora de aspas, `\` escapa o próximo caractere. Lança `ParseArgsError` se uma aspa não fechar.
 */
export function parseArgs(line: string): string[] {
  const args: string[] = [];
  let cur = '';
  let inArg = false;
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (isBlank(c)) {
      if (inArg) args.push(cur);
      cur = '';
      inArg = false;
      i++;
      continue;
    }
    inArg = true;
    if (c === '\\') {
      cur += line[i + 1] ?? '';
      i += 2;
    } else if (c === "'") {
      const end = line.indexOf("'", i + 1);
      if (end === -1) throw new ParseArgsError();
      cur += line.slice(i + 1, end);
      i = end + 1;
    } else if (c === '$' && line[i + 1] === "'") {
      i += 2;
      for (;;) {
        if (i >= line.length) throw new ParseArgsError();
        const d = line[i];
        if (d === "'") break;
        if (d === '\\' && i + 1 < line.length) {
          const [text, next] = ansiEscape(line, i + 1);
          cur += text;
          i = next;
        } else {
          cur += d;
          i++;
        }
      }
      i++;
    } else if (c === '"') {
      i++;
      for (;;) {
        if (i >= line.length) throw new ParseArgsError();
        const d = line[i];
        if (d === '"') break;
        if (d === '\\' && '"\\$`'.includes(line[i + 1] ?? '')) {
          cur += line[i + 1];
          i += 2;
        } else {
          cur += d;
          i++;
        }
      }
      i++;
    } else {
      cur += c;
      i++;
    }
  }
  if (inArg) args.push(cur);
  return args;
}

function hex2(code: number): string {
  return code.toString(16).padStart(2, '0');
}

/** Um argumento entre aspas, de um jeito que `parseArgs` (e o bash) leem de volta igual. */
function quoteArg(arg: string): string {
  if (/[\x00-\x1f\x7f]/.test(arg)) {
    let out = '';
    for (const ch of arg) {
      const code = ch.charCodeAt(0);
      if (ch === '\\' || ch === "'") out += '\\' + ch;
      else if (ch === '\t') out += '\\t';
      else if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (code < 32 || code === 127) out += '\\x' + hex2(code);
      else out += ch;
    }
    return `$'${out}'`;
  }
  return '"' + arg.replace(/["\\$`]/g, (m) => '\\' + m) + '"';
}

/** Os argumentos como seriam digitados no terminal: `"a b" "c"`, ou `$'\t…'` se houver invisíveis. */
export function formatArgs(args: string[]): string {
  return args.map(quoteArg).join(' ');
}

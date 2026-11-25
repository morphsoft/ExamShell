/** Índice do primeiro caractere diferente entre as saídas, ou -1 se iguais. */
export function firstDiffIndex(expected: string, actual: string): number {
  const n = Math.min(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    if (expected[i] !== actual[i]) return i;
  }
  return expected.length === actual.length ? -1 : n;
}

/** Verdadeiro quando as saídas diferem apenas em quebras de linha finais. */
export function onlyNewlineDiff(expected: string, actual: string): boolean {
  if (expected === actual) return false;
  return expected.replace(/\n+$/, '') === actual.replace(/\n+$/, '');
}

function catChar(c: number): string {
  if (c === 10) return '$\n';
  if (c < 32) return '^' + String.fromCharCode(c + 64); // inclui TAB como ^I (estilo cat -A)
  if (c === 127) return '^?';
  if (c >= 128 && c <= 255) return 'M-' + catChar(c - 128);
  return String.fromCharCode(c);
}

/** Torna caracteres invisíveis visíveis (estilo `cat -A`: TAB vira ^I). */
export function catE(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) out += catChar(s.charCodeAt(i));
  return out;
}

/** Extrai os nomes de símbolos indefinidos (linhas `U nome`) da saída do `nm`. */
export function parseNmUndefined(nmOut: string): string[] {
  const names: string[] = [];
  for (const line of nmOut.split('\n')) {
    const m = /^\s*U\s+(\S+)\s*$/.exec(line);
    if (m) names.push(m[1]);
  }
  return names;
}

const COMPILER_BUILTINS = ['memset', 'memcpy', 'memmove'];

/** Símbolos usados que não são permitidos, ordenados e sem repetição. */
export function findForbidden(symbols: string[], allowed: string[], sources: string[]): string[] {
  const result = new Set<string>();
  for (const sym of symbols) {
    if (sym.startsWith('__') || allowed.includes(sym)) continue;
    if (COMPILER_BUILTINS.includes(sym)) {
      const call = new RegExp('\\b' + sym + '\\s*\\(');
      if (!sources.some((s) => call.test(s))) continue;
    }
    result.add(sym);
  }
  return [...result].sort();
}

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

/** Extrai os nomes de símbolos (última coluna) da saída de `nm --defined-only`. */
export function parseNmDefined(nmOut: string): string[] {
  const names: string[] = [];
  for (const line of nmOut.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) names.push(parts[parts.length - 1]);
  }
  return names;
}

/** `main` pode sair como `main`, `__main_argc_argv` (com argc/argv) ou `__original_main` (void) em wasm32-wasi. */
export const MAIN_SYMBOLS = ['main', '__main_argc_argv', '__original_main'];

export const definesMain = (symbols: string[]): boolean => symbols.some((s) => MAIN_SYMBOLS.includes(s));

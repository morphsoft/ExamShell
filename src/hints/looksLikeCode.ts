const CODE_RE = /[;{}]|==|\+\+|--|\b(while|if|for)\s*\(|\breturn\b/;

/** Heurística: o texto parece conter código C? Dicas nunca podem passar nisso. */
export function looksLikeCode(text: string): boolean {
  return CODE_RE.test(text);
}

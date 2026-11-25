type Rule = { re: RegExp; text: (m: RegExpExecArray) => string };

const RULES: Rule[] = [
  { re: /unused variable '([^']+)'/, text: (m) => `A variável '${m[1]}' foi declarada mas nunca é usada. Use-a ou remova-a.` },
  { re: /unused parameter '([^']+)'/, text: (m) => `O parâmetro '${m[1]}' não é usado dentro da função. Use-o ou remova-o da assinatura.` },
  { re: /variable '([^']+)' set but not used/, text: (m) => `A variável '${m[1]}' recebe um valor, mas esse valor nunca é lido. Confira se ela é mesmo necessária.` },
  { re: /call to undeclared function '([^']+)'/, text: (m) => `A função '${m[1]}' é chamada sem ter sido declarada antes. Veja se o nome está certo e se ela está definida acima do uso.` },
  { re: /use of undeclared identifier '([^']+)'/, text: (m) => `O nome '${m[1]}' não foi declarado neste ponto. Confira a grafia e o escopo.` },
  { re: /non-void function does not return a value/, text: () => 'Uma função que promete devolver um valor termina sem dar return. Confira todos os caminhos dela.' },
  { re: /expected ';'/, text: () => "O compilador esperava um ';' aqui. Olhe o fim desta linha e da anterior." },
  { re: /missing terminating (.)/, text: (m) => `Falta fechar o literal: o compilador não achou o ${m[1]} de fechamento. Confira as aspas.` },
  { re: /incompatible pointer types[^\n]*?'([^']+)'[^\n]*?'([^']+)'/, text: (m) => `Os tipos de ponteiro não combinam: '${m[1]}' e '${m[2]}'. Veja o tipo que a função espera.` },
  { re: /incompatible pointer types/, text: () => 'Os tipos de ponteiro não combinam. Veja o tipo que a função espera.' },
  { re: /comparison of integers of different signs/, text: () => 'Você compara um inteiro com sinal com um sem sinal (sinal diferente). Confira os tipos dos dois lados.' },
  { re: /variable '([^']+)' is uninitialized when used here/, text: (m) => `A variável '${m[1]}' é usada antes de receber um valor. Inicialize-a antes do uso.` },
  { re: /format specifies type '([^']+)' but the argument has type '([^']+)'/, text: (m) => `O formato espera '${m[1]}', mas o argumento é '${m[2]}'. Alinhe o formato com o tipo.` },
];

/** Explicações em português para erros conhecidos do clang; vazio se nada casar. */
export function explainClangError(stderr: string): string[] {
  const out: string[] = [];
  for (const line of stderr.split('\n')) {
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (m) {
        const t = rule.text(m);
        if (!out.includes(t)) out.push(t);
        break;
      }
    }
  }
  return out;
}

export function classifyLinkError(stderr: string): { reason: 'duplicate-main' | 'missing-symbol' | 'other'; symbol?: string } {
  if (/duplicate symbol: main\b/.test(stderr)) return { reason: 'duplicate-main' };
  const m = /undefined symbol: (\S+)/.exec(stderr);
  if (m) return { reason: 'missing-symbol', symbol: m[1] };
  return { reason: 'other' };
}

# ExamShell Rank 02: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um site estático em que o cadete escolhe ou sorteia exercícios do Rank 02, escreve C no navegador, compila com Clang em WebAssembly, roda testes e recebe feedback de onde quebrou, com dicas em camadas e nunca a solução.

**Architecture:** É um app React (Vite + TS) publicado como arquivos estáticos. O motor tem duas partes:
- um compilador (`@yowasp/clang`), que roda num Web Worker de vida longa e baixa o `.wasm` comprimido uma única vez (Cache API);
- um executor (`@bjorn3/browser_wasi_shim`), que roda num Worker descartável, encerrado quando o tempo estoura.

A lógica de correção (`grade`) é pura e recebe o motor por injeção. Por isso ela é testada com um motor falso, e também com o motor real no Node. O conteúdo de cada exercício fica em arquivos de dados. As saídas esperadas são geradas fora do site, com gcc no Linux, a partir de soluções de referência que nunca são publicadas.

**Tech Stack:** Vite, React 18, TypeScript, Vitest (+ jsdom), Playwright (Chromium + Firefox), CodeMirror 6 (`@codemirror/lang-cpp`, `@replit/codemirror-vim`), `@yowasp/clang`, `@bjorn3/browser_wasi_shim`, zod, `@fontsource/jetbrains-mono`, Python 3 + gcc (geração de saídas esperadas), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-25-examshell-rank02-design.md`

## Global Constraints

- Hospedagem estática, **sem backend**. Tudo roda no navegador.
- O site publicado **nunca** contém soluções de referência. **As dicas nunca contêm código** (validado por `looksLikeCode`).
- Compila com **`-Wall -Wextra -Werror`**. No grademe, função fora da lista de permitidas reprova.
- Interface e dicas em **português**. Enunciados em **inglês**, com tradução para o português.
- Navegadores obrigatórios: **Chrome, Edge e Firefox recentes**. Safari é *best effort*.
- Visual "Examshell, só que gentil":
  - **JetBrains Mono** em tudo;
  - fundo `#0E1621`, texto `#D8E1E8`, ciano `#00BABC`, âmbar `#F2B84B` (dicas), vermelho `#FF6B6B` (falhas), rótulo `#5F7488`, painel `#13202E`, borda `#1F2C3B`.
- **Falhar não bloqueia nem penaliza.** O relógio do modo aleatório (3h) é só informativo.
- Progresso só no `localStorage`, com botão de **limpar progresso**.
- Nenhum arquivo publicado pode passar de 100 MB. O `.wasm` grande é publicado **comprimido (gzip)** e descomprimido no navegador.
- Tempo limite por teste: **2000 ms**.
- Todo arquivo de solução de referência começa com a linha sentinela `/* EXAMSHELL-REFERENCE: nunca publicar */`.
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Falha no download do compilador (offline, conexão caiu no meio).** Esperado: mensagem clara com "tentar de novo", nada corrompido no cache, e a nova tentativa funciona. O teste está na Task 4.
2. **`localStorage` indisponível, cheio ou com JSON corrompido** (modo privado, cota estourada). Esperado: o site funciona sem salvar, sem tela branca. O teste está na Task 7.
3. **Saída gigante** (um `while (1) write(...)` ou impressão de MBs). Esperado: a saída capturada é cortada em 64 KB com a marca `truncated`, e a aba não trava. O teste está na Task 3.
4. **Argumentos com aspas, espaços, tabs ou string vazia no campo "rodar"** (`"" "a b"`, `$'\t'`). Esperado: tudo é repassado como no bash. O teste está na Task 9 (`parseArgs`).
5. **Bytes não imprimíveis na saída** (`\0`, tab, bytes ≥ 128). Esperado: o diff é legível no estilo `cat -e` (`^@`, `^I`, `M-i`). O teste está na Task 2 (`catE`).

---

## Estrutura de arquivos

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts
index.html                       # app
engine-check.html                # página mínima do teste no navegador (Task 4)
.github/workflows/deploy.yml
scripts/
  prepare-clang.mjs              # copia/comprime @yowasp/clang/gen → public/clang (gitignored)
  gen_expected.py                # gcc no Linux: referência (+ harness) → content/**/expected.json
  check-no-reference.mjs         # falha o build se algo de reference/ estiver em dist/
src/
  engine/
    types.ts                     # todos os tipos compartilhados
    rewriteLong.ts               # long → _L64 (long long), e volta nos diagnósticos
    compare.ts                   # firstDiffIndex, onlyNewlineDiff, catE
    forbidden.ts                 # parseNmUndefined, findForbidden
    clangErrors.ts               # explainClangError, classifyLinkError
    compiler.ts                  # createCompiler(clang) → Compiler (flags fixas)
    runner.ts                    # runWasm (WASI shim), sem timeout
    clangFetchShim.ts            # fetch do .gz + DecompressionStream + Cache API + progresso
    compiler.worker.ts
    runner.worker.ts
    browserEngine.ts             # Engine do navegador (workers, timeout, retry)
    grade.ts                     # grade(), runOnce()
    parseArgs.ts                 # argumentos estilo shell
  hints/
    looksLikeCode.ts
    genericHints.ts
    hintsFor.ts
  content/
    rank02Catalog.ts             # 57 entradas (apêndice A): fonte única de metadados
    schema.ts                    # zod do exercise.json
    loadExercises.ts             # import.meta.glob → LoadedExercise[]
  state/
    storage.ts, progress.ts, rng.ts, randomSession.ts
  ui/
    theme.css, App.tsx, router.ts, engineContext.tsx
    screens/  Home.tsx, PracticeList.tsx, ExerciseScreen.tsx, RandomScreen.tsx, SummaryScreen.tsx
    components/  TopBar.tsx, StatusBar.tsx, SubjectPane.tsx, CodeEditor.tsx, EditorTabs.tsx,
                 RunBar.tsx, LogPane.tsx, HintBlock.tsx, CompilerLoader.tsx, Timer.tsx
  main.tsx, engine-check.ts
content/rank02/<id>/
  exercise.json                  # tests, hints, starter (à mão)
  subject.en.txt, subject.pt.txt
  harness.c                      # só exercícios de função (main de teste, público)
  expected.json                  # GERADO por gen_expected.py (commitado)
reference/rank02/<id>/*.c|*.h    # soluções: NUNCA no site
tests/
  unit/      (vitest, rápido)
  engine/    (vitest, Clang real no Node)
  content/   (vitest, valida os 57 exercícios)
  e2e/       (playwright)
  support/nodeEngine.ts
```

---

### Task 1: Esqueleto do projeto, tipos e reescrita de `long`

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `.gitignore`
- Create: `src/engine/types.ts`, `src/engine/rewriteLong.ts`
- Test: `tests/unit/rewriteLong.test.ts`

**Interfaces:**
- Produces: todos os tipos abaixo (`src/engine/types.ts`), mais `rewriteLong`, `restoreLongInDiagnostics`, `LONG_MACRO`, `PRELUDE_HEADER` e `PRELUDE`.

- [ ] **Step 1: `git init` e esqueleto**

`git init -b main`. `npm init -y`. Dependências:
- `react react-dom`;
- dev: `vite @vitejs/plugin-react typescript vitest jsdom @types/react @types/react-dom`.

`.gitignore`: `node_modules/`, `dist/`, `public/clang/`, `.superpowers/`, `test-results/`, `playwright-report/`.

`vite.config.ts`: `base: './'`, plugin React.

`vitest.config.ts` com `test.projects`:
- `unit`: `tests/unit/**/*.test.ts(x)`, environment `node`;
- `engine`: `tests/engine/**`, `testTimeout: 120000`;
- `content`: `tests/content/**`, `testTimeout: 600000`.

Scripts:
- `dev`, `build` (`tsc -b && vite build`), `preview`;
- `test` (`vitest run --project unit`), `test:engine`, `test:content`.

`src/main.tsx` renderiza `<h1>examshell</h1>` (é substituído na Task 8).

- [ ] **Step 2: Escrever `src/engine/types.ts`** (contrato usado por todas as tasks)

```ts
export type Level = 1 | 2 | 3 | 4;
export type SourceFiles = Record<string, string>;            // nome → conteúdo

export interface CatalogEntry {
  id: string; level: Level; kind: 'program' | 'function';
  expectedFiles: string[];          // abas editáveis, na ordem; a 1ª é o .c principal
  allowedFunctions: string[];
  prototype?: string;               // só 'function'
}
export interface TestCase {
  id: string;                       // "t01".."t15"
  args: string[];                   // argv[1..]; em 'function' = [String(índice do caso no harness)]
  stdin?: string;
  category: string;                 // kebab-case em PT, ex.: "espacos-no-inicio"
  display?: string;                 // obrigatório em 'function', ex.: 'ft_strlen("")'
}
export type HintLadder = [string, string, string];
export interface ExerciseContent {
  tests: TestCase[];
  hints: Record<string, HintLadder>; // por category
  starter?: SourceFiles;             // conteúdo inicial de algum expectedFile (ex.: struct do subject)
}
export interface LoadedExercise extends CatalogEntry, ExerciseContent {
  subject: { en: string; pt: string };
  harness?: string;                  // 'function'
  expected: Record<string, { stdout: string }>; // por test.id; bytes como chars latin1
}

export interface RunResult {
  stdout: string;                    // bytes → chars latin1, cortado em STDOUT_LIMIT
  truncated?: boolean;
  outcome: 'exit' | 'crash' | 'timeout';
  exitCode?: number;
  trapMessage?: string;
  trapStack?: string;
}
export type CompileOutcome =
  | { ok: true; objects: Record<string, Uint8Array>; stderr: string }
  | { ok: false; stderr: string };
export type LinkOutcome =
  | { ok: true; wasm: Uint8Array; stderr: string }
  | { ok: false; stderr: string };
export interface RunSession {
  run(test: Pick<TestCase, 'args' | 'stdin'>, timeoutMs: number): Promise<RunResult>;
  dispose(): void;
}
export interface Engine {
  compileObjects(sources: SourceFiles, headers: SourceFiles): Promise<CompileOutcome>;
  undefinedSymbols(objects: Record<string, Uint8Array>): Promise<string[]>;
  link(objects: Record<string, Uint8Array>, extraSources: SourceFiles, headers: SourceFiles): Promise<LinkOutcome>;
  openRunSession(wasm: Uint8Array, programName: string): RunSession;
}

export type Failure =
  | { kind: 'compile'; stderr: string }
  | { kind: 'forbidden'; functions: string[] }
  | { kind: 'link'; reason: 'duplicate-main' | 'missing-symbol' | 'other'; symbol?: string; stderr: string }
  | { kind: 'wrong-output'; test: TestCase; index: number; expected: string; actual: string; diffIndex: number; truncated: boolean }
  | { kind: 'crash'; test: TestCase; index: number; trapMessage: string; line?: { file: string; line: number } }
  | { kind: 'timeout'; test: TestCase; index: number };
export interface GradeResult { passed: number; total: number; failure: Failure | null }
```

- [ ] **Step 3: Escrever os testes que falham em `tests/unit/rewriteLong.test.ts`**

```ts
expect(rewriteLong('long n;')).toBe('_L64 n;');
expect(rewriteLong('unsigned long x;')).toBe('unsigned _L64 x;');
expect(rewriteLong('long long y;')).toBe('long long y;');
expect(rewriteLong('long double z;')).toBe('long double z;');
expect(rewriteLong('// long\n/* long */ "long" int longest;')).toBe('// long\n/* long */ "long" int longest;');
expect(rewriteLong('long\nint a;')).toBe('_L64\nint a;');
// mesmo número de linhas e mesmo comprimento por linha (colunas dos diagnósticos não mudam)
const src = 'int f(long a)\n{\n\tlong b = a;\n\treturn ((int)b);\n}\n';
expect(rewriteLong(src).split('\n').map(l => l.length)).toEqual(src.split('\n').map(l => l.length));

const diag =
  "main.c:3:7: error: unused variable 'n' [-Werror,-Wunused-variable]\n" +
  "    3 |       _L64 n;\n      |            ^\n" +
  "./__examshell.h:1:14: note: expanded from macro '_L64'\n" +
  "    1 | #define _L64 long long\n      |              ^\n" +
  "main.c:4:9: error: incompatible integer to pointer conversion initializing 'char *' with an expression of type 'long long'\n";
const out = restoreLongInDiagnostics(diag, false);
expect(out).toContain('long n;');
expect(out).not.toContain('_L64');
expect(out).not.toContain('__examshell.h');
expect(out).toContain("of type 'long'");
expect(restoreLongInDiagnostics(diag, true)).toContain("of type 'long long'");
```

- [ ] **Step 4: Rodar e ver falhar.** Comando: `npx vitest run --project unit tests/unit/rewriteLong.test.ts`. Esperado: FAIL (módulo não existe).

- [ ] **Step 5: Implementar `src/engine/rewriteLong.ts`**

Constantes:
- `LONG_MACRO = '_L64'`
- `PRELUDE_HEADER = '__examshell.h'`
- `PRELUDE = '#define _L64 long long\n'`

`rewriteLong(src: string): string`: um scanner de caracteres. Ele copia comentários (`//`, `/* */`), strings e literais de char sem mexer. Um token identificador exatamente igual a `long` vira `_L64`, a não ser que o token significativo anterior ou o seguinte seja `long`, ou que o seguinte seja `double`.

`restoreLongInDiagnostics(stderr: string, userWroteLongLong: boolean): string`:
- remove cada linha que contém `__examshell.h`, junto com as linhas de trecho seguintes (as que casam com `/^\s*\d*\s*\|/`);
- troca `_L64` por `long`;
- se `!userWroteLongLong`, troca `'long long'` por `'long'` e `unsigned long long` por `unsigned long`.

- [ ] **Step 6: Rodar e ver passar.** Mesmo comando. Esperado: PASS.

- [ ] **Step 7: Commit** (inclui `docs/` com spec e plano)

```bash
git add -A && git commit -m "chore: esqueleto do projeto, tipos do motor e reescrita de long"
```

---

### Task 2: Comparação de saída, funções proibidas e explicação de erros

**Files:**
- Create: `src/engine/compare.ts`, `src/engine/forbidden.ts`, `src/engine/clangErrors.ts`
- Test: `tests/unit/compare.test.ts`, `tests/unit/forbidden.test.ts`, `tests/unit/clangErrors.test.ts`

**Interfaces:**
- Produces:
  - `firstDiffIndex(expected: string, actual: string): number` (retorna -1 se iguais)
  - `onlyNewlineDiff(expected: string, actual: string): boolean`
  - `catE(s: string): string`
  - `parseNmUndefined(nmOut: string): string[]`
  - `findForbidden(symbols: string[], allowed: string[], sources: string[]): string[]`
  - `explainClangError(stderr: string): string[]`
  - `classifyLinkError(stderr: string): { reason: 'duplicate-main' | 'missing-symbol' | 'other'; symbol?: string }`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// compare
expect(firstDiffIndex('abc\n', 'abc\n')).toBe(-1);
expect(firstDiffIndex('abc\n', 'abd\n')).toBe(2);
expect(firstDiffIndex('abc\n', 'abc')).toBe(3);
expect(firstDiffIndex('', 'x')).toBe(0);
expect(onlyNewlineDiff('lorem\n', 'lorem')).toBe(true);
expect(onlyNewlineDiff('lorem\n', 'lorem\n\n')).toBe(true);
expect(onlyNewlineDiff('a\n', 'b\n')).toBe(false);
expect(onlyNewlineDiff('a\n', 'a\n')).toBe(false);
expect(catE('a\tb\n')).toBe('a^Ib$\n');
expect(catE('\0')).toBe('^@');
expect(catE('\x7f')).toBe('^?');
expect(catE('é')).toBe('M-i');          // byte 0xE9

// forbidden
expect(parseNmUndefined('         U __stack_pointer\n         U printf\n         U write\n'))
  .toEqual(['__stack_pointer', 'printf', 'write']);
expect(findForbidden(['__stack_pointer', 'printf', 'write'], ['write'], [''])).toEqual(['printf']);
expect(findForbidden(['memset', 'write'], ['write'], ['char b[200] = {0};'])).toEqual([]);
expect(findForbidden(['memset', 'write'], ['write'], ['memset(b, 0, 10);'])).toEqual(['memset']);
expect(findForbidden(['puts', 'printf', 'puts'], [], [''])).toEqual(['printf', 'puts']);

// clangErrors
expect(explainClangError("main.c:2:22: error: unused variable 'x' [-Werror,-Wunused-variable]")[0]).toContain('x');
expect(explainClangError("main.c:5:3: error: call to undeclared function 'ft_putchar'; ISO C99 and later do not support implicit function declarations [-Wimplicit-function-declaration]")[0]).toContain('ft_putchar');
expect(explainClangError('main.c:1:1: error: something nobody maps')).toEqual([]);
expect(classifyLinkError('wasm-ld: error: duplicate symbol: main\n>>> defined in a.o')).toEqual({ reason: 'duplicate-main' });
expect(classifyLinkError('wasm-ld: error: a.o: undefined symbol: ft_strlen')).toEqual({ reason: 'missing-symbol', symbol: 'ft_strlen' });
expect(classifyLinkError('wasm-ld: error: whatever')).toEqual({ reason: 'other' });
```

- [ ] **Step 2: Rodar e ver falhar.** Comando: `npm test`. Esperado: FAIL.

- [ ] **Step 3: Implementar.**

`catE` segue o `cat -e` do GNU:
- `\n` vira `$\n`;
- caracteres de controle `c < 32` (exceto `\n`) viram `^` + `String.fromCharCode(c + 64)`;
- 127 vira `^?`;
- de 128 a 255 vira `M-` + `catE` do caractere `c - 128`.

`findForbidden`:
- ignora nomes que começam com `__`;
- ignora `memset`, `memcpy` e `memmove` só quando nenhum dos `sources` casa com `\b<nome>\s*\(`;
- devolve a lista ordenada e sem repetição.

`explainClangError` cobre pelo menos estes padrões. Cada explicação é uma frase curta em português que cita o identificador:
- `unused variable`, `unused parameter`, `set but not used`
- `call to undeclared function`, `use of undeclared identifier`
- `non-void function does not return a value`
- `expected ';'`, `missing terminating`
- `incompatible pointer types`, `comparison of integers of different signs`
- `is uninitialized when used here`, `format specifies type`

- [ ] **Step 4: Rodar e ver passar.** Comando: `npm test`. Esperado: PASS.

- [ ] **Step 5: Commit.** Mensagem: `feat(engine): diff de saída, funções proibidas e explicação de erros`.

---

### Task 3: Compilador e executor no Node (Clang real)

**Files:**
- Create: `src/engine/compiler.ts`, `src/engine/runner.ts`, `tests/support/nodeEngine.ts`
- Test: `tests/engine/engine.test.ts`

**Interfaces:**
- Consumes: `rewriteLong`, `restoreLongInDiagnostics`, `PRELUDE`, `PRELUDE_HEADER` (Task 1); tipos da Task 1.
- Produces:
  - `ClangModule = { runClang: Command; runLLVM: Command }`, com o mesmo formato de `@yowasp/clang`;
  - `createCompiler(clang: ClangModule): Pick<Engine, 'compileObjects' | 'undefinedSymbols' | 'link'>`;
  - `runWasm(module: WebAssembly.Module, test: Pick<TestCase, 'args' | 'stdin'>, programName: string): Promise<RunResult>`, que nunca devolve `'timeout'`;
  - `STDOUT_LIMIT = 65536`;
  - `createNodeEngine(): Promise<Engine>` (em `tests/support/nodeEngine.ts`; o `openRunSession` roda inline, sem timeout).

- [ ] **Step 1: Instalar** `@yowasp/clang` (dependency) e `@bjorn3/browser_wasi_shim`.

- [ ] **Step 2: Escrever os testes que falham em `tests/engine/engine.test.ts`** (o `beforeAll` cria um engine com `createNodeEngine()`; o helper `build(src)` faz compileObjects + link de `{'main.c': src}` e roda via `openRunSession(wasm, './prog')`)

| teste | entrada | esperado |
|---|---|---|
| `compila e roda` | `first_word` correto, args `["  lorem,ipsum  "]` | `{ outcome: 'exit', exitCode: 0, stdout: 'lorem,ipsum\n' }` |
| `-Werror reprova` | `int main(void){int x; return 0;}` | `compileObjects` → `ok: false`, `stderr` contém `unused variable 'x'` |
| `NULL vira crash` | `char *p = 0; p[0] = 'x';` no main | `outcome: 'crash'` |
| `recursão infinita vira crash` | recursão sem base (com `buf[64]` usado, para não cair no `-Winfinite-recursion`) | `outcome: 'crash'` |
| `long tem 64 bits` | imprime `sizeof(long)` com `write` e `'0' + n` | `stdout: '8'` |
| `INT_MIN com long` | `long n = -2147483648; n = -n;` + putnbr próprio | `stdout: '2147483648'` |
| `diagnóstico sem _L64` | `int main(void){long n; return 0;}` | stderr contém `long n;` e não contém `_L64` |
| `nm lista símbolos` | programa usando `printf` e `write` | `undefinedSymbols` contém `printf` e `write` |
| `stdin` | eco de `read(0, …)` | `stdin: 'abc'` → `stdout: 'abc'` |
| `pilha de 8 MB` | `char buf[1000000]; buf[999999] = 'a'; write(1, &buf[999999], 1);` | `stdout: 'a'` |
| `saída gigante é cortada` | `for (i = 0; i < 200000; i++) write(1, "xxxxxxxx", 8);` | `stdout.length === 65536`, `truncated === true` |
| `main duplicado` | `link` com objeto que tem `main` + extraSources `{'__harness.c': 'int main(void){return 0;}'}` | `ok: false`, `classifyLinkError(stderr).reason === 'duplicate-main'` |
| `ponteiro de função sem protótipo` | `int (*cmp)(); … cmp(a, b)` | compila (`ok: true`) |

- [ ] **Step 3: Rodar e ver falhar.** Comando: `npm run test:engine`. Esperado: FAIL.

- [ ] **Step 4: Implementar `src/engine/compiler.ts`**

Flags exatas:
```ts
export const COMPILE_FLAGS = ['-std=gnu17', '-O0', '-g', '-Wall', '-Wextra', '-Werror',
  '-Wno-deprecated-non-prototype', '-fno-color-diagnostics',
  '-fsanitize=null,bounds', '-fsanitize-trap=all', '-include', PRELUDE_HEADER];
export const LINK_FLAGS = ['-Wl,-z,stack-size=8388608', '-Wl,--stack-first'];
```

- `compileObjects`:
  - aplica `rewriteLong` a cada source;
  - chama `runClang(['clang', ...COMPILE_FLAGS, '-c', ...nomes])`, com uma árvore que tem sources, headers e `{[PRELUDE_HEADER]: PRELUDE}`;
  - captura o stderr pelo callback `stderr`;
  - na exceção `Exit`, devolve `ok: false`;
  - pega da árvore devolvida os `*.o`;
  - passa o stderr por `restoreLongInDiagnostics(stderr, /\blong\s+long\b/.test(todasAsSources))`;
  - usa `fetchProgress: () => {}` para não poluir o console.
- `undefinedSymbols`: roda `runLLVM(['nm', '-u', ...objetos])` e aplica `parseNmUndefined`.
- `link`: roda `runClang(['clang', ...COMPILE_FLAGS, ...extraSources, ...objetos, '-o', 'a.out', ...LINK_FLAGS])`, também com `rewriteLong` nos extraSources.

- [ ] **Step 5: Implementar `src/engine/runner.ts`**

Usa `WASI` do `@bjorn3/browser_wasi_shim` com:
- `args = [programName, ...test.args]`, sem env;
- fds `[OpenFile(new File(bytes(stdin ?? ''))), ConsoleStdout coletor, ConsoleStdout que descarta]`.

O coletor converte bytes em chars latin1 e para de acumular ao chegar em `STDOUT_LIMIT` (marca `truncated`).

Resultado:
- `WASIProcExit` (ou retorno normal de `wasi.start`) dá `outcome: 'exit'`;
- qualquer outra exceção dá `outcome: 'crash'`, com `trapMessage = e.message` e `trapStack = e.stack`.

- [ ] **Step 6: Implementar `tests/support/nodeEngine.ts`**

Faz `createCompiler(await import('@yowasp/clang'))`. O `openRunSession` compila o módulo uma vez e chama `runWasm` a cada `run`.

- [ ] **Step 7: Rodar e ver passar.** Comando: `npm run test:engine`. Esperado: PASS (o primeiro carregamento do Clang leva alguns segundos).

- [ ] **Step 8: Commit.** Mensagem: `feat(engine): compilador e executor com Clang wasm`.

---

### Task 4: Motor no navegador + teste de viabilidade (PONTO DE PARADA)

**Files:**
- Create: `scripts/prepare-clang.mjs`, `src/engine/clangFetchShim.ts`, `src/engine/compiler.worker.ts`, `src/engine/runner.worker.ts`, `src/engine/browserEngine.ts`, `engine-check.html`, `src/engine-check.ts`, `playwright.config.ts`
- Modify: `vite.config.ts` (multi-page: `index.html` + `engine-check.html`), `package.json`
- Test: `tests/e2e/engine.spec.ts`

**Interfaces:**
- Consumes: `createCompiler`, `runWasm` (Task 3).
- Produces:
  - `LoadProgress = { loadedBytes: number; totalBytes: number; fromCache: boolean }`
  - `BrowserEngine = Engine & { ready(): Promise<void>; status(): 'loading' | 'ready' | 'error'; retry(): void }`
  - `createBrowserEngine(opts: { clangBaseUrl: string; onProgress?(p: LoadProgress): void; onStatus?(s: 'loading' | 'ready' | 'error'): void }): BrowserEngine`

- [ ] **Step 1: `scripts/prepare-clang.mjs`**

Copia de `node_modules/@yowasp/clang/gen/` para `public/clang/`:
- `bundle.js`, `llvm.core2.wasm`, `llvm.core3.wasm` e `llvm.core4.wasm`, sem mexer;
- `llvm.core.wasm.gz` e `llvm-resources.tar.gz`, com `zlib.gzipSync`, nível 9;
- `manifest.json` com `{ version, gz: { 'llvm.core.wasm': bytes, 'llvm-resources.tar': bytes } }`.

Não refaz nada se o `version` do manifesto for igual ao do pacote. Adicionar os scripts `predev` e `prebuild` apontando para ele. O `.tar` não é enxugado: são 4,3 MB com gzip, e reempacotar arrisca quebrar o parser de tar do YoWASP. Isso é um desvio consciente da spec 6.6.

- [ ] **Step 2: `src/engine/clangFetchShim.ts`**

`installClangFetchShim(opts: { cacheName: string; manifest: { gz: Record<string, number> }; onProgress(p: LoadProgress): void }): void` substitui `globalThis.fetch`. Para URLs cujo pathname termina em `/llvm.core.wasm` ou `/llvm-resources.tar`, o shim:
- procura `<url>.gz` na Cache API;
- se não achar, baixa da rede, reporta o progresso por bytes lidos contra `manifest.gz[nome]` e só grava no cache depois que o download termina inteiro;
- descomprime com `DecompressionStream('gzip')`;
- devolve uma `Response` com `content-type` `application/wasm` (ou `application/x-tar`).

As outras URLs passam direto. `cacheName = 'examshell-clang-' + version`. Na inicialização, apaga os caches `examshell-clang-*` de versões antigas.

- [ ] **Step 3: Workers e `browserEngine.ts`**

`compiler.worker.ts`:
- recebe `{ type: 'init', clangBaseUrl }`;
- carrega `manifest.json`, instala o shim e faz `await import(/* @vite-ignore */ clangBaseUrl + 'bundle.js')`;
- faz uma compilação de aquecimento (`int main(void){return 0;}`);
- responde `ready` ou `{ type: 'error', message }`;
- depois atende `{ id, op: 'compileObjects' | 'undefinedSymbols' | 'link', args }` com `createCompiler`.

`runner.worker.ts`: recebe `{ module, test, programName }`, chama `runWasm` e devolve o `RunResult`.

`browserEngine.ts`:
- cria o compiler worker (`type: 'module'`) e repassa progresso e status;
- `retry()` recria o worker;
- `openRunSession` faz `WebAssembly.compile(wasm)` uma vez e reaproveita um runner worker;
- `run(test, timeoutMs)` arma um timer; se ele estourar, faz `terminate()`, resolve `{ stdout: '', outcome: 'timeout' }` e recria o worker de forma preguiçosa na próxima chamada;
- `dispose()` encerra o worker.

- [ ] **Step 4: `engine-check.html` + `src/engine-check.ts`**

A página lê `?scenario=` e usa `createBrowserEngine({ clangBaseUrl: new URL('clang/', location.href).href })`. Ela mostra:
- `#status` (`loading`, `ready` ou `error`);
- `#error` com um botão `#retry` (que chama `retry()`) quando o status é `error`;
- `#timing` com `performance.now()` no `ready`;
- o JSON do resultado em `#result`.

Os cenários são os C inline da Task 3:
- `first_word-ok` (args `["  lorem,ipsum  "]`)
- `first_word-bug` (não pula os espaços do início)
- `werror`
- `null-write`
- `long-size`
- `infinite-then-ok`: `while(1);` com 2000 ms e depois `first_word-ok`; devolve `{ first, second }`

- [ ] **Step 5: Escrever os testes Playwright que falham**

`playwright.config.ts`:
- projetos `chromium` e `firefox`;
- `webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173' }`;
- `timeout: 120000`.

Em `tests/e2e/engine.spec.ts` (os testes leem `#result` e fazem `JSON.parse`):
- `first_word-ok` → `stdout === 'lorem,ipsum\n'`; `first_word-bug` → `stdout === '\n'`
- `werror` → `ok === false`, com `stderr` contendo `unused variable`
- `null-write` → `outcome === 'crash'`
- `long-size` → `stdout === '8'`
- `infinite-then-ok` → `first.outcome === 'timeout'` e `second.stdout === 'lorem,ipsum\n'`
- **só no Chromium**, `carga a 10 Mbps`:
  - contexto novo, com CDP `Network.emulateNetworkConditions({ offline: false, latency: 20, downloadThroughput: 1310720, uploadThroughput: 1310720 })`;
  - `#status` precisa virar `ready` em menos de 60000 ms;
  - depois de `page.reload()` sem throttle, `#timing` < 5000.
- `download falha e tentar de novo funciona`:
  - `page.route('**/llvm.core.wasm.gz', r => r.abort())` → `#error` visível;
  - `page.unroute(...)`, clicar em `#retry` → `#status` = `ready`.

- [ ] **Step 6: Rodar.** Comandos: `npx playwright install chromium firefox`, depois `npx playwright test tests/e2e/engine.spec.ts`. Esperado: PASS nos dois projetos.

- [ ] **Step 7: Conferência manual de memória.** Abrir `engine-check.html?scenario=first_word-ok` no Chrome e ver no Gerenciador de tarefas do navegador se a aba fica abaixo de ~2 GB. Anotar o valor na mensagem de commit.

- [ ] **Step 8: PONTO DE PARADA.**
  - Se algum teste falhar porque o navegador exige isolamento de origem (COOP/COEP), tentar o `coi-serviceworker`.
  - Se o Clang **não rodar** em algum dos dois navegadores, **parar e reportar ao usuário** antes de seguir. A spec proíbe trocar de abordagem sem ele.

- [ ] **Step 9: Commit.** Mensagem: `feat(engine): compilador no navegador com cache e timeout`.

---

### Task 5: Correção (`grade`), execução avulsa (`runOnce`) e escolha de dicas

**Files:**
- Create: `src/engine/grade.ts`, `src/hints/looksLikeCode.ts`, `src/hints/genericHints.ts`, `src/hints/hintsFor.ts`
- Test: `tests/unit/grade.test.ts` (motor falso), `tests/unit/hintsFor.test.ts`, `tests/engine/grade.engine.test.ts` (motor do Node)

**Interfaces:**
- Consumes: `Engine` e os tipos (Task 1); `firstDiffIndex`, `onlyNewlineDiff`, `findForbidden`, `classifyLinkError` (Task 2); `createNodeEngine` (Task 3).
- Produces:
  - `TIMEOUT_MS = 2000`
  - `grade(ex: LoadedExercise, userFiles: SourceFiles, engine: Engine, opts?: { timeoutMs?: number; onProgress?(done: number, total: number): void }): Promise<GradeResult>`
  - `runOnce(ex: LoadedExercise, userFiles: SourceFiles, scratch: { mainC?: string; args: string[]; stdin?: string }, engine: Engine): Promise<{ failure: Extract<Failure, { kind: 'compile' | 'link' }> | null; run?: RunResult }>`
  - `looksLikeCode(text: string): boolean`
  - `GENERIC_HINTS: Record<'compile' | 'forbidden' | 'duplicate-main' | 'missing-symbol' | 'crash' | 'timeout' | 'newline' | 'wrong-output', HintLadder>`
  - `hintsFor(failure: Failure, ex: LoadedExercise): HintLadder`

- [ ] **Step 1: Escrever os testes que falham** (o motor falso registra as chamadas)

`grade`:
- compile falha → `failure.kind === 'compile'` e `passed === 0`; `link` não é chamado;
- `undefinedSymbols` = `['write', 'printf']` com `allowedFunctions` = `['write']` → `{ kind: 'forbidden', functions: ['printf'] }`;
- link falha com `duplicate symbol: main` → `{ kind: 'link', reason: 'duplicate-main' }`;
- 3 testes, o 2º com saída errada → `passed === 1`, `failure.test.id === 't02'`, `diffIndex` correto e `run` chamado só 2 vezes;
- `run` devolve `timeout` → `kind: 'timeout'`; devolve `crash` → `kind: 'crash'`;
- todos passam → `failure === null` e `passed === total`;
- `dispose()` é chamado em todos os casos que chegam a abrir a sessão;
- exercício `function` → `link` recebe `extraSources` com a chave `'__harness.c'` igual a `ex.harness`;
- `programName === './' + ex.id`;
- só os arquivos de `ex.expectedFiles` entram (`.c` vira source, `.h` vira header); chaves extras de `userFiles` são ignoradas.

`runOnce`:
- `program` → `link` sem extraSources e `run` com `scratch.args`;
- `function` com `mainC` → extraSources `{ 'main.c': mainC }`.

`hintsFor` + `looksLikeCode`:
- wrong-output com categoria que tem escada → devolve a escada do exercício;
- wrong-output em que só o `\n` difere → `GENERIC_HINTS.newline`;
- crash → `GENERIC_HINTS.crash`;
- compile → `GENERIC_HINTS.compile`;
- link com `duplicate-main` → `GENERIC_HINTS['duplicate-main']`;
- `looksLikeCode('while (i < n)') === true`, `looksLikeCode('i++') === true`, `looksLikeCode('E se a string começar com espaços?') === false`;
- toda escada de `GENERIC_HINTS` tem 3 textos não vazios e nenhum passa em `looksLikeCode`.

`grade.engine.test.ts` (motor real, fixture inline de `first_word` com 3 testes e os `expected` escritos à mão):
- código com bug → `wrong-output` no teste de espaços do início;
- código correto → `failure === null`;
- código com `printf` → `forbidden`.

- [ ] **Step 2: Rodar e ver falhar.** Comandos: `npm test` e `npm run test:engine`. Esperado: FAIL.

- [ ] **Step 3: Implementar.**

`grade` segue a ordem da spec 6.1:
1. compilar;
2. checar funções proibidas (`findForbidden(symbols, ex.allowedFunctions, Object.values(sources))`);
3. linkar;
4. rodar os testes em sequência e parar na primeira falha.

Na comparação, `truncated` conta como saída errada.

`looksLikeCode` usa `/[;{}]|==|\+\+|--|\b(while|if|for)\s*\(|\breturn\b/`.

Os textos de `GENERIC_HINTS` seguem a escada da spec 6.3: (1) uma pergunta, (2) o conceito, (3) bem direta, sem código, sempre em tom de incentivo.

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit.** Mensagem: `feat: correção por testes e escolha de dicas`.

---

### Task 6: Formato do conteúdo, catálogo, geração das saídas esperadas e 5 exercícios-piloto

**Files:**
- Create: `src/content/rank02Catalog.ts`, `src/content/schema.ts`, `src/content/loadExercises.ts`, `scripts/gen_expected.py`
- Create: `content/rank02/{first_word,ft_strlen,inter,ft_list_size,ft_itoa}/…` e `reference/rank02/{…}/…`
- Test: `tests/content/content.test.ts`

**Interfaces:**
- Consumes: os tipos (Task 1); `grade`, `looksLikeCode` (Task 5); `createNodeEngine` (Task 3).
- Produces:
  - `RANK02_CATALOG: CatalogEntry[]` (as 57 entradas do Apêndice A, na ordem dele)
  - `exerciseContentSchema` (zod)
  - `loadExercises(): LoadedExercise[]` (só os que têm conteúdo, na ordem do catálogo)
  - `getExercise(id: string): LoadedExercise | undefined`
  - `byLevel(list: LoadedExercise[]): Record<Level, LoadedExercise[]>`
  - scripts npm `gen:expected` (`python3 scripts/gen_expected.py`) e `gen:expected:wsl` (`wsl python3 scripts/gen_expected.py`)

- [ ] **Step 1: `rank02Catalog.ts`**

Transcrever o Apêndice A literalmente. Nos exercícios com `.h`, o `starter` (no `exercise.json`) traz a `struct` exatamente como no subject.

No Rank 02, o exame não fornece nenhum header pronto: o cadete escreve o `.h`. Por isso a "aba somente leitura" da spec 6.2 não é usada aqui. O `starter` editável cumpre esse papel, e o suporte a header somente leitura fica para quando algum rank precisar.

- [ ] **Step 2: Escrever os testes que falham em `tests/content/content.test.ts`**

Testes globais:
- o catálogo tem 57 entradas, com 12/20/15/10 por nível;
- os ids são únicos.

Para cada exercício de `loadExercises()` (`describe.each`):
1. passa no `exerciseContentSchema`, e o `id` é o nome da pasta;
2. `subject.en` começa com `Assignment name  : <id>`, e `subject.pt` não está vazio;
3. tem de 6 a 15 testes, com ids únicos no formato `t\d\d`;
   - em `function`: todo teste tem `display`, e `args` é `[String(i)]` na ordem;
   - em `program`: existe ao menos 1 teste com `args: []`;
4. toda `category` usada tem uma escada de 3 dicas, e nenhuma dica passa em `looksLikeCode`;
5. `expected` tem uma entrada para cada `test.id`;
6. `reference/rank02/<id>/` existe, todo arquivo começa com a linha sentinela, e `grade(ex, arquivosDaReferência, nodeEngine)` dá `failure === null`.

- [ ] **Step 3: Rodar e ver falhar.** Comando: `npm run test:content`. Esperado: FAIL.

- [ ] **Step 4: `schema.ts` e `loadExercises.ts`**

`loadExercises` usa `import.meta.glob` (eager) para:
- `/content/rank02/*/exercise.json`
- `/content/rank02/*/expected.json`
- `/content/rank02/*/subject.{en,pt}.txt` com `?raw`
- `/content/rank02/*/harness.c` com `?raw`

Depois junta tudo com o catálogo (`{ ...catalogEntry, ...content, subject, harness, expected }`).

- [ ] **Step 5: `scripts/gen_expected.py`** (roda no Linux: WSL ou CI)

Uso: `python3 scripts/gen_expected.py [--check] [ids...]`. Para cada exercício:
1. compila `reference/rank02/<id>/*.c` (mais `content/rank02/<id>/harness.c`, se existir) com `gcc -Wall -Wextra -Werror -I reference/rank02/<id>` num diretório temporário;
2. roda cada teste com `subprocess.run([bin, *args], input=stdin_bytes, capture_output=True, timeout=5)`;
3. falha alto se o retorno for negativo (sinal) ou se houver timeout;
4. escreve `expected.json` como `{ "<testId>": { "stdout": stdout.decode('latin-1') } }`, com chaves ordenadas, `indent=2` e `ensure_ascii=True`.

Com `--check`, ele não escreve nada e sai com código 1 se algum arquivo mudaria.

- [ ] **Step 6: Conteúdo dos 5 pilotos**

Os pilotos são `first_word` (programa), `ft_strlen` (função), `inter` (programa, nível 2), `ft_list_size` (função + `ft_list.h`) e `ft_itoa` (malloc + `INT_MIN`). Cada um segue as **regras de conteúdo** abaixo.

O `first_word` usa exatamente estes testes, porque o e2e depende deles:

```json
{ "tests": [
  { "id": "t01", "args": ["FOR PONY"], "category": "basico" },
  { "id": "t02", "args": ["this        ...       is sparta, then again, yes!"], "category": "basico" },
  { "id": "t03", "args": ["   lorem,ipsum   "], "category": "espacos-no-inicio" },
  { "id": "t04", "args": ["\t \tlorem"], "category": "tabs" },
  { "id": "t05", "args": [], "category": "argumentos" },
  { "id": "t06", "args": ["a", "b"], "category": "argumentos" },
  { "id": "t07", "args": [""], "category": "string-vazia" },
  { "id": "t08", "args": ["      "], "category": "so-espacos" }
], "hints": { "basico": ["…", "…", "…"], "espacos-no-inicio": ["E se a string já começar com espaços?", "…", "…"] } }
```

**Regras de conteúdo** (valem para esta task e para as Tasks 12 a 16):
- `subject.en.txt` imita o formato da prova: as 3 linhas de cabeçalho (`Assignment name  :`, `Expected files   :`, `Allowed functions:`), uma linha de 80 `-`, o texto, e `Examples:` no estilo `$> ./x "..." | cat -e`. `subject.pt.txt` é a tradução, com os rótulos `Nome do exercício`, `Arquivos esperados` e `Funções permitidas`.
- Os primeiros testes reproduzem os exemplos do subject. Depois vêm as bordas que se aplicam: sem argumentos e com argumentos demais (programa), string vazia, só espaços, tabs, `INT_MIN`/`INT_MAX`, negativos, `0`, lista vazia, `NULL` quando o subject permitir.
- As categorias são kebab-case em português. Cada uma tem a escada de 3 dicas da spec 6.3: (1) uma pergunta, (2) o conceito, (3) bem direta, **sem código**.
- Exercício de função tem `harness.c` (`int main(int argc, char **argv)`, com `switch (atoi(argv[1]))` e um caso por teste). Ele imprime o resultado com `printf` num formato estável, usa `(null)` para `NULL` e libera o que for alocado. O `display` mostra a chamada como o cadete a escreveria.
- A referência fica em `reference/rank02/<id>/`, com os mesmos nomes de `expectedFiles`, e começa com a linha sentinela.

- [ ] **Step 7: Gerar e validar.** Comandos: `npm run gen:expected:wsl` e depois `npm run test:content`. Esperado: PASS para os 5 pilotos.

- [ ] **Step 8: Commit.** Mensagem: `feat(content): formato, catálogo do Rank 02 e 5 exercícios-piloto`.

---

### Task 7: Armazenamento, progresso e sessão aleatória

**Files:**
- Create: `src/state/storage.ts`, `src/state/progress.ts`, `src/state/rng.ts`, `src/state/randomSession.ts`
- Test: `tests/unit/storage.test.ts`, `tests/unit/progress.test.ts`, `tests/unit/randomSession.test.ts` (os dois primeiros com `// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `Level`, `SourceFiles` (Task 1).
- Produces:
  - `KEY_PREFIX = 'examshell:v1:'`
  - `readJson<T>(key: string, fallback: T): T`, `writeJson(key: string, value: unknown): boolean`, `removeAll(): void` (remove as chaves com o prefixo)
  - `ExerciseStatus = 'untried' | 'tried' | 'passed'`; `getProgress(): Record<string, ExerciseStatus>`; `markAttempt(id: string, passed: boolean): void`
  - `loadDraft(id): SourceFiles | null`, `saveDraft(id, files): void`, `clearProgress(): void`
  - `Settings = { vim: boolean; subjectLang: 'en' | 'pt' }`, `getSettings(): Settings` (padrão `{ vim: false, subjectLang: 'en' }`), `saveSettings(s: Settings): void`
  - `mulberry32(seed: number): () => number`
  - `EXAM_DURATION_MS = 10800000`
  - `LevelRun = { level: Level; exerciseId: string | null; outcome: 'pending' | 'passed' | 'skipped'; attempts: number; hintsUsed: number; swappedFrom: string[]; lastAttemptFailed: boolean }`
  - `RandomSession = { seed: number; draws: number; startedAt: number; currentLevel: Level; levels: LevelRun[]; finishedAt: number | null; drafts: Record<string, SourceFiles> }`
  - `RandomAction = { type: 'attempt'; passed: boolean; now: number } | { type: 'hint' } | { type: 'swap' } | { type: 'skip'; now: number } | { type: 'finish'; now: number } | { type: 'saveDraft'; exerciseId: string; files: SourceFiles }`
  - `startSession(pool: Record<Level, string[]>, seed: number, now: number): RandomSession`
  - `reduceSession(s: RandomSession, a: RandomAction, pool: Record<Level, string[]>): RandomSession`
  - `canSwap(s: RandomSession, pool: Record<Level, string[]>): boolean`
  - `remainingMs(s: RandomSession, now: number): number`
  - `loadSession(): RandomSession | null`, `saveSession(s: RandomSession | null): void`

- [ ] **Step 1: Escrever os testes que falham**

`storage`:
- `localStorage.setItem('examshell:v1:x', '{bad')` → `readJson('examshell:v1:x', 7) === 7`;
- `setItem` que lança exceção (spy) → `writeJson` devolve `false` sem lançar;
- com `localStorage` indefinido (stub `undefined`) → `readJson` devolve o fallback.

`progress`:
- `markAttempt('a', false)` → `'tried'`; depois `markAttempt('a', true)` → `'passed'`; depois `markAttempt('a', false)` continua `'passed'`;
- draft: ida e volta;
- `clearProgress()` → `getProgress()` vazio;
- settings: o padrão é `{ vim: false, subjectLang: 'en' }`.

`randomSession`, com `pool = {1: ['a', 'b'], 2: ['c'], 3: ['d'], 4: ['e']}`:
- mesmo seed dá o mesmo `levels[0].exerciseId`, que é `'a'` ou `'b'`;
- `canSwap` é falso antes de qualquer tentativa;
- `attempt` reprovado → `attempts === 1` e `canSwap === true`; `swap` → id diferente, `swappedFrom` igual ao anterior, `lastAttemptFailed === false`, `attempts` mantido;
- no nível 2 (uma opção só), `canSwap` é falso mesmo depois de reprovar;
- `attempt` aprovado → `outcome` `'passed'`, `currentLevel` 2 e `levels[1].exerciseId === 'c'`;
- `skip` → `'skipped'` e avança; aprovar o nível 4 → `finishedAt === now`;
- `finish` → `finishedAt === now`, e os níveis seguintes continuam `'pending'`;
- `hint` → `hintsUsed` +1 no nível atual;
- ação numa sessão encerrada → devolve o mesmo objeto;
- nível sem exercícios no pool → é marcado `'skipped'` ao chegar nele, e a sessão avança;
- `remainingMs({ startedAt: 0 }, 1000) === EXAM_DURATION_MS - 1000`.

- [ ] **Step 2: Rodar e ver falhar.** Comando: `npm test`. Esperado: FAIL.

- [ ] **Step 3: Implementar.**

O sorteio é `mulberry32(seed + draws)` aplicado aos candidatos do nível, excluindo o atual e `swappedFrom` (se isso esvaziar a lista, exclui só o atual). Cada sorteio incrementa `draws`.

Toda leitura e escrita de storage passa por `try/catch`.

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit.** Mensagem: `feat(state): progresso, rascunhos e sessão aleatória`.

---

### Task 8: Base da interface: tema, rotas, início e lista de treino

**Files:**
- Create: `src/ui/theme.css`, `src/ui/App.tsx`, `src/ui/router.ts`, `src/ui/screens/Home.tsx`, `src/ui/screens/PracticeList.tsx`, `src/ui/components/TopBar.tsx`, `src/ui/components/StatusBar.tsx`
- Modify: `src/main.tsx`
- Test: `tests/unit/router.test.ts`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `loadExercises`, `byLevel` (Task 6); `getProgress`, `clearProgress`, `loadSession` (Task 7).
- Produces:
  - `Route = { name: 'home' } | { name: 'practice' } | { name: 'exercise'; id: string } | { name: 'random'; seed?: number } | { name: 'summary' }`
  - `parseHash(hash: string): Route`, `navigate(hash: string): void`, `useRoute(): Route`
  - `TopBar({ left: ReactNode; right: ReactNode })`, `StatusBar({ items: { label: string; value: string }[] })`

- [ ] **Step 1: Escrever os testes que falham**

`parseHash`:
- `''` e `'#/'` → `home`
- `'#/treino'` → `practice`
- `'#/treino/first_word'` → `{ name: 'exercise', id: 'first_word' }`
- `'#/aleatorio?seed=42'` → `{ name: 'random', seed: 42 }`
- `'#/aleatorio/resumo'` → `summary`
- `'#/xyz'` → `home`

`home.spec.ts` (Chromium):
- `[data-testid=mode-practice]` com o texto "Treino livre" e `[data-testid=mode-random]` com "Modo aleatório";
- clicar em treino → aparecem os textos "Nível 1" a "Nível 4", e `[data-testid=ex-first_word]` com `data-status="untried"`;
- clicar no exercício → a URL termina em `#/treino/first_word`;
- com viewport 375×800, `document.scrollingElement.scrollWidth <= 375` na home e na lista;
- `[data-testid=clear-progress]` com confirm aceito → os status voltam a `untried`.

- [ ] **Step 2: Rodar e ver falhar.** Comandos: `npm test` e `npx playwright test tests/e2e/home.spec.ts --project=chromium`. Esperado: FAIL.

- [ ] **Step 3: Implementar.**

Tema:
- `theme.css` define os tokens das Global Constraints como variáveis CSS;
- fonte de `@fontsource/jetbrains-mono` (400/600/800);
- `:focus-visible` com contorno ciano;
- `@media (prefers-reduced-motion: reduce)` desliga transições.

Home:
- mostra "examshell · rank 02", os dois modos, o progresso por nível (`nível 1 · 3/12 ✓`), `[data-testid=continue-random]` ("continuar sessão") se houver sessão em andamento, e "limpar progresso".

Lista:
- marca o status com `·` (não tentado), `~` (tentado) e `✓` (passou).

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit.** Mensagem: `feat(ui): tema examshell, início e lista de treino`.

---

### Task 9: Tela do exercício (enunciado, editor, rodar, grademe, log, dicas)

**Files:**
- Create: `src/engine/parseArgs.ts`, `src/ui/engineContext.tsx`, `src/ui/screens/ExerciseScreen.tsx`, `src/ui/components/{SubjectPane,CodeEditor,EditorTabs,RunBar,LogPane,HintBlock,CompilerLoader}.tsx`
- Modify: `src/ui/App.tsx` (rota `exercise`)
- Test: `tests/unit/parseArgs.test.ts`, `tests/e2e/exercise.spec.ts`

**Interfaces:**
- Consumes: `createBrowserEngine` (Task 4); `grade`, `runOnce`, `TIMEOUT_MS`, `hintsFor` (Task 5); `catE`, `explainClangError` (Task 2); progresso e settings (Task 7); `TopBar`, `StatusBar` (Task 8).
- Produces:
  - `parseArgs(line: string): string[]`, que lança `ParseArgsError` (mensagem `aspas sem fechar`);
  - `useEngine(): { engine: BrowserEngine; status: 'loading' | 'ready' | 'error'; progress: LoadProgress | null }` (uma instância só, criada na primeira tela de exercício);
  - `ExerciseScreen(props: { exercise: LoadedExercise; mode: 'practice' | 'random'; initialFiles: SourceFiles; onFilesChange(files: SourceFiles): void; onGraded(r: GradeResult): void; onHintUsed(): void; statusItems: { label: string; value: string }[]; actions?: ReactNode })`.

- [ ] **Step 1: Escrever os testes que falham**

`parseArgs`:
- `'a b'` → `['a', 'b']`
- `'"  lorem,ipsum  "'` → `['  lorem,ipsum  ']`
- `'"" x'` → `['', 'x']`
- `` `'a "b"'` `` → `['a "b"']`
- `'a\\ b'` → `['a b']`
- `"$'\\t'"` → `['\t']`
- `''` → `[]`
- `'"abc'` lança `ParseArgsError`

`exercise.spec.ts` (Chromium). O helper `setCode(page, text)` clica em `.cm-content`, faz `Control+A` e `page.keyboard.insertText(text)`.

O "first_word com bug" é o do mockup, que não pula os espaços do início:
- `if (argc == 2)` envolvendo `while (argv[1][i] && argv[1][i] != ' ') write(1, &argv[1][i++], 1);`
- seguido de `write(1, "\n", 1);`

Ele passa em t01 e t02 e falha em t03.
1. `#/treino/first_word`: `[data-testid=compiler-loader]` aparece e some.
   - colar o first_word com bug e clicar em `[data-testid=grademe]` → `[data-testid=log]` contém `✗ teste 3/8`, `./first_word "   lorem,ipsum   "`, `esperado:` e `recebido:`.
   - `[data-testid=hint]` mostra `dica 1/3`; mais dois cliques mostram `dica 3/3`, e o botão fica `disabled`.
2. Código corrigido → o log contém `✓ passou nos 8 testes`. Voltando à lista, `ex-first_word` tem `data-status="passed"`.
3. `page.reload()` → o editor mantém o último código.
4. `[data-testid=run-args]` = `"  hello world"`, depois `[data-testid=run]` → o log contém `hello$`.
5. Código com `printf` → o log contém `printf` e `não está permitida`.
6. `ft_strlen` com `main` no arquivo → o log contém `não se entrega main`.
   - a aba `main.c (rascunho)` com um `main` que imprime `ft_strlen("abc")`, mais "rodar" → o log contém `3`.
7. `ft_itoa` resolvido com `long` para `INT_MIN` → `✓ passou`.
8. `while (1);` no first_word → o log contém `tempo esgotado`.
9. `[data-testid=subject-lang]` alterna entre "ver em português" e "view in English", e o texto do enunciado muda.
   - `[data-testid=vim-toggle]` ligado continua ligado depois de `reload`.
10. Duplo clique no grademe → exatamente um bloco `[data-testid=grade-result]` novo.

- [ ] **Step 2: Rodar e ver falhar.** Esperado: FAIL.

- [ ] **Step 3: Implementar.**

Layout (spec 7):
- barra superior ciano com `examshell · rank 02` e `nível N/4 · <id>`;
- painel esquerdo com o `SubjectPane` em `<pre>`;
- painel direito com o editor em cima e o `RunBar` + `LogPane` embaixo;
- `StatusBar` no rodapé.

Editor:
- CodeMirror 6 com `@codemirror/lang-cpp`, `indentWithTab`, `tabSize` 4 e um compartimento vim (`@replit/codemirror-vim`) ligado pelo setting;
- uma aba por `expectedFile`, mais `main.c (rascunho)` nos exercícios de função;
- conteúdo inicial vindo de `initialFiles` ou `starter`;
- `onFilesChange` com debounce de 500 ms.

Botões:
- `rodar` e `grademe` ficam desabilitados enquanto o motor não está `ready` ou já há uma execução em andamento;
- `rodar` também fica desabilitado em exercício de função se o rascunho estiver vazio.

`CompilerLoader`:
- texto `baixando o compilador, só na primeira vez · NN%`;
- em erro: `Não consegui baixar o compilador. Verifique a conexão e tente de novo.`, com o botão `[data-testid=compiler-retry]` ("tentar de novo").

`LogPane`:
- cada saída do rodar mostra `examshell> ./<id> <args>` e a saída passada por `catE`;
- cada grademe mostra `examshell> grademe` e um bloco `[data-testid=grade-result]`:
  - sucesso: `✓ passou nos N testes`;
  - falha: bloco vermelho `✗ teste k/N`, com o comando (`./<id>` + args entre aspas) ou o `display`, e as linhas `esperado:`/`recebido:` em `catE`, com o primeiro caractere diferente destacado;
  - crash: `o programa travou (segfault)`; timeout: `tempo esgotado (2 s)`; compile: o stderr mais `explainClangError`; forbidden: `` você usou `printf`, que não está permitida aqui ``; `duplicate-main`: `neste exercício não se entrega main; use a aba main.c (rascunho) para testar`;
  - saída truncada: `(saída cortada em 64 KB)`.
- Abaixo do último resultado com falha, o `HintBlock` (âmbar) tem o botão `pedir dica` (`[data-testid=hint]`). Ele revela `hintsFor(...)` um degrau por vez, como `dica k/3 · <texto>`, e chama `onHintUsed` a cada clique.

No modo treino, o `grademe` chama `markAttempt`.

- [ ] **Step 4: Rodar e ver passar.** Comando: `npx playwright test tests/e2e/exercise.spec.ts --project=chromium`. Esperado: PASS.

- [ ] **Step 5: Commit.** Mensagem: `feat(ui): tela do exercício com editor, grademe e dicas`.

---

### Task 10: Modo aleatório e resumo

**Files:**
- Create: `src/ui/screens/RandomScreen.tsx`, `src/ui/screens/SummaryScreen.tsx`, `src/ui/components/Timer.tsx`
- Modify: `src/ui/App.tsx`
- Test: `tests/e2e/random.spec.ts`

**Interfaces:**
- Consumes: `startSession`, `reduceSession`, `canSwap`, `remainingMs`, `loadSession`, `saveSession` (Task 7); `ExerciseScreen` (Task 9); `byLevel`, `loadExercises` (Task 6).

- [ ] **Step 1: Escrever o teste que falha** (`random.spec.ts`, Chromium; os pilotos dão `pool = {1: [first_word, ft_strlen], 2: [inter], 3: [ft_list_size], 4: [ft_itoa]}`)
1. `#/aleatorio?seed=7` → a barra superior mostra `nível 1/4`, e o exercício é `first_word` ou `ft_strlen`. `[data-testid=swap]` não está visível.
2. Grademe com código vazio → falha, e `swap` ("sortear outro deste nível") fica visível. Clicar nele → o outro exercício do nível 1.
3. `[data-testid=skip]` ("pular para o próximo nível") → `nível 2/4` e `inter`.
4. `page.reload()` → continua em `nível 2/4` com `inter`. A home mostra `continue-random`.
5. `[data-testid=finish]` ("encerrar sessão") com confirm → `#/aleatorio/resumo`. O `[data-testid=summary]` contém `nível 1`, `pulado` e `1 troca`, e mostra `não chegou` nos níveis 3 e 4.
6. "voltar ao início" → `continue-random` não existe mais.

- [ ] **Step 2: Rodar e ver falhar.** Esperado: FAIL.

- [ ] **Step 3: Implementar.**

`RandomScreen`:
- sem sessão salva, inicia uma com `seed` da rota (ou `Date.now()`), usando como pool os ids com conteúdo por nível;
- salva a sessão a cada ação;
- passa `initialFiles` de `session.drafts[id]` (ou `starter`);
- `onFilesChange` dispara `saveDraft`; `onGraded` dispara `attempt`; `onHintUsed` dispara `hint`;
- `actions` contém `swap` (só se `canSwap`), `skip` e `finish`;
- `statusItems` traz tempo (`Timer`), tentativas, `modo aleatório` e o nível;
- sessão encerrada navega para o resumo.

`Timer`:
- mostra `H:MM:SS` restante;
- quando o tempo fica negativo, mostra `tempo esgotado, mas pode continuar`.

`SummaryScreen` mostra, por nível:
- o exercício que passou, `pulado` ou `não chegou`;
- as tentativas, as trocas (`N troca(s)`) e as dicas;
- o tempo total.

Fecha com uma frase de incentivo escolhida pelo número de níveis passados (0 a 4). Tem os botões "nova sessão" e "voltar ao início", e os dois limpam a sessão.

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit.** Mensagem: `feat(ui): modo aleatório com troca, pulo e resumo`.

---

### Task 11: Publicação, trava contra soluções no site e README

**Files:**
- Create: `.github/workflows/deploy.yml`, `scripts/check-no-reference.mjs`, `README.md`
- Modify: `package.json` (script `check:dist`)

- [ ] **Step 1: `scripts/check-no-reference.mjs`**

Percorre `dist/**`. Sai com código 1, listando os arquivos culpados, se:
- algum arquivo de texto contém `EXAMSHELL-REFERENCE`;
- algum caminho contém `/reference/`;
- algum arquivo passa de 95 MB.

Se não houver problema, imprime `ok: nenhuma referência em dist/`.

- [ ] **Step 2: Verificar a trava.**
  - `npm run build && npm run check:dist` → imprime `ok…`.
  - Copiar uma referência para `dist/x.c` e rodar `npm run check:dist` → sai com 1. Apagar `dist/x.c`.

- [ ] **Step 3: `deploy.yml`**

Roda em `push` para `main` e em `workflow_dispatch`. Permissões: `pages: write` e `id-token: write`.

Job `build` (ubuntu-latest):
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (node 22, cache npm)
3. `npm ci`
4. `npm test`
5. `python3 scripts/gen_expected.py --check`
6. `npm run test:engine`
7. `npm run test:content`
8. `npm run build`
9. `npm run check:dist`
10. `actions/upload-pages-artifact@v3` (`dist`)

Job `deploy`: `actions/deploy-pages@v4`.

- [ ] **Step 4: `README.md`**

Cobre:
- o que é o projeto;
- como rodar (`npm i`, `npm run dev`);
- os testes (`test`, `test:engine`, `test:content`, `test:e2e`);
- **como adicionar um exercício** (entrada no catálogo → pasta em `content/` → referência com sentinela → `npm run gen:expected:wsl -- <id>` → `npm run test:content`);
- como publicar (Settings → Pages → Source: GitHub Actions).

- [ ] **Step 5: Commit.** Mensagem: `ci: publicação no GitHub Pages com trava contra soluções`.

---

### Tasks 12–16: Conteúdo dos exercícios restantes

Cada task segue as **regras de conteúdo** da Task 6, e os metadados vêm do Apêndice A. Os passos de cada uma:
- [ ] **Step 1:** para cada id, criar `content/rank02/<id>/{exercise.json, subject.en.txt, subject.pt.txt, harness.c?}` e `reference/rank02/<id>/…`.
- [ ] **Step 2:** rodar `npm run gen:expected:wsl -- <ids>`. Esperado: sem erro.
- [ ] **Step 3:** rodar `npm run test:content`. Esperado: PASS em todos os exercícios com conteúdo.
- [ ] **Step 4:** commit `feat(content): <lote>`.

| Task | Lote | Ids |
|---|---|---|
| 12 | nível 1 | fizzbuzz, ft_putstr, ft_strcpy, ft_swap, repeat_alpha, rev_print, rot_13, rotone, search_and_replace, ulstr |
| 13 | nível 2 (A) | alpha_mirror, camel_to_snake, do_op, ft_atoi, ft_strcmp, ft_strcspn, ft_strdup, ft_strpbrk, ft_strrev, ft_strspn |
| 14 | nível 2 (B) | is_power_of_2, last_word, max, print_bits, reverse_bits, snake_to_camel, swap_bits, union, wdmatch |
| 15 | nível 3 | add_prime_sum, epur_str, expand_str, ft_atoi_base, ft_range, ft_rrange, hidenp, lcm, paramsum, pgcd, print_hex, rstr_capitalizer, str_capitalizer, tab_mult |
| 16 | nível 4 | flood_fill, fprime, ft_list_foreach, ft_list_remove_if, ft_split, rev_wstr, rostring, sort_int_tab, sort_list |

Notas de harness:
- `ft_putstr` e `print_bits` escrevem direto na saída, e o harness só chama a função.
- `ft_swap` imprime `a` e `b` depois da troca.
- `ft_range`/`ft_rrange` imprimem `abs(end - start) + 1` inteiros.
- `ft_split` imprime cada palavra numa linha até `NULL`.
- `flood_fill` imprime a grade linha a linha.
- `ft_list_foreach`, `ft_list_remove_if` e `sort_list` montam listas a partir de arrays e imprimem os `data` em ordem.

**Na Task 16, adicionar ao `content.test.ts`:** `it('todos os 57 exercícios têm conteúdo', () => expect(loadExercises()).toHaveLength(57))`.

---

### Task 17 (desejável): linha onde o programa travou

**Files:**
- Create: `src/engine/crashLine.ts`
- Modify: `src/engine/types.ts` (método opcional no `Engine`), `src/engine/compiler.ts`, `src/engine/compiler.worker.ts`, `src/engine/browserEngine.ts`, `tests/support/nodeEngine.ts`, `src/engine/grade.ts` (preenche `failure.line`), `LogPane.tsx`
- Test: `tests/engine/crashLine.test.ts`

**Interfaces:**
- Produces:
  - `parseWasmTrapOffset(stack: string): number | null`, que lê `wasm-function[N]:0xHEX`, formato que aparece tanto no V8 quanto no SpiderMonkey;
  - `Engine.addr2line?(wasm: Uint8Array, moduleOffset: number): Promise<{ file: string; line: number } | null>`, implementado em `createCompiler` e repassado pelo worker e pelo motor do Node. O `grade` só usa se existir.

- [ ] **Step 1: Escrever os testes que falham.**
  - `parseWasmTrapOffset('    at main (wasm://wasm/abc:wasm-function[5]:0x1a3)') === 0x1a3`
  - Com o motor do Node: um programa que escreve em NULL na linha 6 de `main.c` → `grade` devolve `failure.line` igual a `{ file: 'main.c', line: 6 }`.
- [ ] **Step 2: Implementar.** O DWARF do wasm usa offsets relativos ao início do corpo da seção Code. Converter o offset do módulo subtraindo esse início (lido do cabeçalho de seções do `.wasm`) e chamar `runLLVM(['addr2line', '-e', 'a.out', '0x…'])`. Mostrar só quando o arquivo for do cadete: `travou na linha 6 de first_word.c`.
- [ ] **Step 3: Limite de esforço.** Se não funcionar no Chrome e no Firefox dentro desta task, reverter, manter só a entrada que travou (o comportamento atual) e anotar isso no commit.
- [ ] **Step 4: Commit.** Mensagem: `feat(engine): mostra a linha do segfault`.

---

## Apêndice A: catálogo do Rank 02

`kind`: P = programa, F = função. "—" = nenhuma função permitida.

| nível | id | kind | expectedFiles | allowedFunctions | prototype |
|---|---|---|---|---|---|
| 1 | first_word | P | first_word.c | write | |
| 1 | fizzbuzz | P | fizzbuzz.c | write | |
| 1 | ft_putstr | F | ft_putstr.c | write | `void ft_putstr(char *str);` |
| 1 | ft_strcpy | F | ft_strcpy.c | — | `char *ft_strcpy(char *s1, char *s2);` |
| 1 | ft_strlen | F | ft_strlen.c | — | `int ft_strlen(char *str);` |
| 1 | ft_swap | F | ft_swap.c | — | `void ft_swap(int *a, int *b);` |
| 1 | repeat_alpha | P | repeat_alpha.c | write | |
| 1 | rev_print | P | rev_print.c | write | |
| 1 | rot_13 | P | rot_13.c | write | |
| 1 | rotone | P | rotone.c | write | |
| 1 | search_and_replace | P | search_and_replace.c | write, exit | |
| 1 | ulstr | P | ulstr.c | write | |
| 2 | alpha_mirror | P | alpha_mirror.c | write | |
| 2 | camel_to_snake | P | camel_to_snake.c | malloc, realloc, write, free | |
| 2 | do_op | P | do_op.c | atoi, printf, write | |
| 2 | ft_atoi | F | ft_atoi.c | — | `int ft_atoi(const char *str);` |
| 2 | ft_strcmp | F | ft_strcmp.c | — | `int ft_strcmp(char *s1, char *s2);` |
| 2 | ft_strcspn | F | ft_strcspn.c | — | `size_t ft_strcspn(const char *s, const char *reject);` |
| 2 | ft_strdup | F | ft_strdup.c | malloc | `char *ft_strdup(char *src);` |
| 2 | ft_strpbrk | F | ft_strpbrk.c | — | `char *ft_strpbrk(const char *s1, const char *s2);` |
| 2 | ft_strrev | F | ft_strrev.c | — | `char *ft_strrev(char *str);` |
| 2 | ft_strspn | F | ft_strspn.c | — | `size_t ft_strspn(const char *s, const char *accept);` |
| 2 | inter | P | inter.c | write | |
| 2 | is_power_of_2 | F | is_power_of_2.c | — | `int is_power_of_2(unsigned int n);` |
| 2 | last_word | P | last_word.c | write | |
| 2 | max | F | max.c | — | `int max(int* tab, unsigned int len);` |
| 2 | print_bits | F | print_bits.c | write | `void print_bits(unsigned char octet);` |
| 2 | reverse_bits | F | reverse_bits.c | — | `unsigned char reverse_bits(unsigned char octet);` |
| 2 | snake_to_camel | P | snake_to_camel.c | malloc, realloc, write, free | |
| 2 | swap_bits | F | swap_bits.c | — | `unsigned char swap_bits(unsigned char octet);` |
| 2 | union | P | union.c | write | |
| 2 | wdmatch | P | wdmatch.c | write | |
| 3 | add_prime_sum | P | add_prime_sum.c | write, exit | |
| 3 | epur_str | P | epur_str.c | write | |
| 3 | expand_str | P | expand_str.c | write | |
| 3 | ft_atoi_base | F | ft_atoi_base.c | — | `int ft_atoi_base(const char *str, int str_base);` |
| 3 | ft_list_size | F | ft_list_size.c, ft_list.h | — | `int ft_list_size(t_list *begin_list);` |
| 3 | ft_range | F | ft_range.c | malloc | `int *ft_range(int start, int end);` |
| 3 | ft_rrange | F | ft_rrange.c | malloc | `int *ft_rrange(int start, int end);` |
| 3 | hidenp | P | hidenp.c | write | |
| 3 | lcm | F | lcm.c | — | `unsigned int lcm(unsigned int a, unsigned int b);` |
| 3 | paramsum | P | paramsum.c | write | |
| 3 | pgcd | P | pgcd.c | printf, atoi, malloc, free | |
| 3 | print_hex | P | print_hex.c | write | |
| 3 | rstr_capitalizer | P | rstr_capitalizer.c | write | |
| 3 | str_capitalizer | P | str_capitalizer.c | write | |
| 3 | tab_mult | P | tab_mult.c | write | |
| 4 | flood_fill | F | flood_fill.c, t_point.h | — | `void flood_fill(char **tab, t_point size, t_point begin);` |
| 4 | fprime | P | fprime.c | printf, atoi | |
| 4 | ft_itoa | F | ft_itoa.c | malloc | `char *ft_itoa(int nbr);` |
| 4 | ft_list_foreach | F | ft_list_foreach.c, ft_list.h | — | `void ft_list_foreach(t_list *begin_list, void (*f)(void *));` |
| 4 | ft_list_remove_if | F | ft_list_remove_if.c | free | `void ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)());` |
| 4 | ft_split | F | ft_split.c | malloc | `char **ft_split(char *str);` |
| 4 | rev_wstr | P | rev_wstr.c | write, malloc, free | |
| 4 | rostring | P | rostring.c | write, malloc, free | |
| 4 | sort_int_tab | F | sort_int_tab.c | — | `void sort_int_tab(int *tab, unsigned int size);` |
| 4 | sort_list | F | sort_list.c | — | `t_list *sort_list(t_list* lst, int (*cmp)(int, int));` |

`starter` dos headers (a struct exatamente como no subject):
- `ft_list.h`: `typedef struct s_list { struct s_list *next; void *data; } t_list;`
- `t_point.h`: `typedef struct s_point { int x; int y; } t_point;`
- `list.h`: `typedef struct s_list t_list; struct s_list { int data; t_list *next; };`

Exceção (R14): `list.h` (sort_list) e o `ft_list.h` de ft_list_remove_if são fornecidos pelo exame, não são starters nem expectedFiles: ficam em `provided` no `exercise.json` (abas somente leitura).

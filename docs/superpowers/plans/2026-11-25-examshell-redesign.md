# ExamShell: plano do redesenho visual e celular

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a interface do ExamShell pela linguagem dos protótipos aprovados (início por nível, nova tela do exercício, simulado com cara própria, tema claro/escuro e programar pelo celular), sem mexer na correção nem na fidelidade do conteúdo.

**Architecture:** O motor (`src/engine`) e a correção (`grade`) ficam como estão, com dois ajustes pequenos (addr2line quieto e com limite de tempo; motor que pode começar adiado). A lógica nova fica em módulos puros e testáveis no Node:
- `src/state/activity.ts`: continuar, última tentativa e sequência de dias;
- `src/ui/prepText.ts`: textos de preparação e de status;
- `src/ui/home/homeModel.ts`: busca, filtro e sorteio;
- `src/ui/subjectFormat.ts`: apresentação do enunciado.

As telas React consomem esses módulos. O CSS sai de um arquivo só e vai para `src/ui/styles/` (tokens, base e um arquivo por tela). Os protótipos em `docs/superpowers/specs/prototypes/` são a fonte da verdade visual: classes, medidas, cores e textos vêm de lá.

**Tech Stack:** Vite, React 18, TypeScript, Vitest (projetos `unit` com jsdom por arquivo, `engine`, `content`), Playwright (Chromium + Firefox), CodeMirror 6, zod, `@fontsource/manrope` (novo), `@fontsource/jetbrains-mono`.

**Spec:** `docs/superpowers/specs/2026-11-25-examshell-redesign-design.md`. Protótipos: `docs/superpowers/specs/prototypes/inicio-preparacao.html` e `docs/superpowers/specs/prototypes/exercicio.html`.

## Global Constraints

- **Nada de solução publicada.** Dicas e textos novos nunca contêm código (`looksLikeCode`). O "main de exemplo" só chama a função; nunca a define (Task 3). `npm run check:dist` continua passando.
- **Interface em português, tom de incentivo, frases normais (sem CAIXA ALTA).** Os textos fixados no spec são copiados literalmente (ex.: "Bora treinar para o Rank 02", "Sortear um do nível N", "✗ Falhou no teste k de N", "✓ Passou nos N testes", "Dica k de 3", "Próxima dica (k+1/3)", "pronto para a prova"). Os textos que não estão no spec vêm do protótipo correspondente.
- **Enunciado:** o texto de cada língua não muda. Só a apresentação muda: os parágrafos se juntam e os exemplos viram bloco de terminal.
- **Fontes no próprio site, só o subconjunto `latin`:**
  - Manrope 500/600/700/800 (`@fontsource/manrope/latin-<peso>.css`);
  - JetBrains Mono 400/500/700 (`@fontsource/jetbrains-mono/latin-<peso>.css`).
  - Mono sempre com `font-variant-ligatures: none` e `font-feature-settings: "liga" 0, "calt" 0`.
- **Tokens:** os nomes são `--bg --surface --raise --line --line-2 --ink --muted --soft --accent --accent-ink --accent-soft --on-accent --ok --bad --warn` (com `-soft`), `--code-bg --code-ln --kw --str --num --com --term-bg`, `--l1..--l4`, `--l1s..--l4s` e `--shadow`. Os valores vêm do `:root` e dos dois blocos escuros de `exercicio.html`; um token que só exista em `inicio-preparacao.html` vem de lá.
- **Tema:**
  - o claro fica no `:root`;
  - o escuro fica em `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` e em `:root[data-theme="dark"] {…}`;
  - `settings.theme` é `'system' | 'light' | 'dark'`, com padrão `'system'`.
- **Cores de nível só em detalhes** (selo, barra, botão de sortear), nunca como fundo de tela.
- **Larguras:**
  - celular = `max-width: 820px`;
  - grade de exercícios com 3 colunas no desktop, 2 entre 821–1100px e 1 até 820px.
- **Movimento:** todo movimento automático respeita `prefers-reduced-motion: reduce` (sem animação, sem rolagem suave).
- **Dados salvos:**
  - as mudanças só acrescentam dados; o prefixo continua `examshell:v1:`;
  - campo ausente ou inválido vira o valor padrão;
  - nada do que já existe se perde (progresso, rascunhos, sessão, configurações).
- **`data-testid` mantidos:** `grademe`, `run`, `run-args`, `log`, `hint`, `compiler-loader`, `compiler-retry`, `ex-<id>`, `swap`, `skip`, `finish`, `summary`, `clear-progress`, `subject-lang`, `vim-toggle`, além de `grade-result` (com `data-state`), `run-result`, `subject`, `error-fallback`, `continue-random` e `timer`. Os novos estão em cada task.
- **Protótipos:** o painel de opinião e o código `window.claude`/`db` dos protótipos não fazem parte do app. O código de exemplo dentro deles também não.
- **Dependências:** nenhuma dependência de execução nova além de `@fontsource/manrope`.
- **Comandos:** no Git Bash, rodar sempre a partir de `cd "C:/Users/kikev/Documents/Coding/42SP/ExamShell"` (com `C:` maiúsculo), senão o vitest falha.
- **Testes:**
  - `npm test` (unit), `npm run test:content`, `npm run test:engine`;
  - `npx playwright test <arquivo>` roda os dois navegadores e faz o build sozinho.
- **Commits** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Dados salvos antes do redesenho.** Configurações sem `theme`, o mapa de progresso antigo, rascunhos e um simulado em andamento.
   - Esperado: tudo carrega igual, o tema vira `'system'` e o simulado retoma direto no exercício, sem passar pela tela de início.
   - Testes: Task 1 (configurações) e Task 11 (sessão antiga, e2e).
2. **Barra de símbolos no celular.**
   - Esperado: tocar `{` e `}` insere no cursor e o editor continua com o foco (o teclado não fecha).
   - Teste: Task 12 (e2e).
3. **Ctrl/Cmd+Enter digitado dentro do CodeMirror.**
   - Esperado: corrige e não insere uma linha nova. Ctrl/Cmd+Shift+Enter roda com os argumentos do campo.
   - Teste: Task 9 (e2e).
4. **Sequência de dias perto da meia-noite** (fuso local, virada de mês).
   - Esperado: grademe às 23:30 e outro às 00:10 do dia seguinte dão 2 dias; de 30/11 para 01/12 soma 1.
   - Teste: Task 4.
5. **Busca com acento, maiúscula ou espaço no lugar de `_`.**
   - Esperado: "funcao" acha "função", "STRING" acha "string" e "ft strlen" acha `ft_strlen`.
   - Teste: Task 6.

## Decisões deste plano

O spec deixou estes pontos em aberto. As escolhas abaixo valem para todas as tasks.

- **Main de exemplo:** fica num campo de conteúdo novo, `sampleMain`, escrito à mão para cada um dos 28 exercícios de função (Task 3). Gerar automaticamente não serve: listas, `flood_fill`, `ft_swap` e os vetores não têm uma chamada única que dê para montar a partir do protótipo.
- **"tentativa N" no treino:** `lastAttempt[id]` guarda também `count`, o número de grademes. N é esse número. No simulado, N é `run.attempts`.
- **Dados do continuar e da sequência:** ficam numa chave nova, `examshell:v1:activity`. O mapa `progress` continua como está, e `clearProgress` já apaga tudo que tem o prefixo.
- **Simulado depois de passar:** o reducer continua avançando na hora (a sessão salva já está no próximo nível). A tela segura o exercício que passou, com o cartão de "passou", até o cadete clicar em "Ir para o nível N+1" ou em "Ver resumo".
- **`#/aleatorio?seed=N`:**
  - sem sessão em andamento, mostra a tela de início;
  - o botão "Começar" usa a semente da rota (é o que deixa o e2e determinístico).
- **Celular:** os botões `run`/`grademe` ficam num lugar só por vez (barra de rodar no desktop, rodapé no celular). Assim os `data-testid` continuam únicos. Quem decide é `useIsMobile()`, que usa `matchMedia('(max-width: 820px)')`.
- **Barra de status antiga:** some. O estado do compilador fica no `CompilerLoader` e o status do exercício fica no topo.
- **Sorteio a partir do cartão de "passou" (treino):** navega direto para o exercício sorteado, sem abrir o detalhe.

---

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| `src/ui/styles/tokens.css` (novo) | tokens claro/escuro, cores de código e de nível |
| `src/ui/styles/base.css` (novo) | fontes, corpo, botões, etiquetas, cartões, foco, `[hidden]`, toast, confirmação na página, movimento reduzido |
| `src/ui/styles/home.css`, `exercise.css`, `random.css` (novos) | uma folha por tela, cada uma com o próprio bloco `@media (max-width: 820px)` |
| `src/ui/styles/legacy.css` (renomeado de `src/ui/theme.css`) | estilos antigos em transição; apagado na Task 13 |
| `src/ui/theme.ts` (novo) | aplicar e trocar o tema |
| `src/ui/components/ThemeToggle.tsx` (novo) | botão sol/lua |
| `src/content/levels.ts` (novo) | títulos e subtítulos dos níveis |
| `src/state/activity.ts` (novo) | `lastOpened`, `lastAttempt`, sequência |
| `src/ui/prepText.ts` (novo) | prontidão, sequência em texto, barrinhas, status, frases de incentivo |
| `src/ui/lowMemory.ts` (novo) | marca de início do motor e espera de 60 s |
| `src/ui/home/homeModel.ts` (novo) | busca, filtro, sorteio, contagens |
| `src/ui/home/ExerciseList.tsx`, `LevelSection.tsx`, `ExerciseDetail.tsx` (novos) | a lista dentro do início |
| `src/ui/home/HomeCards.tsx`, `PrepList.tsx` (novos) | continuar, simular, preparação |
| `src/ui/components/AppTopBar.tsx` (novo) | topo do app + navegação de baixo no celular |
| `src/ui/components/ExerciseTopBar.tsx` (novo) | topo da tela do exercício |
| `src/ui/subjectFormat.ts` (novo) | enunciado → blocos |
| `src/ui/components/ResultCard.tsx`, `Toast.tsx` (novos) | cartão do grademe, aviso ao passar |
| `src/ui/components/SessionBar.tsx`, `src/ui/screens/RandomStart.tsx` (novos) | simulado |
| `src/ui/components/MobileTabs.tsx`, `SymbolBar.tsx`, `src/ui/useIsMobile.ts`, `src/ui/useKeyboardInset.ts` (novos) | celular |
| `src/ui/screens/PracticeList.tsx`, `components/StatusBar.tsx`, `TopBar.tsx`, `Timer.tsx`, `HintBlock.tsx` | apagados quando ficarem sem uso (Tasks 6, 10, 11 e 13) |

---

### Task 1: Base visual: tokens, fontes e tema

**Files:**
- Create: `src/ui/styles/tokens.css`, `src/ui/styles/base.css`, `src/ui/theme.ts`, `src/ui/components/ThemeToggle.tsx`
- Move: `src/ui/theme.css` → `src/ui/styles/legacy.css`
- Modify: `src/main.tsx`, `src/state/progress.ts`, `package.json`
- Test: `tests/unit/theme.test.tsx` (novo), `tests/unit/progress.test.ts`

**Interfaces:**
- Produces:
  - `export type Theme = 'system' | 'light' | 'dark'` (em `progress.ts`);
  - `Settings = { vim: boolean; subjectLang: 'en' | 'pt'; theme: Theme }`;
  - `applyTheme(theme: Theme, root?: HTMLElement): void`;
  - `toggledTheme(theme: Theme, systemDark: boolean): 'light' | 'dark'`;
  - `<ThemeToggle />` (`data-testid="theme-toggle"`).

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/unit/progress.test.ts`:
```ts
it('configurações antigas, sem theme, ficam como estavam e o tema vira system', () => {
  localStorage.setItem('examshell:v1:settings', JSON.stringify({ vim: true, subjectLang: 'pt' }));
  expect(getSettings()).toEqual({ vim: true, subjectLang: 'pt', theme: 'system' });
});
it('tema inválido vira system', () => {
  localStorage.setItem('examshell:v1:settings', JSON.stringify({ theme: 'blue' }));
  expect(getSettings().theme).toBe('system');
});
```
(Siga o jeito do arquivo de simular o `localStorage`.)

Em `tests/unit/theme.test.tsx` (`// @vitest-environment jsdom`):
```ts
it('applyTheme: dark/light põem data-theme; system tira', () => {
  applyTheme('dark'); expect(document.documentElement.dataset.theme).toBe('dark');
  applyTheme('system'); expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
});
it('toggledTheme troca o que está na tela', () => {
  expect(toggledTheme('system', true)).toBe('light');
  expect(toggledTheme('system', false)).toBe('dark');
  expect(toggledTheme('light', true)).toBe('dark');
  expect(toggledTheme('dark', false)).toBe('light');
});
it('ThemeToggle: clicar com o sistema claro liga o escuro e grava', async () => {
  // matchMedia falso: { matches: false, addEventListener() {}, removeEventListener() {} }
  // renderiza <ThemeToggle/>, clica
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(getSettings().theme).toBe('dark');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- progress theme`. Expected: FAIL (`theme` ausente, módulo `theme.ts` inexistente).

- [ ] **Step 3: Implementar**

- `getSettings` lê `theme` de forma tolerante.
- `theme.ts`: `applyTheme` tira o atributo quando o tema é `'system'`.
- `ThemeToggle`:
  - usa os ícones `i-sun` e `i-moon` do protótipo, em SVG inline;
  - o `aria-label` é "usar tema escuro" ou "usar tema claro", conforme o que vai ligar;
  - ouve `change` do `matchMedia('(prefers-color-scheme: dark)')` para atualizar o ícone quando o tema é `'system'`.
- `tokens.css` e `base.css` seguem o protótipo; os blocos escuros usam exatamente os dois seletores das Global Constraints.
- `legacy.css`:
  - perde o `:root` antigo e os `@import` de fonte;
  - ganha um `:root` de apelidos para cada variável antiga em uso. O mapa: `--text→--ink`, `--cyan→--accent`, `--amber→--warn`, `--red→--bad`, `--label→--muted`, `--panel→--surface`, `--border→--line`. Qualquer outra variável antiga vai para o token mais próximo.
  - Assim as telas antigas continuam de pé até serem trocadas.
- `main.tsx`:
  - importa `tokens.css`, `base.css` e `legacy.css`, nessa ordem;
  - chama `applyTheme(getSettings().theme)` antes do `createRoot`, para não piscar o tema errado.
- `npm i @fontsource/manrope`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run build`. Expected: PASS; build ok.
Run: `npx playwright test tests/e2e/home.spec.ts`. Expected: PASS (só o visual mudou).

- [ ] **Step 5: Commit** — `feat(ui): tokens, fontes Manrope e tema claro/escuro`

---

### Task 2: Conteúdo: descrição curta e títulos dos níveis

**Files:**
- Modify: `src/engine/types.ts`, `src/content/schema.ts`, os 57 `content/rank02/*/exercise.json`
- Create: `src/content/levels.ts`
- Test: `tests/content/content.test.ts`

**Interfaces:**
- Produces:
  - `ExerciseContent.summary: string` (obrigatório);
  - `export const LEVEL_INFO: Record<Level, { title: string; subtitle: string }>`.

- [ ] **Step 1: Escrever os testes que falham** (em `content.test.ts`)

```ts
describe('descrição curta', () => {
  it('todo exercício tem summary de 1 a 80 caracteres, sem código e sem repetir', () => {
    const all = loadExercises();
    for (const ex of all) {
      expect(ex.summary.length, ex.id).toBeGreaterThan(0);
      expect(ex.summary.length, ex.id).toBeLessThanOrEqual(80);
      expect(looksLikeCode(ex.summary), ex.id).toBe(false);
    }
    expect(new Set(all.map((e) => e.summary)).size).toBe(57);
  });
  it('bate com o array EX do protótipo: mesmos ids, níveis e textos', () => {
    // lê inicio-preparacao.html com import.meta.glob(..., { query: '?raw', eager: true }),
    // extrai as tuplas [id, nível, tipo, summary, ...] do array EX
    // espera: ids e níveis iguais aos de RANK02_CATALOG; summary igual ao do exercise.json
  });
});
it('LEVEL_INFO tem os 4 títulos do spec', () => {
  expect(LEVEL_INFO).toEqual({
    1: { title: 'Primeiros passos', subtitle: 'strings, write e laços' },
    2: { title: 'Strings e bits', subtitle: 'funções da libc, bits e malloc' },
    3: { title: 'Números e listas', subtitle: 'matemática, bases e listas encadeadas' },
    4: { title: 'Algoritmos', subtitle: 'split, ordenação e flood fill' },
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm run test:content -- -t "descrição curta|LEVEL_INFO"`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- O schema ganha `summary: z.string().min(1).max(80)`.
- Copie o 4º elemento de cada tupla do `EX` para `"summary"`, como primeira chave do `exercise.json`, com um script descartável no scratchpad (não vai para o commit).
- Acrescente `summary` às fixtures tipadas que o `tsc -b` acusar.

- [ ] **Step 4: Rodar e ver passar** — `npm run test:content && npm test && npm run build`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(content): descrição curta dos 57 exercícios e títulos dos níveis`

---

### Task 3: Conteúdo: main de exemplo dos exercícios de função

**Files:**
- Modify: `src/engine/types.ts`, `src/content/schema.ts`, os 28 `exercise.json` com `kind: 'function'`
- Test: `tests/content/content.test.ts`

**Interfaces:**
- Produces: `ExerciseContent.sampleMain?: string`, presente se e somente se o exercício for de função.

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe('main de exemplo', () => {
  it('existe em todo exercício de função e em nenhum programa', ...);
  it('não define a função do exercício', async () => {
    // para cada função: nome = /(\w+)\s*\(/ aplicado ao prototype
    // compileObjects({ 'main.c': sampleMain }, provided ?? {}) → ok
    // definedSymbols(objects) não contém o nome
  });
  it('compila com a referência, roda sem travar e imprime algo', async () => {
    // runOnce(ex, <arquivos da referência>, { mainC: sampleMain, args: [] }, nodeEngine)
    // espera: outcome 'exit', exitCode 0, stdout não vazio
  });
  it('não tem a sentinela de referência e tem no máximo 40 linhas', ...);
});
```
Reaproveite como o teste atual monta os arquivos da referência e o `createNodeEngine`.

- [ ] **Step 2: Rodar e ver falhar** — `npm run test:content -- -t "main de exemplo"`. Expected: FAIL.

- [ ] **Step 3: Escrever os 28 `sampleMain`**

Formato fixo:
- 1ª linha: `// main de exemplo: chama a função com o 1º exemplo do enunciado. Edite à vontade.`
- depois os `#include` (`<stdio.h>`, `<stdlib.h>` se precisar, e o header fornecido entre aspas quando houver: `ft_list.h`, `t_point.h`, `list.h`);
- o protótipo do catálogo, exatamente como está;
- `main`, que monta a entrada do 1º `display` dos testes e imprime o retorno:
  - `int` → `%d`; `size_t` → `%zu`; `unsigned` → `%u`; `unsigned char` → `%u`;
  - `char *` → `%s`, imprimindo `(null)` se vier `NULL`;
  - funções `void` que mudam os dados (`ft_swap`, `ft_strcpy`, `sort_int_tab`, `flood_fill`, listas) → imprimir os dados depois da chamada;
  - `print_bits` e `ft_putstr` → só a chamada e um `\n`.
- Nas listas, os nós são montados com `malloc` dentro do `main`. Funções auxiliares (`print_str`, `cmp`, `ascending`) podem aparecer; a função do exercício, nunca.

- [ ] **Step 4: Rodar e ver passar** — `npm run test:content && npm run build && npm run check:dist`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(content): main de exemplo para os exercícios de função`

---

### Task 4: Estado: atividade, sequência e textos de preparação

**Files:**
- Create: `src/state/activity.ts`, `src/ui/prepText.ts`
- Test: `tests/unit/activity.test.ts`, `tests/unit/prepText.test.ts`

**Interfaces:**
- Produces (`activity.ts`, chave `examshell:v1:activity`):
  ```ts
  export type Streak = { last: string; count: number };
  export type AttemptRecord = { passed: number; total: number; count: number };
  export type Activity = { lastOpened: { id: string; at: number } | null; lastAttempt: Record<string, AttemptRecord>; streak: Streak | null };
  export function localDay(d: Date): string;                       // 'YYYY-MM-DD', fuso local
  export function nextStreak(prev: Streak | null, today: string): Streak;
  export function streakDays(s: Streak | null, today: string): number; // count se last é hoje ou ontem; senão 0
  export function getActivity(): Activity;
  export function recordOpened(id: string, now: number): void;
  export function recordGrade(id: string, r: { passed: number; total: number }, now: Date): void; // count+1 e sequência
  ```
- Produces (`prepText.ts`):
  ```ts
  export type Dot = 'ok' | 'bad' | 'skip';
  export function readiness(passed: number, total: number): string;
  export function streakText(days: number): string;                // 0 → 'comece hoje'; 1 → '1 dia'; n → 'n dias'
  export function attemptBars(passed: number, total: number): Dot[]; // ok até passed, bad na seguinte se passed<total, resto skip
  export function statusView(passed: boolean, attempts: number): { tone: 'new' | 'tried' | 'passed'; text: string };
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
// activity.test.ts
it('nextStreak: primeiro dia, mesmo dia, dia seguinte, intervalo', () => {
  expect(nextStreak(null, '2026-11-25')).toEqual({ last: '2026-11-25', count: 1 });
  expect(nextStreak({ last: '2026-11-25', count: 3 }, '2026-11-25')).toEqual({ last: '2026-11-25', count: 3 });
  expect(nextStreak({ last: '2026-11-25', count: 3 }, '2026-11-26')).toEqual({ last: '2026-11-26', count: 4 });
  expect(nextStreak({ last: '2026-11-25', count: 3 }, '2026-11-28')).toEqual({ last: '2026-11-28', count: 1 });
  expect(nextStreak({ last: '2026-11-30', count: 3 }, '2026-12-01')).toEqual({ last: '2026-12-01', count: 4 });
});
it('meia-noite local: 23:30 e 00:10 do dia seguinte dão 2 dias', () => {
  recordGrade('first_word', { passed: 1, total: 8 }, new Date(2026, 10, 25, 23, 30));
  recordGrade('first_word', { passed: 8, total: 8 }, new Date(2026, 10, 26, 0, 10));
  expect(getActivity().streak).toEqual({ last: '2026-11-26', count: 2 });
  expect(getActivity().lastAttempt.first_word).toEqual({ passed: 8, total: 8, count: 2 });
});
it('streakDays: hoje ou ontem contam; antes disso, 0', () => {
  expect(streakDays({ last: '2026-11-25', count: 3 }, '2026-11-25')).toBe(3);
  expect(streakDays({ last: '2026-11-24', count: 3 }, '2026-11-25')).toBe(3);
  expect(streakDays({ last: '2026-11-23', count: 3 }, '2026-11-25')).toBe(0);
  expect(streakDays(null, '2026-11-25')).toBe(0);
});
it('dados estragados viram o padrão, campo por campo', () => {
  localStorage.setItem('examshell:v1:activity', JSON.stringify({ lastOpened: 5, lastAttempt: [], streak: { last: 3 } }));
  expect(getActivity()).toEqual({ lastOpened: null, lastAttempt: {}, streak: null });
  localStorage.setItem('examshell:v1:activity', '"x"');
  expect(getActivity()).toEqual({ lastOpened: null, lastAttempt: {}, streak: null });
});
it('recordOpened grava; clearProgress apaga a atividade', ...);

// prepText.test.ts
it('readiness nos limites', () => {
  expect([0, 3, 4, 7, 8, 11, 12].map((p) => readiness(p, 12))).toEqual([
    'ainda não começou', 'começando', 'pegando o jeito', 'pegando o jeito', 'quase pronto', 'quase pronto', 'pronto para a prova',
  ]);
  expect(readiness(0, 0)).toBe('ainda não começou');
});
it('attemptBars', () => {
  expect(attemptBars(2, 5)).toEqual(['ok', 'ok', 'bad', 'skip', 'skip']);
  expect(attemptBars(5, 5)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
  expect(attemptBars(0, 2)).toEqual(['bad', 'skip']);
});
it('statusView', () => {
  expect(statusView(false, 0)).toEqual({ tone: 'new', text: 'novo' });
  expect(statusView(false, 3)).toEqual({ tone: 'tried', text: 'ainda não passou · tentativa 3' });
  expect(statusView(true, 3)).toEqual({ tone: 'passed', text: 'passou ✓' });
});
it('streakText', () => expect([0, 1, 4].map(streakText)).toEqual(['comece hoje', '1 dia', '4 dias']));
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- activity prepText`. Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

- O "ontem" é calculado com `new Date(y, m - 1, d - 1)`, sempre em hora local e nunca em UTC.
- Use `readJson`/`writeJson` de `storage.ts`.

- [ ] **Step 4: Rodar e ver passar** — `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(state): atividade, sequência de dias e textos de preparação`

---

### Task 5: Motor: pendências da Task 17 e celular sem memória

**Files:**
- Modify: `src/engine/compiler.ts:147-159`, `src/engine/crashLine.ts:59-74`, `src/engine/browserEngine.ts:56-140`, `src/ui/engineContext.tsx`, `src/ui/components/CompilerLoader.tsx`
- Create: `src/ui/lowMemory.ts`
- Test: `tests/unit/crashLine.test.ts`, `tests/unit/lowMemory.test.ts` (novo), `tests/unit/compilerAddr2line.test.ts` (novo), `tests/e2e/exercise.spec.ts`

**Interfaces:**
- Produces:
  - `export const CRASH_LINE_TIMEOUT_MS = 2000` (crashLine);
  - `createBrowserEngine({ ..., deferStart?: boolean })`: com `true`, o motor não inicia; `status()` é `'error'` e `retry()` inicia;
  - `useEngine()` devolve também `lowMemory: boolean`;
  - `CompilerLoader` ganha a prop `lowMemory: boolean`;
  - `lowMemory.ts`:
    ```ts
    export const ENGINE_INIT_MARK = 'examshell:v1:engine-init';
    export const LOW_MEMORY_TIMEOUT_MS = 60000;
    export function createLowMemoryWatch(o: {
      storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
      setTimer(fn: () => void, ms: number): () => void; // devolve o cancelamento
      onSuspect(): void;
    }): { crashedBefore: boolean; onDownloaded(): void; onSettled(): void };
    ```
  - A marca só é gravada depois do download, na fase que gasta memória (preparar o compilador). Quem recarrega no meio do download não recebe o aviso por engano.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// crashLine.test.ts
it('addr2line que não responde: null depois de 2 s', async () => {
  vi.useFakeTimers();
  const p = locateCrash({ addr2line: () => new Promise(() => {}) }, wasm, stackComOffset, ['a.c']);
  await vi.advanceTimersByTimeAsync(2000);
  await expect(p).resolves.toBeNull();
});
// compilerAddr2line.test.ts: createCompiler(fakeClang).addr2line(...) passa uma função `stderr` ao runLLVM
// lowMemory.test.ts
it('sem marca: crashedBefore false e nada gravado ainda', ...);
it('com a marca já gravada: crashedBefore true', ...);
it('onDownloaded grava a marca e arma um timer de 60 s; disparar chama onSuspect', ...);
it('onSettled antes do disparo apaga a marca e cancela o timer', ...);
it('onDownloaded duas vezes arma um timer só', ...);
it('storage null (bloqueado): não lança e crashedBefore é false', ...);
```
e2e em `exercise.spec.ts`:
```ts
test('aba que morreu no início do motor: aviso de memória e tentar de novo funciona', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('examshell:v1:engine-init', '1'));
  await page.goto('./#/treino/first_word');
  await expect(page.getByTestId('compiler-loader')).toContainText('Este aparelho pode não ter memória suficiente');
  await page.getByTestId('compiler-retry').click();
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
});
```
Ponha o `addInitScript` só nesse teste: ele grava a marca em toda carga, então o motor não pode recarregar a página depois do retry.

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- crashLine lowMemory compilerAddr2line`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- `addr2line` passa `stderr: collector().callback`, e a saída de erro é descartada.
- `locateCrash` corre a chamada contra um timer de `CRASH_LINE_TIMEOUT_MS`; o timer é limpo quando a chamada termina.
- `engineContext`:
  - cria o watch com `sessionStorage` (num try/catch);
  - `deferStart: crashedBefore`;
  - quando `crashedBefore` é verdadeiro, o snapshot começa com `status: 'error'` e `lowMemory: true`;
  - `onStatus('loading')` → `lowMemory: false`; `'ready'`/`'error'` → `onSettled()`;
  - `onProgress` com `fromCache` ou `loadedBytes >= totalBytes` → `onDownloaded()`;
  - `onSuspect` → `lowMemory: true` (o status não muda).
- `CompilerLoader` com `lowMemory` (em `loading` ou `error`) mostra, com `role="alert"`:
  - o texto exato do spec 11.5: "Este aparelho pode não ter memória suficiente para o compilador. Você pode continuar lendo e escrevendo; para rodar e corrigir, tente num computador.";
  - "tentar de novo" (`compiler-retry`).

- [ ] **Step 4: Rodar e ver passar** — `npm test && npm run test:engine && npx playwright test tests/e2e/exercise.spec.ts tests/e2e/engine.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(engine): addr2line quieto e com limite; aviso de aparelho sem memória`

---

### Task 6: Início, parte 1: a lista (busca, filtro, sorteio, detalhe)

**Files:**
- Create: `src/ui/home/homeModel.ts`, `src/ui/home/ExerciseList.tsx`, `src/ui/home/LevelSection.tsx`, `src/ui/home/ExerciseDetail.tsx`, `src/ui/styles/home.css`
- Modify: `src/ui/router.ts`, `src/ui/App.tsx`, `src/ui/screens/Home.tsx`
- Delete: `src/ui/screens/PracticeList.tsx`
- Test: `tests/unit/homeModel.test.ts` (novo), `tests/unit/router.test.ts`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `summary`, `LEVEL_INFO` (Task 2); `getProgress()`.
- Produces:
  ```ts
  // router.ts: 'practice' sai
  export type Route = { name: 'home'; section?: 'exercicios' } | { name: 'exercise'; id: string } | { name: 'random'; seed?: number } | { name: 'summary' };
  // homeModel.ts
  export type Filter = 'all' | 'todo' | 'passed';
  export function normalize(s: string): string;                       // minúsculas, sem acento, '_' → ' '
  export function matchesQuery(ex: { id: string; summary: string }, query: string): boolean;
  export function matchesFilter(status: ExerciseStatus, f: Filter): boolean; // todo = não passou
  export function drawFromLevel(ids: string[], progress: Record<string, ExerciseStatus>, rand: () => number, exclude?: string): string | null;
  export function levelCounts(ids: string[], progress: Record<string, ExerciseStatus>): { passed: number; tried: number; total: number };
  // ExerciseList.tsx: o detalhe é controlado por quem usa (o início abre o detalhe também pelo cartão continuar)
  export type DetailRequest = { id: string; drawn: boolean };
  export function ExerciseList(props: { detail: DetailRequest | null; onDetail(r: DetailRequest | null): void }): JSX.Element;
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
// homeModel.test.ts
const strlen = { id: 'ft_strlen', summary: 'Devolve o tamanho de uma string.' };
it('busca ignora maiúscula, acento e _', () => {
  expect(matchesQuery(strlen, 'STRING')).toBe(true);
  expect(matchesQuery(strlen, 'ft strlen')).toBe(true);
  expect(matchesQuery({ id: 'x', summary: 'Uma função simples.' }, 'funcao')).toBe(true);
  expect(matchesQuery(strlen, '  ')).toBe(true);
  expect(matchesQuery(strlen, 'xyz')).toBe(false);
});
it('sorteio: entre os não passados; todos passados → entre todos; exclude', () => {
  const p = { a: 'passed', b: 'passed' } as const;
  expect(drawFromLevel(['a', 'b', 'c'], p, () => 0)).toBe('c');
  expect(drawFromLevel(['a', 'b'], p, () => 0.99)).toBe('b');
  expect(drawFromLevel(['a', 'b', 'c'], p, () => 0, 'c')).toBe('a'); // só c faltava: cai para todos menos c
  expect(drawFromLevel(['a'], {}, () => 0, 'a')).toBe('a');
  expect(drawFromLevel([], {}, () => 0)).toBeNull();
});
it('matchesFilter e levelCounts', ...);
// router.test.ts
it('#/treino é o início rolado até os exercícios', () =>
  expect(parseHash('#/treino')).toEqual({ name: 'home', section: 'exercicios' }));
```
`home.spec.ts` (troca os testes de lista antigos):
```ts
test('lista: 4 níveis com títulos, 6 por nível e "ver todos"', ...); // level-1..4; show-all-2 mostra os 20
test('busca e filtro', ...);   // search "tamanho" → só ex-ft_strlen; filtro passed com progresso salvo
test('item abre o detalhe; Começar leva ao exercício', ...); // ex-first_word → detail → detail-start → #/treino/first_word
test('sortear um do nível abre o detalhe com o selo; Sortear outro troca', ...); // draw-1 → drawn-badge; detail-redraw
test('#/treino rola até os exercícios', ...);
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- homeModel router`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- Siga `inicio-preparacao.html` (seção da lista e folha de detalhe).
- `data-testid` novos:
  - `search`;
  - `filter-all`, `filter-todo`, `filter-passed` (com `aria-pressed`);
  - `level-<n>` (a `<section id="nivel-<n>">`), `draw-<n>`, `show-all-<n>`;
  - `ex-<id>` com `data-status` (`untried|tried|passed`);
  - `detail` (`role="dialog"`, `aria-modal`), `drawn-badge`, `detail-start`, `detail-close`, `detail-redraw`.
- Com busca ou filtro ativo, aparecem todos os itens.
- Estado vazio do filtro num nível: "Você já passou em todos deste nível."
- Busca sem nenhum resultado: "Nenhum exercício com “<busca>”." e um botão "limpar busca".
- O detalhe:
  - fecha com Esc e devolve o foco a quem o abriu;
  - é folha que sobe de baixo até 820px;
  - "Começar"/"Continuar"/"Praticar de novo" vêm do status, e o link vai para `#/treino/<id>`.
- `Home.tsx` mantém o topo antigo por enquanto, guarda o estado `detail` e põe `<ExerciseList detail onDetail/>` numa `<section id="exercicios">`.
- "Sortear um do nível N" e "Sortear outro" (no detalhe) usam `drawFromLevel(ids, getProgress(), Math.random, idAtual)`.
- Com `route.section === 'exercicios'`, rola até ela ao montar (sem rolagem suave se o movimento for reduzido).
- Apague `PracticeList.tsx` e a rota `practice`.

- [ ] **Step 4: Rodar e ver passar** — `npm test && npx playwright test tests/e2e/home.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(home): lista por nível com busca, filtro, sorteio e detalhe`

---

### Task 7: Início, parte 2: topo, continuar, simular, preparação e rodapé

**Files:**
- Create: `src/ui/components/AppTopBar.tsx`, `src/ui/home/HomeCards.tsx`, `src/ui/home/PrepList.tsx`
- Modify: `src/ui/screens/Home.tsx`, `src/ui/styles/home.css`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes:
  - `getActivity`, `streakDays`, `localDay` (Task 4);
  - `readiness`, `streakText`, `attemptBars` (Task 4);
  - `drawFromLevel`, `levelCounts`, `ExerciseList` (Task 6);
  - `ThemeToggle` (Task 1);
  - `loadSession`, `remainingMs`, `formatClock`.
- Produces: `export function AppTopBar(props: { active: 'inicio' | 'exercicios' | 'simulado' }): JSX.Element`. Ele mostra:
  - a marca `>_ examshell rank 02` (link `#/`);
  - a navegação: no topo no desktop, e como `nav.bottom-nav` fixa embaixo até 820px;
  - `streak` com `streakText`;
  - `passed-count` ("N/57 passaram");
  - `ThemeToggle`.

- [ ] **Step 1: Escrever os testes que falham** (`home.spec.ts`)

```ts
test('início vazio: preparação "ainda não começou" e convite do nível 1', async ({ page }) => {
  for (const n of [1, 2, 3, 4]) await expect(page.getByTestId(`prep-${n}`)).toContainText('ainda não começou');
  await expect(page.getByTestId('continue-card')).toContainText('Comece pelo nível 1');
  await expect(page.getByTestId('streak')).toHaveText(/comece hoje/);
  await expect(page.getByTestId('passed-count')).toHaveText(/0\/57 passaram/);
});
test('continuar mostra o último aberto com as barrinhas da última tentativa', async ({ page }) => {
  // localStorage activity: lastOpened inter, lastAttempt inter {passed:2,total:9,count:1}
  // continue-card: "inter", "na última tentativa passou em 2 de 9 testes", 9 barrinhas (2 ok, 1 bad)
  // continue-open → #/treino/inter
});
test('continuar com id que não existe mais vira o convite', ...);
test('simulado em andamento: o cartão vira "Continuar simulado"', ...); // continue-random visível; sem sessão, start-simulado
test('preparação rola até o nível', ...); // prep-3 → level-3 no viewport
test('limpar progresso pede confirmação na página', async ({ page }) => {
  // progresso salvo; clear-progress → clear-confirm → ex-first_word volta a untried; nenhum dialog do navegador
});
test('tema: o botão troca e a escolha fica depois do reload', ...);
test('375px: sem rolagem horizontal e com a navegação embaixo', ...); // bottom-nav visível
```
Apague os testes antigos de `mode-practice`, `mode-random` e `legend`.

- [ ] **Step 2: Rodar e ver falhar** — `npx playwright test tests/e2e/home.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- A ordem e os textos seguem o protótipo:
  - h1 "Bora treinar para o Rank 02";
  - o subtítulo do protótipo;
  - os dois cartões;
  - "Sua preparação";
  - a lista (Task 6);
  - o rodapé.
- **Continuar** (`continue-card`):
  - usa `lastOpened`, se o id existir no catálogo;
  - mostra o nível, "na última tentativa passou em X de N testes" (só se houver `lastAttempt` para o id) e barrinhas de `attemptBars`;
  - botões `continue-open` "Abrir <id>" e `continue-draw` "Sortear outro do nível N";
  - o sorteio chama `onDetail({ id: drawFromLevel(..., idAtual), drawn: true })`, abrindo o detalhe da Task 6 com o selo.
  - Sem `lastOpened`: "Comece pelo nível 1" e "Sortear um do nível 1".
- **Simular** (`simulate-card`):
  - "Começar simulado" (`start-simulado`) leva a `#/aleatorio`;
  - com sessão em andamento: "Continuar simulado · nível N · H:MM:SS restantes" (`continue-random`).
- **Preparação:** um `prep-<n>` por nível, com contagem, barra (passou cheio, tentou claro) e `readiness`.
- **Rodapé:**
  - `clear-progress` abre a confirmação na página "Apagar todo o progresso, rascunhos e configurações?";
  - os botões são `clear-confirm` e "cancelar";
  - nada de `window.confirm`.
- A sequência de dias também aparece no cartão continuar, quando for maior que 0.

- [ ] **Step 4: Rodar e ver passar** — `npx playwright test tests/e2e/home.spec.ts && npm test`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(home): topo, continuar, simular e preparação por nível`

---

### Task 8: Tela do exercício, parte 1: topo, enunciado e registro do progresso

**Files:**
- Create: `src/ui/subjectFormat.ts`, `src/ui/components/ExerciseTopBar.tsx`, `src/ui/styles/exercise.css`
- Modify: `src/ui/components/SubjectPane.tsx`, `src/ui/screens/ExerciseScreen.tsx`, `src/ui/App.tsx`, `src/ui/screens/RandomScreen.tsx`
- Test: `tests/unit/subjectFormat.test.ts` (novo), `tests/content/content.test.ts`, `tests/e2e/exercise.spec.ts`

**Interfaces:**
- Consumes: `statusView`, `recordOpened`, `recordGrade` (Task 4); `ThemeToggle`.
- Produces:
  ```ts
  // subjectFormat.ts
  export type TermLine = { kind: 'cmd' | 'out'; text: string };
  export type SubjectBlock =
    | { kind: 'prose'; text: string }
    | { kind: 'heading'; text: string }      // "Examples:" → "Examples"
    | { kind: 'code'; text: string }         // linhas como estão
    | { kind: 'terminal'; lines: TermLine[] };
  export function formatSubject(text: string): SubjectBlock[]; // o cabeçalho antes da régua ----- é descartado
  // ExerciseScreen: saem statusItems, actions e notice; entram:
  backHref: string;
  levelLabel: string;                                   // 'nível 1' | 'nível 1 de 4'
  status: { tone: 'new' | 'tried' | 'passed'; text: string };
  sessionBar?: ReactNode;                               // simulado, logo abaixo do topo
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
// subjectFormat.test.ts (com first_word.en e ft_list_size.en, lidos via ?raw)
it('junta as linhas de um parágrafo', () => {
  const b = formatSubject(firstWordEn);
  expect(b[0]).toEqual({ kind: 'prose', text: 'Write a program that takes a string and displays its first word, followed by a newline.' });
});
it('Examples: vira título; $> vira cmd; a continuação com \\ se junta ao comando', () => {
  const term = formatSubject(firstWordEn).find((x) => x.kind === 'terminal')!;
  expect(term.lines[0]).toEqual({ kind: 'cmd', text: './first_word "FOR PONY" | cat -e' });
  expect(term.lines[1]).toEqual({ kind: 'out', text: 'FOR$' });
  expect(term.lines).toContainEqual({ kind: 'cmd', text: './first_word "this        ...    is sparta, then again, maybe    not" | cat -e' });
});
it('protótipo, struct e linhas de chamada ficam como código, sem juntar', () => {
  const b = formatSubject(listSizeEn);
  expect(b).toContainEqual({ kind: 'code', text: 'int\tft_list_size(t_list *begin_list);' });
  expect(b.some((x) => x.kind === 'code' && x.text.includes('ft_list_size(NULL) returns 0'))).toBe(true);
});
// content.test.ts
it('formatSubject não perde nenhuma palavra em nenhum dos 114 enunciados', () => {
  // palavras(corpo depois da régua) === palavras(todos os blocos, com "$>" de volta nos cmd)
  // nenhum bloco prose contém "$>"
});
```
`exercise.spec.ts`:
- troque a alternância de `subject-lang` pelos botões `lang-en`/`lang-pt` (o grupo continua `subject-lang`);
- some:
```ts
test('topo mostra nível e status; o status muda depois do grademe', async ({ page }) => {
  // #/treino/first_word: ex-status "novo", "nível 1"; código errado + grademe → "ainda não passou · tentativa 1"
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- subjectFormat && npm run test:content -- -t formatSubject`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- **`formatSubject`.** Separe o corpo em blocos por linha em branco. Para cada bloco:
  - começa com `$>` → `terminal`: tire o `$> `; uma linha que termina em ` \` se junta à seguinte com um espaço; o `$>` sozinho no fim vira `cmd` vazio;
  - uma linha só, terminando em `:` e com até 30 caracteres → `heading`, sem os dois-pontos;
  - alguma linha começa com tab ou 2+ espaços, termina em `;`, `{` ou `}`, começa com `typedef`/`struct`/`#`, ou todas as linhas começam com `identificador(` → `code`;
  - senão → `prose`, com as linhas juntadas por um espaço.
  - Ajuste a heurística até o teste de "nenhuma palavra perdida" passar nos 114 arquivos.
- **`SubjectPane`:**
  - mostra os fatos `arquivo <expectedFiles>`, `permitidas <lista ou "nenhuma">` e `N testes`;
  - mostra o grupo EN|PT (`subject-lang`, com os botões `lang-en`/`lang-pt` e `aria-pressed`);
  - renderiza os blocos (`p`, `h2`, `pre.code`, `pre.examples` com `.pr`/`.cmd`/`.out`); mantém `data-testid="subject"`.
- **`ExerciseTopBar`:** voltar com a marca (`backHref`), etiqueta de nível, nome em mono, tipo, `ex-status` e `ThemeToggle`.
- **`ExerciseScreen`:**
  - layout de duas colunas de `exercicio.html` (desktop); some com o `StatusBar`;
  - no grademe, nos dois modos, chama `markAttempt(id, passou)` e `recordGrade(id, result, new Date())`, antes de `onGraded`.
- **`App.PracticeExercise`:**
  - chama `recordOpened(id, Date.now())` ao montar;
  - `backHref="#/treino"`;
  - `status = statusView(progress passou, lastAttempt?.count ?? 0)`, recalculado depois de cada grademe.
- **`RandomScreen`:**
  - `levelLabel="nível N de 4"`, `backHref="#/"`, `status = statusView(run.outcome === 'passed', run.attempts)`;
  - os botões atuais de trocar/pular/encerrar e o aviso de passou vão provisoriamente para `sessionBar` (a Task 11 troca).

- [ ] **Step 4: Rodar e ver passar** — `npm test && npm run test:content && npx playwright test tests/e2e/exercise.spec.ts tests/e2e/random.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(exercise): novo topo e enunciado com parágrafos e bloco de terminal`

---

### Task 9: Tela do exercício, parte 2: editor, recomeçar, atalhos e main de exemplo

**Files:**
- Modify: `src/ui/components/CodeEditor.tsx`, `src/ui/components/EditorTabs.tsx`, `src/ui/components/RunBar.tsx`, `src/ui/screens/ExerciseScreen.tsx`, `src/ui/styles/exercise.css`
- Test: `tests/e2e/exercise.spec.ts`

**Interfaces:**
- Consumes: `sampleMain` (Task 3).
- Produces:
  ```ts
  // CodeEditor vira forwardRef<CodeEditorHandle, CodeEditorProps>
  export interface CodeEditorHandle {
    insertText(text: string): void;       // troca a seleção principal; cursor depois do texto; não mexe no foco
    setDoc(key: string, text: string): void; // substitui o doc de `key` (desfazível se for o ativo); chama onChange(key, text) uma vez
    focus(): void;
  }
  // RunBar fica controlado
  { line: string; onLineChange(v: string): void; shortcutLabel: { run: string; grade: string } }
  ```

- [ ] **Step 1: Escrever os testes que falham** (`exercise.spec.ts`)

```ts
test('Ctrl+Enter dentro do editor corrige, sem quebrar linha', async ({ page }) => {
  await open(page, 'first_word'); await setCode(page, 'int main(void){return 0;}');
  const before = await page.locator('.cm-content').innerText();
  await page.locator('.cm-content').press('Control+Enter');
  await expect(page.getByTestId('grade-result').last()).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  expect(await page.locator('.cm-content').innerText()).toBe(before);
});
test('Ctrl+Shift+Enter roda com os argumentos do campo', ...); // run-args "a b" → run-result com o comando
test('recomeçar pede confirmação na página e volta o arquivo ao início', async ({ page }) => {
  // setCode → editor-reset → reset-confirm visível → confirmar → editor vazio (ou starter)
  // cancelar mantém o código
});
test('gerar main de exemplo preenche o rascunho e rodar funciona', async ({ page }) => {
  // ft_strlen: run-help visível; sample-main → aba main.c ativa com o texto; código do cadete + run → run-result
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx playwright test tests/e2e/exercise.spec.ts -g "Ctrl|recomeçar|main de exemplo"`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- **`CodeEditor`:**
  - expõe a `CodeEditorHandle`; para uma `key` que não é a ativa, `setDoc` descarta o estado guardado dela;
  - `contentAttributes` com `autocapitalize: 'off'`, `autocorrect: 'off'` e `spellcheck: 'false'`;
  - `examTheme` e `examHighlight` passam a usar `var(--code-bg)`, `var(--code-ln)`, `var(--kw)`, `var(--str)`, `var(--num)` e `var(--com)` no lugar das cores fixas.
- **`EditorTabs`:**
  - tem as ações `editor-reset` "recomeçar" (escondida em aba somente leitura) e `vim-toggle`;
  - a confirmação fica na própria barra: "Recomeçar <arquivo>? O código volta ao início." com `reset-confirm` "recomeçar" e "cancelar";
  - recomeçar faz `setDoc(key, exercise.starter?.[key] ?? '')`.
- **Atalhos:**
  - um listener de `keydown` em `window`, na fase de captura, montado pelo `Workspace`;
  - `(ctrlKey || metaKey) && key === 'Enter'` → `preventDefault()` + `stopPropagation()`, depois `shiftKey ? onRun(line) : onGrade()`;
  - os rótulos `<kbd>` são `⌘↵`/`⌘⇧↵` no Mac (`/Mac|iPhone|iPad/` em `navigator.userAgent`) e `Ctrl↵`/`Ctrl⇧↵` nos outros.
- **`RunBar`:**
  - o prompt é `$> ./<id>`, com os botões "Rodar" e "Grademe" do protótipo;
  - em exercício de função com o rascunho vazio, aparece a linha `run-help` "para rodar, escreva um main na aba main.c (rascunho)";
  - junto vem o botão `sample-main` "gerar main de exemplo" (só se houver `sampleMain`), que faz `setDoc('main.c', sampleMain)` e ativa a aba `main.c`.

- [ ] **Step 4: Rodar e ver passar** — `npx playwright test tests/e2e/exercise.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(exercise): recomeçar, atalhos de teclado e main de exemplo`

---

### Task 10: Tela do exercício, parte 3: cartões de resultado, dicas e aviso ao passar

**Files:**
- Create: `src/ui/components/ResultCard.tsx`, `src/ui/components/Toast.tsx`
- Modify: `src/ui/components/LogPane.tsx`, `src/ui/screens/ExerciseScreen.tsx`, `src/ui/App.tsx`, `src/ui/screens/RandomScreen.tsx`, `src/ui/prepText.ts`
- Delete: `src/ui/components/HintBlock.tsx`
- Test: `tests/unit/prepText.test.ts`, `tests/e2e/exercise.spec.ts`

**Interfaces:**
- Consumes: `attemptBars`, `Dot` (Task 4); `drawFromLevel`, `levelCounts` (Task 6).
- Produces:
  ```ts
  // prepText.ts
  export function testDots(r: GradeResult): Dot[];   // passou → tudo ok; falha em teste i → attemptBars(i, total); compile/forbidden/link → tudo skip
  export const PASS_PHRASES: readonly string[];       // 5 frases curtas de incentivo, sem código
  export function passPhrase(n: number): string;      // PASS_PHRASES[n % 5]
  // ExerciseScreen
  export interface PassAction { label: string; testId: string; primary?: boolean; href?: string; onClick?(): void }
  export interface PassView { message: string; actions: PassAction[] }
  afterPass(): PassView;  // chamada ao montar o cartão de "passou", depois de onGraded (vê o progresso novo)
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('testDots', () => {
  expect(testDots({ passed: 2, total: 4, failure: { kind: 'wrong-output', index: 2 /*…*/ } as Failure })).toEqual(['ok', 'ok', 'bad', 'skip']);
  expect(testDots({ passed: 0, total: 3, failure: { kind: 'compile', stderr: '' } })).toEqual(['skip', 'skip', 'skip']);
  expect(testDots({ passed: 3, total: 3, failure: null })).toEqual(['ok', 'ok', 'ok']);
});
it('PASS_PHRASES: 5 frases sem código', () => {
  expect(PASS_PHRASES).toHaveLength(5);
  for (const p of PASS_PHRASES) expect(looksLikeCode(p)).toBe(false);
});
```
`exercise.spec.ts` (adapte o teste "grademe mostra onde quebrou e as dicas, uma por vez"):
```ts
// falha: título "✗ Falhou no teste k de N"; test-dots com k-1 ok, 1 bad; hint "Pedir dica" → "Dica 1 de 3"
//   e o botão vira "Próxima dica (2/3)"; depois da 3ª o botão some
// compile: título "✗ Não compilou", todos os pontos skip
test('passar: cartão com o progresso do nível, ações e aviso', ...);
//   "✓ Passou nos N testes", "Nível 1 agora está em 1 de 12", pass-draw, pass-home, pass-toast visível
test('grademe anterior fica recolhido e abre ao clicar', ...); // dois grademes → 1 older-grade
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- prepText && npx playwright test tests/e2e/exercise.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- **`ResultCard` (`grade-result`, com `data-state`):**
  - **rodando:** "corrigindo… k de N" e os pontos;
  - **falhou:** o título é "✗ Falhou no teste k de N" nas falhas de teste; nas outras, "✗ Não compilou", "✗ Usou função proibida" ou "✗ Não deu para montar o programa";
  - mostra `test-dots` (cada ponto com `data-state`) e o corpo atual do `FailureView` (comando, esperado/recebido com o diff, linha do travamento, tempo esgotado);
  - a faixa de dica vem embaixo: `hint` "Pedir dica" e, depois, "Próxima dica (k+1/3)"; cada dica aparece como "Dica k de 3 · <texto>";
  - **passou:** "✓ Passou nos N testes", `afterPass().message` e os botões de `afterPass().actions`.
- **`LogPane`:**
  - só o grademe mais recente fica aberto; os anteriores viram `older-grade` "▸ grademe anterior: <título>", que abre ao clicar;
  - continua rolando sozinho até o fim a cada entrada nova ou terminada.
- **`Toast` (`pass-toast`, `role="status"`):** some em 4 s e não anima com movimento reduzido. O texto é a mensagem do `afterPass`.
- **`afterPass` do treino (App):**
  - mensagem `${passPhrase(n)} Nível L agora está em X de Y.`, com X/Y de `levelCounts` depois do `markAttempt`;
  - ações: `pass-draw` "Sortear outro do nível L" (navega para `#/treino/<drawFromLevel(..., exercise.id)>`) e `pass-home` "Voltar ao início" (`#/`).
- **No simulado, por enquanto:** `afterPass` devolve só a mensagem; a Task 11 completa.

- [ ] **Step 4: Rodar e ver passar** — `npm test && npx playwright test tests/e2e/exercise.spec.ts tests/e2e/random.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(exercise): cartões de resultado com dicas, pontos por teste e aviso ao passar`

---

### Task 11: Simulado: tela de início, barra da sessão, passou e resumo

**Files:**
- Create: `src/ui/screens/RandomStart.tsx`, `src/ui/components/SessionBar.tsx`, `src/ui/styles/random.css`
- Modify: `src/ui/screens/RandomScreen.tsx`, `src/ui/screens/SummaryScreen.tsx`
- Delete: `src/ui/components/Timer.tsx` (se ficar sem uso)
- Test: `tests/e2e/random.spec.ts`

**Interfaces:**
- Consumes:
  - `startSession`, `reduceSession`, `canSwap`, `remainingMs`, `loadSession`, `saveSession`;
  - `formatClock`, `levelLabel`, `encouragement`, `plural`;
  - `AppTopBar` (Task 7); `PassView` (Task 10); `passPhrase`.
- Produces:
  - `export function SessionBar(props: { session: RandomSession; canSwap: boolean; onSwap(): void; onSkip(): void; onFinish(): void }): JSX.Element`;
  - `export function RandomStart(props: { onStart(): void }): JSX.Element`.

- [ ] **Step 1: Escrever os testes que falham** (reescreva `random.spec.ts`)

```ts
test('sem sessão: tela de início; Começar abre o nível 1 com o relógio', async ({ page }) => {
  await page.goto('./#/aleatorio?seed=7');
  await expect(page.getByTestId('start-random')).toHaveText('Começar simulado (o relógio começa agora)');
  await page.getByTestId('start-random').click();
  await expect(page.getByTestId('level-step-1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('timer')).toContainText('2:59');
});
test('sessão salva antes do redesenho retoma direto no exercício', ...); // grava examshell:v1:session no formato atual → sem start-random
test('passar segura o cartão; "Ir para o nível 2" avança', ...);
//   pass-next-level; level-step-1 data-state passed; sem pass-next-level no nível 4 → pass-summary
test('troca só depois de falhar; pular; encerrar com confirmação na página; resumo com nomes', ...);
//   swap oculto → grademe falho → swap "Sortear outro" → nome novo; skip "Pular nível" → level-step-2 skipped
//   finish → finish-confirm → summary com o id trocado, train-<id>, tempo total
test('Sair (a sessão continua) volta ao início com Continuar simulado', ...);
test('passar no simulado marca o treino', ...); // depois de passar: #/treino → ex-<id> data-status passed
```

- [ ] **Step 2: Rodar e ver falhar** — `npx playwright test tests/e2e/random.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- **`RandomScreen`:**
  - sem sessão em andamento (`loadSession()` nula ou terminada), mostra `RandomStart`;
  - o `onStart` cria a sessão com `seed ?? Date.now()`, grava e entra nela;
  - com sessão, mostra o `ExerciseScreen` com `sessionBar`.
- **Segurar depois de passar:**
  - estado local `hold: { exerciseId: string; level: Level } | null`, gravado no `onGraded` que passou;
  - enquanto `hold` existe, a tela continua no exercício segurado (mesmo `key`, o log fica) e não navega para o resumo;
  - `afterPass()`: mensagem `Nível L de 4 concluído. ${passPhrase(n)}`;
  - a ação é `pass-next-level` "Ir para o nível N+1" (limpa o `hold`) ou, se a sessão terminou, `pass-summary` "Ver resumo".
- **`SessionBar` (`session-bar`):**
  - `level-step-<n>` com `data-state` `current|passed|skipped|future`;
  - `timer` em mono grande + "restantes", com a classe `warn` abaixo de 30 min; depois do fim, "tempo esgotado, mas pode continuar";
  - `swap` "Sortear outro" (só quando `canSwap`), `skip` "Pular nível" e `finish` "Encerrar";
  - "Encerrar" abre a confirmação na própria barra: `finish-confirm` "Encerrar e ver o resumo" e "cancelar";
  - o link `exit-session` "Sair (a sessão continua)" vai para `#/`.
  - Até 820px, cabe em até 2 linhas.
- Saem o `LevelPassedNotice` e o `level-passed`.
- **Tela de início:**
  - título "Simular a prova";
  - as duas frases: "Cai um exercício sorteado de cada um dos 4 níveis, como na prova." e "O relógio de 3h só informa: dá para trocar de exercício, pular nível e pedir dicas.";
  - os fatos do cartão do início.
- **`SummaryScreen`** (`summary`, usando `AppTopBar active="simulado"`):
  - uma linha por nível com `levelLabel`, mais "trocou: <ids>", tentativas e dicas;
  - o tempo total `formatClock(finishedAt - startedAt)`;
  - `train-<id>` "Treinar <id>" para cada exercício trocado e para o exercício de nível pulado ou parado;
  - o total "passou em X de 4 níveis" + `encouragement(X)`;
  - "Novo simulado" (apaga a sessão e vai para `#/aleatorio`) e "Voltar ao início".

- [ ] **Step 4: Rodar e ver passar** — `npx playwright test tests/e2e/random.spec.ts tests/e2e/home.spec.ts && npm test`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(random): tela de início, barra da sessão e resumo com nomes`

---

### Task 12: Celular: abas, barra de símbolos, rodapé e teclado

**Files:**
- Create: `src/ui/components/MobileTabs.tsx`, `src/ui/components/SymbolBar.tsx`, `src/ui/useIsMobile.ts`, `src/ui/useKeyboardInset.ts`
- Modify: `src/ui/screens/ExerciseScreen.tsx`, `src/ui/components/RunBar.tsx`, `src/ui/styles/exercise.css`, `src/ui/styles/random.css`
- Test: `tests/unit/keyboardInset.test.ts` (novo), `tests/e2e/mobile.spec.ts` (novo)

**Interfaces:**
- Consumes: `CodeEditorHandle.insertText`/`focus` (Task 9).
- Produces:
  ```ts
  export function useIsMobile(): boolean;                                         // matchMedia('(max-width: 820px)')
  export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number; // max(0, ih - h - top), arredondado
  export function useKeyboardInset(): void;                                       // grava --kb-inset (px) no <html>
  export const SYMBOLS: readonly string[];  // ['{','}','(',')','[',']',';','*','&',"'",'"','\\','|','<','\t']
  export function SymbolBar(props: { onInsert(text: string): void }): JSX.Element;
  export type MobileTab = 'subject' | 'code' | 'result';
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
// keyboardInset.test.ts
it('teclado fechado: 0; aberto: a diferença; nunca negativo', () => {
  expect(keyboardInset(800, 800, 0)).toBe(0);
  expect(keyboardInset(800, 460, 0)).toBe(340);
  expect(keyboardInset(800, 460, 40)).toBe(300);
  expect(keyboardInset(800, 900, 0)).toBe(0);
});
```
`mobile.spec.ts` (`test.use({ viewport: { width: 390, height: 844 } })`):
```ts
test('abas Enunciado, Código e Resultado; grademe leva ao Resultado', ...); // mtab-*; aria-selected
test('barra de símbolos insere no cursor e mantém o foco do editor', async ({ page }) => {
  await open(page, 'first_word');
  await page.getByTestId('mtab-code').click();
  await page.locator('.cm-content').click();
  await page.locator('[data-sym="{"]').click();
  await page.locator('[data-sym="}"]').click();
  await expect(page.locator('.cm-content')).toContainText('{}');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.cm-editor'))).toBe(true);
});
test('resultado que chega em outra aba ganha o ponto de novo', ...); // grademe, mtab-subject antes de terminar → result-dot
test('375px: sem rolagem horizontal com falha e dica', ...);         // move o teste equivalente de exercise.spec
test('simulado: a barra da sessão cabe em 2 linhas', ...);           // em 390px, boundingBox de session-bar com altura ≤ 96
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- keyboardInset && npx playwright test tests/e2e/mobile.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implementar**

- Siga as regras `≤820px` de `exercicio.html`: `.mtabs`, `.mfoot`, `.mkeys`, `data-mtab`.
- **Abas e resultado:**
  - `MobileTabs` (`mtab-subject|mtab-code|mtab-result`, `role="tab"`), com `result-dot` em Resultado quando um rodar ou grademe termina com a aba fechada;
  - rodar e grademe levam para Resultado.
- **Rodapé e barra de símbolos:**
  - no celular, os botões `run` e `grademe` saem da barra de rodar e vão para o rodapé fixo (`mobile-footer`), em largura total;
  - `SymbolBar` (`symbol-bar`) só aparece na aba Código;
  - cada botão tem `tabIndex={-1}`, `data-sym`, e `preventDefault()` em `pointerdown` e em `mousedown`, para não roubar o foco;
  - o clique chama `editor.insertText(sym)`;
  - o rótulo da tecla tab é "tab ⇥".
- **Teclado:**
  - `useKeyboardInset` ouve `resize` e `scroll` do `visualViewport` e grava `--kb-inset` (o valor de `keyboardInset`) no `<html>`;
  - o rodapé usa `bottom: var(--kb-inset, 0px)`.
- O editor ocupa a altura útil da aba.

- [ ] **Step 4: Rodar e ver passar** — `npm test && npx playwright test tests/e2e/mobile.spec.ts tests/e2e/exercise.spec.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(mobile): abas, barra de símbolos, rodapé fixo e teclado`

---

### Task 13: Limpeza e verificação final

**Files:**
- Delete: `src/ui/styles/legacy.css` e os componentes sem uso (`StatusBar.tsx`, `TopBar.tsx`, `Timer.tsx`, se ainda existirem)
- Modify: `src/main.tsx`, `README.md`
- Test: suíte inteira

- [ ] **Step 1: Achar o que ficou sem uso**

Run: `grep -rn "legacy.css\|StatusBar\|TopBar\b\|Timer\b" src`. Para cada classe de `legacy.css`, `grep -rn "<classe>" src`.
Expected: o que ainda está em uso vai para a folha da tela certa; o resto sai.

- [ ] **Step 2: Apagar `legacy.css` e os componentes sem uso; tirar o import do `main.tsx`.**

- [ ] **Step 3: Atualizar o `README.md`**

- Um parágrafo sobre o início por nível, o simulado, o tema e o uso no celular.
- O aviso de que o compilador baixa ~27 MB e pode não caber em celulares com pouca memória.

- [ ] **Step 4: Verificação completa**

Run, nesta ordem:
- `npm test`
- `npm run test:content`
- `npm run test:engine`
- `npm run build`
- `npm run check:dist`
- `npx playwright test`

Expected: tudo PASS, nos dois navegadores.

- [ ] **Step 5: Conferência visual**

- Script do Playwright no scratchpad (não vai para o commit).
- Capturas de `#/`, `#/treino/first_word` (com uma falha e uma dica) e `#/aleatorio`:
  - em 1280×800 e em 390×844;
  - nos temas claro e escuro.
- Compare com os protótipos e corrija diferenças de espaçamento, cor e tipografia.
- Confira:
  - o contraste AA dos tokens de código e das cores de diff nos dois temas;
  - que nenhum texto mono tem ligadura.

- [ ] **Step 6: Commit** — `chore(ui): remove estilos e componentes antigos; README do redesenho`

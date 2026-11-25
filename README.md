# ExamShell Rank 02

Simulador do exame **Rank 02** de C da 42SP, feito para cadetes treinarem no navegador. O site é estático (Vite + React + TypeScript): o editor, o compilador (clang em WebAssembly) e a correção rodam inteiramente no seu navegador, sem servidor.

> Projeto não oficial, sem qualquer afiliação com a 42 ou com a 42SP.

## Como rodar

Requer Node 22 ou superior.

```sh
npm i
npm run dev
```

O `predev`/`prebuild` copia e comprime o compilador para `public/clang/` (pasta ignorada pelo git).

## Testes

| Comando | O que roda |
|---|---|
| `npm test` | testes unitários |
| `npm run test:engine` | testes do motor de compilação/execução (compilador real) |
| `npm run test:content` | valida o conteúdo de cada exercício contra a referência |
| `npm run test:e2e` | testes de ponta a ponta com Playwright |
| `npm run check:dist` | falha se `dist/` contiver soluções de referência |

## Como adicionar um exercício

O catálogo (`src/content/rank02Catalog.ts`) já lista os 57 exercícios do Rank 02. Adicionar conteúdo significa:

1. Criar `content/rank02/<id>/` (público) com:
   - `exercise.json`
   - `subject.en.txt` e `subject.pt.txt`
   - `harness.c` (apenas para exercícios de função)
2. Criar a solução em `reference/rank02/<id>/`. **Todo arquivo** deve começar com a sentinela:
   ```c
   /* EXAMSHELL-REFERENCE: nunca publicar */
   ```
3. Gerar as saídas esperadas (usa gcc, `-std=gnu17`):
   ```sh
   npm run gen:expected:wsl -- <id>
   ```
   (em Linux/macOS: `npm run gen:expected -- <id>`).
4. Validar: `npm run test:content`.

### Regras das dicas

- Sempre 3 passos, do mais vago ao mais concreto.
- Cada passo começa com uma pergunta.
- Nunca mostrar código.
- No nível `basico`, o passo 3 dá a ideia decisiva, não a receita.

## Soluções nunca são publicadas

`reference/` fica fora de `public/` e de qualquer import do app. Como trava extra, `npm run check:dist` percorre `dist/` e falha se achar o marcador `EXAMSHELL-REFERENCE`, um caminho com `/reference/` ou arquivo acima de 95 MB. O CI roda essa checagem antes de publicar.

## Como publicar

O workflow `.github/workflows/deploy.yml` testa, builda e publica no GitHub Pages a cada push em `main` (ou manualmente via *workflow_dispatch*).

1. Suba o repositório para o GitHub.
2. Em **Settings → Pages → Source**, escolha **GitHub Actions**.
3. Faça push em `main`.

O site usa `base: './'` e rotas por hash, então funciona em `https://<usuario>.github.io/<repo>/`.

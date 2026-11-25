import { expect, test, type Page } from '@playwright/test';

const LOAD = 110000; // 1ª carga do compilador num contexto novo (sem Cache API)

/** Esquece de pular os espaços do início: passa em t01 e t02, falha em t03. */
const FIRST_WORD_BUG = String.raw`#include <unistd.h>

int	main(int argc, char **argv)
{
    int i = 0;

    if (argc == 2)
    {
        while (argv[1][i] && argv[1][i] != ' ')
            write(1, &argv[1][i++], 1);
    }
    write(1, "\n", 1);
    return (0);
}
`;

const FIRST_WORD_OK = String.raw`#include <unistd.h>

int	main(int argc, char **argv)
{
    int i = 0;

    if (argc == 2)
    {
        while (argv[1][i] == ' ' || argv[1][i] == '\t')
            i++;
        while (argv[1][i] && argv[1][i] != ' ' && argv[1][i] != '\t')
            write(1, &argv[1][i++], 1);
    }
    write(1, "\n", 1);
    return (0);
}
`;

const FIRST_WORD_PRINTF = String.raw`#include <stdio.h>

int	main(void)
{
    printf("oi\n");
    return (0);
}
`;

const FIRST_WORD_LOOP = String.raw`int	main(void)
{
    while (1);
    return (0);
}
`;

const FT_STRLEN = String.raw`int	ft_strlen(char *str)
{
    int i = 0;

    while (str[i])
        i++;
    return (i);
}
`;

const FT_STRLEN_WITH_MAIN =
  FT_STRLEN +
  String.raw`
int	main(void)
{
    return (ft_strlen("abc") - 3);
}
`;

const SCRATCH_MAIN = String.raw`#include <stdio.h>

int	ft_strlen(char *str);

int	main(void)
{
    printf("%d\n", ft_strlen("abc"));
    return (0);
}
`;

/** Resolve o INT_MIN com long (no wasm32 o long vira long long, como no Linux do exame). */
const FT_ITOA_LONG = String.raw`#include <stdlib.h>

char	*ft_itoa(int nbr)
{
    long	n;
    long	tmp;
    int		len;
    char	*str;

    n = nbr;
    len = 1;
    if (n < 0)
        len++;
    tmp = n;
    while (tmp / 10 != 0)
    {
        tmp /= 10;
        len++;
    }
    str = malloc(len + 1);
    if (!str)
        return (NULL);
    str[len] = '\0';
    if (n < 0)
    {
        str[0] = '-';
        n = -n;
    }
    while (n >= 10)
    {
        str[--len] = '0' + n % 10;
        n /= 10;
    }
    str[--len] = '0' + n;
    return (str);
}
`;

async function setCode(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(text);
}

/** Abre o exercício no treino e espera o compilador ficar pronto. */
async function open(page: Page, id: string) {
  await page.goto(`./#/treino/${id}`);
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
}

/** Clica em grademe e devolve o bloco do resultado, já terminado. */
async function grademe(page: Page) {
  const results = page.getByTestId('grade-result');
  const before = await results.count();
  await page.getByTestId('grademe').click();
  await expect(results).toHaveCount(before + 1);
  const last = results.last();
  await expect(last).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  return last;
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('grademe mostra onde quebrou e as dicas, uma por vez', async ({ page }) => {
  // segura o download um pouco: no localhost ele acaba rápido demais para ver o "baixando"
  await page.route('**/clang/llvm.core.wasm.gz', async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await r.continue();
  });
  await page.goto('./#/treino/first_word');
  const loader = page.getByTestId('compiler-loader');
  await expect(loader).toBeVisible();
  await expect(loader).toContainText('baixando o compilador, só na primeira vez');
  await expect(page.getByTestId('grademe')).toBeDisabled();
  await expect(page.getByTestId('run')).toBeDisabled();
  await expect(loader).toBeHidden({ timeout: LOAD });

  await setCode(page, FIRST_WORD_BUG);
  await grademe(page);
  const log = page.getByTestId('log');
  await expect(log).toContainText('examshell> grademe');
  await expect(log).toContainText('✗ teste 5/8');
  await expect(log).toContainText('./first_word "  lorem,ipsum  "');
  await expect(log).toContainText('esperado:');
  await expect(log).toContainText('recebido:');

  const hint = page.getByTestId('hint');
  await hint.click();
  await expect(log).toContainText('dica 1/3 · E se a string já começar com espaços?');
  await expect(log).not.toContainText('dica 2/3');
  await hint.click();
  await hint.click();
  await expect(log).toContainText('dica 3/3');
  await expect(hint).toBeDisabled();
});

test('código corrigido passa, e a lista marca o exercício como passou', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  const result = await grademe(page);
  await expect(result).toContainText('✓ passou nos 8 testes');
  await expect(page.getByTestId('hint')).toHaveCount(0);

  await page.getByRole('link', { name: 'voltar à lista' }).click();
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'passed');
});

test('o editor guarda o último código depois do reload', async ({ page }) => {
  await page.goto('./#/treino/first_word');
  await setCode(page, '/* rascunho guardado */\n' + FIRST_WORD_BUG);
  await expect(page.locator('.cm-content')).toContainText('rascunho guardado');
  await page.reload();
  await expect(page.locator('.cm-content')).toContainText('rascunho guardado');
  await expect(page.locator('.cm-content')).toContainText("argv[1][i] != ' '");
});

test('rodar com argumentos mostra a saída com $ no fim da linha', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  await page.getByTestId('run-args').fill('"  hello world"');
  await page.getByTestId('run').click();
  const out = page.getByTestId('run-result').last();
  await expect(out).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  const log = page.getByTestId('log');
  await expect(log).toContainText('examshell> ./first_word "  hello world"');
  await expect(out).toContainText('hello$');

  await page.getByTestId('run-args').fill('"abc');
  await page.getByTestId('run').click();
  await expect(log).toContainText('aspas sem fechar');
});

test('programa sem main: erro de link, não segfault', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, '');
  const result = await grademe(page);
  await expect(result).toContainText('não encontrei a função main');
  await expect(page.getByTestId('log')).not.toContainText('segfault');
});

test('função proibida reprova com o nome dela', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_PRINTF);
  const result = await grademe(page);
  await expect(result).toContainText('printf');
  await expect(result).toContainText('não está permitida');
});

test('ft_strlen: main no arquivo reprova; a aba de rascunho roda o main do cadete', async ({ page }) => {
  await open(page, 'ft_strlen');
  await expect(page.getByRole('tab', { name: 'ft_strlen.c' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'main.c (rascunho)' })).toBeVisible();
  await expect(page.getByTestId('run')).toBeDisabled(); // rascunho vazio

  await setCode(page, FT_STRLEN_WITH_MAIN);
  const result = await grademe(page);
  await expect(result).toContainText('não se entrega main');

  await setCode(page, FT_STRLEN);
  await page.getByRole('tab', { name: 'main.c (rascunho)' }).click();
  await setCode(page, SCRATCH_MAIN);
  await expect(page.getByTestId('run')).toBeEnabled();
  await page.getByTestId('run').click();
  const out = page.getByTestId('run-result').last();
  await expect(out).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(out).toContainText('3$');

  // o grademe ignora o rascunho e usa o main de teste do site
  await expect(await grademe(page)).toContainText('✓ passou nos 8 testes');
});

test('ft_itoa resolvido com long passa no INT_MIN', async ({ page }) => {
  await open(page, 'ft_itoa');
  await setCode(page, FT_ITOA_LONG);
  await expect(await grademe(page)).toContainText('✓ passou');
});

test('laço infinito dá tempo esgotado', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_LOOP);
  const result = await grademe(page);
  await expect(result).toContainText('✗ teste 1/8');
  await expect(result).toContainText('tempo esgotado');
});

test('grademe que termina depois de sair da tela não conta tentativa', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_LOOP);
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('grade-result')).toHaveAttribute('data-state', 'running');
  await page.getByRole('link', { name: 'voltar à lista' }).click();
  await expect(page.getByTestId('ex-first_word')).toBeVisible();
  // compilar + 2 s de tempo esgotado: depois disso o grademe abandonado já terminou
  await page.waitForTimeout(4000);
  const progress = await page.evaluate(() => localStorage.getItem('examshell:v1:progress'));
  expect(progress ?? '').not.toContain('first_word');
  await page.reload(); // a lista só lê o progresso ao renderizar
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'untried');
});

test('idioma do enunciado alterna, e o vim fica ligado depois do reload', async ({ page }) => {
  await page.goto('./#/treino/first_word');
  const subject = page.getByTestId('subject');
  const lang = page.getByTestId('subject-lang');
  await expect(subject).toContainText('Assignment name');
  await expect(lang).toHaveText('ver em português');
  await lang.click();
  await expect(subject).toContainText('Nome do exercício');
  await expect(subject).not.toContainText('Assignment name');
  await expect(lang).toHaveText('view in English');
  await lang.click();
  await expect(subject).toContainText('Assignment name');

  const vim = page.getByTestId('vim-toggle');
  await expect(vim).not.toBeChecked();
  await vim.click();
  await expect(vim).toBeChecked();
  await page.reload();
  await expect(page.getByTestId('vim-toggle')).toBeChecked();
});

test('duplo clique no grademe gera um só resultado', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  const results = page.getByTestId('grade-result');
  await expect(results).toHaveCount(0);
  await page.getByTestId('grademe').dblclick();
  await expect(results).toHaveCount(1);
  await expect(results.first()).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(page.getByTestId('grademe')).toBeEnabled();
  await expect(results).toHaveCount(1);
});

test('sem rolagem horizontal em 375px, com falha e dica no log', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_BUG);
  await grademe(page);
  await page.getByTestId('hint').click();
  await expect(page.getByTestId('log')).toContainText('dica 1/3');
  const sw = await page.evaluate(() => document.scrollingElement!.scrollWidth);
  expect(sw).toBeLessThanOrEqual(375);
});

const SORT_LIST_OK = String.raw`#include "list.h"

t_list	*sort_list(t_list *lst, int (*cmp)(int, int))
{
    t_list	*a;
    t_list	*b;
    int		tmp;

    a = lst;
    while (a)
    {
        b = a->next;
        while (b)
        {
            if (!cmp(a->data, b->data))
            {
                tmp = a->data;
                a->data = b->data;
                b->data = tmp;
            }
            b = b->next;
        }
        a = a->next;
    }
    return (lst);
}
`;

test('header fornecido aparece como aba somente leitura e entra na compilação', async ({ page }) => {
  await open(page, 'sort_list');
  await expect(page.getByRole('tab', { name: 'list.h', exact: true })).toHaveCount(0);
  const tab = page.getByRole('tab', { name: 'list.h (fornecido)' });
  await expect(tab).toBeVisible();
  await tab.click();
  const content = page.locator('.cm-content');
  await expect(content).toContainText('struct s_list');
  const before = await content.innerText();
  await content.click();
  await page.keyboard.type('lixo');
  await page.keyboard.insertText('lixo');
  expect(await content.innerText()).toBe(before);
  await page.getByRole('tab', { name: 'sort_list.c' }).click();
  await setCode(page, SORT_LIST_OK);
  await expect(await grademe(page)).toContainText('✓ passou');
});

test('se o editor não carregar, aparece um aviso com "recarregar" em vez de tela em branco', async ({ page }) => {
  // ex.: um deploy novo trocou o nome do pedaço do editor, ou a conexão caiu
  const editorChunk = '**/assets/CodeEditor-*.js';
  await page.route(editorChunk, (r) => r.abort());
  await page.goto('./#/treino/first_word');
  const fallback = page.getByTestId('error-fallback');
  await expect(fallback).toContainText(
    'Algo deu errado ao carregar esta parte do site. Recarregue a página para continuar.',
  );
  await expect(page.getByTestId('subject')).toContainText('Assignment name'); // o resto da tela segue de pé

  await page.unroute(editorChunk);
  await page.getByRole('button', { name: 'recarregar' }).click();
  await expect(page.locator('.cm-content')).toBeVisible();
  await expect(fallback).toHaveCount(0);
});

test('compilador que não baixa: aviso, detalhe do erro e dica de recarregar; tentar de novo funciona', async ({
  page,
}) => {
  const wasm = '**/clang/llvm.core.wasm.gz';
  await page.route(wasm, (r) => r.abort());
  await page.goto('./#/treino/first_word');
  const loader = page.getByTestId('compiler-loader');
  await expect(loader).toContainText('Não consegui baixar o compilador. Verifique a conexão e tente de novo.', {
    timeout: LOAD,
  });
  await expect(loader).toContainText('Se tentar de novo não resolver, recarregue a página.');
  await loader.getByText('detalhes do erro').click();
  await expect(loader.locator('pre')).toContainText('llvm.core.wasm.gz');

  await page.unroute(wasm);
  await page.getByTestId('compiler-retry').click();
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await expect(loader).toBeHidden();
});

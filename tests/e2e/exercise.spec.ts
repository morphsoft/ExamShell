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

/** Escreve em NULL na linha 10. */
const FIRST_WORD_NULL = String.raw`#include <unistd.h>

int	main(int argc, char **argv)
{
    char	*p;

    p = 0;
    if (argc == 2)
        write(1, argv[1], 1);
    p[0] = 'x';
    write(1, "\n", 1);
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
  // o Firefox lança NS_ERROR_FAILURE em insertText('')
  if (text === '') await page.keyboard.press('Backspace');
  else await page.keyboard.insertText(text);
}

/** Abre o exercício no treino e espera o compilador ficar pronto. */
async function open(page: Page, id: string) {
  await page.goto(`./#/treino/${id}`);
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
}

/** Clica em grademe e devolve o bloco do resultado, já terminado. */
async function grademe(page: Page) {
  // os grademes antigos ficam recolhidos: contam-se as entradas do log, não os cartões abertos
  const entries = page.locator('.entry').filter({ hasText: 'examshell> grademe' });
  const before = await entries.count();
  await page.getByTestId('grademe').click();
  await expect(entries).toHaveCount(before + 1);
  const last = page.getByTestId('grade-result').last();
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
  const card = page.getByTestId('grade-result');
  await expect(card).toContainText('✗ Falhou no teste 5 de 8');
  const dots = page.getByTestId('test-dots').locator('i');
  await expect(dots).toHaveCount(8);
  await expect(dots.locator(':scope[data-state="ok"]')).toHaveCount(4);
  await expect(dots.locator(':scope[data-state="bad"]')).toHaveCount(1);
  await expect(dots.locator(':scope[data-state="skip"]')).toHaveCount(3);
  await expect(log).toContainText('./first_word "  lorem,ipsum  "');
  await expect(log).toContainText('esperado:');
  await expect(log).toContainText('recebido:');

  const hint = page.getByTestId('hint');
  await expect(hint).toHaveText('Pedir dica');
  await hint.click();
  await expect(log).toContainText('Dica 1 de 3 · E se a string já começar com espaços?');
  await expect(log).not.toContainText('Dica 2 de 3');
  await expect(hint).toHaveText('Próxima dica (2/3)');
  await hint.click();
  await expect(hint).toHaveText('Próxima dica (3/3)');
  await hint.click();
  await expect(log).toContainText('Dica 3 de 3');
  await expect(hint).toHaveCount(0);
});

test('compilação que falha: título e pontos todos apagados', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, 'int main(void) { return x; }');
  const result = await grademe(page);
  await expect(result).toContainText('✗ Não compilou');
  const dots = page.getByTestId('test-dots').locator('i');
  await expect(dots).toHaveCount(8);
  await expect(dots.locator(':scope[data-state="skip"]')).toHaveCount(8);
});

test('passar: cartão com o progresso do nível, ações e aviso', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  const result = await grademe(page);
  await expect(result).toContainText('✓ Passou nos 8 testes');
  await expect(result).toContainText('Nível 1 agora está em 1 de 12');
  await expect(page.getByTestId('pass-draw')).toContainText('Sortear outro do nível 1');
  await expect(page.getByTestId('pass-home')).toContainText('Voltar ao início');
  await expect(page.getByTestId('pass-toast')).toBeVisible();
  await expect(page.getByTestId('pass-toast')).toContainText('Nível 1 agora está em 1 de 12');
  await expect(page.getByTestId('pass-toast')).toBeHidden({ timeout: 8000 });
  await page.getByTestId('pass-draw').click();
  await expect(page).toHaveURL(/#\/treino\/(?!first_word$)\w+/);
});

test('grademe anterior fica recolhido e abre ao clicar', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_BUG);
  await grademe(page);
  await expect(page.getByTestId('older-grade')).toHaveCount(0);
  await grademe(page);
  const older = page.getByTestId('older-grade');
  await expect(older).toHaveCount(1);
  await expect(older).toContainText('▸ grademe anterior: ✗ Falhou no teste 5 de 8');
  await expect(page.getByTestId('grade-result')).toHaveCount(1);
  await older.click();
  await expect(page.getByTestId('grade-result')).toHaveCount(2);
});

test('código corrigido passa, e a lista marca o exercício como passou', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  const result = await grademe(page);
  await expect(result).toContainText('✓ Passou nos 8 testes');
  await expect(page.getByTestId('hint')).toHaveCount(0);

  await page.getByTestId('back').click();
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
  await expect(await grademe(page)).toContainText('✓ Passou nos 8 testes');
});

test('ft_itoa resolvido com long passa no INT_MIN', async ({ page }) => {
  await open(page, 'ft_itoa');
  await setCode(page, FT_ITOA_LONG);
  await expect(await grademe(page)).toContainText('✓ Passou');
});

test('laço infinito dá tempo esgotado', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_LOOP);
  const result = await grademe(page);
  await expect(result).toContainText('✗ Falhou no teste 1 de 8');
  await expect(result).toContainText('tempo esgotado');
});

test('travamento mostra a linha do código, no grademe e no rodar', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_NULL);
  const result = await grademe(page);
  await expect(result).toContainText('✗ Falhou no teste 1 de 8');
  await expect(result).toContainText('o programa travou (segfault) na linha 10 de first_word.c');

  await page.getByTestId('run-args').fill('abc');
  await page.getByTestId('run').click();
  const out = page.getByTestId('run-result').last();
  await expect(out).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(out).toContainText('o programa travou (segfault) na linha 10 de first_word.c');
});

test('grademe que termina depois de sair da tela não conta tentativa', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_LOOP);
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('grade-result')).toHaveAttribute('data-state', 'running');
  await page.getByTestId('back').click();
  await expect(page.getByTestId('ex-first_word')).toBeVisible();
  // compilar + 2 s de tempo esgotado: depois disso o grademe abandonado já terminou
  await page.waitForTimeout(4000);
  const progress = await page.evaluate(() => localStorage.getItem('examshell:v1:progress'));
  expect(progress ?? '').not.toContain('first_word');
  const activity = await page.evaluate(() => localStorage.getItem('examshell:v1:activity'));
  expect(JSON.parse(activity ?? '{}').lastAttempt?.first_word).toBeUndefined(); // abandonado: nem tentativa, nem sequência
  await page.reload(); // a lista só lê o progresso ao renderizar
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'untried');
});

test('idioma do enunciado alterna, e o vim fica ligado depois do reload', async ({ page }) => {
  await page.goto('./#/treino/first_word');
  const subject = page.getByTestId('subject');
  const en = page.getByTestId('lang-en');
  const pt = page.getByTestId('lang-pt');
  await expect(page.getByTestId('subject-lang')).toBeVisible();
  await expect(subject).toContainText('Write a program that takes a string');
  await expect(en).toHaveAttribute('aria-pressed', 'true');
  await expect(pt).toHaveAttribute('aria-pressed', 'false');
  await pt.click();
  await expect(subject).toContainText('Escreva um programa');
  await expect(subject).not.toContainText('Write a program');
  await expect(pt).toHaveAttribute('aria-pressed', 'true');
  await en.click();
  await expect(subject).toContainText('Write a program that takes a string');

  const vim = page.getByTestId('vim-toggle');
  await expect(vim).not.toBeChecked();
  await vim.click();
  await expect(vim).toBeChecked();
  await page.reload();
  await expect(page.getByTestId('vim-toggle')).toBeChecked();
});

test('topo mostra nível e status; o status muda depois do grademe', async ({ page }) => {
  await page.goto('./#/treino/first_word');
  await expect(page.getByTestId('exercise-name')).toHaveText('first_word');
  await expect(page.getByTestId('ex-status')).toHaveText('novo');
  await expect(page.locator('.crumb .lv')).toHaveText('nível 1');
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await setCode(page, FIRST_WORD_BUG);
  await grademe(page);
  await expect(page.getByTestId('ex-status')).toHaveText('ainda não passou · tentativa 1');
  await grademe(page);
  await expect(page.getByTestId('ex-status')).toHaveText('ainda não passou · tentativa 2');
  await setCode(page, FIRST_WORD_OK);
  await grademe(page);
  await expect(page.getByTestId('ex-status')).toHaveText('passou ✓');
});

test('progresso salvo antes das tentativas contadas aparece como tentativa 1, não como novo', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('examshell:v1:progress', JSON.stringify({ first_word: 'tried' })));
  await page.goto('./#/treino/first_word');
  await expect(page.getByTestId('ex-status')).toHaveText('ainda não passou · tentativa 1');
});

test('enunciado em parágrafos e bloco de terminal, com os fatos do exercício', async ({ page }) => {
  await page.goto('./#/treino/first_word');
  const subject = page.getByTestId('subject');
  await expect(subject.locator('p').first()).toHaveText(
    'Write a program that takes a string and displays its first word, followed by a newline.',
  );
  await expect(subject.locator('pre.examples .cmd').first()).toHaveText('./first_word "FOR PONY" | cat -e');
  await expect(subject.locator('pre.examples .out').first()).toHaveText('FOR$');
  await expect(page.locator('.facts')).toContainText('first_word.c');
  await expect(page.locator('.facts')).toContainText('write');
  await expect(page.locator('.facts')).toContainText('8 testes');
});

test('mudar vim ou idioma depois de trocar o tema não desfaz o tema', async ({ page }) => {
  await page.goto('./#/treino/first_word');
  await page.getByTestId('theme-toggle').click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(theme);
  await page.getByTestId('vim-toggle').click();
  await page.getByTestId('lang-pt').click();
  await page.reload();
  await expect(page.getByTestId('vim-toggle')).toBeChecked();
  await expect(page.getByTestId('lang-pt')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('examshell:v1:settings') ?? '{}'));
  expect(saved.theme).toBe(theme);
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
  await expect(page.getByTestId('log')).toContainText('Dica 1 de 3');
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
  await expect(await grademe(page)).toContainText('✓ Passou');
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
  await expect(page.getByTestId('subject')).toContainText('Write a program'); // o resto da tela segue de pé

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

test('aba que morreu no início do motor: aviso de memória e tentar de novo funciona', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('examshell:v1:engine-init', '1'));
  await page.goto('about:blank'); // o beforeEach já abriu o site: só uma navegação nova roda o addInitScript
  await page.goto('./#/treino/first_word');
  await expect(page.getByTestId('compiler-loader')).toContainText('Este aparelho pode não ter memória suficiente');
  await page.getByTestId('compiler-retry').click();
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
});

test('Ctrl+Enter dentro do editor corrige, sem quebrar linha', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, 'int main(void){return 0;}');
  const before = await page.locator('.cm-content').innerText();
  await page.locator('.cm-content').press('Control+Enter');
  await expect(page.getByTestId('grade-result').last()).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  expect(await page.locator('.cm-content').innerText()).toBe(before);
});

test('Ctrl+Shift+Enter roda com os argumentos do campo', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  await page.getByTestId('run-args').fill('a b');
  await page.locator('.cm-content').press('Control+Shift+Enter');
  const result = page.getByTestId('run-result').last();
  await expect(result).toBeVisible({ timeout: 60000 });
  await expect(result).toContainText('./first_word a b');
  await expect(page.getByTestId('grade-result')).toHaveCount(0);
});

test('recomeçar pede confirmação na página e volta o arquivo ao início', async ({ page }) => {
  await open(page, 'first_word');
  await setCode(page, FIRST_WORD_OK);
  await expect(page.locator('.cm-content')).toContainText('argv');
  await page.getByTestId('editor-reset').click();
  await expect(page.getByTestId('reset-confirm')).toBeVisible();
  await page.getByRole('button', { name: 'cancelar' }).click();
  await expect(page.getByTestId('reset-confirm')).toBeHidden();
  await expect(page.locator('.cm-content')).toContainText('argv');
  await page.getByTestId('editor-reset').click();
  await page.getByTestId('reset-confirm').click();
  await expect(page.getByTestId('reset-confirm')).toBeHidden();
  await expect(page.locator('.cm-content')).not.toContainText('argv');
});

test('gerar main de exemplo preenche o rascunho e rodar funciona', async ({ page }) => {
  await open(page, 'ft_strlen');
  await expect(page.getByTestId('run-help')).toBeVisible();
  await setCode(page, FT_STRLEN);
  await page.getByTestId('sample-main').click();
  await expect(page.getByRole('tab', { name: 'main.c (rascunho)' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.cm-content')).toContainText('main');
  await expect(page.getByTestId('run-help')).toBeHidden();
  await page.getByRole('tab', { name: 'ft_strlen.c' }).click();
  await expect(page.locator('.cm-content')).toContainText('ft_strlen(char');
  await page.getByTestId('run').click();
  await expect(page.getByTestId('run-result').last()).toBeVisible({ timeout: 60000 });
});

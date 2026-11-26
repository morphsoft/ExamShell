import { expect, test } from '@playwright/test';

import { FIRST_WORD_BUG, grademe, LOAD, open, setCode } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('abas Enunciado, Código e Resultado; grademe leva ao Resultado', async ({ page }) => {
  await open(page, 'first_word');
  // run e grademe existem só no rodapé
  await expect(page.getByTestId('grademe')).toHaveCount(1);
  await expect(page.getByTestId('mobile-footer').getByTestId('grademe')).toHaveCount(1);
  await expect(page.getByTestId('mobile-footer').getByTestId('run')).toHaveCount(1);

  await expect(page.getByTestId('mtab-subject')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('subject')).toBeVisible();
  await expect(page.locator('.cm-content')).toBeHidden();
  await expect(page.getByTestId('symbol-bar')).toHaveCount(0);

  await page.getByTestId('mtab-code').click();
  await expect(page.getByTestId('mtab-code')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.cm-content')).toBeVisible();
  await expect(page.getByTestId('symbol-bar')).toBeVisible();
  await expect(page.getByTestId('subject')).toBeHidden();

  await setCode(page, FIRST_WORD_BUG);
  await grademe(page);
  await expect(page.getByTestId('mtab-result')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('grade-result').last()).toBeVisible();
  await expect(page.locator('.cm-content')).toBeHidden();
  await expect(page.getByTestId('symbol-bar')).toHaveCount(0);
});

test('barra de símbolos insere no cursor e mantém o foco do editor', async ({ page }) => {
  await open(page, 'first_word');
  await page.getByTestId('mtab-code').click();
  await page.locator('.cm-content').click();
  await page.locator('[data-sym="{"]').click();
  await page.locator('[data-sym="}"]').click();
  await expect(page.locator('.cm-content')).toContainText('{}');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.cm-editor'))).toBe(true);
});

test('resultado que chega em outra aba ganha o ponto de novo', async ({ page }) => {
  await open(page, 'first_word');
  await page.getByTestId('mtab-code').click();
  await setCode(page, FIRST_WORD_BUG);
  await page.getByTestId('grademe').click();
  await page.getByTestId('mtab-subject').click();
  await expect(page.getByTestId('result-dot')).toBeVisible({ timeout: 60000 });
  await page.getByTestId('mtab-result').click();
  await expect(page.getByTestId('result-dot')).toHaveCount(0);
  await expect(page.getByTestId('grade-result').last()).toHaveAttribute('data-state', 'done');
});

test('375px: sem rolagem horizontal com falha e dica', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, 'first_word');
  await page.getByTestId('mtab-code').click();
  await setCode(page, FIRST_WORD_BUG);
  await grademe(page);
  await page.getByTestId('hint').click();
  await expect(page.getByTestId('log')).toContainText('Dica 1 de 3');
  const sw = await page.evaluate(() => document.scrollingElement!.scrollWidth);
  expect(sw).toBeLessThanOrEqual(375);
});

test('simulado: a barra da sessão cabe em 2 linhas', async ({ page }) => {
  await page.goto('./#/aleatorio?seed=7');
  await page.getByTestId('start-random').click();
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  const box = await page.getByTestId('session-bar').boundingBox();
  await expect(page.getByTestId('exit-session')).toHaveText('Sair (a sessão continua)');
  await expect(page.getByTestId('exit-session')).toBeVisible();
  expect(box!.height).toBeLessThanOrEqual(96);
  const sw = await page.evaluate(() => document.scrollingElement!.scrollWidth);
  expect(sw).toBeLessThanOrEqual(390);
});

test('aviso de memória e "tentar de novo" aparecem na aba Enunciado', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('examshell:v1:engine-init', '1'));
  await page.goto('about:blank'); // o beforeEach já abriu o site: só uma navegação nova roda o addInitScript
  await page.goto('./#/treino/first_word');
  await expect(page.getByTestId('mtab-subject')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('compiler-loader')).toBeVisible();
  await expect(page.getByTestId('compiler-loader')).toContainText('Este aparelho pode não ter memória suficiente');
  await expect(page.getByTestId('compiler-retry')).toBeVisible();
});

test('simulado depois de uma falha (com "Sortear outro"): a barra continua em 2 linhas', async ({ page }) => {
  await page.goto('./#/aleatorio?seed=7');
  await page.getByTestId('start-random').click();
  await page.evaluate(() => {
    const k = 'examshell:v1:session';
    const s = JSON.parse(localStorage.getItem(k)!);
    s.levels[0].lastAttemptFailed = true;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByTestId('swap')).toBeVisible();
  await expect(page.getByTestId('exit-session')).toHaveText('Sair (a sessão continua)');
  const box = await page.getByTestId('session-bar').boundingBox();
  expect(box!.height).toBeLessThanOrEqual(96);
});

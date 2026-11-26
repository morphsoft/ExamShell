import { expect, test } from '@playwright/test';

import { RANK02_CATALOG } from '../../src/content/rank02Catalog';
import { startSession } from '../../src/state/randomSession';
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

test('375×667: os botões do resumo ficam acima da navegação de baixo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const ids = (level: number) => RANK02_CATALOG.filter((e) => e.level === level).map((e) => e.id);
  const pool = { 1: ids(1), 2: ids(2), 3: ids(3), 4: ids(4) };
  // um resumo comprido: três níveis pulados depois de duas trocas (um botão "Treinar" para cada)
  const base = startSession(pool, 3, Date.now() - 600000);
  const levels = base.levels.map((run, i) =>
    i < 3
      ? { ...run, exerciseId: pool[(i + 1) as 1 | 2 | 3][2], outcome: 'skipped' as const, attempts: 2, swappedFrom: pool[(i + 1) as 1 | 2 | 3].slice(0, 2) }
      : { ...run, exerciseId: pool[4][0] },
  );
  const saved = { ...base, levels, currentLevel: 4 as const, finishedAt: Date.now() };
  await page.evaluate((s) => localStorage.setItem('examshell:v1:session', JSON.stringify(s)), saved);
  await page.goto('./#/aleatorio/resumo');
  await expect(page.getByTestId('summary')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight)).toBeGreaterThan(667); // a página rola
  const nav = await page.locator('nav.bottom-nav').boundingBox();
  for (const id of ['new-simulado', 'summary-home']) {
    const btn = await page.getByTestId(id).boundingBox();
    expect(btn!.y + btn!.height, id).toBeLessThanOrEqual(nav!.y);
  }
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

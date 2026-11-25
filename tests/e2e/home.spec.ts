import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('home mostra os dois modos', async ({ page }) => {
  await expect(page.getByTestId('mode-practice')).toContainText('Treino livre');
  await expect(page.getByTestId('mode-random')).toContainText('Modo aleatório');
});

test('sem progresso, a home não mostra ✓ nos níveis', async ({ page }) => {
  await expect(page.locator('.levels li')).toHaveCount(4);
  await expect(page.locator('.levels')).not.toContainText('✓');
});

test('lista de treino e navegação ao exercício', async ({ page }) => {
  await page.getByTestId('mode-practice').click();
  for (const n of [1, 2, 3, 4]) await expect(page.getByText(`Nível ${n}`).first()).toBeVisible();
  const legend = page.getByTestId('legend');
  await expect(legend).toHaveText(/^✓ passou\s+~ tentado\s+· não tentado$/);
  await expect(legend).not.toContainText('· ·');
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'untried');
  await page.getByTestId('ex-first_word').click();
  expect(page.url()).toMatch(/#\/treino\/first_word$/);
});

test('sem rolagem horizontal em 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const sw = () => page.evaluate(() => document.scrollingElement!.scrollWidth);
  expect(await sw()).toBeLessThanOrEqual(375);
  await page.getByTestId('mode-practice').click();
  await expect(page.getByTestId('ex-first_word')).toBeVisible();
  expect(await sw()).toBeLessThanOrEqual(375);
});

test('limpar progresso volta tudo a untried', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('examshell:v1:progress', JSON.stringify({ first_word: 'passed', inter: 'tried' })),
  );
  await page.reload();
  await page.getByTestId('mode-practice').click();
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'passed');
  await page.goto('./#/');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('clear-progress').click();
  await page.getByTestId('mode-practice').click();
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'untried');
  await expect(page.getByTestId('ex-inter')).toHaveAttribute('data-status', 'untried');
});

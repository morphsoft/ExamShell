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

test('lista: 4 níveis com títulos, 6 por nível e "ver todos"', async ({ page }) => {
  const titles = ['Primeiros passos', 'Strings e bits', 'Números e listas', 'Algoritmos'];
  for (const n of [1, 2, 3, 4]) {
    await expect(page.getByTestId(`level-${n}`)).toContainText(`Nível ${n} · ${titles[n - 1]}`);
  }
  await expect(page.getByTestId('level-2').locator('[data-testid^="ex-"]')).toHaveCount(6);
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'untried');
  await page.getByTestId('show-all-2').click();
  await expect(page.getByTestId('level-2').locator('[data-testid^="ex-"]')).toHaveCount(20);
  await expect(page.getByTestId('show-all-2')).toHaveCount(0);
});

test('busca e filtro', async ({ page }) => {
  await page.getByTestId('search').fill('tamanho');
  await expect(page.locator('[data-testid^="ex-"]')).toHaveCount(1);
  await expect(page.getByTestId('ex-ft_strlen')).toBeVisible();
  await page.getByTestId('search').fill('zzzqq');
  await expect(page.getByTestId('level-1')).toContainText('Nenhum exercício com “zzzqq”.');
  await page.getByTestId('level-1').getByRole('button', { name: 'limpar busca' }).click();
  await expect(page.getByTestId('search')).toHaveValue('');
  await expect(page.getByTestId('ex-first_word')).toBeVisible();

  await page.evaluate(() =>
    localStorage.setItem('examshell:v1:progress', JSON.stringify({ first_word: 'passed', inter: 'tried' })),
  );
  await page.reload();
  await page.getByTestId('filter-passed').click();
  await expect(page.getByTestId('filter-passed')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid^="ex-"]')).toHaveCount(1);
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'passed');
  await expect(page.getByTestId('level-2')).toContainText('Você ainda não passou em nenhum deste nível.');
  await page.getByTestId('filter-todo').click();
  await expect(page.getByTestId('ex-first_word')).toHaveCount(0);
  await expect(page.getByTestId('ex-inter')).toHaveAttribute('data-status', 'tried');
  await page.evaluate(() => {
    const all: Record<string, string> = { first_word: 'passed' };
    for (const el of Array.from(document.querySelectorAll('[data-testid^="ex-"]'))) {
      all[el.getAttribute('data-testid')!.slice(3)] = 'passed';
    }
    localStorage.setItem('examshell:v1:progress', JSON.stringify(all));
  });
  await page.reload();
  await page.getByTestId('filter-todo').click();
  await expect(page.getByTestId('level-1')).toContainText('Você já passou em todos deste nível.');
});

test('item abre o detalhe; Começar leva ao exercício', async ({ page }) => {
  await page.getByTestId('ex-first_word').click();
  const detail = page.getByTestId('detail');
  await expect(detail).toBeVisible();
  await expect(detail).toHaveAttribute('role', 'dialog');
  await expect(detail).toContainText('first_word');
  await expect(page.getByTestId('drawn-badge')).toHaveCount(0);
  await expect(page.getByTestId('detail-start')).toHaveText('Começar');
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  await expect(page.getByTestId('ex-first_word')).toBeFocused();
  await page.getByTestId('ex-first_word').click();
  await page.getByTestId('detail-close').click();
  await expect(detail).toHaveCount(0);
  await page.getByTestId('ex-first_word').click();
  await page.getByTestId('detail-start').click();
  expect(page.url()).toMatch(/#\/treino\/first_word$/);
});

test('o rótulo do botão segue o status', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('examshell:v1:progress', JSON.stringify({ first_word: 'passed', inter: 'tried' })),
  );
  await page.reload();
  await page.getByTestId('ex-first_word').click();
  await expect(page.getByTestId('detail-start')).toHaveText('Praticar de novo');
  await page.keyboard.press('Escape');
  await page.getByTestId('show-all-2').click();
  await page.getByTestId('ex-inter').click();
  await expect(page.getByTestId('detail-start')).toHaveText('Continuar');
});

test('sortear um do nível abre o detalhe com o selo; Sortear outro troca', async ({ page }) => {
  await page.getByTestId('draw-1').click();
  await expect(page.getByTestId('detail')).toBeVisible();
  await expect(page.getByTestId('drawn-badge')).toHaveText('caiu no sorteio');
  const name = () => page.locator('#detail-name').textContent();
  const first = await name();
  await expect(page.getByTestId('detail-redraw')).toBeVisible();
  await expect.poll(async () => {
    await page.getByTestId('detail-redraw').click();
    return name();
  }).not.toBe(first);
});

test('#/treino rola até os exercícios', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('./#/treino');
  await expect(page.getByTestId('search')).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
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
  await page.getByTestId('show-all-2').click(); // inter fica fora dos 6 primeiros do nível 2
  await expect(page.getByTestId('ex-inter')).toHaveAttribute('data-status', 'untried');
});

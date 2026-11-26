import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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

test('início vazio: preparação "ainda não começou" e convite do nível 1', async ({ page }) => {
  for (const n of [1, 2, 3, 4]) await expect(page.getByTestId(`prep-${n}`)).toContainText('ainda não começou');
  await expect(page.getByTestId('continue-card')).toContainText('Comece pelo nível 1');
  await expect(page.getByTestId('streak')).toHaveText(/comece hoje/);
  await expect(page.getByTestId('passed-count')).toHaveText(/0\/57 passaram/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bora treinar para o Rank 02');
});

test('continuar mostra o último aberto com as barrinhas da última tentativa', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'examshell:v1:activity',
      JSON.stringify({
        lastOpened: { id: 'inter', at: 1 },
        lastAttempt: { inter: { passed: 2, total: 9, count: 1 } },
        streak: null,
      }),
    ),
  );
  await page.reload();
  const card = page.getByTestId('continue-card');
  await expect(card).toContainText('inter');
  await expect(card).toContainText('na última tentativa passou em 2 de 9 testes');
  await expect(card.locator('.tests i')).toHaveCount(9);
  await expect(card.locator('.tests i.ok')).toHaveCount(2);
  await expect(card.locator('.tests i.bad')).toHaveCount(1);
  await expect(page.getByTestId('continue-open')).toHaveText('Abrir inter');
  await expect(page.getByTestId('continue-draw')).toHaveText('Sortear outro do nível 2');
  await page.getByTestId('continue-draw').click();
  await expect(page.getByTestId('drawn-badge')).toBeVisible();
  expect(await page.locator('#detail-name').textContent()).not.toBe('inter');
  await page.keyboard.press('Escape');
  await page.getByTestId('continue-open').click();
  expect(page.url()).toMatch(/#\/treino\/inter$/);
});

test('continuar com id que não existe mais vira o convite', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'examshell:v1:activity',
      JSON.stringify({ lastOpened: { id: 'nao_existe_mais', at: 1 }, lastAttempt: {}, streak: null }),
    ),
  );
  await page.reload();
  await expect(page.getByTestId('continue-card')).toContainText('Comece pelo nível 1');
  await expect(page.getByTestId('continue-open')).toHaveCount(0);
});

test('simulado em andamento: o cartão vira "Continuar simulado"', async ({ page }) => {
  await expect(page.getByTestId('start-simulado')).toBeVisible();
  await expect(page.getByTestId('continue-random')).toHaveCount(0);
  await page.evaluate(() => {
    const levels = [1, 2, 3, 4].map((level) => ({
      level,
      exerciseId: level === 2 ? 'inter' : null,
      outcome: level === 1 ? 'skipped' : 'pending',
      attempts: 0,
      hintsUsed: 0,
      swappedFrom: [],
      lastAttemptFailed: false,
    }));
    localStorage.setItem(
      'examshell:v1:session',
      JSON.stringify({ seed: 1, draws: 1, startedAt: Date.now() - 60000, currentLevel: 2, levels, finishedAt: null, drafts: {} }),
    );
  });
  await page.reload();
  await expect(page.getByTestId('start-simulado')).toHaveCount(0);
  await expect(page.getByTestId('continue-random')).toContainText(/Continuar simulado · nível 2 · 2:5\d:\d\d restantes/);
});

test('Começar simulado leva a #/aleatorio', async ({ page }) => {
  await page.getByTestId('start-simulado').click();
  await expect(page).toHaveURL(/#\/aleatorio$/);
});

test('preparação rola até o nível', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.getByTestId('prep-3').click();
  await expect(page.getByTestId('level-3')).toBeInViewport();
});

test('preparação reflete o progresso', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('examshell:v1:progress', JSON.stringify({ first_word: 'passed', inter: 'tried' })),
  );
  await page.reload();
  await expect(page.getByTestId('prep-1')).toContainText('1/');
  await expect(page.getByTestId('prep-1')).toContainText('começando');
  await expect(page.getByTestId('prep-2')).toContainText('ainda não começou');
  await expect(page.getByTestId('passed-count')).toHaveText(/1\/57 passaram/);
});

test('limpar progresso pede confirmação na página', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('examshell:v1:progress', JSON.stringify({ first_word: 'passed', inter: 'tried' })),
  );
  await page.reload();
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'passed');
  let dialogs = 0;
  page.on('dialog', (d) => {
    dialogs++;
    void d.dismiss();
  });
  await page.getByTestId('clear-progress').click();
  await expect(page.getByTestId('clear-confirm')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Apagar todo o progresso, rascunhos e configurações?');
  await page.getByRole('button', { name: 'cancelar' }).click();
  await expect(page.getByTestId('clear-confirm')).toHaveCount(0);
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'passed');
  await page.getByTestId('clear-progress').click();
  await page.getByTestId('clear-confirm').click();
  await expect(page.getByTestId('clear-confirm')).toHaveCount(0);
  await expect(page.getByTestId('ex-first_word')).toHaveAttribute('data-status', 'untried');
  await expect(page.getByTestId('passed-count')).toHaveText(/0\/57 passaram/);
  expect(dialogs).toBe(0);
});

test('tema: o botão troca e a escolha fica depois do reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('375px: sem rolagem horizontal e com a navegação embaixo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const sw = () => page.evaluate(() => document.scrollingElement!.scrollWidth);
  expect(await sw()).toBeLessThanOrEqual(375);
  await expect(page.locator('nav.bottom-nav')).toBeVisible();
  await page.locator('nav.bottom-nav').getByRole('link', { name: 'exercícios' }).click();
  await expect(page.getByTestId('ex-first_word')).toBeVisible();
  expect(await sw()).toBeLessThanOrEqual(375);
});

test('1280px: navegação no topo, sem a de baixo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('nav.bottom-nav')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Seções' })).toBeVisible();
});

import { expect, test } from '@playwright/test';

const LOAD = 110000; // 1ª carga do compilador num contexto novo

test('modo aleatório: troca, pulo, retomada e resumo', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('./#/aleatorio?seed=7');

  // 1. nível 1, first_word ou ft_strlen, sem troca ainda
  await expect(page.locator('.topbar')).toContainText('nível 1/4');
  await expect(page.locator('.topbar')).toContainText(/first_word|ft_strlen/);
  await expect(page.getByTestId('swap')).toBeHidden();
  const first = (await page.locator('.topbar-right').innerText()).includes('first_word') ? 'first_word' : 'ft_strlen';
  const other = first === 'first_word' ? 'ft_strlen' : 'first_word';

  // 2. grademe com o código inicial falha e libera a troca
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('grade-result')).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(page.getByTestId('swap')).toBeVisible();
  await expect(page.getByTestId('swap')).toHaveText(/sortear outro deste nível/);
  await page.getByTestId('swap').click();
  await expect(page.locator('.topbar')).toContainText(other);
  await expect(page.getByTestId('swap')).toBeHidden();

  // 3. pular para o nível 2
  await page.getByTestId('skip').click();
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
  await expect(page.locator('.topbar')).toContainText('inter');

  // 4. recarregar continua; a home oferece continuar
  await page.reload();
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
  await expect(page.locator('.topbar')).toContainText('inter');
  await page.goto('./#/');
  await expect(page.getByTestId('continue-random')).toBeVisible();
  await page.getByTestId('continue-random').click();
  await expect(page.locator('.topbar')).toContainText('nível 2/4');

  // 5. encerrar com confirmação
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('finish').click();
  await expect(page).toHaveURL(/#\/aleatorio\/resumo/);
  const summary = page.getByTestId('summary');
  await expect(summary).toContainText('nível 1');
  await expect(summary).toContainText('pulado');
  await expect(summary).toContainText('1 troca');
  await expect(summary).not.toContainText('1 trocas');
  await expect(summary).toContainText('parou aqui');
  await expect(summary.getByText('não chegou')).toHaveCount(2);

  // 6. voltar ao início limpa a sessão
  await page.getByRole('button', { name: 'voltar ao início' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByTestId('continue-random')).toHaveCount(0);
});

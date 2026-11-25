import { expect, test, type Page } from '@playwright/test';

import { RANK02_CATALOG } from '../../src/content/rank02Catalog';
import { startSession } from '../../src/state/randomSession';

const LOAD = 110000; // 1ª carga do compilador num contexto novo

const idsOfLevel = (level: number) => RANK02_CATALOG.filter((e) => e.level === level).map((e) => e.id);

// Lê o id do exercício atual na barra superior ("nível 1/4 · <id>").
async function currentId(page: Page): Promise<string> {
  const text = await page.locator('.topbar-right').innerText();
  const m = text.match(/nível \d\/4\s*·\s*(\S+)/);
  return m ? m[1] : '';
}

async function setCode(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(text);
}

/** Soluções de alguns exercícios do nível 1 (ficam só nos testes, nunca vão para o site). */
const LEVEL1_SOLUTIONS: Record<string, string> = {
  ft_strlen: String.raw`int	ft_strlen(char *str)
{
    int i = 0;

    while (str[i])
        i++;
    return (i);
}
`,
  ft_putstr: String.raw`#include <unistd.h>

void	ft_putstr(char *str)
{
    while (*str)
        write(1, str++, 1);
}
`,
};

/** A menor semente cujo 1º sorteio cai num exercício que tem solução aqui. */
function seedDrawingSolvable(): number {
  const pool = { 1: idsOfLevel(1), 2: idsOfLevel(2), 3: idsOfLevel(3), 4: idsOfLevel(4) };
  for (let seed = 1; seed < 10000; seed++) {
    const id = startSession(pool, seed, 0).levels[0].exerciseId;
    if (id !== null && id in LEVEL1_SOLUTIONS) return seed;
  }
  throw new Error('nenhuma semente sorteia um exercício com solução no teste');
}

test('modo aleatório: passar um nível avisa e sobe para o próximo', async ({ page }) => {
  await page.goto(`./#/aleatorio?seed=${seedDrawingSolvable()}`);
  await expect(page.locator('.topbar')).toContainText('nível 1/4');
  const id = await currentId(page);
  expect(Object.keys(LEVEL1_SOLUTIONS), `sorteou ${id}, sem solução no teste`).toContain(id);
  await expect(page.getByTestId('level-passed')).toHaveCount(0);

  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await setCode(page, LEVEL1_SOLUTIONS[id]);
  await page.getByTestId('grademe').click();

  const banner = page.getByTestId('level-passed');
  await expect(banner).toContainText(`✓ ${id} passou`, { timeout: 60000 });
  await expect(banner).toContainText('agora o nível 2');
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
  expect(idsOfLevel(2)).toContain(await currentId(page));

  await page.getByRole('button', { name: 'fechar aviso' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
});

test('modo aleatório: troca, pulo, retomada e resumo', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('./#/aleatorio?seed=7');

  // 1. nível 1, um exercício do nível 1, sem troca ainda
  await expect(page.locator('.topbar')).toContainText('nível 1/4');
  await expect(page.getByTestId('swap')).toBeHidden();
  const first = await currentId(page);
  expect(idsOfLevel(1)).toContain(first);

  // 2. grademe com o código inicial falha e libera a troca
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('grade-result')).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(page.getByTestId('swap')).toBeVisible();
  await expect(page.getByTestId('swap')).toHaveText(/sortear outro deste nível/);
  await page.getByTestId('swap').click();
  await expect.poll(() => currentId(page)).not.toBe(first);
  expect(idsOfLevel(1)).toContain(await currentId(page));
  await expect(page.locator('.topbar')).toContainText('nível 1/4');
  await expect(page.getByTestId('swap')).toBeHidden();

  // 3. pular para o nível 2
  await page.getByTestId('skip').click();
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
  const second = await currentId(page);
  expect(idsOfLevel(2)).toContain(second);

  // 4. recarregar continua; a home oferece continuar
  await page.reload();
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
  expect(await currentId(page)).toBe(second);
  await page.goto('./#/');
  await expect(page.getByTestId('continue-random')).toBeVisible();
  await page.getByTestId('continue-random').click();
  await expect(page.locator('.topbar')).toContainText('nível 2/4');
  expect(await currentId(page)).toBe(second);

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

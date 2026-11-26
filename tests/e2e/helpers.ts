import { expect, type Page } from '@playwright/test';

export const LOAD = 110000; // 1ª carga do compilador num contexto novo (sem Cache API)

/** Esquece de pular os espaços do início: passa em t01 e t02, falha em t03. */
export const FIRST_WORD_BUG = String.raw`#include <unistd.h>

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

export async function setCode(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  // o Firefox lança NS_ERROR_FAILURE em insertText('')
  if (text === '') await page.keyboard.press('Backspace');
  else await page.keyboard.insertText(text);
}

/** Abre o exercício no treino e espera o compilador ficar pronto. */
export async function open(page: Page, id: string) {
  await page.goto(`./#/treino/${id}`);
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
}

/** Clica em grademe e devolve o bloco do resultado, já terminado. */
export async function grademe(page: Page) {
  // os grademes antigos ficam recolhidos: contam-se as entradas do log, não os cartões abertos
  const entries = page.locator('.entry').filter({ hasText: 'examshell> grademe' });
  const before = await entries.count();
  await page.getByTestId('grademe').click();
  await expect(entries).toHaveCount(before + 1);
  const last = page.getByTestId('grade-result').last();
  await expect(last).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  return last;
}

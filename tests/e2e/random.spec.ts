import { expect, test, type Page } from '@playwright/test';

import { RANK02_CATALOG } from '../../src/content/rank02Catalog';
import { startSession, type RandomSession } from '../../src/state/randomSession';

const LOAD = 110000; // 1ª carga do compilador num contexto novo

const idsOfLevel = (level: number) => RANK02_CATALOG.filter((e) => e.level === level).map((e) => e.id);

// O id do exercício atual, no topo da tela.
async function currentId(page: Page): Promise<string> {
  return (await page.getByTestId('exercise-name').innerText()).trim();
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


const POOL = { 1: idsOfLevel(1), 2: idsOfLevel(2), 3: idsOfLevel(3), 4: idsOfLevel(4) };

test('sem sessão: tela de início; Começar abre o nível 1 com o relógio', async ({ page }) => {
  await page.goto('./#/aleatorio?seed=7');
  await expect(page.getByRole('heading', { name: 'Simular a prova' })).toBeVisible();
  await expect(page.getByText('Cai um exercício sorteado de cada um dos 4 níveis, como na prova.')).toBeVisible();
  await expect(page.getByText('O relógio de 3h só informa: dá para trocar de exercício, pular nível e pedir dicas.')).toBeVisible();
  await expect(page.getByTestId('start-random')).toHaveText('Começar simulado (o relógio começa agora)');
  await expect(page.getByTestId('session-bar')).toHaveCount(0);
  await expect(page.getByTestId('last-summary')).toHaveCount(0); // nenhum simulado terminado salvo
  await page.getByTestId('start-random').click();
  await expect(page.getByTestId('level-step-1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('level-step-2')).toHaveAttribute('data-state', 'future');
  await expect(page.getByTestId('timer')).toContainText('2:59');
  // a semente da rota vale: mesma semente, mesmo exercício
  expect(await currentId(page)).toBe(startSession(POOL, 7, 0).levels[0].exerciseId);
});

test('sessão salva antes do redesenho retoma direto no exercício', async ({ page }) => {
  const saved: RandomSession = startSession(POOL, 3, Date.now() - 60000); // o formato atual, sem campos novos
  await page.goto('./#/');
  await page.evaluate((s) => localStorage.setItem('examshell:v1:session', JSON.stringify(s)), saved);
  await page.goto('./#/aleatorio');
  await page.reload();
  await expect(page.getByTestId('start-random')).toHaveCount(0);
  await expect(page.getByTestId('session-bar')).toBeVisible();
  expect(await currentId(page)).toBe(saved.levels[0].exerciseId);
  await expect(page.getByTestId('timer')).toContainText('2:58');
});

test('passar segura o cartão; "Ir para o nível 2" avança e o treino fica marcado', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto(`./#/aleatorio?seed=${seedDrawingSolvable()}`);
  await page.getByTestId('start-random').click();
  const id = await currentId(page);
  expect(Object.keys(LEVEL1_SOLUTIONS), `sorteou ${id}, sem solução no teste`).toContain(id);
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await setCode(page, LEVEL1_SOLUTIONS[id]);
  await page.getByTestId('grademe').click();

  const next = page.getByTestId('pass-next-level');
  await expect(next).toHaveText('Ir para o nível 2', { timeout: 60000 });
  await expect(page.getByTestId('pass-summary')).toHaveCount(0);
  // segura: mesmo exercício, log, passos já avançados
  expect(await currentId(page)).toBe(id);
  await expect(page.getByTestId('log')).toBeVisible();
  await expect(page.getByTestId('level-step-1')).toHaveAttribute('data-state', 'passed');
  await expect(page.getByTestId('level-step-2')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('skip')).toHaveCount(0);
  await expect(page.locator('.crumb .lv')).toContainText('nível 1 de 4');

  await next.click();
  await expect(page.getByTestId('pass-next-level')).toHaveCount(0);
  await expect(page.locator('.crumb .lv')).toContainText('nível 2 de 4');
  expect(idsOfLevel(2)).toContain(await currentId(page));

  // passar no simulado marca o treino
  await page.goto('./#/treino');
  await expect(page.getByTestId(`ex-${id}`)).toHaveAttribute('data-status', 'passed');
});

test('passou e depois falhou na nova correção: a barra ainda leva ao nível 2', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto(`./#/aleatorio?seed=${seedDrawingSolvable()}`);
  await page.getByTestId('start-random').click();
  const id = await currentId(page);
  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await setCode(page, LEVEL1_SOLUTIONS[id]);
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('pass-next-level')).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('bar-next-level')).toHaveText('Ir para o nível 2');

  // edita e corrige de novo, agora sem a função: o cartão de "passou" recolhe
  await setCode(page, '/* rascunho */');
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('grade-result').last()).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(page.getByTestId('pass-next-level')).toHaveCount(0);
  await expect(page.getByTestId('skip')).toHaveCount(0);
  expect(await currentId(page)).toBe(id);

  await page.getByTestId('bar-next-level').click();
  await expect(page.locator('.crumb .lv')).toContainText('nível 2 de 4');
  expect(idsOfLevel(2)).toContain(await currentId(page));
  await expect(page.getByTestId('bar-next-level')).toHaveCount(0);
  await expect(page.getByTestId('skip')).toBeVisible();
});

test('simulado terminado: a tela de início leva ao resumo do último', async ({ page }) => {
  let saved: RandomSession = startSession(POOL, 3, Date.now() - 600000);
  saved = { ...saved, finishedAt: Date.now() - 1000 };
  await page.goto('./#/');
  await page.evaluate((s) => localStorage.setItem('examshell:v1:session', JSON.stringify(s)), saved);
  await page.goto('./#/aleatorio');
  await page.reload();
  await expect(page.getByTestId('start-random')).toBeVisible();
  await expect(page.getByTestId('last-summary')).toHaveText('Ver resumo do último simulado');
  await page.getByTestId('last-summary').click();
  await expect(page).toHaveURL(/#\/aleatorio\/resumo$/);
  await expect(page.getByTestId('summary')).toBeVisible();
});

test('troca só depois de falhar; pular; encerrar com confirmação na página; resumo com nomes', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('./#/aleatorio?seed=7');
  await page.getByTestId('start-random').click();
  const first = await currentId(page);
  await expect(page.getByTestId('swap')).toBeHidden();

  await expect(page.getByTestId('grademe')).toBeEnabled({ timeout: LOAD });
  await page.getByTestId('grademe').click();
  await expect(page.getByTestId('grade-result')).toHaveAttribute('data-state', 'done', { timeout: 60000 });
  await expect(page.getByTestId('swap')).toHaveText('Sortear outro');
  await page.getByTestId('swap').click();
  await expect.poll(() => currentId(page)).not.toBe(first);
  const second = await currentId(page);
  expect(idsOfLevel(1)).toContain(second);
  await expect(page.getByTestId('swap')).toBeHidden();

  await page.getByTestId('skip').click();
  await expect(page.getByTestId('level-step-1')).toHaveAttribute('data-state', 'skipped');
  await expect(page.getByTestId('level-step-2')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('.crumb .lv')).toContainText('nível 2 de 4');
  const stopped = await currentId(page);

  // encerrar: confirmação na própria barra, sem diálogo do navegador
  page.on('dialog', () => {
    throw new Error('não deveria abrir um diálogo do navegador');
  });
  await page.getByTestId('finish').click();
  await expect(page.getByTestId('finish-confirm')).toHaveText('Encerrar e ver o resumo');
  await page.getByRole('button', { name: 'cancelar' }).click();
  await expect(page.getByTestId('finish-confirm')).toHaveCount(0);
  await page.getByTestId('finish').click();
  await page.getByTestId('finish-confirm').click();

  await expect(page).toHaveURL(/#\/aleatorio\/resumo/);
  const summary = page.getByTestId('summary');
  await expect(summary).toContainText(`trocou: ${first}`);
  await expect(summary).toContainText('pulado');
  await expect(summary).toContainText('parou aqui');
  await expect(summary).toContainText('passou em 0 de 4 níveis');
  await expect(summary.getByText('não chegou')).toHaveCount(2);
  await expect(page.getByTestId('summary-time')).toHaveText(/^0:0\d:\d\d$/);
  await expect(page.getByTestId(`train-${first}`)).toHaveText(`Treinar ${first}`);
  await expect(page.getByTestId(`train-${second}`)).toHaveText(`Treinar ${second}`);
  await expect(page.getByTestId(`train-${stopped}`)).toBeVisible();

  await page.getByTestId(`train-${first}`).click();
  await expect(page).toHaveURL(new RegExp(`#/treino/${first}$`));

  // Novo simulado limpa a sessão e volta para a tela de início
  await page.goto('./#/aleatorio/resumo');
  await page.getByTestId('new-simulado').click();
  await expect(page.getByTestId('start-random')).toBeVisible();
  await page.goto('./#/');
  await expect(page.getByTestId('continue-random')).toHaveCount(0);
});

test('Sair (a sessão continua) volta ao início com Continuar simulado', async ({ page }) => {
  await page.goto('./#/aleatorio?seed=7');
  await page.getByTestId('start-random').click();
  const id = await currentId(page);
  await page.getByTestId('exit-session').click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByTestId('continue-random')).toBeVisible();
  await page.getByTestId('continue-random').click();
  await expect(page.getByTestId('start-random')).toHaveCount(0);
  expect(await currentId(page)).toBe(id);
});

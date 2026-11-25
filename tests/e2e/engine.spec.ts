import { expect, test, type Page } from '@playwright/test';

/** Abre o engine-check com o cenário e devolve o JSON de `#result`. */
async function scenario(page: Page, name: string) {
  await page.goto(`engine-check.html?scenario=${name}`);
  const result = page.locator('#result');
  await expect(result).not.toBeEmpty({ timeout: 110000 });
  return JSON.parse((await result.textContent()) ?? '');
}

test('first_word-ok', async ({ page }) => {
  const r = await scenario(page, 'first_word-ok');
  expect(r.stdout).toBe('lorem,ipsum\n');
});

test('first_word-bug', async ({ page }) => {
  const r = await scenario(page, 'first_word-bug');
  expect(r.stdout).toBe('\n');
});

test('werror', async ({ page }) => {
  const r = await scenario(page, 'werror');
  expect(r.ok).toBe(false);
  expect(r.stderr).toContain('unused variable');
});

test('null-write', async ({ page }) => {
  const r = await scenario(page, 'null-write');
  expect(r.outcome).toBe('crash');
});

test('long-size', async ({ page }) => {
  const r = await scenario(page, 'long-size');
  expect(r.stdout).toBe('8');
});

test('infinite-then-ok', async ({ page }) => {
  const r = await scenario(page, 'infinite-then-ok');
  expect(r.first.outcome).toBe('timeout');
  expect(r.second.stdout).toBe('lorem,ipsum\n');
});

test('carga a 10 Mbps', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'throttle via CDP só existe no Chromium');
  // cada teste ganha um contexto novo: Cache API vazia, então a 1ª carga baixa tudo
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 20,
    downloadThroughput: 1310720,
    uploadThroughput: 1310720,
  });
  await page.goto('engine-check.html');
  await expect(page.locator('#status')).toHaveText('ready', { timeout: 60000 });
  const firstLoad = Number(await page.locator('#timing').textContent());
  // ~27 MB a 1,25 MB/s levam ~21 s: abaixo de 15 s o throttle não pegou nos workers
  expect(firstLoad).toBeGreaterThan(15000);
  expect(firstLoad).toBeLessThan(60000);

  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page.reload();
  await expect(page.locator('#status')).toHaveText('ready', { timeout: 60000 });
  // sem throttle a rede local também seria rápida: confere que veio mesmo da Cache API
  await expect(page.locator('#progress')).toContainText('(cache)');
  const cachedLoad = Number(await page.locator('#timing').textContent());
  expect(cachedLoad).toBeLessThan(5000);
  console.log(`[carga] 1ª visita a 10 Mbps: ${firstLoad} ms; recarga com cache: ${cachedLoad} ms`);
});

test('download falha e tentar de novo funciona', async ({ page }) => {
  await page.route('**/llvm.core.wasm.gz', (r) => r.abort());
  await page.goto('engine-check.html');
  await expect(page.locator('#error')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#status')).toHaveText('error');
  await expect(page.locator('#error-message')).toContainText('llvm.core.wasm.gz');

  await page.unroute('**/llvm.core.wasm.gz');
  await page.locator('#retry').click();
  await expect(page.locator('#status')).toHaveText('ready', { timeout: 110000 });
  await expect(page.locator('#error')).toBeHidden();
});

import { expect, test, type Page } from '@playwright/test';

/** Abre o engine-check com o cenário e devolve o JSON de `#result`. */
async function scenario(page: Page, name: string) {
  await page.goto(`engine-check.html?scenario=${name}`);
  const result = page.locator('#result');
  await expect(result).not.toBeEmpty({ timeout: 110000 });
  return JSON.parse((await result.textContent()) ?? '');
}

test('echo-ok: compila e roda', async ({ page }) => {
  const r = await scenario(page, 'echo-ok');
  expect(r).toMatchObject({ outcome: 'exit', exitCode: 0, stdout: '  lorem,ipsum  \n' });
});

test('echo-bug: saída errada', async ({ page }) => {
  const r = await scenario(page, 'echo-bug');
  expect(r.stdout).toBe('  lorem,ipsum  ');
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
  expect(r.second.stdout).toBe('  lorem,ipsum  \n');
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

test('.gz como arquivo comum, sem Content-Encoding (como o GitHub Pages)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'o caminho do shim é o mesmo nos dois navegadores');
  // o vite preview manda o .gz com Content-Encoding: gzip (o navegador já descomprime);
  // aqui os dois .gz chegam crus, e o shim tem de descomprimir com DecompressionStream
  const served: string[] = [];
  for (const name of ['llvm.core.wasm.gz', 'llvm-resources.tar.gz']) {
    await page.route(`**/clang/${name}`, (r) => {
      served.push(name);
      return r.fulfill({ path: `dist/clang/${name}`, headers: { 'content-type': 'application/gzip' } });
    });
  }
  const r = await scenario(page, 'echo-ok');
  await expect(page.locator('#status')).toHaveText('ready');
  expect(r.stdout).toBe('  lorem,ipsum  \n');
  expect(served.sort()).toEqual(['llvm-resources.tar.gz', 'llvm.core.wasm.gz']);
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

test('cache estragado: a falha apaga o cache, e tentar de novo baixa tudo de novo', async ({ page }) => {
  await page.goto('engine-check.html');
  await expect(page.locator('#status')).toHaveText('ready', { timeout: 110000 });
  // troca o llvm.core.wasm.gz guardado por um gzip válido de algo que não é wasm
  await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.startsWith('examshell-clang-'));
    if (!name) throw new Error('o compilador não ficou no cache');
    const junk = await new Response(new Blob(['não sou wasm']).stream().pipeThrough(new CompressionStream('gzip'))).blob();
    await (await caches.open(name)).put(new URL('clang/llvm.core.wasm.gz', location.href).href, new Response(junk));
  });

  await page.reload();
  await expect(page.locator('#status')).toHaveText('error', { timeout: 60000 });
  await page.locator('#retry').click();
  await expect(page.locator('#status')).toHaveText('ready', { timeout: 110000 });
  await expect(page.locator('#progress')).not.toContainText('(cache)');
});

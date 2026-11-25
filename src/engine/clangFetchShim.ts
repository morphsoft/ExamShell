export interface LoadProgress {
  loadedBytes: number;
  totalBytes: number;
  fromCache: boolean;
}

/** `public/clang/manifest.json`, gerado por `scripts/prepare-clang.mjs`. */
export interface ClangManifest {
  version: string;
  gz: Record<string, number>; // nome sem .gz → bytes do .gz
}

export const CLANG_CACHE_PREFIX = 'examshell-clang-';

/** Arquivos publicados só em .gz, e o content-type que o @yowasp espera de cada um. */
const GZIPPED: Record<string, string> = {
  'llvm.core.wasm': 'application/wasm', // compileStreaming exige application/wasm
  'llvm-resources.tar': 'application/x-tar',
};

/** Abre o cache desta versão e apaga os de versões antigas; `null` se não houver Cache API. */
async function openCache(cacheName: string): Promise<Cache | null> {
  try {
    const old = (await caches.keys()).filter((k) => k.startsWith(CLANG_CACHE_PREFIX) && k !== cacheName);
    await Promise.all(old.map((k) => caches.delete(k)));
    return await caches.open(cacheName);
  } catch {
    return null; // ex.: navegação privada sem Cache API — baixa sempre
  }
}

/** O corpo começa com a assinatura do gzip? (1f 8b) */
async function isGzip(data: Blob): Promise<boolean> {
  const head = new Uint8Array(await data.slice(0, 2).arrayBuffer());
  return head[0] === 0x1f && head[1] === 0x8b;
}

/**
 * Troca `globalThis.fetch`: `llvm.core.wasm` e `llvm-resources.tar` vêm do `.gz` (Cache API ou rede).
 * O resto passa direto. Tem de ser instalado antes de importar o bundle do @yowasp, que guarda
 * `globalThis.fetch` ao ser avaliado.
 *
 * Funciona com qualquer servidor: o GitHub Pages manda o `.gz` como arquivo comum (o shim descomprime
 * com DecompressionStream); outros (ex.: o sirv do Vite) mandam `Content-Encoding: gzip`, e o navegador
 * já entrega descomprimido. Por isso o shim olha a assinatura do gzip em vez de confiar no nome.
 */
export function installClangFetchShim(opts: {
  cacheName: string;
  manifest: { gz: Record<string, number> };
  onProgress(p: LoadProgress): void;
}): void {
  const realFetch = globalThis.fetch.bind(globalThis);
  const cachePromise = openCache(opts.cacheName);
  const totalBytes = Object.values(opts.manifest.gz).reduce((a, b) => a + b, 0);
  const loaded: Record<string, number> = {};
  let fromCache = true;

  function report(name: string, bytes: number) {
    // limitado ao tamanho do .gz: com Content-Encoding o navegador conta bytes já descomprimidos
    loaded[name] = Math.min(bytes, opts.manifest.gz[name] ?? 0);
    const loadedBytes = Object.values(loaded).reduce((a, b) => a + b, 0);
    opts.onProgress({ loadedBytes, totalBytes, fromCache });
  }

  async function download(url: string, name: string): Promise<Blob> {
    try {
      const res = await realFetch(url);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      report(name, 0);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        bytes += value.byteLength;
        report(name, bytes);
      }
      return new Blob(chunks as BlobPart[]);
    } catch (e) {
      throw new Error(`falha ao baixar ${name}.gz: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input), globalThis.location?.href);
    const name = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
    const contentType = GZIPPED[name];
    if (!contentType) return realFetch(input, init);

    const gzUrl = url.href + '.gz';
    const cache = await cachePromise;
    const hit = await cache?.match(gzUrl).catch(() => undefined);
    let data: Blob; // como chegou: gzip, ou já descomprimido pelo navegador
    if (hit) {
      data = await hit.blob();
      report(name, data.size);
    } else {
      fromCache = false;
      data = await download(gzUrl, name);
    }
    let body = (await isGzip(data)) ? data.stream().pipeThrough(new DecompressionStream('gzip')) : data.stream();
    if (!hit && cache) {
      // grava só depois do download inteiro E de o corpo ser lido até o fim (no gzip, com CRC ok):
      // nada truncado ou corrompido fica no cache
      body = body.pipeThrough(
        new TransformStream({
          async flush() {
            await cache.put(gzUrl, new Response(data)).catch(() => {}); // cota cheia: segue sem cache
          },
        }),
      );
    }
    return new Response(body, { headers: { 'content-type': contentType } });
  };
}

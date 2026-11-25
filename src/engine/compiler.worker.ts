import { CLANG_CACHE_PREFIX, installClangFetchShim, type ClangManifest, type LoadProgress } from './clangFetchShim';
import { createCompiler, type ClangModule } from './compiler';

type Compiler = ReturnType<typeof createCompiler>;
export type CompilerOp = keyof Compiler;

export type CompilerRequest =
  | { type: 'init'; clangBaseUrl: string }
  | { id: number; op: CompilerOp; args: unknown[] };

export type CompilerResponse =
  | { type: 'progress'; progress: LoadProgress }
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'reply'; id: number; ok: true; value: unknown }
  | { type: 'reply'; id: number; ok: false; message: string };

const post = (msg: CompilerResponse) => self.postMessage(msg);
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

let compiler: Compiler | null = null;

async function init(clangBaseUrl: string): Promise<Compiler> {
  const res = await fetch(clangBaseUrl + 'manifest.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`falha ao baixar manifest.json do compilador: HTTP ${res.status}`);
  const manifest = (await res.json()) as ClangManifest;
  installClangFetchShim({
    cacheName: CLANG_CACHE_PREFIX + manifest.version,
    manifest,
    onProgress: (progress) => post({ type: 'progress', progress }),
  });
  // só depois do shim: o bundle guarda globalThis.fetch quando é avaliado
  const clang = (await import(/* @vite-ignore */ clangBaseUrl + 'bundle.js')) as ClangModule;
  // baixa os recursos já aqui, com progresso mudo (o padrão do @yowasp loga cada pedaço no console)
  await clang.runLLVM(undefined, {}, { fetchProgress: () => {} });
  const c = createCompiler(clang);
  const warm = await c.compileObjects({ 'main.c': 'int main(void){return 0;}' }, {});
  if (!warm.ok) throw new Error('a compilação de aquecimento falhou:\n' + warm.stderr);
  return c;
}

self.onmessage = async (e: MessageEvent<CompilerRequest>) => {
  const msg = e.data;
  if ('type' in msg) {
    try {
      compiler = await init(msg.clangBaseUrl);
      post({ type: 'ready' });
    } catch (err) {
      post({ type: 'error', message: messageOf(err) });
    }
    return;
  }
  try {
    if (!compiler) throw new Error('o compilador ainda não carregou');
    const fn = compiler[msg.op] as (...args: unknown[]) => Promise<unknown>;
    post({ type: 'reply', id: msg.id, ok: true, value: await fn(...msg.args) });
  } catch (err) {
    post({ type: 'reply', id: msg.id, ok: false, message: messageOf(err) });
  }
};

import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * O sirv do `vite dev`/`vite preview` manda `x.gz` com `Content-Encoding: gzip`, e o navegador
 * descomprime sozinho. O GitHub Pages manda o `.gz` como arquivo comum, que é o que o
 * clangFetchShim espera (ele descomprime com DecompressionStream). Aqui o servidor local imita o Pages.
 */
function serveGzAsPlainFiles(): Plugin {
  // tipos mínimos: o projeto não usa @types/node
  type Res = {
    setHeader(name: string, value: string): void;
    removeHeader(name: string): void;
    writeHead(...args: unknown[]): unknown;
  };
  const middleware = (req: { url?: string }, res: Res, next: () => void) => {
    if (req.url?.split('?')[0].endsWith('.gz')) {
      const writeHead = res.writeHead;
      res.writeHead = function (this: Res, ...args: unknown[]) {
        for (const a of args) {
          if (a && typeof a === 'object') {
            delete (a as Record<string, unknown>)['Content-Encoding'];
            delete (a as Record<string, unknown>)['Content-Type'];
          }
        }
        this.removeHeader('Content-Encoding');
        this.setHeader('Content-Type', 'application/gzip');
        return writeHead.apply(this, args);
      };
    }
    next();
  };
  return {
    name: 'serve-gz-as-plain-files',
    configureServer: (server) => void server.middlewares.use(middleware as Connect.NextHandleFunction),
    configurePreviewServer: (server) => void server.middlewares.use(middleware as Connect.NextHandleFunction),
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serveGzAsPlainFiles()],
  worker: { format: 'es' },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', 'engine-check': 'engine-check.html' },
    },
  },
});

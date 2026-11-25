// Trava: falha se dist/ contiver soluções de referência ou arquivos grandes demais.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const DIST = 'dist';
const MAX_BYTES = 95 * 1024 * 1024;
const SENTINEL = 'EXAMSHELL-REFERENCE';
const BINARY_EXT = new Set(['.gz', '.wasm', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.zip']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

if (!existsSync(DIST)) {
  console.error('erro: dist/ não existe; rode npm run build antes.');
  process.exit(1);
}

const bad = [];
for (const file of walk(DIST)) {
  const rel = relative(DIST, file).split(String.fromCharCode(92)).join('/');
  const size = statSync(file).size;
  if (`/${rel}`.includes('/reference/')) bad.push(`${rel}: caminho contém /reference/`);
  if (size > MAX_BYTES) bad.push(`${rel}: ${(size / 1048576).toFixed(1)} MB (limite 95 MB)`);
  if (!BINARY_EXT.has(extname(file).toLowerCase()) && readFileSync(file).includes(SENTINEL)) {
    bad.push(`${rel}: contém ${SENTINEL}`);
  }
}

if (bad.length) {
  console.error('FALHA: problemas em dist/:');
  for (const b of bad) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('ok: nenhuma referência em dist/');

// Copia o @yowasp/clang para public/clang/, com os dois arquivos grandes em gzip.
// O navegador descomprime com DecompressionStream (src/engine/clangFetchShim.ts).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkgDir = join(root, 'node_modules', '@yowasp', 'clang');
const gen = join(pkgDir, 'gen');
const out = join(root, 'public', 'clang');
const manifestPath = join(out, 'manifest.json');

const AS_IS = ['bundle.js', 'llvm.core2.wasm', 'llvm.core3.wasm', 'llvm.core4.wasm'];
const GZIPPED = ['llvm.core.wasm', 'llvm-resources.tar'];

const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

if (existsSync(manifestPath) && JSON.parse(readFileSync(manifestPath, 'utf8')).version === version) {
  console.log(`prepare-clang: public/clang já está na versão ${version}`);
  process.exit(0);
}

mkdirSync(out, { recursive: true });
for (const name of AS_IS) copyFileSync(join(gen, name), join(out, name));
const gz = {};
for (const name of GZIPPED) {
  const data = gzipSync(readFileSync(join(gen, name)), { level: 9 });
  writeFileSync(join(out, name + '.gz'), data);
  gz[name] = data.length;
}
// o manifesto vai por último: se algo acima falhar, a próxima execução refaz tudo
writeFileSync(manifestPath, JSON.stringify({ version, gz }, null, 2) + '\n');
console.log(`prepare-clang: public/clang pronto (versão ${version})`, gz);

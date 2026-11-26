import type { Engine, SourceLine } from './types';

/**
 * Offset, no módulo, do frame do topo da pilha de um trap: `wasm-function[N]:0xHEX`,
 * formato do V8 e do SpiderMonkey. Sem esse formato, null.
 */
export function parseWasmTrapOffset(stack: string): number | null {
  const m = /wasm-function\[\d+\]:0x([0-9a-f]+)/i.exec(stack);
  return m ? parseInt(m[1], 16) : null;
}

/** Inteiro LEB128 sem sinal; null se os bytes acabarem no meio. */
function readU32(bytes: Uint8Array, pos: number): { value: number; next: number } | null {
  let value = 0;
  for (let shift = 0; shift < 35; shift += 7) {
    if (pos >= bytes.length) return null;
    const b = bytes[pos++];
    value += (b & 0x7f) * 2 ** shift;
    if ((b & 0x80) === 0) return { value, next: pos };
  }
  return null;
}

const WASM_HEADER = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
const CODE_SECTION = 10;

/** Onde começa o conteúdo da seção Code: o DWARF do wasm conta os endereços a partir daí. */
export function codeSectionStart(wasm: Uint8Array): number | null {
  if (wasm.length < WASM_HEADER.length || WASM_HEADER.some((b, i) => wasm[i] !== b)) return null;
  let pos = WASM_HEADER.length;
  while (pos < wasm.length) {
    const id = wasm[pos];
    const size = readU32(wasm, pos + 1);
    if (!size || size.next + size.value > wasm.length) return null;
    if (id === CODE_SECTION) return size.next;
    pos = size.next + size.value;
  }
  return null;
}

/**
 * Saída de `llvm-addr2line -i` (um `arquivo:linha` por frame, do mais interno para fora).
 * O trap do sanitizer vem como um frame "inline" de linha 0; a linha do código é o primeiro frame com linha.
 * O clang roda em `/`, então os arquivos do cadete aparecem como `/nome.c`.
 */
export function parseAddr2line(output: string): SourceLine | null {
  for (const raw of output.split('\n')) {
    const m = /^(.+):(\d+)(?: \(discriminator \d+\))?$/.exec(raw.trim());
    if (!m || m[1] === '??' || m[2] === '0') continue;
    return { file: m[1].replace(/^\//, ''), line: Number(m[2]) };
  }
  return null;
}

/** Quanto esperar o addr2line; passado isso, a linha do travamento é só omitida. */
export const CRASH_LINE_TIMEOUT_MS = 2000;

/**
 * A linha onde o programa travou, se ela estiver num dos arquivos do cadete (nunca no harness nem na libc).
 * É um extra: qualquer problema vira null, e o resultado do teste segue igual.
 */
export async function locateCrash(
  engine: Pick<Engine, 'addr2line'>,
  wasm: Uint8Array,
  stack: string | undefined,
  files: string[],
): Promise<SourceLine | null> {
  if (!engine.addr2line || !stack) return null;
  const offset = parseWasmTrapOffset(stack);
  if (offset === null) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), CRASH_LINE_TIMEOUT_MS);
    });
    const found = await Promise.race([engine.addr2line(wasm, offset), timeout]);
    return found && files.includes(found.file) ? found : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

import { describe, expect, it, vi } from 'vitest';
import { codeSectionStart, CRASH_LINE_TIMEOUT_MS, locateCrash, parseAddr2line, parseWasmTrapOffset } from '../../src/engine/crashLine';
import type { Engine } from '../../src/engine/types';

describe('parseWasmTrapOffset', () => {
  it('V8: frame do topo', () => {
    expect(parseWasmTrapOffset('    at main (wasm://wasm/abc:wasm-function[5]:0x1a3)')).toBe(0x1a3);
  });

  // pilhas reais do runner.worker (engine-check.html?scenario=null-write)
  it('Chrome: pilha inteira, com a mensagem antes, usa o primeiro frame', () => {
    const stack = [
      'RuntimeError: unreachable',
      '    at a.out.__original_main (wasm://wasm/a.out-43f1f1fa:wasm-function[3]:0x107)',
      '    at a.out._start (wasm://wasm/a.out-43f1f1fa:wasm-function[2]:0xb7)',
      '    at u.start (http://localhost:4173/assets/runner.worker-C-31jFiu.js:1:1973)',
      '    at _ (http://localhost:4173/assets/runner.worker-C-31jFiu.js:2:620)',
      '    at async self.onmessage (http://localhost:4173/assets/runner.worker-C-31jFiu.js:2:883)',
    ].join('\n');
    expect(parseWasmTrapOffset(stack)).toBe(0x107);
  });

  it('Firefox: mesmo offset, outro formato', () => {
    const stack = [
      'a.out.__original_main@http://localhost:4173/assets/browserEngine-DbwGbjp-.js line 1 > WebAssembly.compile:wasm-function[3]:0x107',
      'a.out._start@http://localhost:4173/assets/browserEngine-DbwGbjp-.js line 1 > WebAssembly.compile:wasm-function[2]:0xb7',
      'start@http://localhost:4173/assets/runner.worker-C-31jFiu.js:1:1973',
      '_@http://localhost:4173/assets/runner.worker-C-31jFiu.js:2:620',
    ].join('\n');
    expect(parseWasmTrapOffset(stack)).toBe(0x107);
  });

  it('sem frame de wasm com offset (outro formato, erro do worker): null', () => {
    expect(parseWasmTrapOffset('main@[wasm code]\n_start@[wasm code]')).toBeNull();
    expect(parseWasmTrapOffset('')).toBeNull();
  });
});

/** Módulo mínimo válido: um tipo, uma função vazia; `extra` entra antes da seção Code. */
function module(extra: number[] = []): Uint8Array {
  return new Uint8Array([
    ...[0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00],
    ...[0x01, 0x04, 0x01, 0x60, 0x00, 0x00], // type
    ...[0x03, 0x02, 0x01, 0x00], // function
    ...extra,
    ...[0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b], // code
  ]);
}

describe('codeSectionStart', () => {
  it('devolve onde começa o conteúdo da seção Code', () => {
    const wasm = module();
    expect(() => new WebAssembly.Module(wasm as BufferSource)).not.toThrow();
    expect(codeSectionStart(wasm)).toBe(20);
  });

  it('tamanho de seção com mais de um byte em LEB128', () => {
    const custom = [0x00, 0xca, 0x01, 0x01, 0x78, ...new Array<number>(200).fill(0)]; // 202 bytes de conteúdo
    const wasm = module(custom);
    expect(() => new WebAssembly.Module(wasm as BufferSource)).not.toThrow();
    expect(codeSectionStart(wasm)).toBe(20 + custom.length);
  });

  it('sem seção Code, cortado ou que não é wasm: null', () => {
    expect(codeSectionStart(module().slice(0, 14))).toBeNull();
    expect(codeSectionStart(module().slice(0, 20))).toBeNull();
    expect(codeSectionStart(new TextEncoder().encode('int main(void) {}'))).toBeNull();
    expect(codeSectionStart(new Uint8Array())).toBeNull();
  });
});

describe('parseAddr2line', () => {
  it('pula os frames de linha 0 (o trap do sanitizer) e tira a / do começo', () => {
    expect(parseAddr2line('/first_word.c:0\n/first_word.c:7\n')).toEqual({ file: 'first_word.c', line: 7 });
  });

  it('um frame só', () => {
    expect(parseAddr2line('/ft_strlen.c:4\n')).toEqual({ file: 'ft_strlen.c', line: 4 });
  });

  it('com discriminator', () => {
    expect(parseAddr2line('/main.c:12 (discriminator 3)\n')).toEqual({ file: 'main.c', line: 12 });
  });

  it('endereço sem informação de linha: null', () => {
    expect(parseAddr2line('??:0\n')).toBeNull();
    expect(parseAddr2line('/main.c:0\n')).toBeNull();
    expect(parseAddr2line('')).toBeNull();
  });
});

describe('locateCrash', () => {
  const wasm = new Uint8Array([1, 2, 3]);
  const STACK = 'RuntimeError: unreachable\n    at a.out.main (wasm://wasm/x:wasm-function[6]:0x1b2)';
  const engineWith = (addr2line: Engine['addr2line']) => ({ addr2line }) as Pick<Engine, 'addr2line'>;

  it('arquivo do cadete: devolve a linha', async () => {
    const addr2line = vi.fn(async () => ({ file: 'first_word.c', line: 7 }));
    expect(await locateCrash(engineWith(addr2line), wasm, STACK, ['first_word.c'])).toEqual({
      file: 'first_word.c',
      line: 7,
    });
    expect(addr2line).toHaveBeenCalledWith(wasm, 0x1b2);
  });

  it('arquivo que não é do cadete (harness, libc): null', async () => {
    const harness = engineWith(async () => ({ file: '__harness.c', line: 5 }));
    expect(await locateCrash(harness, wasm, STACK, ['ft_strlen.c'])).toBeNull();
    const libc = engineWith(async () => ({ file: 'usr/include/string.h', line: 30 }));
    expect(await locateCrash(libc, wasm, STACK, ['string.h'])).toBeNull();
  });

  it('sem addr2line no motor, sem pilha ou sem offset: null, sem chamar nada', async () => {
    const addr2line = vi.fn(async () => ({ file: 'main.c', line: 1 }));
    expect(await locateCrash({}, wasm, STACK, ['main.c'])).toBeNull();
    expect(await locateCrash(engineWith(addr2line), wasm, undefined, ['main.c'])).toBeNull();
    expect(await locateCrash(engineWith(addr2line), wasm, 'main@[wasm code]', ['main.c'])).toBeNull();
    expect(addr2line).not.toHaveBeenCalled();
  });

  it('addr2line que falha ou não acha: null, sem lançar', async () => {
    expect(await locateCrash(engineWith(async () => null), wasm, STACK, ['main.c'])).toBeNull();
    const boom = engineWith(async () => {
      throw new Error('o compilador foi reiniciado');
    });
    expect(await locateCrash(boom, wasm, STACK, ['main.c'])).toBeNull();
  });
});

describe('locateCrash: limite de tempo', () => {
  it('addr2line que não responde: null depois de 2 s', async () => {
    vi.useFakeTimers();
    try {
      const wasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 10, 1, 0]);
      const p = locateCrash({ addr2line: () => new Promise(() => {}) }, wasm, 'at x (wasm://w:wasm-function[1]:0x20)', ['a.c']);
      await vi.advanceTimersByTimeAsync(CRASH_LINE_TIMEOUT_MS);
      await expect(p).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

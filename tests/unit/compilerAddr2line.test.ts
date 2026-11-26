import { describe, expect, it, vi } from 'vitest';
import { createCompiler, type ClangModule } from '../../src/engine/compiler';

describe('createCompiler.addr2line', () => {
  it('passa uma função stderr ao runLLVM, para a saída de erro ser descartada', async () => {
    const runLLVM = vi.fn(async (_args: string[], _tree: unknown, opts: { stdout?: (c: Uint8Array | null) => void; stderr?: unknown }) => {
      opts.stdout?.(new TextEncoder().encode('/a.c:3\n'));
      return undefined;
    });
    const compiler = createCompiler({ runClang: vi.fn(), runLLVM } as unknown as ClangModule);
    // módulo mínimo: cabeçalho + seção Code (id 10) vazia, começando no byte 10
    const wasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 10, 0]);
    const found = await compiler.addr2line(wasm, 12);
    expect(found).toEqual({ file: 'a.c', line: 3 });
    expect(typeof runLLVM.mock.calls[0][2].stderr).toBe('function');
  });
});

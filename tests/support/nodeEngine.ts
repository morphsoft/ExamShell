import { createCompiler, type ClangModule } from '../../src/engine/compiler';
import { runWasm } from '../../src/engine/runner';
import type { Engine } from '../../src/engine/types';

/** Engine para testes em Node: Clang real, execução inline (sem timeout). */
export async function createNodeEngine(): Promise<Engine> {
  const compiler = createCompiler((await import('@yowasp/clang')) as unknown as ClangModule);
  return {
    ...compiler,
    openRunSession(wasm, programName) {
      const module = new WebAssembly.Module(wasm as BufferSource);
      return {
        run: (test) => runWasm(module, test, programName),
        dispose() {},
      };
    },
  };
}

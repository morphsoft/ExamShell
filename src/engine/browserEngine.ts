import type { LoadProgress } from './clangFetchShim';
import type { CompilerOp, CompilerRequest, CompilerResponse } from './compiler.worker';
import type { RunRequest } from './runner.worker';
import type { Engine, RunResult, RunSession, TestCase } from './types';

export type { LoadProgress };
export type EngineStatus = 'loading' | 'ready' | 'error';
export type BrowserEngine = Engine & { ready(): Promise<void>; status(): EngineStatus; retry(): void };

function quiet(p: Promise<unknown>) {
  p.catch(() => {}); // a rejeição é entregue a quem chamar ready(); aqui só evita "unhandled rejection"
}

function openRunSession(wasm: Uint8Array, programName: string): RunSession {
  const module = WebAssembly.compile(wasm as BufferSource);
  quiet(module);
  let worker: Worker | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  async function runOne(test: Pick<TestCase, 'args' | 'stdin'>, timeoutMs: number): Promise<RunResult> {
    const msg: RunRequest = { module: await module, test, programName };
    const w = (worker ??= new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' }));
    return new Promise<RunResult>((resolve) => {
      const discard = (result: RunResult) => {
        clearTimeout(timer);
        w.terminate();
        if (worker === w) worker = null; // recriado na próxima chamada
        resolve(result);
      };
      const timer = setTimeout(() => discard({ stdout: '', outcome: 'timeout' }), timeoutMs);
      w.onmessage = (e: MessageEvent<RunResult>) => {
        clearTimeout(timer);
        resolve(e.data);
      };
      w.onerror = (e) => {
        e.preventDefault();
        discard({ stdout: '', outcome: 'crash', trapMessage: e.message || 'o worker de execução falhou' });
      };
      w.postMessage(msg);
    });
  }

  return {
    run(test, timeoutMs) {
      const result = queue.then(() => runOne(test, timeoutMs)); // uma execução por vez
      queue = result.catch(() => {});
      return result;
    },
    dispose() {
      worker?.terminate();
      worker = null;
    },
  };
}

export function createBrowserEngine(opts: {
  clangBaseUrl: string;
  onProgress?(p: LoadProgress): void;
  onStatus?(s: EngineStatus): void;
}): BrowserEngine {
  let current: EngineStatus = 'loading';
  let worker: Worker;
  let readyPromise: Promise<void>;
  let stop: (err: Error) => void = () => {};
  let nextId = 1;
  const pending = new Map<number, { resolve(v: unknown): void; reject(e: Error): void }>();

  function setStatus(s: EngineStatus) {
    current = s;
    opts.onStatus?.(s);
  }

  function start() {
    const w = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' });
    worker = w;
    let settle!: { resolve(): void; reject(e: Error): void };
    readyPromise = new Promise<void>((resolve, reject) => (settle = { resolve, reject }));
    quiet(readyPromise);
    stop = (err) => {
      w.terminate();
      for (const p of pending.values()) p.reject(err);
      pending.clear();
      settle.reject(err);
    };
    const fail = (message: string) => {
      if (w !== worker) return;
      const err = new Error(message);
      stop(err);
      readyPromise = Promise.reject(err); // vale também se o worker morrer depois do ready
      quiet(readyPromise);
      setStatus('error');
    };
    w.onmessage = (e: MessageEvent<CompilerResponse>) => {
      const msg = e.data;
      if (msg.type === 'progress') opts.onProgress?.(msg.progress);
      else if (msg.type === 'ready') {
        settle.resolve();
        setStatus('ready');
      } else if (msg.type === 'error') fail(msg.message);
      else {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.ok) p?.resolve(msg.value);
        else p?.reject(new Error(msg.message));
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      fail(e.message || 'o worker do compilador falhou');
    };
    setStatus('loading');
    w.postMessage({ type: 'init', clangBaseUrl: opts.clangBaseUrl } satisfies CompilerRequest);
  }

  async function call<T>(op: CompilerOp, args: unknown[]): Promise<T> {
    await readyPromise;
    if (current !== 'ready') throw new Error('o compilador não está pronto');
    return new Promise<T>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ id, op, args } satisfies CompilerRequest);
    });
  }

  start();
  return {
    compileObjects: (sources, headers) => call('compileObjects', [sources, headers]),
    undefinedSymbols: (objects) => call('undefinedSymbols', [objects]),
    definedSymbols: (objects) => call('definedSymbols', [objects]),
    link: (objects, extraSources, headers) => call('link', [objects, extraSources, headers]),
    openRunSession,
    ready: () => readyPromise,
    status: () => current,
    retry() {
      stop(new Error('o compilador foi reiniciado'));
      start();
    },
  };
}

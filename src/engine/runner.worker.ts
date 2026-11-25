import { runWasm } from './runner';
import type { RunResult, TestCase } from './types';

export interface RunRequest {
  module: WebAssembly.Module;
  test: Pick<TestCase, 'args' | 'stdin'>;
  programName: string;
}

self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const { module, test, programName } = e.data;
  const result: RunResult = await runWasm(module, test, programName);
  self.postMessage(result);
};

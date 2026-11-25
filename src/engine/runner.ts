import { ConsoleStdout, File, OpenFile, WASI, WASIProcExit } from '@bjorn3/browser_wasi_shim';
import type { RunResult, TestCase } from './types';

export const STDOUT_LIMIT = 65536;

/** latin1: um byte vira um char, para a saída ficar exata. */
function latin1ToBytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
  return bytes;
}

export async function runWasm(
  module: WebAssembly.Module,
  test: Pick<TestCase, 'args' | 'stdin'>,
  programName: string,
): Promise<RunResult> {
  let stdout = '';
  let truncated = false;
  const collect = new ConsoleStdout((buf: Uint8Array) => {
    for (let i = 0; i < buf.length; i++) {
      if (stdout.length >= STDOUT_LIMIT) {
        truncated = true;
        return;
      }
      stdout += String.fromCharCode(buf[i]);
    }
  });
  const fds = [
    new OpenFile(new File(latin1ToBytes(test.stdin ?? ''))),
    collect,
    new ConsoleStdout(() => {}),
  ];
  const wasi = new WASI([programName, ...test.args], [], fds);
  const result = (r: Omit<RunResult, 'stdout' | 'truncated'>): RunResult =>
    truncated ? { stdout, truncated, ...r } : { stdout, ...r };
  try {
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });
    const code = wasi.start(instance as unknown as Parameters<WASI['start']>[0]);
    return result({ outcome: 'exit', exitCode: code });
  } catch (e) {
    if (e instanceof WASIProcExit) return result({ outcome: 'exit', exitCode: e.code });
    const err = e instanceof Error ? e : new Error(String(e));
    return result({ outcome: 'crash', trapMessage: err.message, trapStack: err.stack });
  }
}

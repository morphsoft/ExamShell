export type Level = 1 | 2 | 3 | 4;
export type SourceFiles = Record<string, string>; // nome → conteúdo

export interface CatalogEntry {
  id: string;
  level: Level;
  kind: 'program' | 'function';
  expectedFiles: string[]; // abas editáveis, na ordem; a 1ª é o .c principal
  allowedFunctions: string[];
  prototype?: string; // só 'function'
}
export interface TestCase {
  id: string; // "t01".."t15"
  args: string[]; // argv[1..]; em 'function' = [String(índice do caso no harness)]
  stdin?: string;
  category: string; // kebab-case em PT, ex.: "espacos-no-inicio"
  display?: string; // obrigatório em 'function', ex.: 'ft_strlen("")'
}
export type HintLadder = [string, string, string];
export interface ExerciseContent {
  tests: TestCase[];
  hints: Record<string, HintLadder>; // por category
  starter?: SourceFiles; // conteúdo inicial de algum expectedFile (ex.: struct do subject)
}
export interface LoadedExercise extends CatalogEntry, ExerciseContent {
  subject: { en: string; pt: string };
  harness?: string; // 'function'
  expected: Record<string, { stdout: string }>; // por test.id; bytes como chars latin1
}

export interface RunResult {
  stdout: string; // bytes → chars latin1, cortado em STDOUT_LIMIT
  truncated?: boolean;
  outcome: 'exit' | 'crash' | 'timeout';
  exitCode?: number;
  trapMessage?: string;
  trapStack?: string;
}
export type CompileOutcome =
  | { ok: true; objects: Record<string, Uint8Array>; stderr: string }
  | { ok: false; stderr: string };
export type LinkOutcome =
  | { ok: true; wasm: Uint8Array; stderr: string }
  | { ok: false; stderr: string };
export interface RunSession {
  run(test: Pick<TestCase, 'args' | 'stdin'>, timeoutMs: number): Promise<RunResult>;
  dispose(): void;
}
export interface Engine {
  compileObjects(sources: SourceFiles, headers: SourceFiles): Promise<CompileOutcome>;
  undefinedSymbols(objects: Record<string, Uint8Array>): Promise<string[]>;
  link(objects: Record<string, Uint8Array>, extraSources: SourceFiles, headers: SourceFiles): Promise<LinkOutcome>;
  openRunSession(wasm: Uint8Array, programName: string): RunSession;
}

export type Failure =
  | { kind: 'compile'; stderr: string }
  | { kind: 'forbidden'; functions: string[] }
  | { kind: 'link'; reason: 'duplicate-main' | 'missing-symbol' | 'other'; symbol?: string; stderr: string }
  | { kind: 'wrong-output'; test: TestCase; index: number; expected: string; actual: string; diffIndex: number; truncated: boolean }
  | { kind: 'crash'; test: TestCase; index: number; trapMessage: string; line?: { file: string; line: number } }
  | { kind: 'timeout'; test: TestCase; index: number };
export interface GradeResult { passed: number; total: number; failure: Failure | null }

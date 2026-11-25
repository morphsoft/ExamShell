// Página mínima do teste de viabilidade: carrega o Clang no navegador e roda um cenário (?scenario=).
// Esta página vai para o site publicado: nenhum programa daqui pode ser solução de um exercício.
import { createBrowserEngine, type BrowserEngine } from './engine/browserEngine';
import type { RunResult } from './engine/types';

/** Ecoa argv[1] e uma quebra de linha. */
const ECHO = `#include <unistd.h>
int main(int argc, char **argv)
{
	int i = 0;
	if (argc == 2)
		while (argv[1][i])
			write(1, &argv[1][i++], 1);
	write(1, "\\n", 1);
	return (0);
}
`;

/** Esquece a quebra de linha do fim. */
const ECHO_BUG = `#include <unistd.h>
int main(int argc, char **argv)
{
	int i = 0;
	if (argc == 2)
		while (argv[1][i])
			write(1, &argv[1][i++], 1);
	return (0);
}
`;

// `;` em outra linha: na mesma linha o -Wempty-body (com -Werror) reprova
const INFINITE = 'int main(void)\n{\n\twhile (1)\n\t\t;\n\treturn (0);\n}\n';
const NULL_WRITE = "int main(void){ char *p = 0; p[0] = 'x'; return 0; }";
const LONG_SIZE =
  "#include <unistd.h>\nint main(void){ char c = (char)('0' + sizeof(long)); write(1, &c, 1); return 0; }";
const LOREM = ['  lorem,ipsum  '];

async function runProgram(engine: BrowserEngine, src: string, args: string[], timeoutMs = 10000): Promise<RunResult> {
  const c = await engine.compileObjects({ 'main.c': src }, {});
  if (!c.ok) throw new Error('compile failed: ' + c.stderr);
  const l = await engine.link(c.objects, {}, {});
  if (!l.ok) throw new Error('link failed: ' + l.stderr);
  const session = engine.openRunSession(l.wasm, './prog');
  try {
    return await session.run({ args }, timeoutMs);
  } finally {
    session.dispose();
  }
}

const SCENARIOS: Record<string, (engine: BrowserEngine) => Promise<unknown>> = {
  'echo-ok': (e) => runProgram(e, ECHO, LOREM),
  'echo-bug': (e) => runProgram(e, ECHO_BUG, LOREM),
  werror: (e) => e.compileObjects({ 'main.c': 'int main(void){int x; return 0;}' }, {}),
  'null-write': (e) => runProgram(e, NULL_WRITE, []),
  'long-size': (e) => runProgram(e, LONG_SIZE, []),
  'infinite-then-ok': async (e) => ({
    first: await runProgram(e, INFINITE, [], 2000),
    second: await runProgram(e, ECHO, LOREM),
  }),
};

const el = (id: string) => document.getElementById(id)!;
let started = false;

async function runScenario(engine: BrowserEngine) {
  const name = new URLSearchParams(location.search).get('scenario');
  if (!name || started) return;
  started = true;
  let out: unknown;
  try {
    const scenario = SCENARIOS[name];
    out = scenario ? await scenario(engine) : { error: `cenário desconhecido: ${name}` };
  } catch (e) {
    out = { error: e instanceof Error ? e.message : String(e) };
  }
  el('result').textContent = JSON.stringify(out, null, 2);
}

const engine = createBrowserEngine({
  clangBaseUrl: new URL('clang/', location.href).href,
  onProgress: (p) => {
    const mb = (n: number) => (n / 1e6).toFixed(1);
    el('progress').textContent = `${mb(p.loadedBytes)} / ${mb(p.totalBytes)} MB${p.fromCache ? ' (cache)' : ''}`;
  },
  onStatus: (s) => {
    el('status').textContent = s;
    el('error').hidden = s !== 'error';
    if (s === 'error') engine.ready().catch((e: Error) => (el('error-message').textContent = e.message));
    if (s === 'ready') {
      el('timing').textContent = String(Math.round(performance.now()));
      void runScenario(engine);
    }
  },
});
el('retry').addEventListener('click', () => engine.retry());

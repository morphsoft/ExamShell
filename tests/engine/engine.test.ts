import { beforeAll, describe, expect, it } from 'vitest';
import { classifyLinkError } from '../../src/engine/clangErrors';
import type { Engine, RunResult } from '../../src/engine/types';
import { createNodeEngine } from '../support/nodeEngine';

let engine: Engine;
beforeAll(async () => {
  engine = await createNodeEngine();
});

async function build(src: string, args: string[] = [], stdin?: string): Promise<RunResult> {
  const c = await engine.compileObjects({ 'main.c': src }, {});
  if (!c.ok) throw new Error('compile failed: ' + c.stderr);
  const l = await engine.link(c.objects, {}, {});
  if (!l.ok) throw new Error('link failed: ' + l.stderr);
  const session = engine.openRunSession(l.wasm, './prog');
  try {
    return await session.run({ args, stdin }, 10000);
  } finally {
    session.dispose();
  }
}

const FIRST_WORD = `#include <unistd.h>
int main(int argc, char **argv)
{
	int i = 0;
	if (argc == 2)
	{
		while (argv[1][i] == ' ' || argv[1][i] == '\\t')
			i++;
		while (argv[1][i] && argv[1][i] != ' ' && argv[1][i] != '\\t')
			write(1, &argv[1][i++], 1);
	}
	write(1, "\\n", 1);
	return (0);
}
`;

describe('engine (Clang real)', () => {
  it('compila e roda', async () => {
    const r = await build(FIRST_WORD, ['  lorem,ipsum  ']);
    expect(r).toMatchObject({ outcome: 'exit', exitCode: 0, stdout: 'lorem,ipsum\n' });
  });

  it('-Werror reprova', async () => {
    const c = await engine.compileObjects({ 'main.c': 'int main(void){int x; return 0;}' }, {});
    expect(c.ok).toBe(false);
    expect(c.stderr).toContain("unused variable 'x'");
  });

  it('NULL vira crash', async () => {
    const r = await build('int main(void){ char *p = 0; p[0] = \'x\'; return 0; }');
    expect(r.outcome).toBe('crash');
  });

  it('recursão infinita vira crash', async () => {
    const r = await build(
      'static int rec(int n) { char buf[64]; buf[0] = (char)n; if (n < 0) return (0); return (rec(n + 1) + buf[0]); }\n' +
        'int main(void){ return (rec(0)); }',
    );
    expect(r.outcome).toBe('crash');
  });

  it('long tem 64 bits', async () => {
    const r = await build(
      '#include <unistd.h>\nint main(void){ char c = (char)(\'0\' + sizeof(long)); write(1, &c, 1); return 0; }',
    );
    expect(r.stdout).toBe('8');
  });

  it('INT_MIN com long', async () => {
    const r = await build(`#include <unistd.h>
static void putnbr(long n)
{
	char c;
	if (n >= 10)
		putnbr(n / 10);
	c = (char)('0' + n % 10);
	write(1, &c, 1);
}
int main(void)
{
	long n = -2147483648;
	n = -n;
	putnbr(n);
	return (0);
}
`);
    expect(r.stdout).toBe('2147483648');
  });

  it('diagnóstico sem _L64', async () => {
    const c = await engine.compileObjects({ 'main.c': 'int main(void){long n; return 0;}' }, {});
    expect(c.ok).toBe(false);
    expect(c.stderr).toContain('long n;');
    expect(c.stderr).not.toContain('_L64');
  });

  it('nm lista símbolos', async () => {
    const c = await engine.compileObjects(
      {
        'main.c':
          '#include <stdio.h>\n#include <unistd.h>\nint main(void){ printf("a"); write(1, "b", 1); return 0; }',
      },
      {},
    );
    if (!c.ok) throw new Error(c.stderr);
    const syms = await engine.undefinedSymbols(c.objects);
    expect(syms).toContain('printf');
    expect(syms).toContain('write');
  });

  it('stdin', async () => {
    const r = await build(
      '#include <unistd.h>\nint main(void){ char b[16]; ssize_t n = read(0, b, 16); if (n > 0) write(1, b, (size_t)n); return 0; }',
      [],
      'abc',
    );
    expect(r.stdout).toBe('abc');
  });

  it('pilha de 8 MB', async () => {
    const r = await build(
      '#include <unistd.h>\nint main(void){ char buf[1000000]; buf[999999] = \'a\'; write(1, &buf[999999], 1); return 0; }',
    );
    expect(r.stdout).toBe('a');
  });

  it('saída gigante é cortada', async () => {
    const r = await build(
      '#include <unistd.h>\nint main(void){ int i; for (i = 0; i < 200000; i++) write(1, "xxxxxxxx", 8); return 0; }',
    );
    expect(r.stdout.length).toBe(65536);
    expect(r.truncated).toBe(true);
  });

  it('main duplicado', async () => {
    const c = await engine.compileObjects({ 'main.c': 'int main(void){ return 0; }' }, {});
    if (!c.ok) throw new Error(c.stderr);
    const l = await engine.link(c.objects, { '__harness.c': 'int main(void){return 0;}' }, {});
    expect(l.ok).toBe(false);
    expect(classifyLinkError(l.stderr).reason).toBe('duplicate-main');
  });

  it('ponteiro de função sem protótipo', async () => {
    const c = await engine.compileObjects(
      {
        'main.c':
          'static int lt(int a, int b){ return a < b; }\nint main(void){ int (*cmp)() = lt; return (cmp(1, 2) ? 0 : 1); }',
      },
      {},
    );
    expect(c.ok).toBe(true);
  });
});

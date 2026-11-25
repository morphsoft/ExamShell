import { beforeAll, describe, expect, it } from 'vitest';
import { grade } from '../../src/engine/grade';
import type { Engine, LoadedExercise } from '../../src/engine/types';
import { createNodeEngine } from '../support/nodeEngine';

let engine: Engine;
beforeAll(async () => {
  engine = await createNodeEngine();
});

const ex: LoadedExercise = {
  id: 'first_word',
  level: 1,
  kind: 'program',
  expectedFiles: ['first_word.c'],
  allowedFunctions: ['write'],
  tests: [
    { id: 't01', args: ['hello world'], category: 'basico' },
    { id: 't02', args: ['   lorem ipsum'], category: 'espacos-no-inicio' },
    { id: 't03', args: [], category: 'argc-errado' },
  ],
  hints: {},
  subject: { en: '', pt: '' },
  expected: { t01: { stdout: 'hello\n' }, t02: { stdout: 'lorem\n' }, t03: { stdout: '\n' } },
};

const body = (skip: string) => `#include <unistd.h>
int main(int argc, char **argv)
{
	int i = 0;
	if (argc == 2)
	{
		${skip}
		while (argv[1][i] && argv[1][i] != ' ' && argv[1][i] != '\\t')
			write(1, &argv[1][i++], 1);
	}
	write(1, "\\n", 1);
	return (0);
}
`;
const GOOD = body("while (argv[1][i] == ' ' || argv[1][i] == '\\t') i++;");
const BUGGY = body('');

describe('grade (motor real)', () => {
  it('bug: falha no teste de espaços no início', async () => {
    const r = await grade(ex, { 'first_word.c': BUGGY }, engine);
    expect(r.passed).toBe(1);
    expect(r.failure).toMatchObject({ kind: 'wrong-output', index: 1, expected: 'lorem\n', actual: '\n' });
  });
  it('código correto passa', async () => {
    const r = await grade(ex, { 'first_word.c': GOOD }, engine);
    expect(r).toEqual({ passed: 3, total: 3, failure: null });
  });
  it('printf é proibido', async () => {
    const src = '#include <stdio.h>\nint main(void){ printf("x\\n"); return 0; }\n';
    const r = await grade(ex, { 'first_word.c': src }, engine);
    expect(r.failure).toEqual({ kind: 'forbidden', functions: ['printf'] });
  });
});

describe('main do cadete em exercício de função (motor real)', () => {
  const fnEx: LoadedExercise = {
    id: 'ft_strlen',
    level: 1,
    kind: 'function',
    expectedFiles: ['ft_strlen.c'],
    allowedFunctions: [],
    prototype: 'int ft_strlen(char *s);',
    harness: `#include <stdio.h>
int ft_strlen(char *s);
int main(int argc, char **argv)
{
	(void)argc; (void)argv;
	printf("%d\\n", ft_strlen("abc"));
	return (0);
}
`,
    tests: [{ id: 't01', args: ['0'], category: 'basico', display: 'ft_strlen("abc")' }],
    hints: {},
    subject: { en: '', pt: '' },
    expected: { t01: { stdout: '3\n' } },
  };
  const fn = `int ft_strlen(char *s)
{
	int i = 0;
	while (s[i])
		i++;
	return (i);
}
`;
  it('int main(void) é rejeitado', async () => {
    const r = await grade(fnEx, { 'ft_strlen.c': fn + 'int main(void){ return (0); }\n' }, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'duplicate-main' });
  });
  it('int main(argc, argv) é rejeitado', async () => {
    const src = fn + 'int main(int argc, char **argv){ (void)argc; (void)argv; return (0); }\n';
    const r = await grade(fnEx, { 'ft_strlen.c': src }, engine);
    expect(r.failure).toMatchObject({ kind: 'link', reason: 'duplicate-main' });
  });
  it('sem main passa', async () => {
    const r = await grade(fnEx, { 'ft_strlen.c': fn }, engine);
    expect(r.failure).toBeNull();
  });
});

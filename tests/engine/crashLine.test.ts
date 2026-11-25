import { beforeAll, describe, expect, it } from 'vitest';
import { grade, runOnce } from '../../src/engine/grade';
import type { Engine, LoadedExercise } from '../../src/engine/types';
import { createNodeEngine } from '../support/nodeEngine';

let engine: Engine;
beforeAll(async () => {
  engine = await createNodeEngine();
});

const program = (file: string): LoadedExercise => ({
  id: file.replace(/\.c$/, ''),
  level: 1,
  summary: '',
  kind: 'program',
  expectedFiles: [file],
  allowedFunctions: ['write'],
  tests: [{ id: 't01', args: ['a'], category: 'basico' }],
  hints: {},
  subject: { en: '', pt: '' },
  expected: { t01: { stdout: 'a\n' } },
});

const ftStrlen = (harness: string): LoadedExercise => ({
  id: 'ft_strlen',
  level: 1,
  summary: '',
  kind: 'function',
  expectedFiles: ['ft_strlen.c'],
  allowedFunctions: [],
  prototype: 'int ft_strlen(char *str);',
  harness,
  tests: [{ id: 't01', args: ['0'], category: 'basico', display: 'ft_strlen(NULL)' }],
  hints: {},
  subject: { en: '', pt: '' },
  expected: { t01: { stdout: '0\n' } },
});

const FT_STRLEN = `int	ft_strlen(char *str)
{
	int	i;

	i = 0;
	while (str[i])
		i++;
	return (i);
}
`;

describe('linha do travamento (motor real)', () => {
  it('escrita em NULL na linha 6 de main.c', async () => {
    // o long (reescrito para _L64) e o -include do prelúdio não podem mexer nas linhas
    const src = `#include <unistd.h>
int	main(void)
{
	long	n = 0;
	char	*p = (char *)n;
	p[0] = 'x';
	write(1, "a\\n", 2);
	return (0);
}
`;
    const r = await grade(program('main.c'), { 'main.c': src }, engine);
    expect(r.failure).toMatchObject({ kind: 'crash', index: 0, line: { file: 'main.c', line: 6 } });
  });

  it('índice fora do vetor (bounds) na linha 7 de first_word.c', async () => {
    const src = `#include <unistd.h>

int	main(int argc, char **argv)
{
	char	buf[4];

	buf[argc + 10] = argv[0][0];
	write(1, buf, 1);
	return (0);
}
`;
    const r = await grade(program('first_word.c'), { 'first_word.c': src }, engine);
    expect(r.failure).toMatchObject({ kind: 'crash', line: { file: 'first_word.c', line: 7 } });
  });

  it('travou dentro da função do cadete, chamada pelo harness', async () => {
    const harness = `#include <stdio.h>
int	ft_strlen(char *str);
int	main(void)
{
	printf("%d\\n", ft_strlen(NULL));
	return (0);
}
`;
    const r = await grade(ftStrlen(harness), { 'ft_strlen.c': FT_STRLEN }, engine);
    expect(r.failure).toMatchObject({ kind: 'crash', line: { file: 'ft_strlen.c', line: 6 } });
  });

  it('travou no harness: sem linha', async () => {
    const harness = `#include <stdio.h>
int	ft_strlen(char *str);
int	main(void)
{
	char	*p = NULL;

	p[ft_strlen("abc") - 3] = 'x';
	return (0);
}
`;
    const r = await grade(ftStrlen(harness), { 'ft_strlen.c': FT_STRLEN }, engine);
    expect(r.failure).toMatchObject({ kind: 'crash', index: 0 });
    expect(r.failure).not.toHaveProperty('line');
  });

  it('rodar: escrita em NULL no main.c do rascunho', async () => {
    const mainC = `#include <stdio.h>

int	ft_strlen(char *str);

int	main(void)
{
	char	*p = NULL;

	printf("%d\\n", ft_strlen("abc"));
	p[0] = 'x';
	return (0);
}
`;
    const r = await runOnce(ftStrlen(''), { 'ft_strlen.c': FT_STRLEN }, { mainC, args: [] }, engine);
    expect(r.run).toMatchObject({ outcome: 'crash', stdout: '3\n' });
    expect(r.line).toEqual({ file: 'main.c', line: 10 });
  });
});

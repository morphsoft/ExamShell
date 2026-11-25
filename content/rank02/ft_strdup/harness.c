/*
** main de teste do ExamShell para ft_strdup.
** Chama a sua função com o caso de número argv[1], imprime a cópia (ou
** "(null)") e libera a memória.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char	*ft_strdup(char *src);

static void	show(char *src, int check)
{
	char	*copy;

	copy = ft_strdup(src);
	if (copy == NULL)
	{
		printf("(null)\n");
		return ;
	}
	printf("%s\n", copy);
	if (check)
	{
		printf("novo bloco: %s\n", copy != src ? "sim" : "nao");
		src[0] = '#';
		printf("%s\n", copy);
	}
	if (copy != src)
		free(copy);
}

/* Deixa lixo num bloco do tamanho certo e o libera, para o malloc reusá-lo. */
static void	dirty(size_t len)
{
	char	*p;

	p = malloc(len + 1);
	if (p == NULL)
		return ;
	memset(p, 'X', len + 1);
	free(p);
}

int	main(int argc, char **argv)
{
	static char	big[201];
	char			buf[16];

	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show((char []){"Hello"}, 0);
			break ;
		case 1: /* t02 */
			show((char []){""}, 0);
			break ;
		case 2: /* t03 */
			show((char []){"The quick brown fox"}, 0);
			break ;
		case 3: /* t04 */
			show((char []){"x"}, 0);
			break ;
		case 4: /* t05 */
			strcpy(buf, "Hello");
			show(buf, 1);
			break ;
		case 5: /* t06 */
			dirty(2);
			show((char []){"ab"}, 0);
			break ;
		case 6: /* t07 */
			show((char []){"  \t  "}, 0);
			break ;
		case 7: /* t08 */
			memset(big, 'a', 200);
			show(big, 0);
			break ;
		default:
			return (1);
	}
	return (0);
}

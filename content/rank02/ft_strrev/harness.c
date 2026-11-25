/*
** main de teste do ExamShell para ft_strrev.
** Copia o texto do caso para um buffer, chama a sua função e imprime o buffer.
** No caso do retorno, também diz se ela devolveu o próprio buffer.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char	*ft_strrev(char *str);

static void	run(const char *init, int show_ret)
{
	static char	buf[256];
	char		*ret;

	strcpy(buf, init);
	ret = ft_strrev(buf);
	printf("%s\n", buf);
	if (show_ret)
		printf("devolveu str: %s\n", ret == buf ? "sim" : "nao");
}

int	main(int argc, char **argv)
{
	static char	big[101];
	int			i;

	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			run("Hello", 0);
			break ;
		case 1: /* t02 */
			run("abcd", 0);
			break ;
		case 2: /* t03 */
			run("", 0);
			break ;
		case 3: /* t04 */
			run("x", 0);
			break ;
		case 4: /* t05 */
			run("Hello", 1);
			break ;
		case 5: /* t06 */
			run("a b\tc", 0);
			break ;
		case 6: /* t07 */
			i = 0;
			while (i < 100)
			{
				big[i] = 'a' + i % 26;
				i++;
			}
			run(big, 0);
			break ;
		case 7: /* t08 */
			run("ab", 0);
			break ;
		default:
			return (1);
	}
	return (0);
}

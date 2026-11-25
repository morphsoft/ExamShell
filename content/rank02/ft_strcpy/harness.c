/*
** main de teste do ExamShell para ft_strcpy.
** Prepara o destino com o conteúdo inicial do caso, chama a sua função e
** imprime o destino. No caso do retorno, também diz se ela devolveu o
** próprio destino.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char	*ft_strcpy(char *s1, char *s2);

static void	run(char *init, char *src, int show_ret)
{
	static char	dst[512];
	char		*ret;

	memset(dst, 0, sizeof(dst));
	strcpy(dst, init);
	ret = ft_strcpy(dst, src);
	printf("%s\n", dst);
	if (show_ret)
		printf("devolveu dst: %s\n", ret == dst ? "sim" : "nao");
}

int	main(int argc, char **argv)
{
	static char	big[201];
	static char	src[16];

	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			strcpy(src, "Hello");
			run("", src, 0);
			break ;
		case 1: /* t02 */
			run("ABCDEFGHIJ", (char []){""}, 0);
			break ;
		case 2: /* t03 */
			run("", (char []){"The quick brown fox"}, 0);
			break ;
		case 3: /* t04 */
			run("", (char []){"x"}, 0);
			break ;
		case 4: /* t05 */
			run("XXXXXXXXXXXX", (char []){"ab"}, 0);
			break ;
		case 5: /* t06 */
			run("", (char []){"  	  "}, 0);
			break ;
		case 6: /* t07 */
			strcpy(src, "Hello");
			run("", src, 1);
			break ;
		case 7: /* t08 */
			memset(big, 'a', 200);
			run("", big, 0);
			break ;
		default:
			return (1);
	}
	return (0);
}

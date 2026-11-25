/*
** main de teste do ExamShell para ft_strpbrk.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>

char	*ft_strpbrk(const char *s1, const char *s2);

/*
** Mostra o resto de s1 a partir do ponteiro devolvido e a posição dele dentro
** de s1, ou "(null)" quando a função devolve NULL.
*/
static void	show(const char *s1, const char *s2)
{
	char	*r;

	r = ft_strpbrk(s1, s2);
	if (r == NULL)
		printf("(null)\n");
	else
		printf("%s (indice %d)\n", r, (int)(r - s1));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("Hello, World", "o,");
			break ;
		case 1: /* t02 */
			show("abcdef", "xyz");
			break ;
		case 2: /* t03 */
			show("abcdef", "a");
			break ;
		case 3: /* t04 */
			show("", "abc");
			break ;
		case 4: /* t05 */
			show("abc", "");
			break ;
		case 5: /* t06 */
			show("hello world", "wo");
			break ;
		case 6: /* t07 */
			show("abcabc", "cb");
			break ;
		case 7: /* t08 */
			show("Hello", "h");
			break ;
		case 8: /* t09 */
			show("abc", "c");
			break ;
		case 9: /* t10 */
			show("a b", " ");
			break ;
		default:
			return (1);
	}
	return (0);
}

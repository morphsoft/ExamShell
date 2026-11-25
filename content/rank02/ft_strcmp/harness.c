/*
** main de teste do ExamShell para ft_strcmp.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>

int	ft_strcmp(char *s1, char *s2);

/*
** Mostra só o sinal do resultado (negativo, zero ou positivo): o enunciado não
** fixa o valor exato, só o comportamento do strcmp.
*/
static void	show(char *s1, char *s2)
{
	int	r;

	r = ft_strcmp(s1, s2);
	if (r < 0)
		printf("negativo\n");
	else if (r > 0)
		printf("positivo\n");
	else
		printf("zero\n");
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("abc", "abc");
			break ;
		case 1: /* t02 */
			show("abc", "abd");
			break ;
		case 2: /* t03 */
			show("abd", "abc");
			break ;
		case 3: /* t04 */
			show("", "");
			break ;
		case 4: /* t05 */
			show("", "a");
			break ;
		case 5: /* t06 */
			show("a", "");
			break ;
		case 6: /* t07 */
			show("abc", "abcd");
			break ;
		case 7: /* t08 */
			show("abcd", "abc");
			break ;
		case 8: /* t09 */
			show("Hello", "hello");
			break ;
		case 9: /* t10 */
			show("zzz", "aaa");
			break ;
		case 10: /* t11 */
			show("The quick brown fox", "The quick brown fox");
			break ;
		default:
			return (1);
	}
	return (0);
}

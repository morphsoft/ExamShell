/*
** main de teste do ExamShell para ft_atoi.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>

int	ft_atoi(const char *str);

static void	show(const char *str)
{
	printf("%d\n", ft_atoi(str));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("42");
			break ;
		case 1: /* t02 */
			show("  -15abc");
			break ;
		case 2: /* t03 */
			show("abc");
			break ;
		case 3: /* t04 */
			show("-42");
			break ;
		case 4: /* t05 */
			show("0");
			break ;
		case 5: /* t06 */
			show("   123");
			break ;
		case 6: /* t07 */
			show("+7");
			break ;
		case 7: /* t08 */
			show("123abc");
			break ;
		case 8: /* t09 */
			show("");
			break ;
		case 9: /* t10 */
			show("\t\n  -15");
			break ;
		case 10: /* t11 */
			show("2147483647");
			break ;
		case 11: /* t12 */
			show("-2147483648");
			break ;
		case 12: /* t13 */
			show("--5");
			break ;
		case 13: /* t14 */
			show("12 34");
			break ;
		case 14: /* t15 */
			show("0042");
			break ;
		default:
			return (1);
	}
	return (0);
}

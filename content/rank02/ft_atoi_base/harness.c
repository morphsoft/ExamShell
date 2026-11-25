/*
** main de teste do ExamShell para ft_atoi_base.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>

int	ft_atoi_base(const char *str, int str_base);

static void	show(const char *str, int base)
{
	printf("%d\n", ft_atoi_base(str, base));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("101", 2);
			break ;
		case 1: /* t02 */
			show("-ff", 16);
			break ;
		case 2: /* t03 */
			show("12fdbA", 16);
			break ;
		case 3: /* t04 */
			show("42", 10);
			break ;
		case 4: /* t05 */
			show("777", 8);
			break ;
		case 5: /* t06 */
			show("321", 4);
			break ;
		case 6: /* t07 */
			show("ab", 16);
			break ;
		case 7: /* t08 */
			show("FF", 16);
			break ;
		case 8: /* t09 */
			show("0", 10);
			break ;
		case 9: /* t10 */
			show("-7", 10);
			break ;
		case 10: /* t11 */
			show("0010", 2);
			break ;
		case 11: /* t12 */
			show("7fffffff", 16);
			break ;
		default:
			return (1);
	}
	return (0);
}

/*
** main de teste do ExamShell para ft_itoa.
** Chama a sua função com o caso de número argv[1], imprime a string devolvida
** (ou "(null)") e libera a memória.
*/
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

char	*ft_itoa(int nbr);

static void	show(int nbr)
{
	char	*str;

	str = ft_itoa(nbr);
	if (str == NULL)
		printf("(null)\n");
	else
		printf("%s\n", str);
	free(str);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show(42);
			break ;
		case 1: /* t02 */
			show(-42);
			break ;
		case 2: /* t03 */
			show(0);
			break ;
		case 3: /* t04 */
			show(7);
			break ;
		case 4: /* t05 */
			show(123456789);
			break ;
		case 5: /* t06 */
			show(-7);
			break ;
		case 6: /* t07 */
			show(10);
			break ;
		case 7: /* t08 */
			show(1000000000);
			break ;
		case 8: /* t09 */
			show(-2005);
			break ;
		case 9: /* t10 */
			show(INT_MAX);
			break ;
		case 10: /* t11 */
			show(INT_MIN);
			break ;
		case 11: /* t12 */
			show(INT_MIN + 1);
			break ;
		default:
			return (1);
	}
	return (0);
}

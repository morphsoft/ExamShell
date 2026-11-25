/*
** main de teste do ExamShell para ft_swap.
** Chama a sua função com os valores do caso de número argv[1] e imprime a e b
** depois da troca.
*/
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

void	ft_swap(int *a, int *b);

static void	run(int a, int b)
{
	ft_swap(&a, &b);
	printf("a = %d, b = %d\n", a, b);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			run(1, 2);
			break ;
		case 1: /* t02 */
			run(-5, 0);
			break ;
		case 2: /* t03 */
			run(-42, 42);
			break ;
		case 3: /* t04 */
			run(0, 0);
			break ;
		case 4: /* t05 */
			run(0, 5);
			break ;
		case 5: /* t06 */
			run(-1, -2);
			break ;
		case 6: /* t07 */
			run(INT_MAX, INT_MIN);
			break ;
		case 7: /* t08 */
			run(INT_MAX, 1);
			break ;
		default:
			return (1);
	}
	return (0);
}

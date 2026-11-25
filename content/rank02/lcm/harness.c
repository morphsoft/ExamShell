/*
** main de teste do ExamShell para lcm.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>

unsigned int	lcm(unsigned int a, unsigned int b);

static void	show(unsigned int a, unsigned int b)
{
	printf("%u\n", lcm(a, b));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show(4, 6);
			break ;
		case 1: /* t02 */
			show(21, 6);
			break ;
		case 2: /* t03 */
			show(0, 5);
			break ;
		case 3: /* t04 */
			show(5, 0);
			break ;
		case 4: /* t05 */
			show(1, 1);
			break ;
		case 5: /* t06 */
			show(7, 13);
			break ;
		case 6: /* t07 */
			show(12, 12);
			break ;
		case 7: /* t08 */
			show(6, 3);
			break ;
		case 8: /* t09 */
			show(3, 6);
			break ;
		default:
			return (1);
	}
	return (0);
}

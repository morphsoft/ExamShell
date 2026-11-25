/*
** main de teste do ExamShell para is_power_of_2.
** Chama a sua função com o caso de número argv[1] e imprime o valor devolvido.
*/
#include <stdio.h>
#include <stdlib.h>

int	is_power_of_2(unsigned int n);


int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			printf("%d\n", is_power_of_2(16u));
			break ;
		case 1: /* t02 */
			printf("%d\n", is_power_of_2(12u));
			break ;
		case 2: /* t03 */
			printf("%d\n", is_power_of_2(0u));
			break ;
		case 3: /* t04 */
			printf("%d\n", is_power_of_2(1u));
			break ;
		case 4: /* t05 */
			printf("%d\n", is_power_of_2(2u));
			break ;
		case 5: /* t06 */
			printf("%d\n", is_power_of_2(1024u));
			break ;
		case 6: /* t07 */
			printf("%d\n", is_power_of_2(3u));
			break ;
		case 7: /* t08 */
			printf("%d\n", is_power_of_2(2147483648u));
			break ;
		case 8: /* t09 */
			printf("%d\n", is_power_of_2(6u));
			break ;
		case 9: /* t10 */
			printf("%d\n", is_power_of_2(1000u));
			break ;
		case 10: /* t11 */
			printf("%d\n", is_power_of_2(2147483647u));
			break ;
		case 11: /* t12 */
			printf("%d\n", is_power_of_2(17u));
			break ;
		default:
			return (1);
	}
	return (0);
}

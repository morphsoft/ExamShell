/*
** main de teste do ExamShell para print_bits.
** Chama a sua função com o caso de número argv[1] e, depois, escreve uma
** quebra de linha (a sua função não deve escrever nenhuma).
*/
#include <stdio.h>
#include <stdlib.h>

void	print_bits(unsigned char octet);


int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			print_bits(2);
			printf("\n");
			break ;
		case 1: /* t02 */
			print_bits(1);
			printf("\n");
			break ;
		case 2: /* t03 */
			print_bits(255);
			printf("\n");
			break ;
		case 3: /* t04 */
			print_bits(15);
			printf("\n");
			break ;
		case 4: /* t05 */
			print_bits(65);
			printf("\n");
			break ;
		case 5: /* t06 */
			print_bits(170);
			printf("\n");
			break ;
		case 6: /* t07 */
			print_bits(240);
			printf("\n");
			break ;
		case 7: /* t08 */
			print_bits(128);
			printf("\n");
			break ;
		case 8: /* t09 */
			print_bits(0);
			printf("\n");
			break ;
		case 9: /* t10 */
			print_bits(85);
			printf("\n");
			break ;
		default:
			return (1);
	}
	return (0);
}

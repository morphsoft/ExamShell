/*
** main de teste do ExamShell para reverse_bits.
** Chama a sua função com o caso de número argv[1] e imprime o byte devolvido
** em decimal, seguido do valor em hexadecimal entre parênteses.
*/
#include <stdio.h>
#include <stdlib.h>

unsigned char	reverse_bits(unsigned char octet);

static void	show(unsigned char r)
{
	printf("%u (0x%02X)\n", r, r);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show(reverse_bits(38));
			break ;
		case 1: /* t02 */
			show(reverse_bits(1));
			break ;
		case 2: /* t03 */
			show(reverse_bits(0));
			break ;
		case 3: /* t04 */
			show(reverse_bits(65));
			break ;
		case 4: /* t05 */
			show(reverse_bits(15));
			break ;
		case 5: /* t06 */
			show(reverse_bits(240));
			break ;
		case 6: /* t07 */
			show(reverse_bits(170));
			break ;
		case 7: /* t08 */
			show(reverse_bits(2));
			break ;
		case 8: /* t09 */
			show(reverse_bits(6));
			break ;
		case 9: /* t10 */
			show(reverse_bits(128));
			break ;
		case 10: /* t11 */
			show(reverse_bits(255));
			break ;
		default:
			return (1);
	}
	return (0);
}

/*
** main de teste do ExamShell para ft_putstr.
** Chama a sua função com o caso de número argv[1] e, depois, escreve uma
** quebra de linha (a sua função não deve escrever nenhuma).
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void	ft_putstr(char *str);

int	main(int argc, char **argv)
{
	static char	big[1501];

	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			ft_putstr("Hello");
			break ;
		case 1: /* t02 */
			ft_putstr("42 SP");
			break ;
		case 2: /* t03 */
			ft_putstr("");
			break ;
		case 3: /* t04 */
			ft_putstr("a");
			break ;
		case 4: /* t05 */
			ft_putstr("  tab\there  ");
			break ;
		case 5: /* t06 */
			ft_putstr("100% %d %s \\ \"q\"");
			break ;
		case 6: /* t07 */
			ft_putstr("line1\nline2");
			break ;
		case 7: /* t08 */
			memset(big, 'x', 1500);
			ft_putstr(big);
			break ;
		default:
			return (1);
	}
	printf("\n");
	return (0);
}

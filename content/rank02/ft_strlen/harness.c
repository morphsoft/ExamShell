/*
** main de teste do ExamShell para ft_strlen.
** Chama a sua função com o caso de número argv[1] e imprime o que ela devolveu.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int	ft_strlen(char *str);

int	main(int argc, char **argv)
{
	static char	big[1001];

	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			printf("%d\n", ft_strlen("Hello"));
			break ;
		case 1: /* t02 */
			printf("%d\n", ft_strlen("abcdefghijklmnopqrstuvwxyz"));
			break ;
		case 2: /* t03 */
			printf("%d\n", ft_strlen("a"));
			break ;
		case 3: /* t04 */
			printf("%d\n", ft_strlen(""));
			break ;
		case 4: /* t05 */
			printf("%d\n", ft_strlen("The quick brown fox jumps over the lazy dog"));
			break ;
		case 5: /* t06 */
			printf("%d\n", ft_strlen("   "));
			break ;
		case 6: /* t07 */
			printf("%d\n", ft_strlen("\tHello World\n"));
			break ;
		case 7: /* t08 */
			memset(big, 'x', 1000);
			big[1000] = '\0';
			printf("%d\n", ft_strlen(big));
			break ;
		default:
			return (1);
	}
	return (0);
}

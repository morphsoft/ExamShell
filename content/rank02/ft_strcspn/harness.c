/*
** main de teste do ExamShell para ft_strcspn.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

size_t	ft_strcspn(const char *s, const char *reject);

static void	show(const char *s, const char *reject)
{
	printf("%zu\n", ft_strcspn(s, reject));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("abcdef", "dx");
			break ;
		case 1: /* t02 */
			show("abcdef", "xyz");
			break ;
		case 2: /* t03 */
			show("abc", "a");
			break ;
		case 3: /* t04 */
			show("Hello, World", "o,");
			break ;
		case 4: /* t05 */
			show("", "abc");
			break ;
		case 5: /* t06 */
			show("abc", "");
			break ;
		case 6: /* t07 */
			show("hello world", "wo");
			break ;
		case 7: /* t08 */
			show("abcabc", "cb");
			break ;
		case 8: /* t09 */
			show("aaaaab", "b");
			break ;
		case 9: /* t10 */
			show("abc", "abc");
			break ;
		case 10: /* t11 */
			show("Hello", "h");
			break ;
		case 11: /* t12 */
			show("one two", " ");
			break ;
		default:
			return (1);
	}
	return (0);
}

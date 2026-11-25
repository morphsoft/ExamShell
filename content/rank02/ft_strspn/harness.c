/*
** main de teste do ExamShell para ft_strspn.
** Chama a sua função com o caso de número argv[1] e imprime o resultado.
*/
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

size_t	ft_strspn(const char *s, const char *accept);

static void	show(const char *s, const char *accept)
{
	printf("%zu\n", ft_strspn(s, accept));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("129th", "0123456789");
			break ;
		case 1: /* t02 */
			show("abc", "xyz");
			break ;
		case 2: /* t03 */
			show("abcabc", "abc");
			break ;
		case 3: /* t04 */
			show("hello", "leh");
			break ;
		case 4: /* t05 */
			show("", "abc");
			break ;
		case 5: /* t06 */
			show("abc", "");
			break ;
		case 6: /* t07 */
			show("aabbcc", "ab");
			break ;
		case 7: /* t08 */
			show("Hello", "h");
			break ;
		case 8: /* t09 */
			show("ababab", "ba");
			break ;
		case 9: /* t10 */
			show("   x", " ");
			break ;
		default:
			return (1);
	}
	return (0);
}

/*
** main de teste do ExamShell para ft_split.
** Chama a sua função com uma cópia (que pode ser alterada) da string do caso de
** número argv[1], imprime cada palavra do vetor devolvido entre colchetes, uma
** por linha, até encontrar o NULL final, e libera tudo.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char	**ft_split(char *str);

static void	show(char *text)
{
	char	buffer[128];
	char	**words;
	int		k;

	strcpy(buffer, text);
	words = ft_split(buffer);
	if (words == NULL)
	{
		printf("(null)\n");
		return ;
	}
	k = 0;
	while (words[k] != NULL)
	{
		printf("[%s]\n", words[k]);
		free(words[k]);
		k++;
	}
	free(words);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show("Hello world");
			break ;
		case 1: /* t02 */
			show("one");
			break ;
		case 2: /* t03 */
			show("  lead and trail  ");
			break ;
		case 3: /* t04 */
			show("many     spaces   here");
			break ;
		case 4: /* t05 */
			show("tab\tseparated\twords");
			break ;
		case 5: /* t06 */
			show("line one\nline two");
			break ;
		case 6: /* t07 */
			show("a \t\nb");
			break ;
		default:
			return (1);
	}
	return (0);
}

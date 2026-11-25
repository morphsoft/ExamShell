/*
** main de teste do ExamShell para ft_list_size.
** Monta a lista do caso de número argv[1], chama a sua função e imprime o que
** ela devolveu. Os elementos ficam num vetor estático, ligados em sequência.
*/
#include <stdio.h>
#include <stdlib.h>
#include "ft_list.h"

int	ft_list_size(t_list *begin_list);

static t_list	g_nodes[1000];

/* Liga g_nodes[0..n-1]; o data do k-ésimo é data[k] (ou "x" se data for NULL). */
static t_list	*make_list(int n, char **data)
{
	int	k;

	if (n == 0)
		return (NULL);
	k = 0;
	while (k < n)
	{
		g_nodes[k].data = data ? data[k] : "x";
		g_nodes[k].next = (k + 1 < n) ? &g_nodes[k + 1] : NULL;
		k++;
	}
	return (&g_nodes[0]);
}

static void	show(t_list *list)
{
	printf("%d\n", ft_list_size(list));
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show(make_list(3, (char *[]){"a", "b", "c"}));
			break ;
		case 1: /* t02 */
			show(make_list(1, (char *[]){"a"}));
			break ;
		case 2: /* t03 */
			show(make_list(5, (char *[]){"1", "2", "3", "4", "5"}));
			break ;
		case 3: /* t04 */
			show(NULL);
			break ;
		case 4: /* t05 */
			show(make_list(3, (char *[]){NULL, NULL, NULL}));
			break ;
		case 5: /* t06 */
			show(make_list(3, (char *[]){"a", NULL, "c"}));
			break ;
		case 6: /* t07 */
			show(make_list(1000, NULL));
			break ;
		default:
			return (1);
	}
	return (0);
}

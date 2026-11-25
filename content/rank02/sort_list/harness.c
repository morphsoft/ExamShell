/*
** main de teste do ExamShell para sort_list.
** Monta a lista do caso de número argv[1] (elementos num vetor estático,
** ligados em sequência), chama a sua função com ascending ou descending e
** imprime os data da lista que ela devolveu, na ordem, de cada elemento.
*/
#include <stdio.h>
#include <stdlib.h>
#include "list.h"

t_list	*sort_list(t_list *lst, int (*cmp)(int, int));

static t_list	g_nodes[64];

static int	ascending(int a, int b)
{
	return (a <= b);
}

static int	descending(int a, int b)
{
	return (a >= b);
}

static void	run(int n, int *values, int (*cmp)(int, int))
{
	t_list	*list;
	int		k;

	k = 0;
	while (k < n)
	{
		g_nodes[k].data = values[k];
		g_nodes[k].next = (k + 1 < n) ? &g_nodes[k + 1] : NULL;
		k++;
	}
	list = sort_list(&g_nodes[0], cmp);
	k = 0;
	while (list != NULL && k < 64)
	{
		printf("[%d] -> ", list->data);
		list = list->next;
		k++;
	}
	printf("NULL\n");
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			run(3, (int []){3, 1, 2}, ascending);
			break ;
		case 1: /* t02 */
			run(3, (int []){3, 1, 2}, descending);
			break ;
		case 2: /* t03 */
			run(4, (int []){4, 1, 4, 1}, ascending);
			break ;
		case 3: /* t04 */
			run(5, (int []){1, 2, 3, 4, 5}, ascending);
			break ;
		case 4: /* t05 */
			run(5, (int []){5, 4, 3, 2, 1}, ascending);
			break ;
		case 5: /* t06 */
			run(6, (int []){-3, 5, -10, 0, 2, -1}, ascending);
			break ;
		case 6: /* t07 */
			run(5, (int []){1, 5, -2, 5, 0}, descending);
			break ;
		case 7: /* t08 */
			run(12, (int []){31, 4, 15, 9, 26, 5, 35, 8, 97, 93, 23, 84},
				ascending);
			break ;
		default:
			return (1);
	}
	return (0);
}

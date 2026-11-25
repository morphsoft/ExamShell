/*
** main de teste do ExamShell para ft_list_remove_if.
** Monta a lista do caso de número argv[1] (cada elemento é alocado com malloc,
** com data apontando para uma string), chama a sua função com uma cópia da
** string de referência e a função de comparação cmp_str, imprime os elementos
** que sobraram e libera só esses (os removidos são responsabilidade sua).
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ft_list.h"

void	ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)());

/* Devolve 0 quando as duas strings são iguais, como o enunciado pede. */
static int	cmp_str(void *a, void *b)
{
	return (strcmp((char *)a, (char *)b));
}

static t_list	*make_list(int n, char **data)
{
	t_list	*begin;
	t_list	*node;
	int		k;

	begin = NULL;
	k = n;
	while (k > 0)
	{
		k--;
		node = malloc(sizeof(t_list));
		node->data = data[k];
		node->next = begin;
		begin = node;
	}
	return (begin);
}

static void	run(int n, char **data, char *ref_text)
{
	t_list	*list;
	t_list	*next;
	char	ref[16];

	strcpy(ref, ref_text);
	list = make_list(n, data);
	ft_list_remove_if(&list, ref, cmp_str);
	while (list)
	{
		printf("[%s] -> ", (char *)list->data);
		next = list->next;
		free(list);
		list = next;
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
			run(3, (char *[]){"a", "b", "c"}, "b");
			break ;
		case 1: /* t02 */
			run(3, (char *[]){"a", "b", "c"}, "a");
			break ;
		case 2: /* t03 */
			run(3, (char *[]){"a", "a", "a"}, "a");
			break ;
		case 3: /* t04 */
			run(3, (char *[]){"a", "b", "c"}, "c");
			break ;
		case 4: /* t05 */
			run(3, (char *[]){"a", "b", "c"}, "x");
			break ;
		case 5: /* t06 */
			run(4, (char *[]){"a", "b", "b", "c"}, "b");
			break ;
		case 6: /* t07 */
			run(6, (char *[]){"a", "a", "b", "a", "c", "a"}, "a");
			break ;
		case 7: /* t08 */
			run(4, (char *[]){"b", "a", "a", "a"}, "a");
			break ;
		default:
			return (1);
	}
	return (0);
}

/*
** main de teste do ExamShell para ft_list_foreach.
** Monta a lista do caso de número argv[1] (elementos num vetor estático,
** ligados em sequência), chama a sua função com uma função f de teste e imprime
** o que f produziu ou os valores que ela alterou.
*/
#include <stdio.h>
#include <stdlib.h>
#include "ft_list.h"

void	ft_list_foreach(t_list *begin_list, void (*f)(void *));

static t_list	g_nodes[1000];
static int		g_ints[1000];

/* Liga g_nodes[0..n-1]; o data do k-ésimo é data[k]. */
static t_list	*make_list(int n, void **data)
{
	int	k;

	k = 0;
	while (k < n)
	{
		g_nodes[k].data = data[k];
		g_nodes[k].next = (k + 1 < n) ? &g_nodes[k + 1] : NULL;
		k++;
	}
	return (&g_nodes[0]);
}

/* f de teste: escreve a string recebida e uma quebra de linha. */
static void	print_str(void *data)
{
	if (data == NULL)
		printf("(null)\n");
	else
		printf("%s\n", (char *)data);
}

/* f de teste: soma 1 ao int para o qual data aponta. */
static void	add_one(void *data)
{
	*(int *)data += 1;
}

/* Liga uma lista cujo data aponta para g_ints[0..n-1], aplica add_one e mostra. */
static void	run_ints(int n, int *values)
{
	void	*data[10];
	int		k;

	k = 0;
	while (k < n)
	{
		g_ints[k] = values[k];
		data[k] = &g_ints[k];
		k++;
	}
	ft_list_foreach(make_list(n, data), add_one);
	k = 0;
	while (k < n)
	{
		printf(k ? " %d" : "%d", g_ints[k]);
		k++;
	}
	printf("\n");
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			ft_list_foreach(make_list(3, (void *[]){"a", "b", "c"}), print_str);
			break ;
		case 1: /* t02 */
			ft_list_foreach(make_list(1, (void *[]){"a"}), print_str);
			break ;
		case 2: /* t03 */
			run_ints(3, (int []){1, 2, 3});
			break ;
		case 3: /* t04 */
			ft_list_foreach(make_list(5, (void *[]){"first", "second", "third",
				"fourth", "fifth"}), print_str);
			break ;
		case 4: /* t05 */
			ft_list_foreach(make_list(3, (void *[]){"a", NULL, "c"}), print_str);
			break ;
		case 5: /* t06 */
			run_ints(2, (int []){10, 20});
			break ;
		default:
			return (1);
	}
	return (0);
}

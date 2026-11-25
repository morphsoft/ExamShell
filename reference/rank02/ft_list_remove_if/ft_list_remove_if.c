/* EXAMSHELL-REFERENCE: nunca publicar */
#include <stdlib.h>
#include "ft_list.h"

void	ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)())
{
	t_list	*node;

	while (*begin_list)
	{
		node = *begin_list;
		if ((*cmp)(node->data, data_ref) == 0)
		{
			*begin_list = node->next;
			free(node);
		}
		else
			begin_list = &node->next;
	}
}

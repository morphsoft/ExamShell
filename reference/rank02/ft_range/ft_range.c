/* EXAMSHELL-REFERENCE: nunca publicar */
#include <stdlib.h>

int	*ft_range(int start, int end)
{
	int	n;
	int	i;
	int	*tab;

	if (start <= end)
		n = end - start + 1;
	else
		n = start - end + 1;
	tab = malloc(n * sizeof(int));
	if (!tab)
		return (NULL);
	i = 0;
	while (i < n)
	{
		if (start <= end)
			tab[i] = start + i;
		else
			tab[i] = start - i;
		i++;
	}
	return (tab);
}

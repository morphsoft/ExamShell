/* EXAMSHELL-REFERENCE: nunca publicar */
#include "t_point.h"

static void	fill(char **tab, t_point size, t_point at, char zone)
{
	if (at.x < 0 || at.y < 0 || at.x >= size.x || at.y >= size.y)
		return ;
	if (tab[at.y][at.x] != zone)
		return ;
	tab[at.y][at.x] = 'F';
	fill(tab, size, (t_point){at.x + 1, at.y}, zone);
	fill(tab, size, (t_point){at.x - 1, at.y}, zone);
	fill(tab, size, (t_point){at.x, at.y + 1}, zone);
	fill(tab, size, (t_point){at.x, at.y - 1}, zone);
}

void	flood_fill(char **tab, t_point size, t_point begin)
{
	char	zone;

	zone = tab[begin.y][begin.x];
	if (zone != 'F')
		fill(tab, size, begin, zone);
}

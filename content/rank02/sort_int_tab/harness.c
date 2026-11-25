/*
** main de teste do ExamShell para sort_int_tab.
** Copia os valores do caso de número argv[1] para um vetor, chama a sua função
** com os primeiros 'size' valores e imprime o vetor inteiro, separado por
** espaços.
*/
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>

void	sort_int_tab(int *tab, unsigned int size);

/* 'total' valores no vetor; só os primeiros 'size' são entregues à função. */
static void	run(int *values, unsigned int total, unsigned int size)
{
	int				tab[64];
	unsigned int	k;

	k = 0;
	while (k < total)
	{
		tab[k] = values[k];
		k++;
	}
	sort_int_tab(tab, size);
	k = 0;
	while (k < total)
	{
		printf(k ? " %d" : "%d", tab[k]);
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
			run((int []){3, 1, 2}, 3, 3);
			break ;
		case 1: /* t02 */
			run((int []){4, 1, 4, 1}, 4, 4);
			break ;
		case 2: /* t03 */
			run((int []){7}, 1, 1);
			break ;
		case 3: /* t04 */
			run((int []){9, 8, 7, 6, 5, 4, 3, 2, 1}, 9, 9);
			break ;
		case 4: /* t05 */
			run((int []){-3, 5, -10, 0, 2, -1}, 6, 6);
			break ;
		case 5: /* t06 */
			run((int []){INT_MAX, INT_MIN, 0, -1, 1}, 5, 5);
			break ;
		case 6: /* t07 */
			run((int []){9, 8, 7, 6, 5, 4}, 6, 4);
			break ;
		case 7: /* t08 */
			run((int []){31, 4, 15, 9, 26, 5, 35, 8, 97, 93, 23, 84, 62, 64, 33,
				83, 27, 95, 2, 88}, 20, 20);
			break ;
		default:
			return (1);
	}
	return (0);
}

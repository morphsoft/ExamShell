/*
** main de teste do ExamShell para ft_range.
** Chama a sua função com o caso de número argv[1], imprime os valores do vetor devolvido
** (abs(end - start) + 1 inteiros) e libera a memória.
*/
#include <stdio.h>
#include <stdlib.h>

int	*ft_range(int start, int end);

static void	show(int start, int end)
{
	int	*tab;
	int	n;
	int	i;

	tab = ft_range(start, end);
	if (tab == NULL)
	{
		printf("(null)\n");
		return ;
	}
	n = abs(end - start) + 1;
	i = 0;
	while (i < n)
	{
		if (i > 0)
			printf(" ");
		printf("%d", tab[i]);
		i++;
	}
	printf("\n");
	free(tab);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			show(1, 3);
			break ;
		case 1: /* t02 */
			show(-1, 2);
			break ;
		case 2: /* t03 */
			show(0, 0);
			break ;
		case 3: /* t04 */
			show(0, -3);
			break ;
		case 4: /* t05 */
			show(5, 5);
			break ;
		case 5: /* t06 */
			show(-3, -1);
			break ;
		case 6: /* t07 */
			show(10, 20);
			break ;
		case 7: /* t08 */
			show(3, -2);
			break ;
		case 8: /* t09 */
			show(-2, -5);
			break ;
		case 9: /* t10 */
			show(0, 1000);
			break ;
		default:
			return (1);
	}
	return (0);
}

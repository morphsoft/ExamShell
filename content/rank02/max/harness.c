/*
** main de teste do ExamShell para max.
** Chama a sua função com o caso de número argv[1] (o array vem de dados
** estáticos) e imprime o valor devolvido.
*/
#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

int	max(int *tab, unsigned int len);


int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			{
				int tab[] = {3, 7, 2};
				printf("%d\n", max(tab, 3));
			}
			break ;
		case 1: /* t02 */
			{
				int tab[] = {-5, -2, -9};
				printf("%d\n", max(tab, 3));
			}
			break ;
		case 2: /* t03 */
			{
				int tab[] = {-7};
				printf("%d\n", max(tab, 0));
			}
			break ;
		case 3: /* t04 */
			{
				int tab[] = {5};
				printf("%d\n", max(tab, 1));
			}
			break ;
		case 4: /* t05 */
			{
				int tab[] = {1, 2, 3, 4, 5};
				printf("%d\n", max(tab, 5));
			}
			break ;
		case 5: /* t06 */
			{
				int tab[] = {9, 1, 2};
				printf("%d\n", max(tab, 3));
			}
			break ;
		case 6: /* t07 */
			{
				int tab[] = {INT_MIN};
				printf("%d\n", max(tab, 1));
			}
			break ;
		case 7: /* t08 */
			{
				int tab[] = {INT_MAX, 0, INT_MIN};
				printf("%d\n", max(tab, 3));
			}
			break ;
		case 8: /* t09 */
			{
				int tab[] = {4, 4, 4};
				printf("%d\n", max(tab, 3));
			}
			break ;
		case 9: /* t10 */
			{
				int tab[] = {5, 9, 100};
				printf("%d\n", max(tab, 2));
			}
			break ;
		case 10: /* t11 */
			{
				int tab[] = {INT_MIN, -3, INT_MIN};
				printf("%d\n", max(tab, 3));
			}
			break ;
		default:
			return (1);
	}
	return (0);
}

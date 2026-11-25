/*
** main de teste do ExamShell para flood_fill.
** Monta a grade do caso de número argv[1] a partir de textos fixos (copiados
** para linhas alocadas, que a sua função pode alterar), imprime a grade, uma
** linha em branco, chama a sua função e imprime a grade de novo.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "t_point.h"

void	flood_fill(char **tab, t_point size, t_point begin);

static void	print_area(char **area, t_point size)
{
	int	row;

	row = 0;
	while (row < size.y)
	{
		printf("%s\n", area[row]);
		row++;
	}
}

static void	run(char **zone, t_point size, t_point begin)
{
	char	**area;
	int		row;

	area = malloc(sizeof(char *) * size.y);
	row = 0;
	while (row < size.y)
	{
		area[row] = malloc(size.x + 1);
		memcpy(area[row], zone[row], size.x + 1);
		row++;
	}
	print_area(area, size);
	printf("\n");
	flood_fill(area, size, begin);
	print_area(area, size);
	row = 0;
	while (row < size.y)
		free(area[row++]);
	free(area);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (1);
	switch (atoi(argv[1]))
	{
		case 0: /* t01 */
			run((char *[]){"11111111", "10001001", "10010001", "10110001",
				"11100001"}, (t_point){8, 5}, (t_point){7, 4});
			break ;
		case 1: /* t02 */
			run((char *[]){"AAAAB", "ACCBB", "ACDDB", "ACCDB", "AAAAB"},
				(t_point){5, 5}, (t_point){1, 3});
			break ;
		case 2: /* t03 */
			run((char *[]){"0111", "1011", "1101", "1110"},
				(t_point){4, 4}, (t_point){0, 0});
			break ;
		case 3: /* t04 */
			run((char *[]){"00000", "11110", "00000", "01111", "00000"},
				(t_point){5, 5}, (t_point){0, 0});
			break ;
		case 4: /* t05 */
			run((char *[]){"00000", "11110", "00000", "01111", "00000"},
				(t_point){5, 5}, (t_point){4, 4});
			break ;
		case 5: /* t06 */
			run((char *[]){"00100", "00100", "11111", "00100"},
				(t_point){5, 4}, (t_point){0, 0});
			break ;
		case 6: /* t07 */
			run((char *[]){"11111111", "10001001", "10010001", "10110001",
				"11100001"}, (t_point){8, 5}, (t_point){0, 0});
			break ;
		default:
			return (1);
	}
	return (0);
}

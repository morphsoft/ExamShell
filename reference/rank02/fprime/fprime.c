/* EXAMSHELL-REFERENCE: nunca publicar */
#include <stdio.h>
#include <stdlib.h>

int	main(int argc, char **argv)
{
	int	nbr;
	int	factor;
	int	first;

	if (argc != 2)
	{
		printf("\n");
		return (0);
	}
	nbr = atoi(argv[1]);
	if (nbr == 1)
		printf("1");
	factor = 2;
	first = 1;
	while (nbr > 1)
	{
		if (nbr % factor == 0)
		{
			if (!first)
				printf("*");
			printf("%d", factor);
			first = 0;
			nbr /= factor;
		}
		else
			factor++;
	}
	printf("\n");
	return (0);
}

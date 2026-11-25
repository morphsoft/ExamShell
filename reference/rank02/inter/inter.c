/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

/*
** seen[c]: 0 = c não está na 2ª string, 1 = está e ainda não saiu, 2 = já saiu.
*/
int	main(int argc, char **argv)
{
	int	seen[256];
	int	i;

	if (argc == 3)
	{
		i = 0;
		while (i < 256)
			seen[i++] = 0;
		i = 0;
		while (argv[2][i])
			seen[(unsigned char)argv[2][i++]] = 1;
		i = 0;
		while (argv[1][i])
		{
			if (seen[(unsigned char)argv[1][i]] == 1)
			{
				write(1, &argv[1][i], 1);
				seen[(unsigned char)argv[1][i]] = 2;
			}
			i++;
		}
	}
	write(1, "\n", 1);
	return (0);
}

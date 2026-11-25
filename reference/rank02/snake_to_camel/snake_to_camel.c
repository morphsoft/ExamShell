/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

int	main(int argc, char **argv)
{
	int		i;
	char	c;

	if (argc == 2)
	{
		i = 0;
		while (argv[1][i])
		{
			if (argv[1][i] == '_' && argv[1][i + 1])
			{
				i++;
				c = argv[1][i] - 'a' + 'A';
			}
			else
				c = argv[1][i];
			if (argv[1][i] != '_')
				write(1, &c, 1);
			i++;
		}
	}
	write(1, "\n", 1);
	return (0);
}

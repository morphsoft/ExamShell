/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

int	main(int argc, char **argv)
{
	int		i;
	int		times;
	char	c;

	if (argc == 2)
	{
		i = 0;
		while (argv[1][i])
		{
			c = argv[1][i];
			times = 1;
			if (c >= 'a' && c <= 'z')
				times = c - 'a' + 1;
			else if (c >= 'A' && c <= 'Z')
				times = c - 'A' + 1;
			while (times--)
				write(1, &c, 1);
			i++;
		}
	}
	write(1, "\n", 1);
	return (0);
}

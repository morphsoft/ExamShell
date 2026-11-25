/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

static int	is_sep(char c)
{
	return (c == ' ' || c == '\t');
}

int	main(int argc, char **argv)
{
	int	i;

	if (argc == 2)
	{
		i = 0;
		while (is_sep(argv[1][i]))
			i++;
		while (argv[1][i] && !is_sep(argv[1][i]))
		{
			write(1, &argv[1][i], 1);
			i++;
		}
	}
	write(1, "\n", 1);
	return (0);
}

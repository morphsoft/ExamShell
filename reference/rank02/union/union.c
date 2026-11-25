/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

static int	appears_before(char *s, int n, char c)
{
	int	i;

	i = 0;
	while (i < n)
	{
		if (s[i] == c)
			return (1);
		i++;
	}
	return (0);
}

static int	len(char *s)
{
	int	n;

	n = 0;
	while (s[n])
		n++;
	return (n);
}

int	main(int argc, char **argv)
{
	int	i;

	if (argc == 3)
	{
		i = 0;
		while (argv[1][i])
		{
			if (!appears_before(argv[1], i, argv[1][i]))
				write(1, &argv[1][i], 1);
			i++;
		}
		i = 0;
		while (argv[2][i])
		{
			if (!appears_before(argv[2], i, argv[2][i])
				&& !appears_before(argv[1], len(argv[1]), argv[2][i]))
				write(1, &argv[2][i], 1);
			i++;
		}
	}
	write(1, "\n", 1);
	return (0);
}

/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

static int	is_sep(char c)
{
	return (c == ' ' || c == '\t');
}

int	main(int argc, char **argv)
{
	int	end;
	int	start;

	if (argc == 2)
	{
		end = 0;
		while (argv[1][end])
			end++;
		while (end > 0 && is_sep(argv[1][end - 1]))
			end--;
		start = end;
		while (start > 0 && !is_sep(argv[1][start - 1]))
			start--;
		if (end > start)
			write(1, argv[1] + start, end - start);
	}
	write(1, "\n", 1);
	return (0);
}

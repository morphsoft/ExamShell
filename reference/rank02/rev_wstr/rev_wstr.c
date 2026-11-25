/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

static int	is_sep(char c)
{
	return (c == ' ' || c == '\t');
}

int	main(int argc, char **argv)
{
	char	*str;
	int		end;
	int		start;
	int		printed;

	if (argc == 2)
	{
		str = argv[1];
		end = 0;
		while (str[end])
			end++;
		printed = 0;
		while (end > 0)
		{
			while (end > 0 && is_sep(str[end - 1]))
				end--;
			start = end;
			while (start > 0 && !is_sep(str[start - 1]))
				start--;
			if (start < end)
			{
				if (printed)
					write(1, " ", 1);
				write(1, str + start, end - start);
				printed = 1;
			}
			end = start;
		}
	}
	write(1, "\n", 1);
	return (0);
}

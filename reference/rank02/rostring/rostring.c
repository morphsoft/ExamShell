/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

static int	is_sep(char c)
{
	return (c == ' ' || c == '\t');
}

static int	word_len(char *str)
{
	int	len;

	len = 0;
	while (str[len] && !is_sep(str[len]))
		len++;
	return (len);
}

int	main(int argc, char **argv)
{
	char	*str;
	char	*first;
	int		len;
	int		first_len;

	if (argc >= 2)
	{
		str = argv[1];
		while (*str && is_sep(*str))
			str++;
		first = str;
		first_len = word_len(first);
		str += first_len;
		while (*str)
		{
			while (*str && is_sep(*str))
				str++;
			len = word_len(str);
			write(1, str, len);
			if (len > 0)
				write(1, " ", 1);
			str += len;
		}
		write(1, first, first_len);
	}
	write(1, "\n", 1);
	return (0);
}

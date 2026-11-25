/* EXAMSHELL-REFERENCE: nunca publicar */
#include <unistd.h>

static void	put_hex(unsigned long n)
{
	if (n >= 16)
		put_hex(n / 16);
	write(1, &"0123456789abcdef"[n % 16], 1);
}

int	main(int argc, char **argv)
{
	unsigned long	n;
	int				i;

	if (argc == 2)
	{
		n = 0;
		i = 0;
		while (argv[1][i] >= '0' && argv[1][i] <= '9')
		{
			n = n * 10 + (argv[1][i] - '0');
			i++;
		}
		put_hex(n);
	}
	write(1, "\n", 1);
	return (0);
}

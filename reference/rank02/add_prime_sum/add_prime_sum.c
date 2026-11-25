/* EXAMSHELL-REFERENCE: nunca publicar */
#include <stdlib.h>
#include <unistd.h>

static int	is_prime(int n)
{
	int	d;

	if (n < 2)
		return (0);
	d = 2;
	while (d * d <= n)
	{
		if (n % d == 0)
			return (0);
		d++;
	}
	return (1);
}

static void	put_nbr(long n)
{
	char	c;

	if (n >= 10)
		put_nbr(n / 10);
	c = '0' + n % 10;
	write(1, &c, 1);
}

static long	to_num(char *s)
{
	long	n;
	int		sign;

	n = 0;
	sign = 1;
	if (*s == '-')
	{
		sign = -1;
		s++;
	}
	while (*s >= '0' && *s <= '9')
	{
		n = n * 10 + (*s - '0');
		s++;
	}
	return (n * sign);
}

int	main(int argc, char **argv)
{
	long	limit;
	long	sum;
	int		i;

	if (argc != 2 || to_num(argv[1]) <= 0)
	{
		write(1, "0\n", 2);
		exit(0);
	}
	limit = to_num(argv[1]);
	sum = 0;
	i = 2;
	while (i <= limit)
	{
		if (is_prime(i))
			sum += i;
		i++;
	}
	put_nbr(sum);
	write(1, "\n", 1);
	return (0);
}

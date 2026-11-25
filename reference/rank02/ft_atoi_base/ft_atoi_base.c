/* EXAMSHELL-REFERENCE: nunca publicar */
static int	digit_value(char c)
{
	if (c >= '0' && c <= '9')
		return (c - '0');
	if (c >= 'a' && c <= 'f')
		return (c - 'a' + 10);
	if (c >= 'A' && c <= 'F')
		return (c - 'A' + 10);
	return (-1);
}

int	ft_atoi_base(const char *str, int str_base)
{
	int	i;
	int	sign;
	int	res;
	int	d;

	i = 0;
	sign = 1;
	res = 0;
	if (str[i] == '-')
	{
		sign = -1;
		i++;
	}
	d = digit_value(str[i]);
	while (d >= 0 && d < str_base)
	{
		res = res * str_base + d;
		i++;
		d = digit_value(str[i]);
	}
	return (res * sign);
}

/* EXAMSHELL-REFERENCE: nunca publicar */
#include <stdlib.h>

/*
** Usa long de propósito: é o padrão mais comum de cadete para o INT_MIN, e o
** site precisa aceitá-lo (o motor reescreve long para 64 bits, como no Linux).
*/
char	*ft_itoa(int nbr)
{
	long	n;
	long	rest;
	int		len;
	char	*str;

	n = nbr;
	len = (n <= 0);
	rest = n;
	while (rest)
	{
		len++;
		rest /= 10;
	}
	str = malloc(len + 1);
	if (!str)
		return (NULL);
	str[len] = '\0';
	if (n < 0)
	{
		str[0] = '-';
		n = -n;
	}
	if (n == 0)
		str[0] = '0';
	while (n)
	{
		str[--len] = '0' + n % 10;
		n /= 10;
	}
	return (str);
}

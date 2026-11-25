/* EXAMSHELL-REFERENCE: nunca publicar */

unsigned char	reverse_bits(unsigned char octet)
{
	unsigned char	res;
	int				i;

	res = 0;
	i = 0;
	while (i < 8)
	{
		res = (res << 1) | (octet & 1);
		octet = octet >> 1;
		i++;
	}
	return (res);
}

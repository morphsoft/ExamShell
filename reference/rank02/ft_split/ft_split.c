/* EXAMSHELL-REFERENCE: nunca publicar */
#include <stdlib.h>

static int	is_sep(char c)
{
	return (c == ' ' || c == '\t' || c == '\n');
}

static int	count_words(char *str)
{
	int	count;
	int	in_word;

	count = 0;
	in_word = 0;
	while (*str)
	{
		if (!is_sep(*str) && !in_word)
			count++;
		in_word = !is_sep(*str);
		str++;
	}
	return (count);
}

static char	*copy_word(char *str, int len)
{
	char	*word;
	int		i;

	word = malloc(len + 1);
	if (!word)
		return (NULL);
	i = 0;
	while (i < len)
	{
		word[i] = str[i];
		i++;
	}
	word[len] = '\0';
	return (word);
}

char	**ft_split(char *str)
{
	char	**words;
	int		n;
	int		len;

	words = malloc(sizeof(char *) * (count_words(str) + 1));
	if (!words)
		return (NULL);
	n = 0;
	while (*str)
	{
		if (is_sep(*str))
			str++;
		else
		{
			len = 0;
			while (str[len] && !is_sep(str[len]))
				len++;
			words[n++] = copy_word(str, len);
			str += len;
		}
	}
	words[n] = NULL;
	return (words);
}

import type { CatalogEntry, Level } from '../engine/types';

type Row = [level: Level, id: string, kind: 'P' | 'F', expectedFiles: string, allowed: string, prototype?: string];

/** Apêndice A do plano, linha por linha. `allowed` vazio = nenhuma função permitida. */
const ROWS: Row[] = [
  [1, 'first_word', 'P', 'first_word.c', 'write'],
  [1, 'fizzbuzz', 'P', 'fizzbuzz.c', 'write'],
  [1, 'ft_putstr', 'F', 'ft_putstr.c', 'write', 'void ft_putstr(char *str);'],
  [1, 'ft_strcpy', 'F', 'ft_strcpy.c', '', 'char *ft_strcpy(char *s1, char *s2);'],
  [1, 'ft_strlen', 'F', 'ft_strlen.c', '', 'int ft_strlen(char *str);'],
  [1, 'ft_swap', 'F', 'ft_swap.c', '', 'void ft_swap(int *a, int *b);'],
  [1, 'repeat_alpha', 'P', 'repeat_alpha.c', 'write'],
  [1, 'rev_print', 'P', 'rev_print.c', 'write'],
  [1, 'rot_13', 'P', 'rot_13.c', 'write'],
  [1, 'rotone', 'P', 'rotone.c', 'write'],
  [1, 'search_and_replace', 'P', 'search_and_replace.c', 'write, exit'],
  [1, 'ulstr', 'P', 'ulstr.c', 'write'],
  [2, 'alpha_mirror', 'P', 'alpha_mirror.c', 'write'],
  [2, 'camel_to_snake', 'P', 'camel_to_snake.c', 'malloc, realloc, write, free'],
  [2, 'do_op', 'P', 'do_op.c', 'atoi, printf, write'],
  [2, 'ft_atoi', 'F', 'ft_atoi.c', '', 'int ft_atoi(const char *str);'],
  [2, 'ft_strcmp', 'F', 'ft_strcmp.c', '', 'int ft_strcmp(char *s1, char *s2);'],
  [2, 'ft_strcspn', 'F', 'ft_strcspn.c', '', 'size_t ft_strcspn(const char *s, const char *reject);'],
  [2, 'ft_strdup', 'F', 'ft_strdup.c', 'malloc', 'char *ft_strdup(char *src);'],
  [2, 'ft_strpbrk', 'F', 'ft_strpbrk.c', '', 'char *ft_strpbrk(const char *s1, const char *s2);'],
  [2, 'ft_strrev', 'F', 'ft_strrev.c', '', 'char *ft_strrev(char *str);'],
  [2, 'ft_strspn', 'F', 'ft_strspn.c', '', 'size_t ft_strspn(const char *s, const char *accept);'],
  [2, 'inter', 'P', 'inter.c', 'write'],
  [2, 'is_power_of_2', 'F', 'is_power_of_2.c', '', 'int is_power_of_2(unsigned int n);'],
  [2, 'last_word', 'P', 'last_word.c', 'write'],
  [2, 'max', 'F', 'max.c', '', 'int max(int* tab, unsigned int len);'],
  [2, 'print_bits', 'F', 'print_bits.c', 'write', 'void print_bits(unsigned char octet);'],
  [2, 'reverse_bits', 'F', 'reverse_bits.c', '', 'unsigned char reverse_bits(unsigned char octet);'],
  [2, 'snake_to_camel', 'P', 'snake_to_camel.c', 'malloc, realloc, write, free'],
  [2, 'swap_bits', 'F', 'swap_bits.c', '', 'unsigned char swap_bits(unsigned char octet);'],
  [2, 'union', 'P', 'union.c', 'write'],
  [2, 'wdmatch', 'P', 'wdmatch.c', 'write'],
  [3, 'add_prime_sum', 'P', 'add_prime_sum.c', 'write, exit'],
  [3, 'epur_str', 'P', 'epur_str.c', 'write'],
  [3, 'expand_str', 'P', 'expand_str.c', 'write'],
  [3, 'ft_atoi_base', 'F', 'ft_atoi_base.c', '', 'int ft_atoi_base(const char *str, int str_base);'],
  [3, 'ft_list_size', 'F', 'ft_list_size.c, ft_list.h', '', 'int ft_list_size(t_list *begin_list);'],
  [3, 'ft_range', 'F', 'ft_range.c', 'malloc', 'int *ft_range(int start, int end);'],
  [3, 'ft_rrange', 'F', 'ft_rrange.c', 'malloc', 'int *ft_rrange(int start, int end);'],
  [3, 'hidenp', 'P', 'hidenp.c', 'write'],
  [3, 'lcm', 'F', 'lcm.c', '', 'unsigned int lcm(unsigned int a, unsigned int b);'],
  [3, 'paramsum', 'P', 'paramsum.c', 'write'],
  [3, 'pgcd', 'P', 'pgcd.c', 'printf, atoi, malloc, free'],
  [3, 'print_hex', 'P', 'print_hex.c', 'write'],
  [3, 'rstr_capitalizer', 'P', 'rstr_capitalizer.c', 'write'],
  [3, 'str_capitalizer', 'P', 'str_capitalizer.c', 'write'],
  [3, 'tab_mult', 'P', 'tab_mult.c', 'write'],
  [4, 'flood_fill', 'F', 'flood_fill.c, t_point.h', '', 'void flood_fill(char **tab, t_point size, t_point begin);'],
  [4, 'fprime', 'P', 'fprime.c', 'printf, atoi'],
  [4, 'ft_itoa', 'F', 'ft_itoa.c', 'malloc', 'char *ft_itoa(int nbr);'],
  [4, 'ft_list_foreach', 'F', 'ft_list_foreach.c, ft_list.h', '', 'void ft_list_foreach(t_list *begin_list, void (*f)(void *));'],
  [4, 'ft_list_remove_if', 'F', 'ft_list_remove_if.c, ft_list.h', 'free', 'void ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)());'],
  [4, 'ft_split', 'F', 'ft_split.c', 'malloc', 'char **ft_split(char *str);'],
  [4, 'rev_wstr', 'P', 'rev_wstr.c', 'write, malloc, free'],
  [4, 'rostring', 'P', 'rostring.c', 'write, malloc, free'],
  [4, 'sort_int_tab', 'F', 'sort_int_tab.c', '', 'void sort_int_tab(int *tab, unsigned int size);'],
  [4, 'sort_list', 'F', 'sort_list.c, list.h', '', 't_list *sort_list(t_list* lst, int (*cmp)(int, int));'],
];

const list = (s: string) => (s === '' ? [] : s.split(', '));

export const RANK02_CATALOG: CatalogEntry[] = ROWS.map(([level, id, kind, files, allowed, prototype]) => {
  const entry: CatalogEntry = {
    id,
    level,
    kind: kind === 'P' ? 'program' : 'function',
    expectedFiles: list(files),
    allowedFunctions: list(allowed),
  };
  if (prototype !== undefined) entry.prototype = prototype;
  return entry;
});

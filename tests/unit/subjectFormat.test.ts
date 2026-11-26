import { describe, expect, it } from 'vitest';
import firstWordEn from '../../content/rank02/first_word/subject.en.txt?raw';
import listSizeEn from '../../content/rank02/ft_list_size/subject.en.txt?raw';
import { formatSubject } from '../../src/ui/subjectFormat';

describe('formatSubject', () => {
  it('junta as linhas de um parágrafo', () => {
    const b = formatSubject(firstWordEn);
    expect(b[0]).toEqual({
      kind: 'prose',
      text: 'Write a program that takes a string and displays its first word, followed by a newline.',
    });
  });

  it('Examples: vira título; $> vira cmd; a continuação com \\ se junta ao comando', () => {
    const blocks = formatSubject(firstWordEn);
    expect(blocks).toContainEqual({ kind: 'heading', text: 'Examples' });
    const term = blocks.find((x) => x.kind === 'terminal')!;
    if (term.kind !== 'terminal') throw new Error('sem terminal');
    expect(term.lines[0]).toEqual({ kind: 'cmd', text: './first_word "FOR PONY" | cat -e' });
    expect(term.lines[1]).toEqual({ kind: 'out', text: 'FOR$' });
    expect(term.lines).toContainEqual({
      kind: 'cmd',
      text: './first_word "this        ...    is sparta, then again, maybe    not" | cat -e',
    });
    expect(term.lines[term.lines.length - 1]).toEqual({ kind: 'cmd', text: '' });
  });

  it('protótipo, struct e linhas de chamada ficam como código, sem juntar', () => {
    const b = formatSubject(listSizeEn);
    expect(b).toContainEqual({ kind: 'code', text: 'int\tft_list_size(t_list *begin_list);' });
    expect(b.some((x) => x.kind === 'code' && x.text.includes('ft_list_size(NULL) returns 0'))).toBe(true);
  });

  it('descarta o cabeçalho antes da régua', () => {
    const joined = JSON.stringify(formatSubject(firstWordEn));
    expect(joined).not.toContain('Assignment name');
    expect(joined).not.toContain('Expected files');
  });
});

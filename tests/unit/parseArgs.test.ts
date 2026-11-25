import { describe, expect, it } from 'vitest';
import { formatArgs, parseArgs, ParseArgsError } from '../../src/engine/parseArgs';

describe('parseArgs', () => {
  it('separa por espaços', () => {
    expect(parseArgs('a b')).toEqual(['a', 'b']);
    expect(parseArgs('  a \t b  ')).toEqual(['a', 'b']);
  });
  it('aspas duplas guardam os espaços', () => {
    expect(parseArgs('"  lorem,ipsum  "')).toEqual(['  lorem,ipsum  ']);
  });
  it('string vazia entre aspas é um argumento', () => {
    expect(parseArgs('"" x')).toEqual(['', 'x']);
    expect(parseArgs("''")).toEqual(['']);
  });
  it('aspas simples são literais', () => {
    expect(parseArgs(`'a "b"'`)).toEqual(['a "b"']);
    expect(parseArgs("'a\\tb'")).toEqual(['a\\tb']);
  });
  it('barra invertida fora de aspas escapa o próximo caractere', () => {
    expect(parseArgs('a\\ b')).toEqual(['a b']);
  });
  it('dentro de aspas duplas, a barra só escapa " \\ $ e `', () => {
    expect(parseArgs('"a\\"b"')).toEqual(['a"b']);
    expect(parseArgs('"a\\tb"')).toEqual(['a\\tb']);
  });
  it("$'...' entende sequências do C", () => {
    expect(parseArgs("$'\\t'")).toEqual(['\t']);
    expect(parseArgs("$'a\\nb\\\\c\\'d'")).toEqual(["a\nb\\c'd"]);
    expect(parseArgs("$'\\x41'")).toEqual(['A']);
  });
  it('pedaços colados viram um argumento só', () => {
    expect(parseArgs(`ab"c d"'e'`)).toEqual(['abc de']);
  });
  it('linha vazia não tem argumentos', () => {
    expect(parseArgs('')).toEqual([]);
    expect(parseArgs('   ')).toEqual([]);
  });
  it('aspas sem fechar lançam ParseArgsError', () => {
    expect(() => parseArgs('"abc')).toThrow(ParseArgsError);
    expect(() => parseArgs('"abc')).toThrow('aspas sem fechar');
    expect(() => parseArgs("'abc")).toThrow(ParseArgsError);
    expect(() => parseArgs("$'abc")).toThrow(ParseArgsError);
  });
});

describe('formatArgs', () => {
  it('põe cada argumento entre aspas', () => {
    expect(formatArgs(['   lorem,ipsum   '])).toBe('"   lorem,ipsum   "');
    expect(formatArgs(['a', 'b'])).toBe('"a" "b"');
    expect(formatArgs([''])).toBe('""');
    expect(formatArgs([])).toBe('');
  });
  it("caracteres invisíveis usam $'...'", () => {
    expect(formatArgs(['\t \tlorem'])).toBe("$'\\t \\tlorem'");
  });
  it('parseArgs desfaz formatArgs', () => {
    const cases = [['FOR PONY'], ['a"b', 'c\\d', '$x', '`y`'], ['\t \tlorem'], ["it's\n"], [''], ['\x01\x7f']];
    for (const args of cases) expect(parseArgs(formatArgs(args))).toEqual(args);
  });
});

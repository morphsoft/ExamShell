import { describe, expect, it } from 'vitest';
import { rewriteLong, restoreLongInDiagnostics } from '../../src/engine/rewriteLong';

describe('rewriteLong', () => {
  it('reescreve long simples e unsigned long', () => {
    expect(rewriteLong('long n;')).toBe('_L64 n;');
    expect(rewriteLong('unsigned long x;')).toBe('unsigned _L64 x;');
  });
  it('preserva long long e long double', () => {
    expect(rewriteLong('long long y;')).toBe('long long y;');
    expect(rewriteLong('long double z;')).toBe('long double z;');
  });
  it('ignora comentários, strings e identificadores maiores', () => {
    expect(rewriteLong('// long\n/* long */ "long" int longest;')).toBe('// long\n/* long */ "long" int longest;');
    expect(rewriteLong("char c = 'x'; long q;")).toBe("char c = 'x'; _L64 q;");
  });
  it('mantém quebras de linha', () => {
    expect(rewriteLong('long\nint a;')).toBe('_L64\nint a;');
  });
  it('mantém número de linhas e comprimento por linha', () => {
    const src = 'int f(long a)\n{\n\tlong b = a;\n\treturn ((int)b);\n}\n';
    expect(rewriteLong(src).split('\n').map((l) => l.length)).toEqual(src.split('\n').map((l) => l.length));
  });
});

describe('restoreLongInDiagnostics', () => {
  const diag =
    "main.c:3:7: error: unused variable 'n' [-Werror,-Wunused-variable]\n" +
    "    3 |       _L64 n;\n      |            ^\n" +
    "./__examshell.h:1:14: note: expanded from macro '_L64'\n" +
    "    1 | #define _L64 long long\n      |              ^\n" +
    "main.c:4:9: error: incompatible integer to pointer conversion initializing 'char *' with an expression of type 'long long'\n";

  it('restaura long e remove notas do prelúdio', () => {
    const out = restoreLongInDiagnostics(diag, false);
    expect(out).toContain('long n;');
    expect(out).not.toContain('_L64');
    expect(out).not.toContain('__examshell.h');
    expect(out).toContain("of type 'long'");
  });
  it('mantém long long quando o aluno o escreveu', () => {
    expect(restoreLongInDiagnostics(diag, true)).toContain("of type 'long long'");
  });
});

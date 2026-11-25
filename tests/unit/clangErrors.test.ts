import { describe, expect, it } from 'vitest';
import { classifyLinkError, explainClangError } from '../../src/engine/clangErrors';

describe('clangErrors', () => {
  it('explainClangError', () => {
    expect(explainClangError("main.c:2:22: error: unused variable 'x' [-Werror,-Wunused-variable]")[0]).toContain('x');
    expect(
      explainClangError(
        "main.c:5:3: error: call to undeclared function 'ft_putchar'; ISO C99 and later do not support implicit function declarations [-Wimplicit-function-declaration]",
      )[0],
    ).toContain('ft_putchar');
    expect(explainClangError('main.c:1:1: error: something nobody maps')).toEqual([]);
  });
  it('explainClangError covers other patterns', () => {
    const cases: [string, string][] = [
      ["error: unused parameter 'argc' [-Werror,-Wunused-parameter]", 'argc'],
      ["error: variable 'y' set but not used [-Werror,-Wunused-but-set-variable]", 'y'],
      ["error: use of undeclared identifier 'foo'", 'foo'],
      ["error: non-void function does not return a value [-Werror,-Wreturn-type]", 'return'],
      ["error: expected ';' after expression", ';'],
      ['warning: missing terminating " character', '"'],
      ["error: incompatible pointer types passing 'int *' to parameter of type 'char *'", 'int *'],
      ['error: comparison of integers of different signs', 'sinal'],
      ["error: variable 'z' is uninitialized when used here", 'z'],
      ["error: format specifies type 'int' but the argument has type 'char *'", 'int'],
    ];
    for (const [msg, frag] of cases) {
      const r = explainClangError(msg);
      expect(r.length, msg).toBe(1);
      expect(r[0], msg).toContain(frag);
    }
  });
  it('classifyLinkError', () => {
    expect(classifyLinkError('wasm-ld: error: duplicate symbol: main\n>>> defined in a.o')).toEqual({ reason: 'duplicate-main' });
    expect(classifyLinkError('wasm-ld: error: a.o: undefined symbol: ft_strlen')).toEqual({
      reason: 'missing-symbol',
      symbol: 'ft_strlen',
    });
    expect(classifyLinkError('wasm-ld: error: whatever')).toEqual({ reason: 'other' });
  });
});

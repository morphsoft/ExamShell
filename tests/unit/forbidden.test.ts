import { describe, expect, it } from 'vitest';
import { definesMain, findForbidden, parseNmDefined, parseNmUndefined } from '../../src/engine/forbidden';

describe('forbidden', () => {
  it('parseNmUndefined', () => {
    expect(parseNmUndefined('         U __stack_pointer\n         U printf\n         U write\n')).toEqual([
      '__stack_pointer',
      'printf',
      'write',
    ]);
  });
  it('findForbidden', () => {
    expect(findForbidden(['__stack_pointer', 'printf', 'write'], ['write'], [''])).toEqual(['printf']);
    expect(findForbidden(['memset', 'write'], ['write'], ['char b[200] = {0};'])).toEqual([]);
    expect(findForbidden(['memset', 'write'], ['write'], ['memset(b, 0, 10);'])).toEqual(['memset']);
    expect(findForbidden(['puts', 'printf', 'puts'], [], [''])).toEqual(['printf', 'puts']);
  });
  it('parseNmDefined', () => {
    expect(parseNmDefined('00000001 T ft_strlen\n00000010 T __main_argc_argv\n         \n00000020 D data\n')).toEqual([
      'ft_strlen',
      '__main_argc_argv',
      'data',
    ]);
  });
  it('definesMain', () => {
    expect(definesMain(['ft_strlen'])).toBe(false);
    expect(definesMain(['__main_argc_argv'])).toBe(true);
    expect(definesMain(['__original_main'])).toBe(true);
    expect(definesMain(['main'])).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { findForbidden, parseNmUndefined } from '../../src/engine/forbidden';

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
});

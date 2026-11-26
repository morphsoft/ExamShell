import { describe, expect, it } from 'vitest';
import { keyboardInset } from '../../src/ui/useKeyboardInset';

describe('keyboardInset', () => {
  it('teclado fechado: 0; aberto: a diferença; nunca negativo', () => {
    expect(keyboardInset(800, 800, 0)).toBe(0);
    expect(keyboardInset(800, 460, 0)).toBe(340);
    expect(keyboardInset(800, 460, 40)).toBe(300);
    expect(keyboardInset(800, 900, 0)).toBe(0);
  });
  it('arredonda', () => {
    expect(keyboardInset(800, 460.4, 0)).toBe(340);
  });
});

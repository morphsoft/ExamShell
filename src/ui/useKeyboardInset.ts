import { useEffect } from 'react';

/** Quanto o teclado na tela cobre da janela (px): 0 com o teclado fechado, nunca negativo. */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
}

/** Grava `--kb-inset` (px) no <html>: o rodapé do celular sobe junto com o teclado. */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;
    const update = () => root.style.setProperty('--kb-inset', `${keyboardInset(window.innerHeight, vv.height, vv.offsetTop)}px`);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--kb-inset');
    };
  }, []);
}

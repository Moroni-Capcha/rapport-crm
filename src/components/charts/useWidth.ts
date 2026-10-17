import { useEffect, useRef, useState } from 'react';

/** Mide el ancho del contenedor para dibujar el SVG a escala real (sin deformar texto) */
export function useWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Máximo "redondo" para el eje Y (1, 2, 2.5, 5 × 10^n) */
export function niceMax(value: number, ticks = 4) {
  if (value <= 0) return 1;
  const raw = value / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw)!;
  return step * ticks;
}

import { useState, useLayoutEffect, useRef } from "react";

/**
 * Filas por página según el alto de la ventana (mismo criterio que Comercial).
 * Se usa el máximo entre el cálculo de viewport y el recuadro medido,
 * para no quedarse corto y dejar blanco entre la última fila y el paginador.
 */
export function useResponsivePageSize(defaultSize = 18, rowHeight = 36) {
  const containerRef = useRef(null);
  const [pageSize, setPageSize] = useState(defaultSize);

  useLayoutEffect(() => {
    const calculate = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      if (vw < 768) {
        setPageSize(6);
        return;
      }

      // Cabecera + título + tabs + búsqueda + paddings (Maestro no tiene KPIs)
      const chromeHeight = vh < 850 ? 235 : 258;
      const fromWindow = Math.floor((vh - chromeHeight) / rowHeight);

      const el = containerRef.current;
      let fromBox = 0;
      if (el && el.clientHeight > 160) {
        fromBox = Math.floor((el.clientHeight - 76) / rowHeight);
      }

      const rows = Math.max(fromWindow, fromBox, 10);
      setPageSize(Math.min(rows, 45));
    };

    calculate();
    window.addEventListener("resize", calculate);

    const el = containerRef.current;
    let ro;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(calculate);
      ro.observe(el);
    }

    return () => {
      window.removeEventListener("resize", calculate);
      ro?.disconnect();
    };
  }, [rowHeight]);

  return [pageSize, containerRef];
}

export default useResponsivePageSize;

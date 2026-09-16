import { useCallback } from "react";

/**
 * Encuentra el elemento vecino horizontalmente más cercano en la misma fila/banda visual.
 */
function findHorizontalNeighbor(currentEl, candidates, direction) {
  const currentRect = currentEl.getBoundingClientRect();
  const currentCenterY = currentRect.top + currentRect.height / 2;

  // Filtrar elementos que se ubiquen en la misma fila visual (solapamiento vertical o centros cercanos)
  const rowElements = candidates.filter((el) => {
    if (el === currentEl) return false;
    const rect = el.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const yOverlap =
      Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top);
    return yOverlap > 8 || Math.abs(centerY - currentCenterY) < 32;
  });

  if (direction === "right") {
    // Elementos a la derecha del actual
    const rightElements = rowElements.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left >= currentRect.left + 5;
    });
    if (rightElements.length === 0) return null;
    // El más cercano hacia la derecha (menor rect.left)
    rightElements.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    return rightElements[0];
  } else if (direction === "left") {
    // Elementos a la izquierda del actual
    const leftElements = rowElements.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.right <= currentRect.right - 5;
    });
    if (leftElements.length === 0) return null;
    // El más cercano hacia la izquierda (mayor rect.right)
    leftElements.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
    return leftElements[0];
  }

  return null;
}

/**
 * Hook para permitir desplazamiento bidimensional (↑, ↓, ←, →) entre campos de formulario.
 * 
 * Características:
 * - Flechas Arriba (↑) y Abajo (↓): desplazamiento secuencial continuo entre campos.
 * - Flechas Izquierda (←) y Derecha (→): desplazamiento entre campos adyacentes de una misma fila.
 * - En inputs de texto y número, selecciona automáticamente el contenido para edición rápida.
 * - En inputs de texto con contenido, no interrumpe el movimiento de cursor interno salvo cuando se llega al inicio/fin o todo está seleccionado.
 * - No interrumpe textareas multi-línea (permite mover el cursor de texto nativo).
 * - No interfiere con autocompletados o menús desplegables abiertos (si stopPropagation o defaultPrevented).
 * - No interfiere con teclas modificadoras (Alt+Down para abrir calendarios/selects, Ctrl, Shift).
 * - Omite elementos deshabilitados, ocultos o bloqueados (readonly).
 */
export function useFormArrowNavigation() {
  const handleFormKeyDown = useCallback((e) => {
    // Solo manejamos las 4 teclas de flecha
    if (
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight"
    ) {
      return;
    }

    // Si el evento ya fue prevenido (ej: menú de autocompletado navegando sugerencias), salir
    if (e.defaultPrevented) {
      return;
    }

    // No interferir con atajos del sistema con modificadores (Alt+Down, Ctrl, Shift, Meta)
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }

    const currentEl = e.target;
    if (!currentEl) return;

    // En textareas se preserva la navegación nativa vertical y horizontal
    if (currentEl.tagName === "TEXTAREA") {
      return;
    }

    // Encontrar el contenedor más cercano (formulario o diálogo modal)
    const form =
      currentEl.closest("form") ||
      currentEl.closest('[role="dialog"]') ||
      currentEl.closest(".modal-body") ||
      document.body;

    if (!form) return;

    // Selector de controles navegables de formulario
    const selector = [
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled]):not([readonly]):not([tabindex="-1"])',
      'select:not([disabled]):not([readonly]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([readonly]):not([tabindex="-1"])',
      'button[role="combobox"]:not([disabled]):not([tabindex="-1"])',
      'button[type="submit"]:not([disabled]):not([tabindex="-1"])',
    ].join(", ");

    const candidates = Array.from(form.querySelectorAll(selector));

    // Filtrar elementos visibles en el viewport/DOM
    const visibleElements = candidates.filter((el) => {
      if (el.disabled || el.type === "hidden") return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });

    const currentIndex = visibleElements.indexOf(currentEl);
    if (currentIndex === -1) return;

    // --- MANEJO DE FLECHAS IZQUIERDA Y DERECHA (ENTRE CAMPOS LATERALES) ---
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const isInputText =
        currentEl.tagName === "INPUT" &&
        (currentEl.type === "text" ||
          currentEl.type === "number" ||
          currentEl.type === "email" ||
          currentEl.type === "search" ||
          currentEl.type === "password");

      if (isInputText) {
        const val = currentEl.value || "";
        const sStart = currentEl.selectionStart;
        const sEnd = currentEl.selectionEnd;

        if (e.key === "ArrowRight") {
          const isAtEnd = sStart === undefined || sEnd === val.length;
          const isAllSelected = sStart === 0 && sEnd === val.length;
          if (!isAtEnd && !isAllSelected && val.length > 0) {
            return; // Permitir que el cursor se mueva dentro del texto
          }
        } else if (e.key === "ArrowLeft") {
          const isAtStart = sStart === undefined || (sStart === 0 && sEnd === 0);
          const isAllSelected = sStart === 0 && sEnd === val.length;
          if (!isAtStart && !isAllSelected && val.length > 0) {
            return; // Permitir que el cursor se mueva dentro del texto
          }
        }
      }

      const neighbor = findHorizontalNeighbor(
        currentEl,
        visibleElements,
        e.key === "ArrowRight" ? "right" : "left"
      );

      if (neighbor) {
        e.preventDefault();
        neighbor.focus();
        if (
          typeof neighbor.select === "function" &&
          neighbor.tagName === "INPUT" &&
          neighbor.type !== "date" &&
          neighbor.type !== "time"
        ) {
          neighbor.select();
        }
        return;
      }
    }

    // --- MANEJO DE FLECHAS ARRIBA Y ABAJO (SECUENCIAL CONTINUO) ---
    if (e.key === "ArrowDown") {
      if (currentIndex < visibleElements.length - 1) {
        e.preventDefault();
        const nextEl = visibleElements[currentIndex + 1];
        nextEl.focus();
        if (
          typeof nextEl.select === "function" &&
          nextEl.tagName === "INPUT" &&
          nextEl.type !== "date" &&
          nextEl.type !== "time"
        ) {
          nextEl.select();
        }
      }
    } else if (e.key === "ArrowUp") {
      if (currentIndex > 0) {
        e.preventDefault();
        const prevEl = visibleElements[currentIndex - 1];
        prevEl.focus();
        if (
          typeof prevEl.select === "function" &&
          prevEl.tagName === "INPUT" &&
          prevEl.type !== "date" &&
          prevEl.type !== "time"
        ) {
          prevEl.select();
        }
      }
    }
  }, []);

  return { handleFormKeyDown };
}

export default useFormArrowNavigation;

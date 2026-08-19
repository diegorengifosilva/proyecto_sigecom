// src/dashboard/cotizaciones/CondicionesModal.jsx
import { useState, useEffect, useMemo, useRef } from "react"; // Añadimos useRef
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShieldCheck, Info, FileText } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import NotasModal from "./NotasModal";

export default function CondicionesModal({
  open,
  onClose,
  condicionesIniciales,
  onAceptar,
  tipoVenta,
}) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  // 1. ESTADO PARA EL SUBMODAL
  const [notasOpen, setNotasOpen] = useState(false);

  // Referencia para acceder a la instancia de Quill
  const quillRef = useRef(null);

  useEffect(() => {
    if (open) setTexto(condicionesIniciales ?? "");
  }, [open, condicionesIniciales]);

  const handleGuardar = async () => {
    try {
      setSaving(true);
      if (onAceptar) await onAceptar(texto);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // 2. FUNCIÓN PARA INSERTAR LAS NOTAS SELECCIONADAS
  const handleInsertarNotas = (textos) => {
    const quill = quillRef.current.getEditor();
    // Obtenemos la selección o el final del texto
    const range = quill.getSelection() || { index: quill.getLength() };

    textos.forEach((t) => {
      const notaTexto = `${t}\n`;

      // Insertamos el texto como texto normal (sin negrita obligatoria, sin bullet)
      quill.insertText(range.index, notaTexto, {
        bold: false
      });

      // Actualizamos el índice para la siguiente nota
      range.index += notaTexto.length;
    });

    // Posicionamos el cursor al final
    quill.setSelection(range.index);
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }, { font: [] }],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        // MEJORA AQUÍ: Selectores desplegables para listas
        [
          { list: [{ 'list': 'ordered' }, { 'list': 'bullet' }] }, // Esto intenta agruparlos
          // Sin embargo, la forma estándar de dropdown en Quill para tipos de lista es esta:
          { list: 'ordered' },
          { list: 'bullet' },
          { indent: "-1" },
          { indent: "+1" }
        ],
        // Alineación (también muy de Word)
        [{ align: [] }],
        ["link", "notes", "clean"],
      ],
      handlers: {
        notes: function () {
          setNotasOpen(true);
        },
      },
    },
    keyboard: {
      bindings: {
        tab: {
          key: 9,
          handler: function (range, context) {
            if (context.format.list) {
              this.quill.format('indent', '+1');
            } else {
              return true;
            }
          }
        },
        shift_tab: {
          key: 9,
          shiftKey: true,
          handler: function (range, context) {
            if (context.format.list) {
              this.quill.format('indent', '-1');
            } else {
              return true;
            }
          }
        }
      }
    }
  }), []);

  // 3. Añadimos los tooltips para los nuevos botones en el useEffect
  // Dentro de tu Object.keys(labels).forEach...

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const notesButton = document.querySelector(".ql-notes");
      if (notesButton && !notesButton.innerHTML) {
        const iconString = renderToStaticMarkup(
          <FileText size={16} strokeWidth={2.5} style={{ margin: 'auto' }} />
        );
        notesButton.innerHTML = iconString;
      }

      // ... (Tus tooltips se mantienen igual)
      const labels = {
        'ql-bold': 'Negrita',
        'ql-italic': 'Cursiva',
        'ql-underline': 'Subrayado',
        'ql-strike': 'Tachado',
        'ql-blockquote': 'Cita',
        'ql-list': { value: 'ordered', label: 'Lista numerada' },
        'ql-bullet': { value: 'bullet', label: 'Viñetas' },
        'ql-link': 'Insertar enlace',
        'ql-notes': 'Agregar Notas Técnicas',
        'ql-clean': 'Borrar formato',
      };

      Object.keys(labels).forEach((className) => {
        const elements = document.getElementsByClassName(className);
        Array.from(elements).forEach((el) => {
          const item = labels[className];
          if (typeof item === 'string') el.setAttribute('title', item);
        });
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [open]);

  // Definimos el contenido según el tipo de venta
  const MENSAJES_PREDETERMINADOS = {
    'T': '<p><strong>ORDEN TOTAL</strong> </p>',
    'P': '<p><strong>ORDEN PARCIAL</strong> </p>',
  };

  useEffect(() => {
    if (open) {
      // Si ya hay datos en la DB, los ponemos. 
      // Si no hay nada (vacio o null), inyectamos el mensaje según el tipoVenta.
      if (condicionesIniciales && condicionesIniciales !== "<p><br></p>") {
        setTexto(condicionesIniciales);
      } else {
        const mensajeInicial = MENSAJES_PREDETERMINADOS[tipoVenta] || "";
        setTexto(mensajeInicial);
      }
    }
  }, [open, condicionesIniciales, tipoVenta]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="max-w-4xl h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

        {/* HEADER */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <SheetTitle>Condiciones Generales</SheetTitle>
            </div>
          </div>
        </div>

        {/* EDITOR CON REF */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          <style>{`
            .quill-sticky-container { display: flex; flex-direction: column; height: 100%; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
            .ql-toolbar.ql-snow { position: sticky; top: 0; z-index: 10; background: #f8fafc !important; border: none !important; border-bottom: 1px solid #e2e8f0 !important; padding: 8px !important; }
            
            /* Botón de Notas */
            .ql-notes { width: 34px !important; display: flex !important; align-items: center; justify-content: center; border-radius: 6px; margin-right: 4px; transition: all 0.2s; color: #475569; }
            .ql-notes:hover { background: #e0f2fe !important; color: #0369a1 !important; }
            
            /* Resaltado de botones activos en el Toolbar */
            .ql-snow.ql-toolbar button.ql-active {
              color: #0d9488 !important;
              background: #f0fdfa !important;
              border-radius: 4px;
            }

            .ql-container.ql-snow { border: none !important; flex: 1; overflow-y: auto !important; font-size: 13px; }
            
            /* Blockquote Estilo V&C */
            .ql-editor blockquote {
              border-left: 4px solid #14b8a6 !important;
              background-color: #f0fdfa !important;
              color: #0d9488 !important;
              padding: 12px 15px !important;
              margin: 10px 0 !important;
              border-radius: 0 8px 8px 0;
              font-style: normal !important;
            }

            /* --- MULTINIVEL ESTILO WORD (VERSIÓN DEFINITIVA) --- */

            /* 1. Limpiamos el formato de Quill que bloquea el estilo nativo */
            .ql-editor ul li::before, .ql-editor ol li::before {
              content: none !important; /* Eliminamos el punto manual de Quill */
            }

            /* 2. Forzamos a que las listas tengan padding y estilo visible */
            .ql-editor ul, .ql-editor ol {
              padding-left: 1.5em !important;
            }

            /* 3. Definimos los tipos de viñeta por nivel (Igual que la biblioteca de Word) */
            .ql-editor ul li { list-style-type: disc !important; }         /* Nivel 1: ● */
            .ql-editor ul li.ql-indent-1 { list-style-type: circle !important; } /* Nivel 2: ○ */
            .ql-editor ul li.ql-indent-2 { list-style-type: square !important; } /* Nivel 3: ■ */

            /* 4. Definimos los tipos de numeración por nivel (1, a, i) */
            .ql-editor ol li { list-style-type: decimal !important; }
            .ql-editor ol li.ql-indent-1 { list-style-type: lower-alpha !important; }
            .ql-editor ol li.ql-indent-2 { list-style-type: lower-roman !important; }

            /* 5. Ajuste de sangrías para que coincidan con los niveles de Word */
            .ql-editor li.ql-indent-1 { padding-left: 1.5em !important; margin-left: 1.5em !important; }
            .ql-editor li.ql-indent-2 { padding-left: 1.5em !important; margin-left: 3em !important; }
          `}</style>

          <div className="quill-sticky-container shadow-inner">
            <ReactQuill
              ref={quillRef} // <--- Asignamos la referencia
              value={texto}
              onChange={setTexto}
              theme="snow"
              modules={modules}
              className="flex-1 flex flex-col overflow-hidden"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 opacity-70">
            <Info size={14} className="text-slate-400" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Afecta la impresión del PDF</p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-[11px] font-black uppercase text-red-700 h-9 px-8 rounded-xl">Salir</Button>
            <Button variant="ghost" onClick={handleGuardar} disabled={saving} className="text-[11px] font-black uppercase text-sky-700 h-9 px-8 rounded-xl border border-transparent hover:border-sky-200 hover:bg-sky-50">
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>

        {/* 4. COMPONENTE NOTASMODAL INYECTADO */}
        <NotasModal
          open={notasOpen}
          onClose={() => setNotasOpen(false)}
          onAceptar={handleInsertarNotas}
        />
      </SheetContent>
    </Sheet>
  );
}
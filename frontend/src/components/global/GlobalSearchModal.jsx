import React, { useEffect, useRef, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GlobalSearchModal({ open, onClose }) {
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const actions = [
    {
      label: "Ir a Cotizaciones",
      description: "Listado principal",
      to: "/dashboard/cotizaciones",
    },
    {
      label: "Nueva Cotización",
      description: "Crear una nueva",
      to: "/dashboard/cotizaciones/nueva",
    },
    {
      label: "Seguimiento Cotizaciones",
      description: "Panel de seguimiento",
      to: "/dashboard/seguimiento-cotizaciones",
    },
    {
      label: "Aprobación Cotización",
      description: "Aprobar solicitudes",
      to: "/comercial",
    },
  ];

  const filtered = actions.filter((a) =>
    `${a.label} ${a.description}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeys = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) =>
          Math.min(s + 1, filtered.length - 1)
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }

      if (e.key === "Enter") {
        const item = filtered[selected];
        if (item?.to) {
          navigate(item.to);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () =>
      window.removeEventListener("keydown", handleKeys);
  }, [filtered, selected, navigate, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm flex items-start justify-center pt-[12vh]">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

        {/* HEADER */}
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-slate-50">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo, acción, pantalla..."
            className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-slate-400"
          />
          <span className="text-[10px] font-bold text-slate-400">
            ESC para cerrar
          </span>
        </div>

        {/* RESULTADOS */}
        <div className="max-h-[360px] overflow-y-auto divide-y">
          {filtered.length === 0 && (
            <div className="px-5 py-6 text-sm text-slate-400">
              No se encontraron resultados
            </div>
          )}

          {filtered.map((item, i) => (
            <div
              key={item.label}
              className={`px-5 py-3 cursor-pointer flex flex-col gap-0.5 transition
                ${i === selected
                  ? "bg-teal-50 ring-1 ring-teal-400/30"
                  : "hover:bg-slate-50"
                }
              `}
              onMouseEnter={() => setSelected(i)}
              onClick={() => {
                navigate(item.to);
                onClose();
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">
                  {item.label}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-[11px] text-slate-500">
                {item.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

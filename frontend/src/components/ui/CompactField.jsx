import React from "react";
import { cn } from "@/lib/utils";

const REQUIRED_LABELS = [
  "referencia del proyecto",
  "referencia",
  "probabilidad",
  "igv",
  "moneda",
  "tipo moneda",
  "t. cambio",
  "tipo cambio",
  "forma pago",
  "lugar entrega",
  "cliente",
  "cliente (para)",
  "representante",
  "recepción solicitud",
  "recepcion solicitud",
  "fecha límite",
  "fecha limite",
  "emisión cotización",
  "emision cotización",
  "área",
  "comercial",
  "técnico",
  "tecnico"
];

const EMPTY_PLACEHOLDERS = [
  "---",
  "sin referencia asignada",
  "sin nombre",
  "sin cargo",
  "sin representante",
  "seleccionar...",
  "buscar técnico...",
  "buscar comercial...",
  "sin técnico",
  "sin comercial",
  "",
  "0",
  "0 días",
  "0 semanas",
  "0 meses",
  "0 días (suministros)",
  "0 días (servicios)",
  "0 días (validez)"
];

export const CompactField = ({ label, value, children, color = "text-gray-900", className = "", required, isEmpty }) => {
  const labelClean = String(label || "").toLowerCase().trim();
  const isRequired = required || REQUIRED_LABELS.includes(labelClean);

  const detectIsEmpty = () => {
    if (isEmpty !== undefined) return isEmpty;
    if (value !== undefined) {
      const valStr = String(value || "").trim().toLowerCase();
      return !valStr || EMPTY_PLACEHOLDERS.includes(valStr);
    }
    if (children) {
      const extractText = (node) => {
        if (!node) return "";
        if (typeof node === "string" || typeof node === "number") return String(node);
        if (Array.isArray(node)) return node.map(extractText).join("");
        if (node.props) {
          if (node.props.value !== undefined && node.props.value !== null) {
            return String(node.props.value);
          }
          if (node.props.children) {
            return extractText(node.props.children);
          }
        }
        return "";
      };
      const text = extractText(children).trim().toLowerCase();
      return !text || EMPTY_PLACEHOLDERS.includes(text);
    }
    return true;
  };

  const isFieldEmpty = detectIsEmpty();
  const showWarning = isRequired && isFieldEmpty;

  return (
    <div className={cn(
      "p-2.5 rounded-xl flex flex-col justify-center min-h-[50px] transition-all duration-200 border",
      showWarning 
        ? "bg-amber-50/40 border-amber-200/80 shadow-sm" 
        : "bg-gray-50/70 border-gray-100/80",
      className
    )}>
      <span className={cn(
        "text-[9.5px] font-black uppercase tracking-wider mb-0.5 block",
        showWarning ? "text-amber-700" : "text-indigo-700"
      )}>
        {label}
        {isRequired && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
        {showWarning && (
          <span className="text-[7.5px] font-extrabold ml-1.5 text-amber-600 normal-case bg-amber-100/85 px-1 py-0.5 rounded">
            (Falta)
          </span>
        )}
      </span>

      <div className={cn("text-[11px] font-black uppercase truncate", showWarning ? "text-amber-800/80" : color)}>
        {children ? children : (value || '---')}
      </div>
    </div>
  );
};
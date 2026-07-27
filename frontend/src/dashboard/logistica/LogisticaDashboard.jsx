import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, ClipboardList } from "lucide-react";
import KardexView from "./components/KardexView";
import EntradaView from "./components/EntradaView";
import SalidaView from "./components/SalidaView";

const TABS = [
  { id: "entrada", label: "Entradas", path: "/logistica/entradas", icon: <ArrowDownCircle size={14} /> },
  { id: "salida",  label: "Salidas",  path: "/logistica/salidas",  icon: <ArrowUpCircle size={14} /> },
  { id: "kardex",  label: "Kardex",   path: "/logistica/kardex",   icon: <ClipboardList size={14} /> },
];

export default function LogisticaDashboard({ defaultTab = "entrada" }) {
  const navigate = useNavigate();
  const tabActiva = defaultTab;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Módulo de Logística</h1>
          <p className="text-sm text-gray-500 font-medium">Gestión de almacén e inventarios</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                tabActiva === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
        {tabActiva === "entrada" && <EntradaView />}
        {tabActiva === "salida"  && <SalidaView />}
        {tabActiva === "kardex"  && <div className="p-6"><KardexView /></div>}
      </div>
    </div>
  );
}

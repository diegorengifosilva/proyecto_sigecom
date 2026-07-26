import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  UserSquare, 
  Building2, 
  Contact2, 
  Wallet, 
  Plus, 
  Search,
  Database,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TablaAreas from "./Tabla/TablaAreas";
import TablaCargos from "./Tabla/TablaCargos";
import TablaClientes from "./Tabla/TablaClientes";
import TablaRepresentantes from "./Tabla/TablaRepresentantes";

export default function EstructuraComercial() {
  const [tabActiva, setTabActiva] = useState("areas");

  const TABS = [
    { id: "areas", label: "Áreas", icon: <Briefcase size={16} />, desc: "Departamentos internos" },
    { id: "cargos", label: "Cargos", icon: <UserSquare size={16} />, desc: "Roles del personal" },
    { id: "proveedores", label: "Empresas Clientes", icon: <Building2 size={16} />, desc: "Base de datos de empresas" },
    { id: "representantes", label: "Representantes", icon: <Contact2 size={16} />, desc: "Contactos directos" },
    { id: "centros", label: "Centros de Costo", icon: <Wallet size={16} />, desc: "Seguimiento financiero" },
  ];

  // Renderizado condicional del contenido
  const renderContent = () => {
    switch (tabActiva) {
      case "areas":
        return <TablaAreas />;
      case "cargos":
        return <TablaCargos />;
      case "proveedores":
        return <TablaClientes />;
      case "representantes":
        return <TablaRepresentantes />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              {TABS.find(t => t.id === tabActiva)?.icon}
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-700">Centros de Costo</p>
            <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Vista informativa de control financiero</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50/20 font-sans overflow-hidden"
    >
      {/* PANEL IZQUIERDO (TABS DE ESTRUCTURA) */}
      <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Database size={16} className="text-amber-500" />
              Estructura
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tablas de Negocio</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {TABS.map((tab) => {
            const isSelected = tabActiva === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`group flex items-center gap-3 p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-100/50"
                    : "bg-white hover:bg-slate-50 border-slate-150 text-slate-700"
                }`}
              >
                <span className={isSelected ? "text-cyan-400" : "text-slate-400"}>
                  {tab.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{tab.label}</span>
                  <span className={`block text-[9px] font-medium leading-none mt-0.5 ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                    {tab.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PANEL DERECHO (CONTENIDO DE TABLA SELECCIONADA) */}
      <div className="flex-1 p-6 flex flex-col min-w-0 overflow-hidden">
        {renderContent()}
      </div>
    </motion.div>
  );
}
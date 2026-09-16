import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Contact2, 
  Tag, 
  ShoppingBag, 
  Layers 
} from "lucide-react";
import TablaClientes from "./Tabla/TablaClientes";
import TablaRepresentantes from "./Tabla/TablaRepresentantes";
import TablaMarcas from "./Tabla/TablaMarcas";
import TablaProductos from "./Tabla/TablaProductos";

export default function EstructuraComercial() {
  const [tabActiva, setTabActiva] = useState("clientes");

  const TABS = [
    { id: "clientes", label: "Clientes", icon: <Building2 size={16} />, desc: "Empresas clientes registradas" },
    { id: "representantes", label: "Representantes", icon: <Contact2 size={16} />, desc: "Contactos de clientes" },
    { id: "marcas", label: "Marcas", icon: <Tag size={16} />, desc: "Fabricantes y marcas" },
    { id: "productos", label: "Productos", icon: <ShoppingBag size={16} />, desc: "Catálogo de suministros" },
  ];

  const renderContent = () => {
    switch (tabActiva) {
      case "clientes":
        return <TablaClientes buttonLabel="Nuevo Cliente" />;
      case "representantes":
        return <TablaRepresentantes />;
      case "marcas":
        return <TablaMarcas />;
      case "productos":
        return <TablaProductos />;
      default:
        return <TablaClientes buttonLabel="Nuevo Cliente" />;
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden gap-3 md:gap-4 animate-in fade-in duration-500">
      {/* HEADER DE TITULO DE MODULO */}
      <div className="flex flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight"> Maestro Comercial</h1>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium">
            Gestión de Clientes, Representantes, Marcas y Productos
          </p>
        </div>
      </div>

      {/* HEADER TABS HORIZONTALES */}
      <div className="flex items-center gap-6 border-b border-slate-200 bg-white px-6 pt-1 shrink-0 overflow-x-auto scrollbar-none rounded-xl shadow-xs">
        {TABS.map((tab) => {
          const isSelected = tabActiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? "border-cyan-600 text-cyan-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <span className={isSelected ? "text-cyan-600" : "text-slate-400"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DE TABLA SELECCIONADA */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
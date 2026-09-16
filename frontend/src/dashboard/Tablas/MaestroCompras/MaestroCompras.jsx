import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Contact2, 
  ShoppingCart,
  Users
} from "lucide-react";
import TablaClientes from "../EstructuraComercial/Tabla/TablaClientes";
import TablaRepresentantes from "../EstructuraComercial/Tabla/TablaRepresentantes";

export default function MaestroCompras() {
  const [tabActiva, setTabActiva] = useState("clientes");

  const TABS = [
    { id: "clientes", label: "Clientes", icon: <Users size={16} />, desc: "Empresas clientes asociadas" },
    { id: "representantes", label: "Representantes", icon: <Contact2 size={16} />, desc: "Contactos directos" },
    { id: "proveedores", label: "Proveedores", icon: <Building2 size={16} />, desc: "Base de datos de proveedores" },
  ];

  const renderContent = () => {
    switch (tabActiva) {
      case "clientes":
        return (
          <TablaClientes 
            title="Empresas Clientes" 
            buttonLabel="Nuevo Cliente" 
          />
        );
      case "representantes":
        return <TablaRepresentantes />;
      case "proveedores":
        return (
          <TablaClientes 
            title="Empresas Proveedoras" 
            buttonLabel="Nuevo Proveedor" 
          />
        );
      default:
        return <TablaClientes buttonLabel="Nuevo Cliente" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col flex-1 min-h-0 bg-slate-50/20 font-sans overflow-hidden p-6"
    >
      {/* HEADER DE TITULO DE MODULO */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 shrink-0">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-cyan-600" size={22} />
            MAESTRO COMPRAS
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Gestión de Clientes, Representantes y Proveedores
          </p>
        </div>
      </div>

      {/* HEADER TABS HORIZONTALES */}
      <div className="flex items-center gap-6 border-b border-slate-200 bg-white px-6 pt-1 mb-4 rounded-xl shadow-xs shrink-0 overflow-x-auto scrollbar-none">
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
    </motion.div>
  );
}

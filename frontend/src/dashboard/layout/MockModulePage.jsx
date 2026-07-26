import React from 'react';
import { LayoutDashboard, AlertCircle, Hammer } from 'lucide-react';

const MockModulePage = ({ title, icon: IconComponent = LayoutDashboard }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-white p-6 rounded-full shadow-xl border border-gray-100">
          <IconComponent className="h-16 w-16 text-indigo-600" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-amber-100 p-2 rounded-lg border border-amber-200 shadow-sm animate-bounce">
            <Hammer className="h-5 w-5 text-amber-600" />
        </div>
      </div>
      
      <div className="max-w-md">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">{title}</h1>
        <div className="h-1 w-20 bg-indigo-600 mx-auto mb-4 rounded-full"></div>
        <p className="text-gray-500 font-medium leading-relaxed">
          Este módulo está actualmente en fase de integración lógica. Pronto podrás gestionar toda la data operativa de <span className="text-indigo-600 font-bold">{title}</span> desde aquí con la misma eficiencia que en el resto del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-200/50 shadow-sm animate-pulse">
            <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
            <div className="h-8 w-3/4 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 text-indigo-500 font-bold text-xs uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
        <AlertCircle className="h-4 w-4" />
        <span>Próximamente: Integración nuevo Módulo</span>
      </div>
    </div>
  );
};

export default MockModulePage;

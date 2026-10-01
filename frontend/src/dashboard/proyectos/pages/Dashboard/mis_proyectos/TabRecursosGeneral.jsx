import React, { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  Network,
  Search,
  ExternalLink,
  Shield,
  Briefcase,
  Clock,
  ChevronRight
} from "lucide-react";

const fmtMoney = (n, currency = "USD") => {
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
};

const num = (v) => Number(v || 0);

export default function TabRecursosGeneral({
  proyectos = [],
  organigrama = [],
  usuarios = [],
  onOpenOrg,
  onOpenUsers,
  onSelectProject,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Métricas de recursos
  const { totalPptoHH, totalRealHH, lideresList } = useMemo(() => {
    let pptoHH = 0;
    let realHH = 0;
    const lideresMap = new Map();

    proyectos.forEach((p) => {
      pptoHH += num(p.presupuesto_hh);
      realHH += num(p.costo_hh_real);

      const liderNombre = p.lider || p.lider_proyecto || p.responsable || "Sin Asignar";
      if (!lideresMap.has(liderNombre)) {
        lideresMap.set(liderNombre, { nombre: liderNombre, count: 0, proyectos: [] });
      }
      const entry = lideresMap.get(liderNombre);
      entry.count += 1;
      entry.proyectos.push(p.codigo);
    });

    return {
      totalPptoHH: pptoHH,
      totalRealHH: realHH,
      lideresList: Array.from(lideresMap.values()),
    };
  }, [proyectos]);

  // Filtrado
  const filtrados = useMemo(() => {
    return proyectos.filter((p) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (p.codigo && p.codigo.toLowerCase().includes(term)) ||
        (p.nombre && p.nombre.toLowerCase().includes(term)) ||
        (p.cliente && p.cliente.toLowerCase().includes(term)) ||
        (p.lider && p.lider.toLowerCase().includes(term)) ||
        (p.responsable && p.responsable.toLowerCase().includes(term))
      );
    });
  }, [proyectos, searchTerm]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Header con métricas y botones rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Equipo Asignado</span>
              <span className="text-xl font-black text-gray-900 leading-none">{usuarios.length || 14} Personas</span>
            </div>
          </div>
          {onOpenUsers && (
            <button
              onClick={onOpenUsers}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors uppercase tracking-wider"
            >
              Gestionar
            </button>
          )}
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Líderes Activos</span>
              <span className="text-xl font-black text-gray-900 leading-none">{lideresList.length} Líderes</span>
            </div>
          </div>
          {onOpenOrg && (
            <button
              onClick={onOpenOrg}
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50/70 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors uppercase tracking-wider"
            >
              Organigrama
            </button>
          )}
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Presupuesto HH</span>
            <span className="text-xl font-black text-gray-900 leading-none">{fmtMoney(totalPptoHH)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Costo HH Real</span>
            <span className="text-xl font-black text-gray-900 leading-none">{fmtMoney(totalRealHH)}</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar por líder, responsable o proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {onOpenOrg && (
            <button
              onClick={onOpenOrg}
              className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Organigrama de Roles</span>
            </button>
          )}
          {onOpenUsers && (
            <button
              onClick={onOpenUsers}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Gestión de Personal</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Tabla de Asignación por Proyecto */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Asignación de Personal y Líderes por Proyecto
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {filtrados.length} proyectos listados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">Código / Proyecto</th>
                <th className="py-3 px-3">Líder del Proyecto</th>
                <th className="py-3 px-3">Responsable</th>
                <th className="py-3 px-3 text-right">Presupuesto HH</th>
                <th className="py-3 px-3 text-right">Costo HH Real</th>
                <th className="py-3 px-3 text-center">Estado HH</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filtrados.map((p) => {
                const pptoHH = num(p.presupuesto_hh);
                const realHH = num(p.costo_hh_real);
                const saldoHH = pptoHH - realHH;
                const lider = p.lider || p.lider_proyecto || "No asignado";
                const responsable = p.responsable || "No asignado";
                const isOverHH = realHH > pptoHH && pptoHH > 0;

                return (
                  <tr key={p.id || p.codigo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-indigo-700 text-xs">{p.codigo}</div>
                      <div className="font-semibold text-gray-900 truncate max-w-[200px]" title={p.nombre}>
                        {p.nombre}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{p.cliente}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {lider.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 truncate max-w-[150px]">{lider}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-gray-600 truncate max-w-[150px] block">{responsable}</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">
                      {fmtMoney(pptoHH, p.moneda)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">
                      {fmtMoney(realHH, p.moneda)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isOverHH
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isOverHH ? "Sobregiro HH" : "En Presupuesto"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectProject && onSelectProject(p.id)}
                        className="px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold inline-flex items-center gap-1 transition-all"
                      >
                        <span>Ver Recursos</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No se encontraron proyectos asignados con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

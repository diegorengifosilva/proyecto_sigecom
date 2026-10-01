import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import {
  Network,
  Building2,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhEstructura() {
  const [positions, setPositions] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const res = await api.get("rrhh/configuration/");
      setPositions(res.data.positions || []);
      setAreas(res.data.areas || []);
    } catch (err) {
      console.error("Error al cargar estructura:", err);
      toast.error("No se pudo cargar la estructura organizacional.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructure();
  }, []);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) =>
      p.name ? p.name.toLowerCase().includes(search.toLowerCase()) : true
    );
  }, [positions, search]);

  const coveredMof = positions.filter((p) => p.activeMof).length;
  const coveragePercent = positions.length > 0 ? Math.round((coveredMof / positions.length) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Network className="w-4 h-4" />
            <span>Arquitectura Corporativa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Estructura Organizacional</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo de áreas, puestos de trabajo y cobertura del Manual de Organización y Funciones (MOF).
          </p>
        </div>

        <button
          onClick={() => toast.info("Generando Organigrama Oficial")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>Ver Organigrama PDF</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Áreas Orgánicas</span>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{areas.length}</div>
            <span className="text-xs text-gray-400">Unidades funcionales</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Cargos Registrados</span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">{positions.length}</div>
            <span className="text-xs text-blue-500">Perfiles de puesto</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Network className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">MOF Vinculado</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{coveredMof}</div>
            <span className="text-xs text-emerald-500">Puestos documentados</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Cobertura MOF</span>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">{coveragePercent}%</div>
            <span className="text-xs text-purple-500">Cumplimiento documental</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Buscador de Cargos */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cargo en la estructura..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">{filteredPositions.length} puestos</span>
      </div>

      {/* Grid de Cargos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPositions.map((pos) => (
          <div
            key={pos.id}
            className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-gray-400 font-medium">CARGO-{pos.id.slice(0, 6)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                    pos.activeMof
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {pos.activeMof ? "MOF Vigente" : "MOF Pendiente"}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{pos.name}</h3>
              {pos.activeMof ? (
                <p className="text-xs text-gray-500 mt-1">
                  Código: <strong>{pos.activeMof.code}</strong> · Versión {pos.activeMof.version}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">Sin manual de funciones vinculado aún.</p>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{pos.area?.name || "Área asignada"}</span>
              {pos.activeMof ? (
                <button
                  onClick={() => toast.success(`Abriendo MOF de ${pos.name}`)}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  Ver MOF
                </button>
              ) : (
                <button
                  onClick={() => toast.info(`Asignar MOF a ${pos.name}`)}
                  className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  + Vincular
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

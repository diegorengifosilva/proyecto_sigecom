import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  PackageCheck,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Flame,
  Archive
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasEquipos() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await api.get("emergencias/equipment/");
      setEquipment(res.data || []);
    } catch (err) {
      console.error("Error al cargar equipos:", err);
      toast.error("No se pudo cargar el inventario de equipos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const filtered = equipment.filter((e) =>
    search
      ? (e.code && e.code.toLowerCase().includes(search.toLowerCase())) ||
        (e.name && e.name.toLowerCase().includes(search.toLowerCase())) ||
        (e.location && e.location.toLowerCase().includes(search.toLowerCase()))
      : true
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>Recursos Operativos de Respuesta</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipos de Emergencia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Inventario de extintores, botiquines, camillas, estaciones lavaojos; control de tarjetas de inspección, fechas de recarga y pruebas hidrostáticas.
          </p>
        </div>

        <button
          onClick={() => toast.info("Registrar nuevo extintor o equipo")}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Equipo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, tipo de equipo o ubicación..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <span className="text-xs text-gray-500 font-semibold">{filtered.length} equipos registrados</span>
      </div>

      {/* Tabla de Equipos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código / Nombre</th>
              <th className="py-3 px-4">Tipo / Categoría</th>
              <th className="py-3 px-4">Ubicación / Sede</th>
              <th className="py-3 px-4">Vencimiento Recarga</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Tarjeta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    <div>{item.name || item.code}</div>
                    <span className="text-xs text-gray-400 font-mono">{item.code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-700">{item.type || "EXTINTOR"}</td>
                  <td className="py-3.5 px-4 text-xs">{item.location || "Sede Principal"}</td>
                  <td className="py-3.5 px-4 text-xs font-mono text-gray-600">
                    {item.chargeExpiresAt ? new Date(item.chargeExpiresAt).toLocaleDateString("es-PE") : "Vigente"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status || "OPERATIVO"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.info(`Inspeccionando equipo ${item.code}`)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      Inspeccionar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  {loading ? "Cargando inventario..." : "No hay equipos de emergencia registrados aún."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { evaluacionesService } from "../../../api";

const estados = [
  { value: "", label: "Todos" },
  { value: "borrador", label: "Borrador" },
  { value: "en_proceso", label: "En proceso" },
  { value: "completada", label: "Completada" },
  { value: "aprobada", label: "Aprobada" },
  { value: "rechazada", label: "Rechazada" },
];

const statusClasses = {
  borrador: "bg-gray-100 text-gray-700",
  en_proceso: "bg-yellow-100 text-yellow-800",
  completada: "bg-green-100 text-green-700",
  aprobada: "bg-blue-100 text-blue-700",
  rechazada: "bg-red-100 text-red-700",
};

export default function HistorialEvaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    cargar();
  }, [filtroEstado]);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await evaluacionesService.listarEvaluaciones(params);
      const data = response?.data;
      setEvaluaciones(Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []));
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (evaluacion) => {
    try {
      const response = await evaluacionesService.obtenerEvaluacion(evaluacion.id);
      setDetalle(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo obtener el detalle");
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historial de evaluaciones</h1>
          <p className="text-sm text-gray-600">
            Consulta evaluaciones pasadas y sus conclusiones. Asegura que las decisiones estrategicas queden registradas.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Estado:</label>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          {estados.map((estado) => (
            <option key={estado.value} value={estado.value}>
              {estado.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-4 text-center text-gray-500">Cargando evaluaciones...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Evaluacion</th>
                <th className="px-4 py-2 text-left">Escenario</th>
                <th className="px-4 py-2 text-left">Proyecto</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-center">Alternativas</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(evaluaciones) ? evaluaciones : []).map((eva) => (
                <tr key={eva.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{eva.nombre}</p>
                    <p className="text-xs text-gray-500">{new Date(eva.fecha_creacion).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3">{eva.escenario_nombre || "Escenario"}</td>
                  <td className="px-4 py-3">
                    {eva.proyecto_asociado ? `${eva.proyecto_asociado}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        statusClasses[eva.estado] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {eva.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{eva.numero_alternativas || eva.alternativas?.length || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-blue-600 font-semibold text-sm" onClick={() => verDetalle(eva)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {(!Array.isArray(evaluaciones) || evaluaciones.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No hay registros para el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <div className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{detalle.nombre}</h2>
              <p className="text-sm text-gray-500">Escenario: {detalle.escenario_nombre}</p>
            </div>
            <button className="text-sm text-gray-500" onClick={() => setDetalle(null)}>
              Cerrar
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{detalle.descripcion}</p>
          {detalle.resultados?.length ? (
            <div className="grid md:grid-cols-2 gap-3">
              {detalle.resultados.map((res) => (
                <div key={res.id} className="border rounded p-3 bg-slate-50 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">{res.alternativa_nombre}</span>
                    <span className="text-blue-600 font-semibold">{res.puntaje?.toFixed(3)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{res.comentario || "Sin comentario"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Esta evaluacion todavia no tiene resultados.</p>
          )}
          {detalle.conclusion_ia && (
            <div className="border rounded p-3 bg-blue-50">
              <p className="font-semibold text-gray-800 mb-2">Conclusion IA</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{detalle.conclusion_ia}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}





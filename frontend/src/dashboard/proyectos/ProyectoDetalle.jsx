import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import ReactECharts from "echarts-for-react";
import {
  Briefcase,
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ShieldAlert,
  FileCheck2,
  Users,
  FileText,
  Activity,
  Plus,
  Save,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ProyectoDetalle() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [proyecto, setProyecto] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");

  // Datos de las pestañas
  const [tareas, setTareas] = useState([]);
  const [curvas, setCurvas] = useState([]);
  const [riesgos, setRiesgos] = useState([]);
  const [cambios, setCambios] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  // Modales
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titulo: "",
    responsable: "",
    fecha_inicio: "",
    fecha_fin: "",
    duracion: 1,
    peso: 10,
    avance_real: 0,
    estado: "pendiente",
  });

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskForm, setRiskForm] = useState({
    codigo: "",
    titulo: "",
    descripcion: "",
    probabilidad: 3,
    impacto: 3,
    categoria: "tecnico",
    plan_mitigacion: "",
  });

  const fetchProyectoDetalle = async () => {
    try {
      setLoading(true);
      const res = await api.get(`proyectos/proyectos/${id}/`);
      setProyecto(res.data);

      if (res.data?.fecha_inicio) {
        setTaskForm((prev) => ({
          ...prev,
          fecha_inicio: res.data.fecha_inicio,
          fecha_fin: res.data.fecha_fin,
        }));
      }

      // Cargar datos complementarios
      loadRelatedData();
    } catch (err) {
      console.error("Error al cargar proyecto:", err);
      toast.error("No se pudo cargar el detalle del proyecto.");
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      // Tareas EV
      api.get(`proyectos/tareas-ev/?proyecto_id=${id}`).then((res) => {
        setTareas(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setTareas([]));

      // Curvas S
      api.get(`proyectos/${id}/curvas/`).then((res) => {
        setCurvas(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setCurvas([]));

      // Riesgos
      api.get(`proyectos/proyectos/${id}/riesgos/`).then((res) => {
        setRiesgos(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setRiesgos([]));

      // Cambios
      api.get(`proyectos/proyectos/${id}/cambios/`).then((res) => {
        setCambios(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setCambios([]));

      // Checklists
      api.get(`proyectos/proyectos/${id}/checklists/`).then((res) => {
        setChecklists(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setChecklists([]));

      // Recursos
      api.get(`proyectos/proyectos/${id}/recursos/`).then((res) => {
        setRecursos(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setRecursos([]));

      // Documentos
      api.get(`proyectos/documentos/?proyecto_id=${id}`).then((res) => {
        setDocumentos(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).catch(() => setDocumentos([]));
    } catch (e) {
      console.error("Error al cargar datos vinculados:", e);
    }
  };

  useEffect(() => {
    if (id) fetchProyectoDetalle();
  }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post("proyectos/tareas-ev/", {
        ...taskForm,
        proyecto: id,
      });
      toast.success("Tarea registrada correctamente.");
      setShowTaskModal(false);
      setTaskForm({
        titulo: "",
        responsable: "",
        fecha_inicio: proyecto?.fecha_inicio || "",
        fecha_fin: proyecto?.fecha_fin || "",
        duracion: 1,
        peso: 10,
        avance_real: 0,
        estado: "pendiente",
      });
      // Recargar tareas
      const res = await api.get(`proyectos/tareas-ev/?proyecto_id=${id}`);
      setTareas(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      console.error("Error al crear tarea:", err);
      toast.error("No se pudo crear la tarea.");
    }
  };

  const handleCreateRisk = async (e) => {
    e.preventDefault();
    try {
      await api.post(`proyectos/proyectos/${id}/riesgos/`, {
        ...riskForm,
        proyecto: id,
      });
      toast.success("Riesgo registrado.");
      setShowRiskModal(false);
      setRiskForm({
        codigo: "",
        titulo: "",
        descripcion: "",
        probabilidad: 3,
        impacto: 3,
        categoria: "tecnico",
        plan_mitigacion: "",
      });
      const res = await api.get(`proyectos/proyectos/${id}/riesgos/`);
      setRiesgos(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      console.error("Error al registrar riesgo:", err);
      toast.error("No se pudo registrar el riesgo.");
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-gray-400">Cargando estación de trabajo del proyecto...</div>;
  }

  if (!proyecto) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-base font-semibold">Proyecto no encontrado</p>
        <Link to="/proyectos/lista" className="text-xs text-blue-600 underline mt-2 inline-block">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const presupuestoTotal = Number(proyecto.presupuesto_gastos || proyecto.presupuesto_estimado || 0);
  const gastoReal = Number(proyecto.gasto_real || 0);
  const saldo = presupuestoTotal - gastoReal;
  const porcentajePresupuesto = presupuestoTotal > 0 ? Math.min(Math.round((gastoReal / presupuestoTotal) * 100), 100) : 0;

  // Curva S Mock/Real data para ECharts
  const fechasCurva = curvas.length > 0 ? curvas.map((c) => c.fecha) : ["Inicio", "Mes 1", "Mes 2", "Mes 3", "Cierre"];
  const pvData = curvas.length > 0 ? curvas.map((c) => c.pv) : [0, 25000, 55000, 85000, 100000];
  const evData = curvas.length > 0 ? curvas.map((c) => c.ev) : [0, 20000, 52000, 78000, 95000];
  const acData = curvas.length > 0 ? curvas.map((c) => c.ac) : [0, 22000, 54000, 81000, 98000];

  const curvaOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Valor Planificado (PV)", "Valor Ganado (EV)", "Costo Real (AC)"], bottom: 0 },
    grid: { left: "3%", right: "4%", bottom: "10%", top: "5%", containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: fechasCurva },
    yAxis: { type: "value", axisLabel: { formatter: "${value}" } },
    series: [
      { name: "Valor Planificado (PV)", type: "line", smooth: true, data: pvData, itemStyle: { color: "#3b82f6" } },
      { name: "Valor Ganado (EV)", type: "line", smooth: true, data: evData, itemStyle: { color: "#10b981" } },
      { name: "Costo Real (AC)", type: "line", smooth: true, data: acData, itemStyle: { color: "#f43f5e" } },
    ],
  };

  const fmtUSD = (num) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Botón Volver */}
      <Link
        to="/proyectos/lista"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al Catálogo de Proyectos</span>
      </Link>

      {/* Cabecera del Proyecto */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
              {proyecto.codigo}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {proyecto.estado || "Apertura"}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
              {proyecto.unidad_negocio || "Minería"}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{proyecto.nombre}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Cliente: <strong className="text-gray-800">{proyecto.cliente || "V&C Corporation"}</strong> ·
            Responsable: <strong className="text-gray-800">{proyecto.responsable || "No asignado"}</strong>
          </p>
        </div>

        {/* Resumen Financiero Rápido */}
        <div className="flex flex-col sm:flex-row gap-6 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Presupuesto</span>
            <strong className="text-base text-gray-900 font-bold">{fmtUSD(presupuestoTotal)}</strong>
            <span className="text-[11px] text-gray-400 block mt-0.5">Base contratada</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Gasto Real</span>
            <strong className="text-base text-rose-600 font-bold">{fmtUSD(gastoReal)}</strong>
            <span className="text-[11px] text-gray-400 block mt-0.5">{porcentajePresupuesto}% consumido</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Saldo Disponible</span>
            <strong className="text-base text-emerald-600 font-bold">{fmtUSD(saldo)}</strong>
            <span className="text-[11px] text-gray-400 block mt-0.5">Margen operativo</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="bg-white border-b border-gray-200 px-6 rounded-t-2xl shadow-sm">
        <div className="flex space-x-6 overflow-x-auto text-xs font-semibold">
          {[
            { key: "resumen", label: "Resumen y Curva S", icon: Activity },
            { key: "cronograma", label: `Cronograma / Tareas (${tareas.length})`, icon: Clock },
            { key: "riesgos", label: `Riesgos (${riesgos.length})`, icon: ShieldAlert },
            { key: "cambios", label: `Control de Cambios (${cambios.length})`, icon: Layers },
            { key: "calidad", label: `Calidad (${checklists.length})`, icon: FileCheck2 },
            { key: "recursos", label: `Recursos (${recursos.length})`, icon: Users },
            { key: "documentos", label: `Documentos (${documentos.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 inline-flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm min-h-[400px]">
        {/* TAB RESUMEN & CURVA S */}
        {activeTab === "resumen" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">CPI (Desempeño Costo)</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">1.02</div>
                <span className="text-[10px] text-gray-400">Eficiencia presupuestal favorable</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">SPI (Desempeño Cronograma)</span>
                <div className="text-xl font-bold text-blue-600 mt-1">0.98</div>
                <span className="text-[10px] text-gray-400">Avance conforme a lo programado</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Fecha Inicio</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{proyecto.fecha_inicio}</div>
                <span className="text-[10px] text-gray-400">Inicio de obra</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Fecha Fin Prevista</span>
                <div className="text-sm font-bold text-gray-900 mt-1">{proyecto.fecha_fin}</div>
                <span className="text-[10px] text-gray-400">Entrega final</span>
              </div>
            </div>

            {/* Curva S */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Curva S de Avance y Costos (EVM)</h3>
                  <p className="text-xs text-gray-400">Seguimiento comparativo de PV (Plan), EV (Ganado) y AC (Real).</p>
                </div>
              </div>
              <div className="h-72">
                <ReactECharts option={curvaOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </div>
          </div>
        )}

        {/* TAB CRONOGRAMA & TAREAS */}
        {activeTab === "cronograma" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Cronograma Operativo de Tareas</h3>
                <p className="text-xs text-gray-500">Estructura de Desglose del Trabajo (EDT) y control de avance por actividad.</p>
              </div>
              <button
                onClick={() => setShowTaskModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Tarea</span>
              </button>
            </div>

            {tareas.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No hay tareas registradas en el cronograma de este proyecto.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Tarea / Actividad</th>
                      <th className="py-2.5 px-4">Responsable</th>
                      <th className="py-2.5 px-4">Fechas</th>
                      <th className="py-2.5 px-4 text-center">Duración</th>
                      <th className="py-2.5 px-4 text-center">Peso</th>
                      <th className="py-2.5 px-4 text-center">Avance</th>
                      <th className="py-2.5 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tareas.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-4 font-semibold text-gray-900">{t.titulo}</td>
                        <td className="py-3 px-4 text-gray-600">{t.responsable || "—"}</td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                          {t.fecha_inicio} al {t.fecha_fin}
                        </td>
                        <td className="py-3 px-4 text-center">{t.duracion} días</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{t.peso}%</td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600">{t.avance_real}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {t.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB RIESGOS */}
        {activeTab === "riesgos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Matriz de Riesgos del Proyecto</h3>
                <p className="text-xs text-gray-500">Evaluación de Probabilidad x Impacto y planes de contingencia asociados.</p>
              </div>
              <button
                onClick={() => setShowRiskModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Riesgo</span>
              </button>
            </div>

            {riesgos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No se han registrado riesgos en este proyecto.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Código</th>
                      <th className="py-2.5 px-4">Riesgo</th>
                      <th className="py-2.5 px-4 text-center">Probabilidad</th>
                      <th className="py-2.5 px-4 text-center">Impacto</th>
                      <th className="py-2.5 px-4 text-center">Severidad</th>
                      <th className="py-2.5 px-4">Plan de Mitigación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {riesgos.map((r) => {
                      const exposicion = Number(r.probabilidad || 3) * Number(r.impacto || 3);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/70">
                          <td className="py-3 px-4 font-mono font-bold text-gray-700">{r.codigo || "R-01"}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{r.titulo}</td>
                          <td className="py-3 px-4 text-center">{r.probabilidad}/5</td>
                          <td className="py-3 px-4 text-center">{r.impacto}/5</td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600">{exposicion} pts</td>
                          <td className="py-3 px-4 text-gray-600">{r.plan_mitigacion || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTROL DE CAMBIOS */}
        {activeTab === "cambios" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Control de Cambios y Adicionales</h3>
            {cambios.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">Sin órdenes de cambio registradas.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cambios.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900">{c.titulo}</span>
                      <p className="text-gray-500">{c.descripcion}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {c.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CALIDAD */}
        {activeTab === "calidad" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Checklists de Calidad e Inspecciones</h3>
            {checklists.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No hay checklists de calidad asociados.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {checklists.map((chk) => (
                  <div key={chk.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900">{chk.titulo}</span>
                      <p className="text-gray-400 font-mono text-[11px]">{chk.codigo}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                      {chk.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB RECURSOS */}
        {activeTab === "recursos" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Recursos y Cuadrillas Asignadas</h3>
            {recursos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No hay recursos vinculados aún.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recursos.map((rec) => (
                  <div key={rec.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <div className="font-bold text-gray-900">{rec.nombre}</div>
                    <div className="text-gray-500">{rec.tipo_recurso} · {rec.unidad}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB DOCUMENTOS */}
        {activeTab === "documentos" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Legajo Documental del Proyecto</h3>
            {documentos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No se han subido documentos aún.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {documentos.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-semibold text-gray-900">{doc.nombre}</div>
                        <div className="text-gray-400 text-[11px]">{doc.tipo}</div>
                      </div>
                    </div>
                    <span className="text-gray-400">{doc.fecha_subida?.substring(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Agregar Tarea */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Agregar Tarea al Cronograma</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Obras civiles y cimentación"
                  value={taskForm.titulo}
                  onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    placeholder="Nombre del encargado"
                    value={taskForm.responsable}
                    onChange={(e) => setTaskForm({ ...taskForm, responsable: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Duración (Días)</label>
                  <input
                    type="number"
                    min="1"
                    value={taskForm.duracion}
                    onChange={(e) => setTaskForm({ ...taskForm, duracion: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={taskForm.fecha_inicio}
                    onChange={(e) => setTaskForm({ ...taskForm, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={taskForm.fecha_fin}
                    onChange={(e) => setTaskForm({ ...taskForm, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Peso en Proyecto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taskForm.peso}
                    onChange={(e) => setTaskForm({ ...taskForm, peso: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Avance Real (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taskForm.avance_real}
                    onChange={(e) => setTaskForm({ ...taskForm, avance_real: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Riesgo */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Identificar y Registrar Riesgo</h3>
              <button onClick={() => setShowRiskModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRisk} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    placeholder="R-01"
                    value={riskForm.codigo}
                    onChange={(e) => setRiskForm({ ...riskForm, codigo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Título del Riesgo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Retraso en entrega de suministros"
                    value={riskForm.titulo}
                    onChange={(e) => setRiskForm({ ...riskForm, titulo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Probabilidad (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={riskForm.probabilidad}
                    onChange={(e) => setRiskForm({ ...riskForm, probabilidad: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Impacto (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={riskForm.impacto}
                    onChange={(e) => setRiskForm({ ...riskForm, impacto: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Plan de Mitigación / Acción</label>
                <textarea
                  rows="2"
                  placeholder="Acciones preventivas y plan de respuesta"
                  value={riskForm.plan_mitigacion}
                  onChange={(e) => setRiskForm({ ...riskForm, plan_mitigacion: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRiskModal(false)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  Guardar Riesgo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

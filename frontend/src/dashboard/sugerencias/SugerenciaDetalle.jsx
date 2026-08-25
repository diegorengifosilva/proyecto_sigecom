import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  MessageSquare, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  EyeOff, 
  Calendar, 
  User, 
  FileText, 
  History, 
  Paperclip, 
  Upload, 
  X, 
  Check, 
  Loader2,
  Building,
  Home,
  Send,
  Printer
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/formatters";

const PRIORITIES = {
  1: { label: "BAJA", color: "bg-slate-50 text-slate-500 border-slate-200" },
  2: { label: "MEDIA", color: "bg-amber-50 text-amber-700 border-amber-200" },
  3: { label: "ALTA", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function SugerenciaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser: user } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = user?.modulos?.some(m => (typeof m === 'string' ? m : m.nombre || '').toUpperCase() === "SUGERENCIAS Y QUEJAS");

  // Fetch Sugerencia
  const { data: sugerencia, isLoading, error } = useQuery({
    queryKey: ["suggestion_detail", id],
    queryFn: async () => {
      const { data } = await api.get(`buzon/sugerencias/${id}/`);
      return data;
    }
  });

  // Fetch Trazabilidad
  const { data: trazabilidad = [], refetch: refetchTrazabilidad } = useQuery({
    queryKey: ["suggestion_trazabilidad", id],
    queryFn: async () => {
      const { data } = await api.get(`buzon/sugerencias/${id}/trazabilidad/`);
      return data;
    }
  });

  // Fetch Adjuntos
  const { data: adjuntos = [], refetch: refetchAdjuntos } = useQuery({
    queryKey: ["suggestion_adjuntos", id],
    queryFn: async () => {
      const { data } = await api.get(`buzon/sugerencias/${id}/adjuntos/`);
      return data;
    }
  });

  // Fetch Gerencias
  const { data: gerencias = [] } = useQuery({
    queryKey: ["gerencias_list"],
    queryFn: async () => {
      const { data } = await api.get("buzon/gerencias/");
      return data;
    }
  });

  // Handlers
  const handleUpdateStatus = async () => {
    let nextStatus = "PENDIENTE";
    if (sugerencia.estado === "PENDIENTE") nextStatus = "EN PROCESO";
    else if (sugerencia.estado === "EN PROCESO") nextStatus = "RESUELTO";

    try {
      await api.patch(`buzon/sugerencias/${id}/`, { estado: nextStatus });
      toast.success(`Estado actualizado a ${nextStatus}`);
      queryClient.invalidateQueries(["suggestion_detail", id]);
      refetchTrazabilidad();
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar el estado.");
    }
  };

  const handleUpdateGerencia = async (newGerenciaId) => {
    try {
      await api.patch(`buzon/sugerencias/${id}/`, { id_gerencia: newGerenciaId || null });
      toast.success("Gerencia destinataria actualizada.");
      queryClient.invalidateQueries(["suggestion_detail", id]);
      refetchTrazabilidad();
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar la gerencia.");
    }
  };



  const handleDelete = async () => {
    if (!window.confirm("¿Está seguro de eliminar esta sugerencia? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`buzon/sugerencias/${id}/`);
      toast.success("Sugerencia eliminada con éxito.");
      navigate("/sugerencias");
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar la sugerencia.");
    }
  };

  const handlePrintReport = () => {
    const token = localStorage.getItem("access_token");
    const cleanBaseURL = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL.slice(0, -1) : api.defaults.baseURL;
    const url = `${cleanBaseURL}/buzon/sugerencias/${id}/reporte/?token=${token}&_t=${Date.now()}`;
    window.open(url, "_blank");
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await api.post(`buzon/sugerencias/${id}/trazabilidad/`, { detalle: `Nota de seguimiento: ${newNote}` });
      toast.success("Nota de seguimiento agregada.");
      setNewNote("");
      refetchTrazabilidad();
    } catch (err) {
      console.error(err);
      toast.error("Error al agregar la nota.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("archivo", file);

    try {
      await api.post(`buzon/sugerencias/${id}/adjuntos/`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Archivo adjunto subido con éxito.");
      refetchAdjuntos();
      refetchTrazabilidad();
    } catch (err) {
      console.error(err);
      toast.error("Error al subir el archivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (adjuntoId) => {
    if (!window.confirm("¿Está seguro de eliminar este archivo adjunto?")) return;
    try {
      await api.delete(`buzon/adjuntos/${adjuntoId}/`);
      toast.success("Archivo adjunto eliminado.");
      refetchAdjuntos();
      refetchTrazabilidad();
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar el archivo.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Cargando Detalle...</span>
        </div>
      </div>
    );
  }

  if (error || !sugerencia) {
    return (
      <div className="p-8 text-center bg-gray-50/50 min-h-screen">
        <h3 className="text-lg font-black text-rose-600 uppercase">Error</h3>
        <p className="text-xs font-bold text-gray-500 mt-2">No se pudo cargar el detalle del registro o el registro no existe.</p>
        <button 
          onClick={() => navigate("/sugerencias")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-md"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-700 font-sans">
      
      {/* 70% MAIN PANEL */}
      <div className="w-full xl:w-8/12 flex flex-col space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible font-sans">
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              {/* Back Arrow Button */}
              <button
                onClick={() => navigate("/sugerencias")}
                className="mr-5 p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group shrink-0 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </button>

              <div className="space-y-1.5">
                <div className="flex items-center flex-wrap gap-2.5">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                    {sugerencia.asunto.toUpperCase()}
                  </h1>

                  {/* BADGE ESTADO */}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm ${
                    sugerencia.estado === "PENDIENTE" 
                      ? "bg-amber-50 text-amber-700 border-amber-250" 
                      : sugerencia.estado === "EN PROCESO"
                      ? "bg-blue-50 text-blue-700 border-blue-250"
                      : "bg-emerald-50 text-emerald-700 border-emerald-250"
                  }`}>
                    {sugerencia.estado}
                  </span>

                  {/* BADGE TIPO */}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm ${
                    sugerencia.tipo === "S" 
                      ? "bg-blue-50 text-blue-700 border-blue-250" 
                      : "bg-rose-50 text-rose-700 border-rose-250"
                  }`}>
                    {sugerencia.tipo === "S" ? "SUGERENCIA" : "QUEJA"}
                  </span>
                </div>

                {/* Pill metadata tags row */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50/40 border border-slate-200/60 rounded-full text-[9px] font-bold text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {sugerencia.anonimo === 1 ? (
                      <span className="flex items-center gap-1 text-purple-650 font-black">
                        <EyeOff className="w-3 h-3" /> ANÓNIMO
                      </span>
                    ) : (
                      <span className="uppercase">{sugerencia.usuario_nombre}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50/40 border border-slate-200/60 rounded-full text-[9px] font-bold text-slate-500">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span className="uppercase">{sugerencia.area_nombre || "SIN ÁREA"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50/40 border border-slate-200/60 rounded-full text-[9px] font-bold text-slate-500">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                    <span className="uppercase">PRIORIDAD: {PRIORITIES[sugerencia.prioridad]?.label || sugerencia.prioridad}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50/40 border border-slate-200/60 rounded-full text-[9px] font-bold text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sugerencia.fecha ? formatDate(sugerencia.fecha) : "SIN FECHA"}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-6 pb-3 pt-1 border-t border-slate-100">
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all duration-200 shadow-sm"
                title="Exportar hoja de queja o sugerencia en formato PDF/Físico"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exportar Reporte</span>
              </button>
            </div>
          </div>
        </div>

        {/* DETALLE DEL REGISTRO CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 font-sans p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-wider">
              Detalle del Registro
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter block">Asunto de la Solicitud</label>
              <div className="p-3.5 bg-gray-50/60 border border-gray-150 rounded-xl text-xs font-black text-gray-900 uppercase">
                {sugerencia.asunto}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter block">Descripción de Queja o Sugerencia</label>
              <div className="p-4 bg-gray-50/60 border border-gray-150 rounded-2xl min-h-[180px] font-medium text-slate-705 leading-relaxed text-xs whitespace-pre-wrap">
                {sugerencia.descripcion}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter block">Descripción de Solución o Medida Correctiva</label>
              <div className="p-4 bg-gray-50/60 border border-gray-150 rounded-2xl min-h-[120px] font-medium text-slate-705 leading-relaxed text-xs whitespace-pre-wrap">
                {sugerencia.solucion || "SIN SOLUCIÓN O MEDIDA CORRECTIVA REGISTRADA AÚN"}
              </div>
            </div>

            <div className="flex flex-col gap-1 max-w-md">
              <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter">
                Gerencia Destinataria
              </label>
              {isAdmin && sugerencia.estado === "PENDIENTE" ? (
                <select
                  value={sugerencia.id_gerencia || ""}
                  onChange={(e) => handleUpdateGerencia(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-black uppercase rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-650 bg-white text-indigo-650 shadow-sm"
                >
                  <option value="">GENERAL / TI</option>
                  {gerencias.map(g => (
                    <option key={g.id_gerencia} value={g.id_gerencia}>{g.nombre.toUpperCase()}</option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-gray-50/60 border border-gray-150 rounded-xl text-xs font-black text-indigo-650 uppercase">
                  {sugerencia.gerencia_nombre || "GENERAL / TI"}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 30% LATERAL PANEL */}
      <div className="w-full xl:w-4/12 space-y-6">
        
        {/* BOTONES */}
        <div className="flex justify-end items-center gap-2">
          {sugerencia.estado !== "RESUELTO" && isAdmin && (
            <button
              onClick={handleUpdateStatus}
              className="flex items-center px-4 py-2.5 bg-indigo-50/55 border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-755 transition-all shadow-sm h-[42px] uppercase group hover:bg-indigo-100/50 hover:border-indigo-300 hover:shadow-md"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-indigo-600 group-hover:scale-110 transition-transform" />
              {sugerencia.estado === "PENDIENTE" ? "Iniciar Atención" : "Resolver Caso"}
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2.5 bg-red-50/55 border border-red-200 rounded-xl text-[10px] font-black text-red-755 transition-all shadow-sm h-[42px] uppercase group hover:bg-red-100/55 hover:border-red-300 hover:shadow-md"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2 text-red-655 group-hover:scale-110 transition-transform" />
              Eliminar
            </button>
          )}
          
          {!isAdmin && sugerencia.estado === "PENDIENTE" && (
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2.5 bg-red-50/55 border border-red-200 rounded-xl text-[10px] font-black text-red-755 transition-all shadow-sm h-[42px] uppercase group hover:bg-red-100/55 hover:border-red-300 hover:shadow-md"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2 text-red-655 group-hover:scale-110 transition-transform" />
              Eliminar
            </button>
          )}
        </div>

        {/* DOCUMENTOS ADJUNTOS CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-black text-gray-900 flex items-center text-[11px] uppercase tracking-wider">
              <Paperclip className="h-4 w-4 mr-2 text-indigo-500 animate-pulse" /> Documentos Adjuntos
            </h3>
            <span className="bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 uppercase">
              {adjuntos.length} Archivos
            </span>
          </div>

          <div className="p-5 space-y-4">
            {adjuntos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 italic uppercase tracking-wider font-bold">Sin documentos adjuntos.</p>
            ) : (
              <ul className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-100 ml-1">
                {adjuntos.map((adj, idx) => (
                  <li key={adj.id_adjunto} className="relative pl-7 group">
                    <div className="absolute left-0 top-1 w-5 h-5 bg-white border-2 border-indigo-400 rounded-full flex items-center justify-center shadow-sm">
                      <FileText className="h-3 w-3 text-indigo-600" />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex justify-between items-start">
                        <a
                          href={adj.archivo_url || adj.archivo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-650 hover:text-indigo-850 font-black text-[11px] truncate uppercase tracking-tight"
                          title={adj.nombre}
                        >
                          {adj.nombre}
                        </a>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteAttachment(adj.id_adjunto)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2"
                            title="Eliminar documento"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Select & upload document box */}
            <div className="mt-4 space-y-3">
              <label className={`w-full flex justify-center items-center px-4 py-2.5 border-2 border-dashed rounded-xl text-xs font-bold transition-all shadow-sm ${isUploading ? 'bg-gray-50 border-gray-250 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer'}`}>
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-500" /> SUBIENDO...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> SELECCIONAR Y VINCULAR</>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* TRAZABILIDAD DEL REGISTRO CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-[600px] transition-all hover:shadow-md font-sans">
          
          {/* Header Estandarizado */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-black text-gray-950 flex items-center text-[11px] uppercase tracking-wider">
              <History className="h-4 w-4 mr-2.5 text-indigo-500" /> Trazabilidad del Registro
            </h3>
            <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 uppercase">
              {trazabilidad.length} Hitos Totales
            </span>
          </div>

          {/* Timeline list */}
          <div className="flex-1 p-5 overflow-y-auto bg-white custom-scrollbar">
            {trazabilidad.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <History className="h-8 w-8 mb-2" />
                <p className="text-[9px] uppercase font-black tracking-widest text-center">Sin historial aún</p>
              </div>
            ) : (
              <div className="relative space-y-0 pb-2">
                {/* Gradient connector line */}
                <div className="absolute left-[9px] top-2 bottom-0 w-[2px] bg-gradient-to-b from-indigo-200 via-slate-100 to-transparent"></div>

                {[...trazabilidad].reverse().map((track, idx) => (
                  <div key={track.id_seguimiento} className="relative pl-7 pb-6 last:pb-2 group">
                    {/* Circle Dot Icon */}
                    <div className="absolute left-0 top-0.5 w-5 h-5 bg-white border-2 border-indigo-400 rounded-full flex items-center justify-center shadow-sm z-10 transition-colors">
                      <History className="h-3 w-3 text-indigo-650" />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                          {track.usuario_nombre || "SISTEMA"}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums uppercase">
                          {track.fecha ? formatDate(track.fecha) : ""}
                        </span>
                      </div>
                      <div className="text-[11px] font-black leading-tight text-slate-700">
                        {track.detalle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Note Input box inside card */}
          {isAdmin && (
            <div className="bg-white border-t border-slate-100 p-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribir nota de seguimiento..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  disabled={isSubmittingNote}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-bold text-xs text-slate-800 placeholder:text-gray-300 focus:outline-none focus:border-indigo-650 bg-slate-50/50 h-[42px]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="flex items-center justify-center p-2 bg-indigo-600 text-white font-black rounded-xl uppercase shadow-md shadow-indigo-200 hover:bg-indigo-750 transition-all w-[42px] h-[42px] shrink-0"
                >
                  {isSubmittingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

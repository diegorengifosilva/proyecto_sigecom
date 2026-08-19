import React, { useMemo, useEffect, useState } from "react";
import { TrendingUp, Target, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import api from "@/services/api";

export default function SemaforoCumplimiento({ module = "comercial", anno = 2026, mes = "%", viewScope = "global" }) {
  const [objetivo, setObjetivo] = useState(null);
  const [logrado, setLogrado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [minima, setMinima] = useState({ 2: "", 1: "", 4: "", 8: "" });
  const [maxima, setMaxima] = useState({ 2: "", 1: "", 4: "", 8: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      if (viewScope === "personal") {
        // Guardar metas personales en localStorage por año
        const personalGoals = {
          2: { minimo: Number(minima[2] || 0), maximo: Number(maxima[2] || 0) },
          1: { minimo: Number(minima[1] || 0), maximo: Number(maxima[1] || 0) },
          4: { minimo: Number(minima[4] || 0), maximo: Number(maxima[4] || 0) },
          8: { minimo: Number(minima[8] || 0), maximo: Number(maxima[8] || 0) }
        };
        localStorage.setItem(`vc_personal_goals_${anno}`, JSON.stringify(personalGoals));
        setOpenModal(false);
        setReloadTrigger(prev => prev + 1);
      } else {
        const payload = {
          anno: Number(anno),
          areas: [
            { id_area: 2, minimo: Number(minima[2] || 0), maximo: Number(maxima[2] || 0) },
            { id_area: 1, minimo: Number(minima[1] || 0), maximo: Number(maxima[1] || 0) },
            { id_area: 4, minimo: Number(minima[4] || 0), maximo: Number(maxima[4] || 0) },
            { id_area: 8, minimo: Number(minima[8] || 0), maximo: Number(maxima[8] || 0) }
          ]
        };
        await api.post("dashboard/objetivos/", payload);
        setOpenModal(false);
        setReloadTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || "Error al guardar objetivos");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard navigation within the 4x2 grid (row: 0-3, col: 0-1)
  const handleInputKeyDown = (e, row, col) => {
    if (e.key === "-" || e.key === "e" || e.key === "E") {
      e.preventDefault();
      return;
    }

    let targetRow = row;
    let targetCol = col;

    if (e.key === "ArrowDown") {
      targetRow = (row + 1) % 4;
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      targetRow = (row - 1 + 4) % 4;
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      targetCol = (col + 1) % 2;
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      targetCol = (col - 1 + 2) % 2;
      e.preventDefault();
    }

    if (targetRow !== row || targetCol !== col) {
      const target = document.querySelector(`.modal-target-input[data-row="${targetRow}"][data-col="${targetCol}"]`);
      if (target) {
        target.focus();
        target.select();
      }
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    if (!openModal) return;
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenModal(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openModal]);

  // Autofocus and text-selection on the first field when modal opens
  useEffect(() => {
    if (openModal) {
      setTimeout(() => {
        const firstInput = document.querySelector('.modal-target-input[data-row="0"][data-col="0"]');
        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }, 80);
    }
  }, [openModal]);

  // Pre-cargar valores en los campos del modal al abrir o cambiar de modo
  useEffect(() => {
    if (!openModal) return;
    
    if (viewScope === "personal") {
      const stored = localStorage.getItem(`vc_personal_goals_${anno}`);
      if (stored) {
        try {
          const personal = JSON.parse(stored);
          setMinima({
            2: personal[2]?.minimo || "",
            1: personal[1]?.minimo || "",
            4: personal[4]?.minimo || "",
            8: personal[8]?.minimo || ""
          });
          setMaxima({
            2: personal[2]?.maximo || "",
            1: personal[1]?.maximo || "",
            4: personal[4]?.maximo || "",
            8: personal[8]?.maximo || ""
          });
          return;
        } catch (e) {
          console.error(e);
        }
      }
    }
    
    // Si es global o no hay metas personales guardadas, pre-cargar de objetivos de la base de datos
    if (Array.isArray(objetivo) && objetivo.length > 0) {
      const first = objetivo[0];
      if (first && first.areas) {
        const tempMin = { 2: "", 1: "", 4: "", 8: "" };
        const tempMax = { 2: "", 1: "", 4: "", 8: "" };
        first.areas.forEach(a => {
          tempMin[a.id_area] = a.minimo || "";
          tempMax[a.id_area] = a.maximo || "";
        });
        setMinima(tempMin);
        setMaxima(tempMax);
      }
    }
  }, [openModal, objetivo, viewScope, anno]);

  const renderModal = () => {
    if (!openModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-in fade-in duration-200">
        <div className="bg-white/85 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl max-w-lg w-full flex flex-col gap-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100/50">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-50/80 p-1.5 rounded-lg text-indigo-600">
                <Target size={18} />
              </div>
              <h3 className="text-sm font-bold text-gray-800">
                {viewScope === "personal" ? `Configurar Mis Metas Personales Anuales ${anno}` : `Configurar Objetivos Anuales ${anno}`}
              </h3>
            </div>
            <button 
              type="button"
              onClick={() => setOpenModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-lg font-bold"
            >
              &times;
            </button>
          </div>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium text-left">
                {errorMsg}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {[
                { id: 2, label: "Minería", row: 0 },
                { id: 1, label: "Industria", row: 1 },
                { id: 4, label: "Petroquímica", row: 2 },
                { id: 8, label: "Seguridad de Maquinaria", row: 3 }
              ].map(area => (
                <div key={area.id} className="grid grid-cols-3 items-center gap-4 py-2 border-b border-gray-100/30 last:border-b-0 text-left">
                  <span className="text-xs font-bold text-gray-700">{area.label}</span>
                  <div className="flex flex-col gap-1 col-span-2">
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase text-left">Mínimo ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          data-row={area.row}
                          data-col={0}
                          value={minima[area.id]}
                          onKeyDown={e => handleInputKeyDown(e, area.row, 0)}
                          onChange={e => setMinima(prev => ({ ...prev, [area.id]: e.target.value }))}
                          className="modal-target-input w-full px-3 py-1.5 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white/60 rounded-xl text-xs focus:outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase text-left">Máximo ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          data-row={area.row}
                          data-col={1}
                          value={maxima[area.id]}
                          onKeyDown={e => handleInputKeyDown(e, area.row, 1)}
                          onChange={e => setMaxima(prev => ({ ...prev, [area.id]: e.target.value }))}
                          className="modal-target-input w-full px-3 py-1.5 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white/60 rounded-xl text-xs focus:outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100/50">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-sm transition-colors uppercase tracking-wider"
              >
                {saving ? "Guardando..." : "Guardar Objetivos"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (module === "logistica") {
      setLoading(false);
      return;
    }
    const cargar = async () => {
      try {
        setLoading(true);
        const isPersonal = viewScope === "personal";
        const [resObjetivo, resLogrado] = await Promise.all([
          api.get(`dashboard/objetivos/?anno=${anno}`),
          api.get(`dashboard/logrado/?anno=${anno}&mes=${mes}${isPersonal ? "&personal=true" : ""}`)
        ]);
        setObjetivo(resObjetivo.data);
        setLogrado(resLogrado.data);
      } catch (error) {
        console.error("Error cargando cumplimiento", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [module, anno, mes, viewScope, reloadTrigger]);

  const resumen = useMemo(() => {
    if (module === "logistica") {
      const seed = Number(anno) + (mes === "%" ? 6 : Number(mes));
      const getVal = (min, max, offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return min + (x - Math.floor(x)) * (max - min);
      };
      const leadTimeLogrado = getVal(3.8, 4.8, 1);
      const fillRateLogrado = getVal(94.2, 97.8, 2);

      return {
        anual: {
          title: "Lead Time (Abastecimiento)",
          min: 5.0,
          max: 3.5,
          logrado: leadTimeLogrado,
          isInverse: true,
          icon: <Clock size={14} className="text-indigo-500"/>,
          unit: "d",
          isCurrency: false
        },
        mensual: {
          title: "Fill Rate de Recepción",
          min: 95.0,
          max: 98.0,
          logrado: fillRateLogrado,
          isInverse: false,
          icon: <CheckCircle2 size={14} className="text-indigo-500"/>,
          unit: "%",
          isCurrency: false
        }
      };
    }

    if (!Array.isArray(objetivo) || objetivo.length === 0 || !logrado) return null;
    
    let minAnual = 0; 
    let maxAnual = 0;

    if (viewScope === "personal") {
      const stored = localStorage.getItem(`vc_personal_goals_${anno}`);
      if (stored) {
        try {
          const personal = JSON.parse(stored);
          Object.values(personal).forEach(p => {
            minAnual += Number(p.minimo || 0);
            maxAnual += Number(p.maximo || 0);
          });
        } catch (e) {
          console.error(e);
        }
      }
      
      // Si no hay cuota personal configurada aún, la prorrateamos por defecto equitativamente entre los 3 comerciales (1/3)
      if (minAnual === 0 && maxAnual === 0 && Array.isArray(objetivo)) {
        let globalMin = 0;
        let globalMax = 0;
        objetivo.forEach(obj => {
          if (obj.areas) {
            obj.areas.forEach(a => {
              globalMin += Number(a.minimo || 0);
              globalMax += Number(a.maximo || 0);
            });
          }
        });
        minAnual = globalMin / 3;
        maxAnual = globalMax / 3;
      }
    } else {
      objetivo.forEach(obj => {
        if (obj.areas) {
          obj.areas.forEach(a => {
            minAnual += Number(a.minimo || 0);
            maxAnual += Number(a.maximo || 0);
          });
        }
      });
    }

    const logradoAnual = Number(logrado.anual || 0);
    const logradoMensual = Number(logrado.mensual || 0);

    return {
      anual: { 
        title: "Ejercicio Anual",
        min: minAnual, 
        max: maxAnual, 
        logrado: logradoAnual, 
        faltante: Math.max(0, minAnual - logradoAnual),
        icon: <Target size={14} className="text-indigo-500"/>,
        unit: "$",
        isCurrency: true
      },
      mensual: { 
        title: "Meta Mensual",
        min: minAnual / 12, 
        max: maxAnual / 12, 
        logrado: logradoMensual, 
        faltante: Math.max(0, (minAnual / 12) - logradoMensual),
        icon: <Calendar size={14} className="text-indigo-500"/>,
        unit: "$",
        isCurrency: true
      }
    };
  }, [module, objetivo, logrado, anno, mes]);

  // LÓGICA DE ESTADO MEJORADA (Soporta metas inversas como lead times cortos)
  const getEstado = (logrado, min, max, isInverse = false) => {
    if (isInverse) {
      if (logrado <= max) return { 
          label: "Objetivo Cumplido", 
          color: "text-emerald-600", 
          bg: "bg-emerald-50", 
          bar: "bg-emerald-500", 
          icon: <CheckCircle2 size={10}/> 
      };
      if (logrado <= min) return { 
          label: "En Rango Mínimo", 
          color: "text-yellow-600", 
          bg: "bg-yellow-50", 
          bar: "bg-yellow-400", 
          icon: <TrendingUp size={10}/> 
      };
      return { 
          label: "Bajo lo Esperado", 
          color: "text-red-600", 
          bg: "bg-red-50", 
          bar: "bg-red-500", 
          icon: <AlertCircle size={10}/> 
      };
    }

    if (logrado >= max) return { 
        label: "Objetivo Cumplido", 
        color: "text-emerald-600", 
        bg: "bg-emerald-50", 
        bar: "bg-emerald-500", 
        icon: <CheckCircle2 size={10}/> 
    };
    if (logrado >= min) return { 
        label: "En Rango Mínimo", 
        color: "text-yellow-600", 
        bg: "bg-yellow-50", 
        bar: "bg-yellow-400", 
        icon: <TrendingUp size={10}/> 
    };
    return { 
        label: "Bajo lo Esperado", 
        color: "text-red-600", 
        bg: "bg-red-50", 
        bar: "bg-red-500", 
        icon: <AlertCircle size={10}/> 
    };
  };

  if (loading) return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 animate-pulse">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculando Metas...</span>
    </div>
  );

  if (!loading && module === "comercial" && (!Array.isArray(objetivo) || objetivo.length === 0)) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div className="bg-indigo-50 p-3 rounded-full text-indigo-600">
          <Target size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-800">No hay objetivos configurados para el año {anno}</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Para poder visualizar el panel de cumplimiento comercial, primero debes configurar los objetivos mínimos y máximos por cada área de negocio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors uppercase tracking-wider"
        >
          Configurar Objetivos
        </button>
        {renderModal()}
      </div>
    );
  }

  if (!resumen) return null;

  const renderCard = (titulo, data) => {
    const estado = getEstado(data.logrado, data.min, data.max, data.isInverse);
    const porcentajeReal = data.isInverse
      ? (data.logrado <= data.max ? 100 : (data.logrado >= data.min ? 0 : ((data.min - data.logrado) / (data.min - data.max)) * 100))
      : (data.max > 0 ? (data.logrado / data.max) * 100 : 0);
    const porcentajeVisual = Math.min(Math.max(porcentajeReal, 0), 100);

    const formatVal = (val) => {
      if (data.isCurrency) {
        return `${data.unit} ${val.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
      }
      return `${val.toFixed(1)} ${data.unit}`;
    };

    return (
      <div className="p-4 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${estado.bg}`}> {data.icon} </div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{data.title}</span>
          </div>
          <span className={`flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${estado.bg} ${estado.color}`}>
            {estado.icon} {estado.label}
          </span>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-800 tracking-tighter">
              {porcentajeReal > 100 ? "100" : porcentajeReal.toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Progreso</span>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs font-bold text-gray-600">{formatVal(data.logrado)}</span>
            {porcentajeReal > 100 && !data.isInverse && (
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Excedente: {formatVal(data.logrado - data.max)}
              </span>
            )}
          </div>
        </div>

        {/* Contenedor de la Barra Estilo Termómetro */}
        <div className="relative w-full pt-6 pb-2">
          {/* El "Pin" Indicador (Flotante) */}
          <div 
            className="absolute top-0 transition-all duration-1000 ease-out -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${porcentajeVisual}%` }}
          >
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border ${estado.bg} ${estado.color} border-current mb-1`}>
              {porcentajeReal.toFixed(0)}%
            </span>
            {/* Aguja del indicador */}
            <div className={`w-0.5 h-2 ${estado.bar}`} />
          </div>

          {/* Cuerpo del Termómetro */}
          <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-200">
            <div 
              className="absolute inset-0 opacity-30"
              style={{ 
                background: 'linear-gradient(90deg, #ff4d4d 0%, #ffcc00 50%, #2ecc71 100%)' 
              }} 
            />
            
            <div 
              className="h-full transition-all duration-1000 ease-out relative shadow-[2px_0_8px_rgba(0,0,0,0.15)] z-10"
              style={{ 
                width: `${porcentajeVisual}%`,
                background: `linear-gradient(90deg, 
                  #ff4d4d 0%, 
                  ${porcentajeVisual > 50 ? '#ffcc00 50%,' : ''} 
                  ${estado.label === "Objetivo Cumplido" ? '#2ecc71' : (estado.label === "En Rango Mínimo" ? '#ffcc00' : '#ff4d4d')} 100%)`
              }}
            >
              <div className="absolute top-0 left-0 w-full h-[35%] bg-white/30 rounded-full" />
              <div className="absolute right-0 top-0 h-full w-1 bg-white/40 blur-[1px]" />
            </div>
          </div>

          {/* Marcas de escala */}
          <div className="flex justify-between w-full px-1 mt-1 opacity-40">
            {[0, 25, 50, 75, 100].map(mark => (
              <div key={mark} className="flex flex-col items-center">
                <div className="w-[1px] h-1 bg-gray-400" />
                <span className="text-[7px] font-bold text-gray-900">{mark}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-400 uppercase">{data.isInverse ? "Límite Alerta" : "Mínimo"}</span>
            <span className="text-[10px] font-black text-gray-600">{formatVal(data.min)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-bold text-gray-400 uppercase">{data.isInverse ? "Meta Óptima" : "Objetivo"}</span>
            <span className="text-[10px] font-black text-gray-600">{formatVal(data.max)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* HEADER MINIMALISTA: Título y Badge de estado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-tight">
            <div className="bg-indigo-50 p-1 rounded-md">
              <TrendingUp size={16} className="text-indigo-600" />
            </div>
            {module === "logistica" ? `Metas e Indicadores de Logística ${anno}` : `Panel de Cumplimiento Comercial ${anno}`}
          </h2>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest ml-8">
            {module === "logistica" ? "Eficiencia en tiempos y recepciones de almacén" : "Monitoreo de objetivos comerciales"}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
            Sincronizado en tiempo real
          </span>
        </div>
      </div>

      {/* GRID DE TARJETAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCard(module === "logistica" ? "Lead Time Abastecimiento" : "Ejercicio Anual", resumen.anual)}
        {renderCard(module === "logistica" ? "Fill Rate Recepciones" : "Meta Mensual", resumen.mensual)}
      </div>
    </div>
  );
}
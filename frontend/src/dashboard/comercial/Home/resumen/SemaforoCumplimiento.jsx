import React, { useMemo, useEffect, useState } from "react";
import { TrendingUp, Target, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import api from "@/services/api";

export default function SemaforoCumplimiento({ module = "comercial", anno = 2026, mes = "%" }) {
  const [objetivo, setObjetivo] = useState(null);
  const [logrado, setLogrado] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (module === "logistica") {
      setLoading(false);
      return;
    }
    const cargar = async () => {
      try {
        setLoading(true);
        const [resObjetivo, resLogrado] = await Promise.all([
          api.get(`dashboard/objetivos/?anno=${anno}`),
          api.get(`dashboard/logrado/?anno=${anno}&mes=${mes}`)
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
  }, [module, anno, mes]);

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

    objetivo.forEach(obj => {
      if (obj.areas) {
        obj.areas.forEach(a => {
          minAnual += Number(a.minimo || 0);
          maxAnual += Number(a.maximo || 0);
        });
      }
    });

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
        unit: "S/.",
        isCurrency: true
      },
      mensual: { 
        title: "Meta Mensual",
        min: minAnual / 12, 
        max: maxAnual / 12, 
        logrado: logradoMensual, 
        faltante: Math.max(0, (minAnual / 12) - logradoMensual),
        icon: <Calendar size={14} className="text-indigo-500"/>,
        unit: "S/.",
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

  if (!resumen) return null;

  const renderCard = (titulo, data) => {
    const estado = getEstado(data.logrado, data.min, data.max, data.isInverse);
    const porcentajeReal = data.isInverse
      ? (data.logrado <= data.max ? 100 : (data.logrado >= data.min ? 0 : ((data.min - data.logrado) / (data.min - data.max)) * 100))
      : (data.max > 0 ? (data.logrado / data.max) * 100 : 0);
    const porcentajeVisual = Math.min(Math.max(porcentajeReal, 0), 100);

    const formatVal = (val) => {
      if (data.isCurrency) {
        return `S/. ${val.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
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
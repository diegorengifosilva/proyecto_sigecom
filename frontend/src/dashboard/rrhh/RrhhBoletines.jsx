import React, { useState } from "react";
import { Newspaper, FileCheck2, Download, Plus, Bell, Calendar } from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhBoletines() {
  const [bulletins, setBulletins] = useState([
    {
      id: "bol-01",
      code: "BOL-2026-001",
      title: "Actualización de Política de Trabajo y Horarios 2026",
      category: "BULLETIN",
      version: 1,
      date: "2026-01-15",
      author: "Gerencia de Recursos Humanos"
    },
    {
      id: "bol-02",
      code: "BOL-2026-002",
      title: "Guía de Beneficios Laborales y Seguro Complementario (SCTR)",
      category: "BULLETIN",
      version: 2,
      date: "2026-02-01",
      author: "Recursos Humanos y Bienestar"
    },
    {
      id: "bol-03",
      code: "CARGO-001",
      title: "Formato de Cargo de Entrega de Reglamento Interno de Trabajo",
      category: "BULLETIN_ACKNOWLEDGEMENT",
      version: 1,
      date: "2026-01-10",
      author: "Relaciones Laborales"
    }
  ]);

  const listBulletins = bulletins.filter((b) => b.category === "BULLETIN");
  const listCargos = bulletins.filter((b) => b.category === "BULLETIN_ACKNOWLEDGEMENT");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Newspaper className="w-4 h-4" />
            <span>Comunicación Interna Oficial</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Boletines y Comunicados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Publicación de comunicados oficiales dirigidos a todo el personal y control de constancias de entrega.
          </p>
        </div>

        <button
          onClick={() => toast.info("Crear nuevo comunicado o boletín oficial")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Comunicado</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Boletines Publicados</span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">{listBulletins.length}</div>
            <span className="text-xs text-gray-400">Material informativo vigente</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Newspaper className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Formatos de Cargo</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{listCargos.length}</div>
            <span className="text-xs text-gray-400">Constancias de recepción</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sección Boletines */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-blue-600" />
          <span>Boletines Informativos Vigentes</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listBulletins.map((item) => (
            <div key={item.id} className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span className="font-mono font-bold text-blue-600">{item.code}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                    Rev. {item.version}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.author} · {item.date}</p>
              </div>
              <button
                onClick={() => toast.success(`Descargando ${item.code}`)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white border border-gray-200 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Boletín</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sección Constancias de Cargo */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-indigo-600" />
          <span>Formatos de Cargo y Constancia de Entrega</span>
        </h2>

        <div className="divide-y divide-gray-100">
          {listCargos.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                <span className="text-xs text-gray-400">{item.code} · Vigente desde {item.date}</span>
              </div>
              <button
                onClick={() => toast.success(`Descargando formato ${item.code}`)}
                className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
              >
                Descargar Plantilla
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

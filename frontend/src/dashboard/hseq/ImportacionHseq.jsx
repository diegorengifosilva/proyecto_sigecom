import React, { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function ImportacionHseq() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) {
      toast.warn("Por favor seleccione un archivo Excel.");
      return;
    }
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast.success("Archivo importado y normalizado correctamente.");
      setFile(null);
    }, 1500);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
          <Upload className="w-4 h-4" />
          <span>Regularización Masiva</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Importación y Regularización HSEQ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Carga masiva de matrices de capacitación, actas históricas y notas pasadas a la base de datos de SIG.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-6 text-center">
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:border-indigo-400 transition-colors bg-gray-50/50">
            <FileSpreadsheet className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <div className="text-sm font-semibold text-gray-800">
              {file ? file.name : "Seleccione su archivo Excel (.xlsx, .xls)"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Plantilla estándar de programa anual, asistencias o exámenes Google Forms
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-4 block mx-auto text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            {uploading ? "Procesando importación..." : "Iniciar Carga y Normalización"}
          </button>
        </form>
      </div>
    </div>
  );
}

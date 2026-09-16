import React, { useState, useRef, useEffect } from "react";
import api, { downloadAttachment } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Paperclip, CloudUpload, FileText, Trash2, AlertCircle, FilePlus2, X } from "lucide-react";
import pdfIcon from "@/assets/Formatos/pdf.png";
import wordIcon from "@/assets/Formatos/word.png";
import excelIcon from "@/assets/Formatos/excel.png";
import jpgIcon from "@/assets/Formatos/jpg.png";
import jpegIcon from "@/assets/Formatos/jpeg.png";
import pngIcon from "@/assets/Formatos/png.png";
import htmlIcon from "@/assets/Formatos/html.png";

export default function AdjuntosModal({ open, onClose, num_reg }) {
  const [archivoNombre, setArchivoNombre] = useState("");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [saving, setSaving] = useState(false);
  const [registroAEliminar, setRegistroAEliminar] = useState(null);

  const fileInputRef = useRef();

  const ICONOS_FORMATO = {
    pdf: pdfIcon,
    doc: wordIcon,
    docx: wordIcon,
    xls: excelIcon,
    xlsx: excelIcon,
    jpg: jpgIcon,
    jpeg: jpegIcon,
    png: pngIcon,
    html: htmlIcon,
  };
  const ICONO_DEFAULT = pngIcon;

  // -----------------------------
  // Seleccionar archivo
  // -----------------------------
  const handleSeleccionarArchivo = () => {
    fileInputRef.current?.click();
  };

  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivoSeleccionado(file);
    setArchivoNombre(file.name);
  };

  // -----------------------------
  // Agregar y subir archivo
  // -----------------------------
  const handleAgregarArchivo = async () => {
    if (!archivoSeleccionado) return;
    setSaving(true);

    try {
      const formData = new FormData();

      // Nombre que se mostrará en la UI
      const displayName = archivoNombre || archivoSeleccionado.name;

      // Nombre que se guardará en disco (num_reg + _ + displayName)
      const saveName = `${num_reg || "NUMREG"}_${displayName}`;

      formData.append("archivo", archivoSeleccionado);
      formData.append("nombre", saveName); // esto es lo que recibirá Django
      formData.append("num_reg", num_reg || "NUM_REG_DE_COTIZACION");

      const { data } = await api.post("cotizaciones/adjuntos/", formData);

      if (data.ok) {
        const nuevo = {
          id: Date.now(),
          dat: new Date().toLocaleString(),
          des: displayName, // sigue mostrando solo NC925 (1).pdf
          cod: "Tú",
          file: archivoSeleccionado,
          saveName, // opcional: puedes guardarlo para referencia futura
        };
        setRegistros((prev) => [nuevo, ...prev]);
        setArchivoSeleccionado(null);
        setArchivoNombre("");
      } else {
        console.error("Error al subir archivo", data);
      }
    } catch (error) {
      console.error("Error subiendo archivo", error);
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Descargar / Eliminar
  // -----------------------------
  const handleDescargar = (registro) => {
    // -------------------------
    // Archivo recién agregado (File en memoria)
    // -------------------------
    if (registro.file) {
      const url = URL.createObjectURL(registro.file);
      const a = document.createElement("a");
      a.href = url;
      // Descarga con el nombre de guardado (saveName)
      a.download = registro.saveName || registro.des;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // -------------------------
    // Archivo existente (en disco)
    // -------------------------
    if (registro.saveName) {
      downloadAttachment(
        `cotizaciones/adjuntos/descargar/${encodeURIComponent(registro.saveName)}/`,
        registro.des || registro.saveName
      ).catch((err) => {
        toast.error(err.message || "No se pudo descargar el archivo");
      });
    }
  };

  const handleEliminar = (id) => {
    const registro = registros.find((r) => r.id === id);
    if (!registro) return;

    setRegistroAEliminar(registro);
  };

  const confirmarEliminar = async () => {
    if (!registroAEliminar) return;

    setSaving(true);

    try {
      if (registroAEliminar.saveName) {
        const formData = new FormData();
        formData.append("nombre", registroAEliminar.saveName);

        const { data } = await api.post(
          "cotizaciones/adjuntos/eliminar/",
          formData
        );

        if (!data.ok) {
          toast.error("No se pudo eliminar el archivo del servidor");
          return;
        }
      }

      setRegistros((prev) =>
        prev.filter((r) => r.id !== registroAEliminar.id)
      );

      toast.success("Archivo eliminado correctamente");
      setRegistroAEliminar(null);

    } catch (error) {
      console.error("Error eliminando archivo", error);
      toast.error("Error eliminando archivo");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAgregarArchivo();
    }
  };

  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || !num_reg || loadedRef.current) return;

    const fetchArchivos = async () => {
      try {
        const { data } = await api.get(`cotizaciones/adjuntos/listar/${num_reg}/`);
        if (data.ok) {
          const existentes = data.archivos.map((a) => ({
            id: a.nombre, // mejor que Date.now()
            dat: "-",
            des: a.displayName,
            cod: "Arch. existente",
            file: null,
            saveName: a.nombre,
          }));

          setRegistros(existentes);
          loadedRef.current = true;
        }
      } catch (error) {
        console.error("Error cargando archivos existentes", error);
      }
    };

    fetchArchivos();
  }, [open, num_reg]);

  useEffect(() => {
    if (!open) {
      loadedRef.current = false;
      setRegistros([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER IDENTICO AL SISTEMA GESTIÓN */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Paperclip size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Archivos Adjuntos
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Documentación técnica y comercial de la cotización
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-2 space-y-2">
          
          {/* SECCIÓN 1: CARGA DE ARCHIVOS */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-2">
              <FilePlus2 size={14} className="text-amber-600" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Cargar Nuevo Documento</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Nombre visible del archivo..."
                  value={archivoNombre}
                  onChange={(e) => setArchivoNombre(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
                />
              </div>

              <input type="file" ref={fileInputRef} className="hidden" onChange={handleArchivoChange} />

              <button
                type="button"
                onClick={handleSeleccionarArchivo}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-all shadow-sm"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                onClick={handleAgregarArchivo}
                disabled={!archivoSeleccionado || saving}
                className="flex items-center justify-center h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white transition-all shadow-md shadow-amber-200 disabled:shadow-none gap-2 text-[11px] font-black uppercase tracking-wider"
              >
                <CloudUpload size={18} />
                {saving ? "Subiendo..." : "Adjuntar"}
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: LISTADO DE ARCHIVOS */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-16">Icono</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[60%]">Nombre del Documento</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400 font-medium text-[11px] uppercase tracking-tighter">
                      No hay archivos adjuntos en esta cotización
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => {
                    const ext = r.des.split(".").pop()?.toLowerCase();
                    const iconSrc = ICONOS_FORMATO[ext] || ICONO_DEFAULT;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => handleDescargar(r)} className="hover:scale-110 transition-transform inline-block">
                            <img src={iconSrc} alt="ext" className="w-7 h-7 object-contain drop-shadow-sm" />
                          </button>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <span className="text-xs font-bold text-slate-700 break-words whitespace-normal leading-tight">
                            {r.des}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleEliminar(r.id)}
                            disabled={saving}
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/60 transition-all shadow-2xs"
                            title="Eliminar adjunto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <Button
            variant="ghost" onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-100 border border-transparent hover:border-red-200 rounded-xl h-9 px-8 transition-all"
          >
            Cerrar
          </Button>
        </div>

        {/* SUBMODAL ELIMINAR (ESTILO ALINEADO) */}
        <Dialog open={!!registroAEliminar} onOpenChange={() => setRegistroAEliminar(null)}>
          <DialogContent className="max-w-sm bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">
            <div className="p-2">
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 shadow-inner flex gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-rose-100 text-rose-500 shadow-sm shrink-0">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">¿Eliminar archivo?</p>
                  <p className="text-[11px] font-bold text-slate-500 leading-tight italic">
                    {registroAEliminar?.des}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-2">
               <Button variant="ghost" onClick={() => setRegistroAEliminar(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                Cancelar
              </Button>
              <Button onClick={confirmarEliminar} disabled={saving} className="bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-black uppercase tracking-widest rounded-lg h-8 px-4">
                {saving ? "..." : "Eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}

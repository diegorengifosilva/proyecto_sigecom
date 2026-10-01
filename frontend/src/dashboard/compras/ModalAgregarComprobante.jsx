import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader,
  Sparkles,
  Receipt,
  Calendar,
  Building2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Check
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { scanQrFromImageFile, parseSunatQr } from "@/utils/sunatQrParser";

export default function ModalAgregarComprobante({
  isOpen,
  onClose,
  onSave,
  isLoadingSave = false,
  realId
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Estados de archivo y procesamiento
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConsultingRuc, setIsConsultingRuc] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // { type: 'qr' | 'manual' | 'ocr', message: '' }
  const [sunatStatus, setSunatStatus] = useState(null); // { estado, condicion, fuente }

  // Formulario
  const [formData, setFormData] = useState({
    tipo_doc: "FAC",
    id_tipo_concepto: "2", // Viáticos por defecto
    serie: "",
    numero: "",
    fecha: new Date().toISOString().split("T")[0],
    ruc: "",
    proveedor: "",
    detalle: "",
    igv: "18.00",
    importe: ""
  });

  // Limpiar estados al abrir o cerrar
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setFilePreview(null);
      setIsPdf(false);
      setIsScanning(false);
      setIsConsultingRuc(false);
      setScanStatus(null);
      setSunatStatus(null);
      setFormData({
        tipo_doc: "FAC",
        id_tipo_concepto: "2",
        serie: "",
        numero: "",
        fecha: new Date().toISOString().split("T")[0],
        ruc: "",
        proveedor: "",
        detalle: "",
        igv: "18.00",
        importe: ""
      });
    }
  }, [isOpen]);

  // Consulta automática de RUC en SUNAT / Local
  const consultarRucSunat = async (rucToQuery) => {
    const clean = String(rucToQuery || "").replace(/\D/g, "");
    if (clean.length !== 11) {
      toast.warning("El RUC debe tener 11 dígitos");
      return;
    }

    try {
      setIsConsultingRuc(true);
      const res = await api.get(`/caja_chica/consulta_ruc/?ruc=${clean}`);
      if (res.data && res.data.razon_social) {
        setFormData((prev) => ({
          ...prev,
          proveedor: res.data.razon_social,
          ruc: clean
        }));
        setSunatStatus({
          estado: res.data.estado || "ACTIVO",
          condicion: res.data.condicion || "HABIDO",
          fuente: res.data.fuente || "sunat"
        });
        toast.success(`Proveedor encontrado: ${res.data.razon_social}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "No se pudo consultar el RUC en SUNAT.";
      toast.info(msg);
      setSunatStatus(null);
    } finally {
      setIsConsultingRuc(false);
    }
  };

  // Manejo de carga y análisis de archivo
  const handleProcessFile = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    const isFilePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setIsPdf(isFilePdf);

    // Generar vista previa
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    // Si es imagen, intentamos leer el código QR de SUNAT inmediatamente
    if (!isFilePdf && file.type.startsWith("image/")) {
      setIsScanning(true);
      setScanStatus({ type: "scanning", message: "Buscando Código QR SUNAT en la imagen..." });

      try {
        const qrResult = await scanQrFromImageFile(file);

        if (qrResult.success && qrResult.data) {
          const qr = qrResult.data;
          setScanStatus({
            type: "qr",
            message: "¡Código QR SUNAT detectado! Datos autocompletados con precisión."
          });

          // Actualizar formulario con datos de QR
          setFormData((prev) => ({
            ...prev,
            tipo_doc: qr.tipo_doc || prev.tipo_doc,
            serie: qr.serie || prev.serie,
            numero: qr.numero || prev.numero,
            fecha: qr.fecha || prev.fecha,
            ruc: qr.ruc || prev.ruc,
            igv: qr.igv || prev.igv,
            importe: qr.importe || prev.importe
          }));

          // Si vino con RUC, consultar Razón Social automáticamente
          if (qr.ruc && qr.ruc.length === 11) {
            consultarRucSunat(qr.ruc);
          }
        } else {
          setScanStatus({
            type: "manual",
            message: "No se encontró código QR visible. Puede completar o verificar los campos."
          });
        }
      } catch (err) {
        console.warn("Error leyendo QR:", err);
        setScanStatus({
          type: "manual",
          message: "No se pudo procesar el QR. Complete los datos manualmente."
        });
      } finally {
        setIsScanning(false);
      }
    } else {
      // Es un PDF
      setScanStatus({
        type: "manual",
        message: "PDF cargado para verificación. Ingrese el RUC o datos del comprobante."
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Cálculo en vivo de base imponible e IGV
  const calculatePreview = () => {
    const totalVal = parseFloat(formData.importe) || 0;
    const rateVal = (parseFloat(formData.igv) || 0) / 100;
    const base = rateVal > 0 ? totalVal / (1 + rateVal) : totalVal;
    const igvMonto = totalVal - base;
    return {
      base: base.toFixed(2),
      igvMonto: igvMonto.toFixed(2)
    };
  };

  const previewCalc = calculatePreview();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.importe || parseFloat(formData.importe) <= 0) {
      toast.error("Ingrese un importe válido");
      return;
    }
    if (!formData.detalle || !formData.detalle.trim()) {
      toast.error("Ingrese una descripción o detalle del gasto");
      return;
    }

    onSave({
      ...formData,
      archivoAdjunto: selectedFile
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* 1. HEADER MODAL */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Agregar Comprobante de Pago
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Sparkles className="w-3 h-3" />
                  Auto-Scan QR SUNAT
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Tome una foto o suba el archivo y el sistema completará los datos automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. CUERPO MODAL (SCROLLABLE) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* BOTONES DE CAPTURA RÁPIDA (OPTIMIZADOS PARA MÓVIL Y DESKTOP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Input oculto para cámara trasera */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Input oculto para subir archivo o PDF */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Botón 1: Tomar Foto (Cámara en Celular) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="group relative flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-white/20 text-white group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-black uppercase tracking-wider leading-tight">
                  Tomar Foto con Cámara
                </span>
                <span className="block text-[10px] text-teal-100 font-medium">
                  Ideal para celular / ticket físico con QR
                </span>
              </div>
            </button>

            {/* Botón 2: Subir Archivo o PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                  Subir Foto o PDF
                </span>
                <span className="block text-[10px] text-slate-500 font-medium">
                  Seleccionar desde la galería o archivos
                </span>
              </div>
            </button>
          </div>

          {/* BANNER DE ESTADO DEL ESCANEO */}
          {isScanning && (
            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center gap-2.5 animate-pulse">
              <Loader className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
              <span className="text-xs font-bold">
                Escaneando imagen y leyendo código QR de SUNAT...
              </span>
            </div>
          )}

          {scanStatus && !isScanning && (
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-xs font-bold ${
                scanStatus.type === "qr"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                {scanStatus.type === "qr" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>{scanStatus.message}</span>
              </div>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                    setScanStatus(null);
                  }}
                  className="text-[10px] uppercase font-black text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Quitar archivo
                </button>
              )}
            </div>
          )}

          {/* CUERPO EN DOS COLUMNAS: PREVIEW A LA IZQUIERDA Y FORMULARIO A LA DERECHA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* COLUMNA 1: VISTA PREVIA DEL COMPROBANTE (5 COLUMNAS EN DESKTOP) */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[220px] max-h-[380px] overflow-hidden relative">
              {filePreview ? (
                isPdf ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <FileText className="w-12 h-12 text-rose-500 mb-2" />
                    <p className="text-xs font-black text-slate-800 uppercase truncate max-w-xs">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Archivo PDF adjunto listo para comprobante</p>
                    <a
                      href={filePreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase hover:bg-indigo-100"
                    >
                      Ver documento PDF
                    </a>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={filePreview}
                      alt="Comprobante"
                      className="max-h-[340px] max-w-full object-contain rounded-xl shadow-xs"
                    />
                  </div>
                )
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="p-3 rounded-2xl bg-white shadow-xs text-slate-400 mb-2">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-black text-slate-700 uppercase">
                    Arrastra aquí el comprobante
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    o haz clic para seleccionar (PDF, JPG, PNG)
                  </p>
                </div>
              )}
            </div>

            {/* COLUMNA 2: FORMULARIO (7 COLUMNAS EN DESKTOP) */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-3">
              
              {/* FILA 1: TIPO DE COMPROBANTE Y CONCEPTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={formData.tipo_doc}
                    onChange={(e) => {
                      const val = e.target.value;
                      let defaultIgv = formData.igv;
                      if (val === "FAC" || val === "BOL") defaultIgv = "18.00";
                      else if (val === "PLL" || val === "REC" || val === "RH" || val === "OTR") defaultIgv = "0.00";
                      setFormData({ ...formData, tipo_doc: val, igv: defaultIgv });
                    }}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:border-teal-500 outline-none"
                  >
                    <option value="FAC">Factura (FAC)</option>
                    <option value="BOL">Boleta de Venta (BOL)</option>
                    <option value="PLL">Planilla Movilidad (PLL)</option>
                    <option value="REC">Recibo (REC)</option>
                    <option value="RH">Recibo por Honorarios (RH)</option>
                    <option value="TIC">Ticket (TIC)</option>
                    <option value="VBO">Boleto de Viaje (VBO)</option>
                    <option value="OTR">Otro Documento (OTR)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Concepto / Área de Gasto
                  </label>
                  <select
                    value={formData.id_tipo_concepto}
                    onChange={(e) => setFormData({ ...formData, id_tipo_concepto: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:border-teal-500 outline-none"
                  >
                    <option value="2">Viáticos</option>
                    <option value="4">Otros Gastos</option>
                    <option value="3">Movilidad Local</option>
                    <option value="1">Pasaje Aéreo / Terrestre</option>
                    <option value="5">Compras</option>
                  </select>
                </div>
              </div>

              {/* FILA 2: SERIE Y NÚMERO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Serie (Ej: F001, B001)
                  </label>
                  <input
                    type="text"
                    placeholder="F001"
                    value={formData.serie}
                    onChange={(e) => setFormData({ ...formData, serie: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Número Correlativo
                  </label>
                  <input
                    type="text"
                    placeholder="0001234"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* FILA 3: RUC CON CONSULTA AUTOMÁTICA EN SUNAT */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    RUC Proveedor
                  </label>
                  {sunatStatus && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      SUNAT: {sunatStatus.estado} - {sunatStatus.condicion}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="Ingrese RUC de 11 dígitos"
                      value={formData.ruc}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setFormData({ ...formData, ruc: val });
                        if (val.length === 11) {
                          consultarRucSunat(val);
                        }
                      }}
                      className="w-full h-9 pl-3 pr-8 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-teal-500 outline-none"
                    />
                    {isConsultingRuc && (
                      <Loader className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600 animate-spin" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => consultarRucSunat(formData.ruc)}
                    disabled={isConsultingRuc || formData.ruc.length !== 11}
                    className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar RUC</span>
                  </button>
                </div>
              </div>

              {/* FILA 4: RAZÓN SOCIAL / PROVEEDOR */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Razón Social / Nombre del Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Se autocompleta con el RUC de SUNAT"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-teal-500 outline-none"
                />
              </div>

              {/* FILA 5: FECHA Y TASA IGV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Fecha del Comprobante
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Tasa de IGV
                  </label>
                  <select
                    value={formData.igv}
                    onChange={(e) => setFormData({ ...formData, igv: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-teal-500 outline-none"
                  >
                    <option value="18.00">18% (General)</option>
                    <option value="10.00">10% (Restaurantes/Hoteles)</option>
                    <option value="0.00">0% (INAFECTO / Sin IGV)</option>
                  </select>
                </div>
              </div>

              {/* FILA 6: DETALLE O CONCEPTO */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Detalle / Descripción del Gasto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Almuerzo de trabajo, Taxi taller, Materiales..."
                  value={formData.detalle}
                  onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 outline-none"
                />
              </div>

              {/* FILA 7: IMPORTE TOTAL Y DESGLOSE EN VIVO */}
              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                    Importe Total Rendido (S/.)
                  </label>
                  {parseFloat(formData.importe) > 0 && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-slate-500 font-bold">
                        Base: <strong className="text-slate-800 font-black">S/. {previewCalc.base}</strong>
                      </span>
                      <span className="text-teal-700 font-bold">
                        IGV: <strong className="text-teal-800 font-black">S/. {previewCalc.igvMonto}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-black text-sm">
                    S/.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.importe}
                    onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                    className="w-full h-11 pl-9 pr-4 border-2 border-teal-500/80 rounded-xl text-base font-black text-slate-900 font-mono focus:border-teal-600 outline-none bg-white"
                  />
                </div>
              </div>

              {/* BOTONES DE ACCIÓN FOOTER */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoadingSave}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSave || !formData.importe || parseFloat(formData.importe) <= 0}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isLoadingSave ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Comprobante</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

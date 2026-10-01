import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Building2, UserCheck, Plus, Save, Trash2, Mail, Phone, Globe, MapPin, Loader, CheckCircle2, AlertCircle, Edit2, ExternalLink, ShieldCheck, Check, Sparkles, CreditCard, Printer, Copy, FileText, User, Briefcase, Image as ImageIcon, Upload, Calendar, Tag, Layers
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import RepresentanteModal from "./Modal/RepresentanteModal";
import { generarIniciales } from "@/utils/formatters";

// Helper para formatear fechas a DD/MM/YYYY
const formatDateDMY = (dateStr) => {
  if (!dateStr) return "S/N";
  try {
    const cleanStr = String(dateStr).split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {
    console.error(e);
  }
  return String(dateStr);
};

export default function ClienteDetalle({ cliente, onBack }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs } = useOutletContext() || {};

  const realId = cliente?.id_cliente || routeId;
  const isNew = routeId === "nuevo" || cliente?.isNew || (!realId || realId === "undefined");

  // CARGAR DATOS DEL CLIENTE DESDE LA API SI SE ACCEDE POR RUTA URL /maestro/comercial/20123
  const { data: clienteQueryData, isLoading: isLoadingCliente } = useQuery({
    queryKey: ["cliente-detalle", realId],
    queryFn: async () => {
      if (!realId || realId === "nuevo") return null;
      const res = await api.get(`core/clientes/?id_cliente=${realId}`);
      if (Array.isArray(res.data)) return res.data[0];
      return res.data;
    },
    enabled: !!realId && realId !== "nuevo",
  });

  const activeCliente = clienteQueryData || cliente;

  // ESTADO DE FORMULARIO DE CLIENTE CON LOS CAMPOS
  const [formData, setFormData] = useState({
    codigo: activeCliente?.id_cliente_formateado || (activeCliente?.id_cliente ? String(activeCliente.id_cliente).padStart(5, '0') : "NUEVO"),
    nombre: activeCliente?.nombre || "",
    iniciales: activeCliente?.iniciales || "",
    ruc: activeCliente?.ruc || "",
    direccion: activeCliente?.direccion || activeCliente?.dir || "",
    tipo: activeCliente?.tipo ?? 0,
    forma_pago: activeCliente?.forma_pago || activeCliente?.fpago || "CONTADO",
    fecha: activeCliente?.fecha || activeCliente?.fecha_ingreso ? (activeCliente?.fecha || activeCliente?.fecha_ingreso).split("T")[0] : new Date().toISOString().split('T')[0],
    rubro: activeCliente?.rubro || activeCliente?.rub || "",
    actividad: activeCliente?.actividad || activeCliente?.pro || "",
    pagina_web: activeCliente?.pagina_web || activeCliente?.web || "",
    representante_legal: activeCliente?.representante_legal || activeCliente?.rleg || "",
    ubicacion: activeCliente?.ubicacion || activeCliente?.ubic || "",
    logo: activeCliente?.logo || (activeCliente?.id_cliente ? `${String(activeCliente.id_cliente).padStart(5, '0')}.png` : "00000.png"),
    activo: String(activeCliente?.activo === true || activeCliente?.activo === "1" || activeCliente?.activo === 1 || isNew ? "1" : "0"),
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);

  useEffect(() => {
    if (activeCliente) {
      setFormData({
        codigo: activeCliente.id_cliente_formateado || (activeCliente.id_cliente ? String(activeCliente.id_cliente).padStart(5, '0') : "NUEVO"),
        nombre: activeCliente.nombre || "",
        iniciales: activeCliente.iniciales || "",
        ruc: activeCliente.ruc || "",
        direccion: activeCliente.direccion || activeCliente.dir || "",
        tipo: activeCliente.tipo ?? 0,
        forma_pago: activeCliente.forma_pago || activeCliente.fpago || "CONTADO",
        fecha: activeCliente.fecha || activeCliente.fecha_ingreso ? (activeCliente.fecha || activeCliente.fecha_ingreso).split("T")[0] : new Date().toISOString().split('T')[0],
        rubro: activeCliente.rubro || activeCliente.rub || "",
        actividad: activeCliente.actividad || activeCliente.pro || "",
        pagina_web: activeCliente.pagina_web || activeCliente.web || "",
        representante_legal: activeCliente.representante_legal || activeCliente.rleg || "",
        ubicacion: activeCliente.ubicacion || activeCliente.ubic || "",
        logo: activeCliente.logo || (activeCliente.id_cliente ? `${String(activeCliente.id_cliente).padStart(5, '0')}.png` : "00000.png"),
        activo: String(activeCliente.activo === true || activeCliente.activo === "1" || activeCliente.activo === 1 ? "1" : "0"),
      });
    }
  }, [clienteQueryData, cliente]);

  useEffect(() => {
    setImageFailed(false);
  }, [formData.logo, formData.codigo, logoPreview, logoVersion]);

  const getLogoFileName = () => {
    const raw = formData.logo || (formData.codigo && formData.codigo !== "NUEVO" ? `${formData.codigo}.png` : "00000.png");
    return String(raw).replace(/\\/g, "/").split("/").pop().split("?")[0] || "00000.png";
  };

  const getLogoUrl = () => {
    if (logoPreview) return logoPreview;
    const logoFile = encodeURIComponent(getLogoFileName());
    return `/api/core/clientes/logo/${logoFile}?v=${logoVersion || formData.codigo || "0"}`;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("jpg")) {
        toast.error("Por favor seleccione un archivo de imagen en formato PNG o JPG.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setImageFailed(false);
      };
      reader.readAsDataURL(file);

      if (formData.codigo && formData.codigo !== "NUEVO") {
        const uploadData = new FormData();
        uploadData.append("codigo", formData.codigo);
        uploadData.append("file", file);
        try {
          const res = await api.post("core/clientes/upload_logo/", uploadData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          const savedFilename = res.data?.logo || `${formData.codigo}.png`;
          setFormData(prev => ({ ...prev, logo: savedFilename }));
          setLogoVersion(Date.now());
          setImageFailed(false);
          toast.success(`Logo guardado en el servidor: ${savedFilename}`);
        } catch (err) {
          console.error("Error al subir logo:", err);
          toast.info("Vista previa de logo activa.");
        }
      }
    }
  };

  // CONFIGURACIÓN DE BREADCRUMBS PERSONALIZADOS EN LA BARRA SUPERIOR
  useEffect(() => {
    if (setCustomBreadcrumbs) {
      const isCompras = location.pathname.includes("/maestro/compras");
      const basePath = isCompras ? "/maestro/compras" : "/maestro/comercial";
      const moduleName = isCompras ? "MAESTRO COMPRAS" : "MAESTRO COMERCIAL";

      const crumbs = [
        { label: moduleName, path: basePath },
        { label: "CLIENTES", path: basePath },
      ];

      if (isNew) {
        crumbs.push({ label: "NUEVO CLIENTE" });
      } else if (formData.nombre) {
        crumbs.push({ label: formData.nombre.toUpperCase() });
      } else if (realId) {
        crumbs.push({ label: String(realId) });
      }

      setCustomBreadcrumbs(crumbs);
    }
  }, [location.pathname, isNew, formData.nombre, realId, setCustomBreadcrumbs]);

  const handleBackNav = () => {
    if (onBack) {
      onBack();
    } else {
      const isCompras = location.pathname.includes("/maestro/compras");
      const basePath = isCompras ? "/maestro/compras" : "/maestro/comercial";
      navigate(basePath);
    }
  };

  const [dirty, setDirty] = useState(false);

  // MODAL PARA AÑADIR/EDITAR REPRESENTANTES DE ESTE CLIENTE
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);

  // CARGAR REPRESENTANTES DEL CLIENTE ESPECÍFICO
  const { data: representantes = [], isLoading: isLoadingReps, isFetching: isFetchingReps } = useQuery({
    queryKey: ["representantes-cliente", realId],
    queryFn: async () => {
      if (!realId || realId === "nuevo") return [];
      const { data } = await api.get(`core/representantes/?id_cliente=${realId}`);
      return data.filter(r => r.nombre_representante !== null && r.nombre_representante.trim() !== "");
    },
    enabled: !!realId && !isNew,
  });

  // MUTACIÓN PARA GUARDAR DATOS DEL CLIENTE
  const saveClienteMutation = useMutation({
    mutationFn: async (payload) => {
      if (isNew) {
        return await api.post("core/clientes/", payload);
      } else {
        return await api.put("core/clientes/", payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      queryClient.invalidateQueries(["cliente-detalle", realId]);
      toast.success(isNew ? "Empresa registrada con éxito" : "Empresa actualizada correctamente");
      setDirty(false);
      handleBackNav();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.response?.data?.message || "Error al procesar la empresa";
      toast.error(msg);
    }
  });

  // MUTACIÓN PARA ELIMINAR CLIENTE
  const deleteClienteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete("core/clientes/", { data: { id_cliente: id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      toast.success("Empresa eliminada correctamente");
      handleBackNav();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo eliminar la empresa";
      toast.error(msg);
    }
  });

  // MUTACIÓN PARA GUARDAR REPRESENTANTE DE ESTE CLIENTE
  const saveRepMutation = useMutation({
    mutationFn: async (repPayload) => {
      const isEditRep = !!repPayload.id_representante;
      if (isEditRep) {
        return await api.put("core/representantes/", repPayload);
      } else {
        return await api.post("core/representantes/", repPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["representantes-cliente", realId]);
      queryClient.invalidateQueries(["maestra-representantes"]);
      toast.success(`Representante ${selectedRep ? 'actualizado' : 'registrado'} correctamente`);
      setRepModalOpen(false);
      setSelectedRep(null);
    },
    onError: (err) => {
      const errorData = err.response?.data;
      const msg = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
      toast.error(msg || "Error al guardar el representante");
    }
  });

  // MUTACIÓN PARA ELIMINAR REPRESENTANTE DE ESTE CLIENTE
  const deleteRepMutation = useMutation({
    mutationFn: async (idRep) => {
      return await api.delete("core/representantes/", { data: { id_representante: idRep } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["representantes-cliente", realId]);
      queryClient.invalidateQueries(["maestra-representantes"]);
      toast.success("Representante eliminado correctamente");
      setRepModalOpen(false);
      setSelectedRep(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al eliminar representante";
      toast.error(msg);
    }
  });

  const handleClienteChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "ruc" && value.length > 11) return;

    setFormData((prev) => {
      const nextData = {
        ...prev,
        [name]: name === "activo"
          ? (checked ? "1" : "0")
          : (type === "checkbox" ? (checked ? "1" : "0") : value),
      };
      if (name === "nombre" && (!prev.iniciales || prev.iniciales === generarIniciales(prev.nombre || ""))) {
        nextData.iniciales = generarIniciales(value);
      }
      return nextData;
    });
    setDirty(true);
  };

  const handleSaveCliente = () => {
    if (!formData.nombre?.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }
    if (formData.ruc && formData.ruc.length !== 11) {
      toast.error("El RUC debe tener exactamente 11 dígitos");
      return;
    }

    const payload = {
      ...formData,
      tipo: parseInt(formData.tipo) || 0,
      activo: formData.activo === "1" || formData.activo === 1 ? 1 : 0
    };

    if (!isNew && realId) {
      payload.id_cliente = realId;
    }

    saveClienteMutation.mutate(payload);
  };

  const handleDeleteCliente = () => {
    if (window.confirm(`¿Está seguro de eliminar la empresa "${formData.nombre}"?`)) {
      deleteClienteMutation.mutate(realId);
    }
  };

  const handleAddRep = () => {
    if (isNew) {
      toast.info("Primero debe guardar los datos de la empresa antes de registrar representantes.");
      return;
    }
    setSelectedRep(null);
    setRepModalOpen(true);
  };

  const handleEditRep = (rep) => {
    setSelectedRep(rep);
    setRepModalOpen(true);
  };

  // TIPO: 0->CLIENTE, 1->PROVEEDOR, 2->ESPECIAL
  const getTipoLabel = (tipoVal) => {
    const num = Number(tipoVal);
    if (num === 1) return "PROVEEDOR";
    if (num === 2) return "ESPECIAL";
    return "CLIENTE";
  };

  // Avatar con iniciales de la empresa
  const getInitials = (name) => {
    if (!name) return "CL";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const rlegNorm = (formData.representante_legal || "").trim().toLowerCase();
  const contactoPrincipal = representantes.find((r) => {
    const nom = (r.nombre_representante || "").trim().toLowerCase();
    return nom && rlegNorm && (nom === rlegNorm || nom.includes(rlegNorm) || rlegNorm.includes(nom));
  }) || representantes[0] || null;
  const contactoTelefono = contactoPrincipal?.telefono || contactoPrincipal?.movil || "";
  const contactoEmail = contactoPrincipal?.email || "";
  const logoUrl = getLogoUrl();
  const renderClienteLogo = (imgClass, fallbackClass = "text-lg") => (
    !imageFailed && logoUrl ? (
      <img
        key={logoUrl}
        src={logoUrl}
        alt={`Logo ${formData.nombre || "cliente"}`}
        onError={() => setImageFailed(true)}
        className={imgClass}
      />
    ) : (
      <span className={fallbackClass}>{getInitials(formData.nombre)}</span>
    )
  );

  if (isLoadingCliente) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
        <Loader className="w-9 h-9 text-cyan-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando Registro de Empresa...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-500 font-sans pb-12">
      
      {/* 1️⃣ ENCABEZADO EJECUTIVO SUPERIOR (RAZÓN SOCIAL PRIMERO + METADATOS) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* IDENTIFICACIÓN Y TÍTULO: RAZÓN SOCIAL EN LA PRIMERA FILA */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={handleBackNav}
              className="p-2.5 bg-slate-50 hover:bg-cyan-50 rounded-2xl text-slate-400 hover:text-cyan-600 border border-slate-200/60 transition-all group shrink-0 cursor-pointer"
              title="Volver al Directorio"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </button>

            <div>
              {/* FILA 1: RAZÓN SOCIAL Y BADGES DE ESTADO Y TIPO */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase font-sans">
                  {formData.nombre || "SUPERMERCADOS PERUANOS S.A."}
                </h1>
                
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                  isNew
                    ? "bg-cyan-50 text-cyan-700 border-cyan-200/50"
                    : formData.activo === "1"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {isNew ? "NUEVO REGISTRO" : (formData.activo === "1" ? "ACTIVO" : "INACTIVO")}
                </span>

                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                  Number(formData.tipo) === 1
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200/60"
                    : Number(formData.tipo) === 2
                    ? "bg-amber-50 text-amber-700 border-amber-200/60"
                    : "bg-cyan-50 text-cyan-700 border-cyan-200/60"
                }`}>
                  {getTipoLabel(formData.tipo)}
                </span>
              </div>

              {/* FILA 2: METADATOS ESTILO COMPRADETALLE (CÓDIGO, RUBRO, ACTIVIDAD, FECHA) */}
              <div className="flex items-center gap-4 mt-2.5 flex-wrap text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                  <Building2 className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Código:</span>
                  <span className="font-mono font-black text-slate-800">{formData.codigo}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Rubro:</span>
                  <span className="font-bold text-slate-800">{formData.rubro || "No especificado"}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                  <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Actividad:</span>
                  <span className="font-bold text-slate-800">{formData.actividad || "No especificada"}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Fecha Reg.:</span>
                  <span className="font-mono font-bold text-slate-800">{formatDateDMY(formData.fecha)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN SUPERIORES (SOLO ELIMINAR Y GUARDAR) */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
            {!isNew && (
              <button
                type="button"
                onClick={handleDeleteCliente}
                disabled={deleteClienteMutation.isLoading}
                className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                title="Eliminar Empresa"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteClienteMutation.isLoading ? "Eliminando..." : "Eliminar"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveCliente}
              disabled={saveClienteMutation.isLoading}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saveClienteMutation.isLoading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2️⃣ ESTRUCTURA PRINCIPAL EN 2 COLUMNAS (70% / 30%) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        
        {/* ================= COLUMNA IZQUIERDA (70%) ================= */}
        <div className="w-full xl:w-8/12 space-y-6">
          
          {/* FILA 1: IDENTIFICACIÓN (ANCHO COMPLETO) Y UBICACIÓN FISCAL */}
          <div className="grid grid-cols-1 gap-6">
            
            {/* SUB-CARD 1: IDENTIFICACIÓN — LOGO + DATOS A LA IZQUIERDA, CONTACTO PRINCIPAL A LA DERECHA */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 md:p-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100/80">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Identificación y Razón Social
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  CÓDIGO: {formData.codigo}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-stretch gap-5 md:gap-0 flex-1">
                {/* Identidad: logo circular + razón social, RUC, ubicación y estado */}
                <div className="flex-1 flex items-start gap-4 min-w-0 md:pr-6">
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-black flex items-center justify-center shadow-md shadow-cyan-600/20 shrink-0 border-2 border-white ring-2 ring-slate-100 overflow-hidden relative">
                    {renderClienteLogo("w-full h-full object-contain p-1.5 bg-white", "text-xl")}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleClienteChange}
                      className="w-full px-0 py-0.5 text-sm md:text-base font-black text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-cyan-500 transition-all outline-none uppercase tracking-tight"
                      placeholder="NOMBRE DE LA EMPRESA S.A.C."
                    />

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                      <span className="font-black uppercase tracking-wider text-[10px] text-slate-400 shrink-0">RUC:</span>
                      <input
                        type="text"
                        name="ruc"
                        value={formData.ruc}
                        onChange={handleClienteChange}
                        className="flex-1 min-w-0 px-0 py-0.5 text-xs font-bold text-slate-700 font-mono bg-transparent border-0 outline-none focus:text-slate-900"
                        placeholder="20100070970"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        name="ubicacion"
                        value={formData.ubicacion}
                        onChange={handleClienteChange}
                        className="flex-1 min-w-0 px-0 py-0.5 text-xs font-medium text-slate-600 bg-transparent border-0 outline-none focus:text-slate-900"
                        placeholder="Lima - Perú"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => handleClienteChange({ target: { name: "activo", checked: formData.activo !== "1", type: "checkbox" } })}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                          formData.activo === "1"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {formData.activo === "1" ? "ACTIVO" : "INACTIVO"}
                      </button>
                      <select
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleClienteChange}
                        className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-100 outline-none cursor-pointer"
                      >
                        <option value={0}>Cliente</option>
                        <option value={1}>Proveedor</option>
                        <option value={2}>Especial</option>
                      </select>
                      <input
                        type="text"
                        name="iniciales"
                        value={formData.iniciales}
                        onChange={handleClienteChange}
                        className="w-20 px-2 py-0.5 text-[10px] font-black uppercase font-mono text-cyan-800 bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:border-cyan-500 transition-all outline-none text-center"
                        placeholder="SIGLAS"
                        title="Iniciales"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto principal — misma distribución que la ficha de proveedor */}
                <div className="flex-1 md:border-l md:border-slate-100 md:pl-6 min-w-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Contacto principal
                    </span>
                    {contactoPrincipal && (
                      <button
                        type="button"
                        onClick={() => handleEditRep(contactoPrincipal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                        title="Editar representante"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                      {getInitials(formData.representante_legal || contactoPrincipal?.nombre_representante || formData.nombre)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        name="representante_legal"
                        value={formData.representante_legal}
                        onChange={handleClienteChange}
                        className="w-full px-0 py-0.5 text-sm font-bold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-cyan-500 transition-all outline-none"
                        placeholder="Nombre del contacto principal"
                      />
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {contactoPrincipal?.cargo || "Representante Legal"}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-cyan-700 pt-1 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className="font-mono truncate">{contactoTelefono || "Sin teléfono"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-cyan-700 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className="truncate">{contactoEmail || "Sin correo"}</span>
                      </div>
                    </div>
                  </div>

                  {!isNew && (
                    <button
                      type="button"
                      onClick={handleAddRep}
                      className="mt-auto pt-3 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 uppercase tracking-wide cursor-pointer text-left"
                    >
                      + Nuevo contacto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SUB-CARD 2: DIRECCIÓN Y UBICACIÓN FISCAL */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Dirección y Ubicación Fiscal
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Dirección Fiscal</label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleClienteChange}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    placeholder="CAL. MORELLI NRO. 181 INT. P-2 LIMA - LIMA - SAN BORJA"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Ubicación / Ciudad</label>
                    <input
                      type="text"
                      name="ubicacion"
                      value={formData.ubicacion}
                      onChange={handleClienteChange}
                      className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
                      placeholder="Lima - Peru"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1 flex items-center justify-between">
                      <span>Página Web</span>
                      {formData.pagina_web && (
                        <a
                          href={formData.pagina_web.startsWith("http") ? formData.pagina_web : `https://${formData.pagina_web}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-600 hover:underline flex items-center gap-0.5 lowercase font-normal"
                        >
                          visitar <ExternalLink size={10} />
                        </a>
                      )}
                    </label>
                    <input
                      type="text"
                      name="pagina_web"
                      value={formData.pagina_web}
                      onChange={handleClienteChange}
                      className="w-full px-3 py-1.5 text-xs font-medium text-cyan-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
                      placeholder="http://www.supermercadosperuanos.com.pe/"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Forma de Pago</label>
                  <input
                    type="text"
                    name="forma_pago"
                    value={formData.forma_pago}
                    onChange={handleClienteChange}
                    className="w-full px-3 py-1.5 text-xs font-bold uppercase text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    placeholder="CONTADO / CREDITO 30 DIAS"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FILA 2: TABLA COMPLETA DE REPRESENTANTES Y CONTACTOS DIRECTOS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 md:p-6 space-y-4 flex-1 flex flex-col min-h-[380px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl border border-cyan-100/80">
                  <UserCheck size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      3. Representantes y Contactos Directos
                    </h3>
                    {!isNew && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800">
                        {representantes.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Personas de contacto vinculadas directamente a {formData.nombre || "esta empresa"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddRep}
                disabled={isNew}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-cyan-600/20 active:scale-95 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Nuevo Representante</span>
              </button>
            </div>

            {/* TABLA HIGH-CONTRAST */}
            <div className="flex-1 min-h-0 overflow-hidden relative rounded-2xl border border-slate-200 bg-white">
              {(isLoadingReps || isFetchingReps) && (
                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader className="w-6 h-6 animate-spin text-cyan-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cargando Representantes</span>
                  </div>
                </div>
              )}

              {isNew ? (
                <div className="w-full h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <AlertCircle size={32} className="opacity-40 text-cyan-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Guarde los datos de la empresa para comenzar a registrar representantes
                  </span>
                </div>
              ) : representantes.length === 0 && !isLoadingReps ? (
                <div className="w-full h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <UserCheck size={32} className="opacity-40" />
                  <span className="text-xs font-bold uppercase tracking-wider">No hay representantes registrados para esta empresa</span>
                  <button
                    type="button"
                    onClick={handleAddRep}
                    className="mt-1 text-xs font-bold text-cyan-600 hover:underline uppercase cursor-pointer"
                  >
                    + Registrar primer representante
                  </button>
                </div>
              ) : (
                <Table
                  disablePagination={true}
                  headers={[
                    "Código", "Representante", "Cargo", "Contacto", "Email", "Estado", "Acciones"
                  ].map((h) => (
                    <span key={h} className="text-[10.5px] font-black py-2.5 uppercase tracking-wider text-slate-700 text-center block">
                      {h}
                    </span>
                  ))}
                  data={representantes}
                  onRowClick={(rep) => handleEditRep(rep)}
                  renderRow={(rep) => [
                    <span key="cod" className="text-xs font-bold text-slate-600 text-center block font-mono">
                      {rep.id_rep_formateado || String(rep.id_representante).padStart(5, '0')}
                    </span>,

                    <div key="rep" className="flex items-center gap-2 px-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {getInitials(rep.nombre_representante)}
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                        {rep.nombre_representante}
                      </span>
                    </div>,

                    <span key="cargo" className="text-[11px] font-semibold text-slate-600 text-center block italic">
                      {rep.cargo || "-"}
                    </span>,

                    <div key="contact" className="flex flex-col text-center">
                      <span className="text-xs font-mono font-bold text-slate-800">{rep.telefono || rep.movil || "-"}</span>
                      {rep.telefono && rep.movil && <span className="text-[9px] text-slate-400 font-mono">{rep.movil}</span>}
                    </div>,

                    <span key="email" className="text-xs text-cyan-700 font-medium text-center block truncate max-w-[180px]">
                      {rep.email || "-"}
                    </span>,

                    <div key="est" className="flex justify-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        rep.activo === true || rep.activo === "1" || rep.activo === 1
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}>
                        {(rep.activo === true || rep.activo === "1" || rep.activo === 1) ? "Activo" : "Inactivo"}
                      </span>
                    </div>,

                    <div key="act" className="flex justify-center items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRep(rep);
                        }}
                        className="p-1 hover:bg-slate-100 text-slate-600 hover:text-cyan-700 rounded-lg transition-colors cursor-pointer"
                        title="Editar Representante"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar al representante "${rep.nombre_representante}"?`)) {
                            deleteRepMutation.mutate(rep.id_representante);
                          }
                        }}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Representante"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ]}
                />
              )}
            </div>
          </div>
        </div>

        {/* ================= COLUMNA DERECHA LATERAL (30%) ================= */}
        <div className="w-full xl:w-4/12 space-y-6">
          
          {/* WIDGET 1: RESUMEN Y ANÁLISIS COMERCIAL (SIGECOM AI / INSIGHTS) */}
          <div className="bg-gradient-to-br from-cyan-50/70 via-teal-50/40 to-slate-50/60 rounded-3xl border border-cyan-200/70 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-cyan-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-cyan-600 text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Resumen Comercial
                  </span>
                  <span className="text-[10px] font-bold text-cyan-700 block -mt-0.5">
                    Insights y Verificación
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-600 text-white">
                SIGECOM AI
              </span>
            </div>

            {/* Tarjeta 1: Total Contactos */}
            <div className="bg-white/80 rounded-2xl p-3.5 border border-cyan-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-bold text-slate-800">Contactos Vinculados</span>
                </div>
                <span className="text-xs font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                  {representantes.length} Registrados
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {representantes.length > 0 
                  ? `Se cuenta con ${representantes.length} persona(s) de contacto directa(s) lista(s) para cotizaciones y logística.`
                  : "No hay contactos registrados aún. Se recomienda vincular al menos un representante."}
              </p>
            </div>

            {/* Tarjeta 2: Verificación Fiscal */}
            <div className="bg-white/80 rounded-2xl p-3.5 border border-cyan-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Estado Fiscal</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                  formData.ruc && formData.ruc.length === 11 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {formData.ruc && formData.ruc.length === 11 ? "RUC Válido" : "Sin RUC Válido"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {formData.ruc && formData.ruc.length === 11 
                  ? `Empresa configurada con RUC ${formData.ruc} bajo condición activa.`
                  : "Es obligatorio registrar un RUC de 11 dígitos para emitir cotizaciones."}
              </p>
            </div>

            {/* Tarjeta 3: Forma de Pago */}
            <div className="bg-white/80 rounded-2xl p-3.5 border border-cyan-100 shadow-2xs space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Condición Comercial</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Forma de Pago Predeterminada:</span>
                <span className="text-xs font-black text-cyan-800 uppercase bg-cyan-100/70 px-2.5 py-0.5 rounded-md">
                  {formData.forma_pago || "CONTADO"}
                </span>
              </div>
            </div>
          </div>

          {/* WIDGET 2: LOGO CLIENTE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100/80">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Logo Cliente
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                    Vista previa PNG (608x402 px)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                {getLogoFileName()}
              </span>
            </div>

            <div className="w-full h-44 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center p-3 relative overflow-hidden group">
              {!imageFailed && logoUrl ? (
                <img
                  key={logoUrl}
                  src={logoUrl}
                  alt={`Logo ${formData.nombre}`}
                  onError={() => setImageFailed(true)}
                  className="max-h-full max-w-full object-contain rounded-lg drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {getInitials(formData.nombre)}
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {formData.nombre || "Sin Logo Asignado"}
                  </span>
                </div>
              )}
            </div>

            <label className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Imagen PNG</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* WIDGET 3: PARÁMETROS MAESTROS Y ESTADO */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Parámetros del Sistema
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-600">Estado de Operación:</span>
                <button
                  type="button"
                  onClick={() => handleClienteChange({ target: { name: "activo", checked: formData.activo !== "1", type: "checkbox" } })}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                    formData.activo === "1"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {formData.activo === "1" ? "ACTIVO" : "INACTIVO"}
                </button>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium">Código Interno:</span>
                <span className="font-mono font-bold text-slate-800">{formData.codigo}</span>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium">Tipo:</span>
                <span className="font-bold text-cyan-700">{getTipoLabel(formData.tipo)}</span>
              </div>
            </div>
          </div>

          {/* WIDGET 4: ACCIONES RÁPIDAS DE MAESTRO */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
              Acciones Rápidas
            </span>

            <button
              type="button"
              onClick={() => toast.info("Generando ficha técnica de empresa en PDF...")}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-2xs active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Imprimir Ficha
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (formData.ruc) {
                  navigator.clipboard.writeText(formData.ruc);
                  toast.success(`RUC ${formData.ruc} copiado al portapapeles`);
                } else {
                  toast.warning("No hay RUC registrado para copiar");
                }
              }}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-2xs active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                Copiar RUC
              </span>
              <span className="text-[10px] text-slate-400 font-mono">CLIPBOARD</span>
            </button>
          </div>

        </div>
      </div>

      {/* MODAL DE REGISTRO/EDICIÓN DE REPRESENTANTES */}
      {repModalOpen && (
        <RepresentanteModal
          open={repModalOpen}
          onClose={() => {
            setRepModalOpen(false);
            setSelectedRep(null);
          }}
          repData={selectedRep ? { ...selectedRep, id_cliente: realId } : { id_cliente: realId }}
          representantes={representantes}
          onGuardar={(data) => {
            saveRepMutation.mutate({ ...data, id_cliente: realId });
          }}
          onEliminar={(idRep) => deleteRepMutation.mutate(idRep)}
        />
      )}
    </div>
  );
}

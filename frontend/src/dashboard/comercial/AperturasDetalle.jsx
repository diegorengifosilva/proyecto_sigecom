import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import api from '@/services/api';
import { toast } from '@/utils/toast';
import DatePicker, { registerLocale } from "react-datepicker";
import es from 'date-fns/locale/es';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { useCotizacionSuministros } from '@/hook/useCotizacionSuministros';
import { useCotizacionServicios } from '@/hook/useCotizacionServicios';
import { useCotizacionAcciones } from '@/hook/useCotizacionAcciones';

registerLocale('es', es);

const Icon = ({ name, className }) => {
  const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

const CompactField = ({ label, children, className }) => {
  return (
    <div className={cn("bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-center min-h-[50px]", className)}>
      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5 block">{label}</span>
      <div className="text-[10px] font-black text-gray-900 uppercase truncate">{children}</div>
    </div>
  );
};

const getInitials = (name) => {
  const parts = (name || '').trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name) => {
  const gradients = [
    "from-indigo-500 to-cyan-500",
    "from-teal-500 to-emerald-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-indigo-500"
  ];
  let sum = 0;
  for (let i = 0; i < (name || '').length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
};

export default function AperturasDetalle({ idRegistro }) {
  const { numReg } = useParams(); // id_apertura o id_registro legacy fallback
  const navigate = useNavigate();
  
  const activeIdRegistro = idRegistro || numReg;
  
  const [aperturas, setAperturas] = useState([]);
  const [formsState, setFormsState] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Handle closing preview modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setPreviewDoc(null);
      }
    };
    const handleMessage = (e) => {
      if (e.data && e.data.type === "close-report-modal") {
        setPreviewDoc(null);
      }
    };

    if (previewDoc) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("message", handleMessage);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("message", handleMessage);
    };
  }, [previewDoc]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usuariosActivos, setUsuariosActivos] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [showAsignarPanel, setShowAsignarPanel] = useState(false);
  const [filterAssignedOnly, setFilterAssignedOnly] = useState(false);
  const [isTotalFocused, setIsTotalFocused] = useState({});
  const [totalInputState, setTotalInputState] = useState({});
  const [deletedOcIds, setDeletedOcIds] = useState(new Set());
  const [isProcessingNewOc, setIsProcessingNewOc] = useState(false);
  const [uploadingOcId, setUploadingOcId] = useState(null);

  const visibleAperturas = useMemo(() => {
    return aperturas.filter(ap => !deletedOcIds.has(ap.id_apertura));
  }, [aperturas, deletedOcIds]);
  
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  const toggleGrupo = (grupoId) => {
    setGruposExpandidos(prev => {
      const current = prev[grupoId] !== false;
      return { ...prev, [grupoId]: !current };
    });
  };
  // State to manage expanded/collapsed OC cards
  const [ocExpanded, setOcExpanded] = useState({});
  const toggleOc = (id) => {
    setOcExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };
  // Initialize all OCs as expanded when data loads
  useEffect(() => {
    if (aperturas && aperturas.length) {
      const init = {};
      aperturas.forEach(ap => { init[ap.id_apertura] = true; });
      setOcExpanded(init);
    }
  }, [aperturas]);

  const parseSafeDate = (dateStr) => {
    if (!dateStr) return null;
    const isoStr = String(dateStr).replace(' ', 'T');
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const initialFormState = (ap) => ({
    id_apertura: ap.id_apertura,
    numero_orden: ap.numero_orden || '',
    fecha_orden: parseSafeDate(ap.fecha_orden),
    fecha_entrega: parseSafeDate(ap.fecha_entrega),
    fecha_factura: parseSafeDate(ap.fecha_factura),
    mes_entrega: ap.mes_entrega !== null ? String(ap.mes_entrega).padStart(2, '0') : '',
    total_orden: Number(ap.total_orden || 0),
    presupuesto: Number(ap.presupuesto || 0),
    prio: String(ap.prio || '0'),
    envio: Number(ap.envio || 1),
    estado_orden: ap.estado_orden !== null && ap.estado_orden !== undefined ? Number(ap.estado_orden) : 1,
    oobs: ap.oobs || '',
    orden_adjunta: ap.orden_adjunta || '',
    orden_plazo_valor: ap.orden_plazo_valor !== null ? Number(ap.orden_plazo_valor) : 0,
    orden_plazo_unidad: ap.orden_plazo_unidad !== null ? Number(ap.orden_plazo_unidad) : 1,
    orden_compra_equipos: Number(ap.orden_compra_equipos || 0),
    orden_compra_materiales: Number(ap.orden_compra_materiales || 0),
    orden_compra_hh: Number(ap.orden_compra_hh || 0),
    orden_compra_entrega: Number(ap.orden_compra_entrega || 0),
    orden_compra_costo_servicios: Number(ap.orden_compra_costo_servicios || 0),
    orden_compra_otros: Number(ap.orden_compra_otros || 0),
    uti_des: Number(ap.uti_des || 0),
    doc: ap.doc,
    ti1: ap.ti1,
    tiene_archivo_fisico: ap.tiene_archivo_fisico || false,
    extension_archivo_fisico: ap.extension_archivo_fisico || null
  });

  const isFormDirty = (formObj, dbObj) => {
    if (!dbObj || !formObj) return false;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };
    
    const formatFormDate = (dateObj) => {
      if (!dateObj) return '';
      try {
        return dateObj.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    return (
      formObj.numero_orden !== (dbObj.numero_orden || '') ||
      formatFormDate(formObj.fecha_orden) !== formatDate(dbObj.fecha_orden) ||
      formatFormDate(formObj.fecha_entrega) !== formatDate(dbObj.fecha_entrega) ||
      formatFormDate(formObj.fecha_factura) !== formatDate(dbObj.fecha_factura) ||
      formObj.mes_entrega !== (dbObj.mes_entrega !== null ? String(dbObj.mes_entrega).padStart(2, '0') : '') ||
      Number(formObj.total_orden) !== Number(dbObj.total_orden || 0) ||
      Number(formObj.presupuesto) !== Number(dbObj.presupuesto || 0) ||
      formObj.prio !== String(dbObj.prio || '0') ||
      formObj.envio !== Number(dbObj.envio || 1) ||
      formObj.estado_orden !== Number(dbObj.estado_orden || 1) ||
      formObj.oobs !== (dbObj.oobs || '') ||
      formObj.orden_adjunta !== (dbObj.orden_adjunta || '') ||
      Number(formObj.orden_plazo_valor) !== Number(dbObj.orden_plazo_valor || 0) ||
      Number(formObj.orden_plazo_unidad) !== Number(dbObj.orden_plazo_unidad || 1) ||
      Number(formObj.orden_compra_equipos) !== Number(dbObj.orden_compra_equipos || 0) ||
      Number(formObj.orden_compra_materiales) !== Number(dbObj.orden_compra_materiales || 0) ||
      Number(formObj.orden_compra_hh) !== Number(dbObj.orden_compra_hh || 0) ||
      Number(formObj.orden_compra_entrega) !== Number(dbObj.orden_compra_entrega || 0) ||
      Number(formObj.orden_compra_costo_servicios) !== Number(dbObj.orden_compra_costo_servicios || 0) ||
      Number(formObj.orden_compra_otros) !== Number(dbObj.orden_compra_otros || 0) ||
      (formObj.doc ?? null) !== (dbObj.doc ?? null) ||
      (formObj.ti1 ?? null) !== (dbObj.ti1 ?? null)
    );
  };

  const [quoteDetails, setQuoteDetails] = useState(null);

  // Cargar datos de las aperturas de este registro
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        
        const [apRes, quoteRes] = await Promise.all([
          api.get(`cotizaciones/aperturas_por_registro/${activeIdRegistro}/`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: [] })),
          api.get(`cotizaciones/cotizacion_detalle/${activeIdRegistro}/`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: null }))
        ]);
        
        if (quoteRes.data) {
          setQuoteDetails(quoteRes.data);
        }

        const list = Array.isArray(apRes.data) ? apRes.data : (apRes.data ? [apRes.data] : []);
        
        const sharedResponsibles = list.find(a => a.responsables)?.responsables || "";
        const syncedList = list.map(a => ({ ...a, responsables: sharedResponsibles }));
        
        setAperturas(syncedList);
        
        const initialForms = {};
        syncedList.forEach(ap => {
          initialForms[ap.id_apertura] = initialFormState(ap);
        });
        setFormsState(initialForms);
      } catch (err) {
        console.error("Error al cargar detalle de apertura:", err);
        toast.error("No se pudo cargar la información de la apertura.");
      } finally {
        setLoading(false);
      }
    };
    
    if (activeIdRegistro) {
      fetchDetail();
    }
  }, [activeIdRegistro]);

  const handleCrearNuevaOCConArchivo = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessingNewOc(true);
    const ocrToast = toast.info("Procesando archivo con OCR... por favor espere.", { autoClose: false });
    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        `cotizaciones/aperturas_por_registro/${activeIdRegistro}/nueva_oc/`, 
        formData, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      toast.dismiss(ocrToast);
      toast.success("Nueva Orden de Compra procesada y añadida correctamente.");
      
      // The optimized backend view returns all apertures directly
      const list = Array.isArray(res.data) ? res.data : [res.data];
      
      // Sync responsibles across all OCs in memory
      const sharedResponsibles = list.find(a => a.responsables)?.responsables || "";
      const syncedList = list.map(a => ({ ...a, responsables: sharedResponsibles }));
      
      setAperturas(syncedList);
      
      const newForms = {};
      syncedList.forEach(ap => {
        newForms[ap.id_apertura] = initialFormState(ap);
      });
      setFormsState(newForms);

      // Find the newly created OC card to expand it automatically
      const newAp = syncedList.find(a => !aperturas.some(prev => prev.id_apertura === a.id_apertura));
      if (newAp) {
        setOcExpanded(prev => ({
          ...prev,
          [newAp.id_apertura]: true
        }));
      }
    } catch (err) {
      toast.dismiss(ocrToast);
      console.error("Error al crear nueva OC con archivo:", err);
      toast.error(err.response?.data?.error || "Ocurrió un error al intentar crear y procesar la nueva Orden de Compra.");
    } finally {
      setIsProcessingNewOc(false);
      event.target.value = '';
    }
  };

  // Manejar cambios de input
  const handleChange = (idApertura, field, val) => {
    let updatedFormRef = null;
    setFormsState(prev => {
      const current = prev[idApertura];
      if (!current) return prev;
      
      const updatedForm = {
        ...current,
        [field]: val
      };

      if ([
        'total_orden',
        'orden_compra_equipos',
        'orden_compra_materiales',
        'orden_compra_hh',
        'orden_compra_entrega',
        'orden_compra_costo_servicios',
        'orden_compra_otros'
      ].includes(field)) {
        const costSum = 
          Number(field === 'orden_compra_equipos' ? val : updatedForm.orden_compra_equipos) +
          Number(field === 'orden_compra_materiales' ? val : updatedForm.orden_compra_materiales) +
          Number(field === 'orden_compra_hh' ? val : updatedForm.orden_compra_hh) +
          Number(field === 'orden_compra_entrega' ? val : updatedForm.orden_compra_entrega) +
          Number(field === 'orden_compra_costo_servicios' ? val : updatedForm.orden_compra_costo_servicios) +
          Number(field === 'orden_compra_otros' ? val : updatedForm.orden_compra_otros);
        updatedForm.uti_des = Number(field === 'total_orden' ? val : updatedForm.total_orden) - costSum;
      }

      // Calcular Fecha de Entrega Real dinámicamente en el formulario
      if (field === 'fecha_orden' || field === 'orden_plazo_valor' || field === 'orden_plazo_unidad') {
        const fo = field === 'fecha_orden' ? val : updatedForm.fecha_orden;
        const op_val = field === 'orden_plazo_valor' ? val : updatedForm.orden_plazo_valor;
        const op_uni = field === 'orden_plazo_unidad' ? val : updatedForm.orden_plazo_unidad;
        
        if (fo && op_val !== undefined && op_val !== null) {
          const days = Number(op_uni) === 1 ? Number(op_val) : (Number(op_uni) === 2 ? Number(op_val) * 7 : Number(op_val) * 30);
          try {
            const dateObj = new Date(fo);
            dateObj.setDate(dateObj.getDate() + days);
            updatedForm.fecha_entrega = dateObj;
          } catch (e) {
            console.error("Error setting date", e);
          }
        }
      }

      updatedFormRef = updatedForm;
      return {
        ...prev,
        [idApertura]: updatedForm
      };
    });

    if (updatedFormRef) {
      autoSaveForm(idApertura, updatedFormRef);
    }
  };

  const quote = useMemo(() => {
    return quoteDetails || visibleAperturas[0]?.id_registro || aperturas[0]?.id_registro || {};
  }, [quoteDetails, visibleAperturas, aperturas]);

  useEffect(() => {
    const codeToShow = quote?.codigo || quote?.numero;
    if (codeToShow) {
      window.dispatchEvent(new CustomEvent("sigecom-breadcrumb-label", {
        detail: {
          path: window.location.pathname,
          label: codeToShow
        }
      }));
    }
  }, [quote?.codigo, quote?.numero]);
  
  const quoteId = quote.id_registro;
  const currencySymbol = quote.tipo_moneda === 'D' ? '$' : 'S/.';

  // Lógica de acciones globales (Nueva versión, Generar copia, Eliminar)
  const { eliminarCotizacion } = useCotizacionAcciones(activeIdRegistro);

  const handleConfirmarEliminacionRegistro = () => {
    toast.error(({ closeToast }) => (
      <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
        <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 border-b border-rose-100">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-rose-100">
            <Icon name="trash" className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">Eliminar Registro Completo</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] text-gray-600 leading-tight">
            ¿Estás seguro de que deseas <span className="font-bold text-red-600 underline decoration-red-200 underline-offset-2">eliminar permanentemente</span> este registro completo? Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-4 pb-3">
          <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
          <button
            onClick={() => { eliminarCotizacion.mutate(); closeToast(); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-red-200 hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <span>Confirmar Eliminación</span>
            <Icon name="trash" className="h-3 w-3 opacity-70" />
          </button>
        </div>
      </div>
    ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
  };

  // Cargar suministros y servicios de la cotización
  const { gruposSuministros, handleEliminarItem: handleEliminarItemSuministro } = useCotizacionSuministros(
    quoteId,
    quote?.id_tipo === "V" || quote?.id_tipo_cotizacion === "V",
    quote?.tipo_venta
  );
  const { gruposServicios, handleEliminarItemServicio } = useCotizacionServicios(quoteId);

  const sortedGruposSuministros = useMemo(() => {
    return Object.values(gruposSuministros || {}).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [gruposSuministros]);

  const sortedGruposServicios = useMemo(() => {
    return Object.values(gruposServicios || {}).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [gruposServicios]);

  const equiposGroups = useMemo(() => {
    return sortedGruposSuministros.filter(g => {
      const isMateriales = String(g.codigo_grupo).includes('MT') || g.id_tipo_gasto === 2;
      return !isMateriales;
    });
  }, [sortedGruposSuministros]);

  const materialesGroups = useMemo(() => {
    return sortedGruposSuministros.filter(g => {
      const isMateriales = String(g.codigo_grupo).includes('MT') || g.id_tipo_gasto === 2;
      return isMateriales;
    });
  }, [sortedGruposSuministros]);

  const formatMoney = (val) => {
    return `${currencySymbol} ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Totales consolidados de la cotización/proyecto
  const quoteTotals = useMemo(() => {
    let equiposCost = 0;
    let equiposSale = 0;
    let materialesCost = 0;
    let materialesSale = 0;

    equiposGroups.forEach(grupo => {
      const qty = Number(grupo.cantidad || 1);
      (grupo.items || []).forEach(item => {
        equiposCost += Number(item.costo_total || 0) * qty;
        equiposSale += Number(item.venta_total || 0) * qty;
      });
    });

    materialesGroups.forEach(grupo => {
      const qty = Number(grupo.cantidad || 1);
      (grupo.items || []).forEach(item => {
        materialesCost += Number(item.costo_total || 0) * qty;
        materialesSale += Number(item.venta_total || 0) * qty;
      });
    });

    let hhCost = 0;
    let hhSale = 0;
    let serviciosCost = 0;
    let serviciosSale = 0;
    let otrosCost = 0;
    let otrosSale = 0;

    sortedGruposServicios.forEach(grupo => {
      const qty = Number(grupo.cantidad || 1);
      (grupo.subgrupos || []).forEach(sub => {
        const isMO = sub.tipoCodigo?.endsWith('04') || sub.id_tipo_gasto === 4 || sub.id_tipo_gasto === 3;
        const isGastos = sub.tipoCodigo?.endsWith('05') || sub.id_tipo_gasto === 5 || sub.id_tipo_gasto === 4;
        const isOtros = sub.tipoCodigo?.endsWith('06') || sub.id_tipo_gasto === 6 || sub.id_tipo_gasto === 5;

        (sub.items || []).forEach(item => {
          const itemCost = Number(item.costo_total || 0);
          const itemSale = Number(item.cotizado_total || 0);

          if (isMO) {
            hhCost += itemCost * qty;
            hhSale += itemSale * qty;
          } else if (isGastos) {
            serviciosCost += itemCost * qty;
            serviciosSale += itemSale * qty;
          } else if (isOtros) {
            otrosCost += itemCost * qty;
            otrosSale += itemSale * qty;
          }
        });
      });
    });

    return {
      equiposCost,
      equiposSale,
      materialesCost,
      materialesSale,
      hhCost,
      hhSale,
      serviciosCost,
      serviciosSale,
      otrosCost,
      otrosSale
    };
  }, [equiposGroups, materialesGroups, sortedGruposServicios]);

  const isSuministroChecked = (docVal, groupCode) => {
    if (docVal === null || docVal === undefined) return true;
    const codes = docVal.split(',').map(s => s.trim()).filter(Boolean);
    return codes.includes(String(groupCode));
  };

  const isServicioChecked = (ti1Val, serviceId) => {
    if (ti1Val === null || ti1Val === undefined) return true;
    const ids = ti1Val.split(',').map(s => s.trim()).filter(Boolean);
    return ids.includes(String(serviceId));
  };

  const recalculateCostsForForm = (f) => {
    let equiposCost = 0;
    let equiposSale = 0;
    let materialesCost = 0;
    let materialesSale = 0;

    sortedGruposSuministros.forEach(grupo => {
      if (isSuministroChecked(f.doc, grupo.codigo_grupo)) {
        const isMateriales = String(grupo.codigo_grupo).includes('MT') || grupo.id_tipo_gasto === 2;
        const qty = Number(grupo.cantidad || 1);
        (grupo.items || []).forEach(item => {
          const cost = Number(item.costo_total || 0) * qty;
          const sale = Number(item.venta_total || 0) * qty;
          if (isMateriales) {
            materialesCost += cost;
            materialesSale += sale;
          } else {
            equiposCost += cost;
            equiposSale += sale;
          }
        });
      }
    });

    let hhCost = 0;
    let hhSale = 0;
    let serviciosCost = 0;
    let serviciosSale = 0;
    let otrosCost = 0;
    let otrosSale = 0;

    sortedGruposServicios.forEach(grupo => {
      if (isServicioChecked(f.ti1, grupo.id_servicio)) {
        const qty = Number(grupo.cantidad || 1);
        (grupo.subgrupos || []).forEach(sub => {
          const isMO = sub.tipoCodigo?.endsWith('04') || sub.id_tipo_gasto === 4 || sub.id_tipo_gasto === 3;
          const isGastos = sub.tipoCodigo?.endsWith('05') || sub.id_tipo_gasto === 5 || sub.id_tipo_gasto === 4;
          const isOtros = sub.tipoCodigo?.endsWith('06') || sub.id_tipo_gasto === 6 || sub.id_tipo_gasto === 5;

          (sub.items || []).forEach(item => {
            const itemCost = Number(item.costo_total || 0) * qty;
            const itemSale = Number(item.cotizado_total || 0) * qty;

            if (isMO) {
              hhCost += itemCost;
              hhSale += itemSale;
            } else if (isGastos) {
              serviciosCost += itemCost;
              serviciosSale += itemSale;
            } else if (isOtros) {
              otrosCost += itemCost;
              otrosSale += itemSale;
            }
          });
        });
      }
    });

    const total_orden = equiposSale + materialesSale + hhSale + serviciosSale + otrosSale;
    const costsSum = equiposCost + materialesCost + hhCost + Number(f.orden_compra_entrega || 0) + serviciosCost + otrosCost;
    const uti_des = total_orden - costsSum;

    return {
      ...f,
      orden_compra_equipos: Number(equiposCost.toFixed(2)),
      orden_compra_materiales: Number(materialesCost.toFixed(2)),
      orden_compra_hh: Number(hhCost.toFixed(2)),
      orden_compra_costo_servicios: Number(serviciosCost.toFixed(2)),
      orden_compra_otros: Number(otrosCost.toFixed(2)),
      total_orden: Number(total_orden.toFixed(2)),
      uti_des: Number(uti_des.toFixed(2))
    };
  };

  const handleToggleSuministroGroup = (idApertura, groupCode) => {
    let updatedFormRef = null;
    setFormsState(prev => {
      const current = prev[idApertura];
      if (!current) return prev;

      let currentChecked;
      if (current.doc === null || current.doc === undefined) {
        currentChecked = sortedGruposSuministros.map(g => String(g.codigo_grupo));
      } else {
        currentChecked = current.doc.split(',').map(s => s.trim()).filter(Boolean);
      }

      const strCode = String(groupCode);
      let nextChecked;
      if (currentChecked.includes(strCode)) {
        nextChecked = currentChecked.filter(c => c !== strCode);
      } else {
        nextChecked = [...currentChecked, strCode];
      }

      const nextDoc = nextChecked.join(',');
      const updatedForm = recalculateCostsForForm({
        ...current,
        doc: nextDoc
      });

      updatedFormRef = updatedForm;
      return {
        ...prev,
        [idApertura]: updatedForm
      };
    });

    if (updatedFormRef) {
      autoSaveForm(idApertura, updatedFormRef);
    }
  };

  const handleToggleServicioGroup = (idApertura, serviceId) => {
    let updatedFormRef = null;
    setFormsState(prev => {
      const current = prev[idApertura];
      if (!current) return prev;

      let currentChecked;
      if (current.ti1 === null || current.ti1 === undefined) {
        currentChecked = sortedGruposServicios.map(g => String(g.id_servicio));
      } else {
        currentChecked = current.ti1.split(',').map(s => s.trim()).filter(Boolean);
      }

      const strId = String(serviceId);
      let nextChecked;
      if (currentChecked.includes(strId)) {
        nextChecked = currentChecked.filter(c => c !== strId);
      } else {
        nextChecked = [...currentChecked, strId];
      }

      const nextTi1 = nextChecked.join(',');
      const updatedForm = recalculateCostsForForm({
        ...current,
        ti1: nextTi1
      });

      updatedFormRef = updatedForm;
      return {
        ...prev,
        [idApertura]: updatedForm
      };
    });

    if (updatedFormRef) {
      autoSaveForm(idApertura, updatedFormRef);
    }
  };

  // Subir Orden de Compra PDF/Excel/Word para una OC específica
  const handleFileUpload = async (event, idApertura) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingOcId(idApertura);
    const uploadToast = toast.info("Subiendo y procesando Orden de Compra (OCR)...", { autoClose: false });
    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(`cotizaciones/apertura_detalle/${idApertura}/subir_oc/`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.dismiss(uploadToast);
      
      if (res.data.ok && res.data.apertura) {
        const updatedAp = res.data.apertura;
        
        // Sync responsibles from memory to the updated aperture
        const sharedResponsibles = visibleAperturas.find(a => a.responsables)?.responsables || aperturas.find(a => a.responsables)?.responsables || "";
        if (sharedResponsibles) {
          updatedAp.responsables = sharedResponsibles;
        }

        setFormsState(prev => ({
          ...prev,
          [idApertura]: initialFormState(updatedAp)
        }));
        setAperturas(prev => prev.map(a => a.id_apertura === idApertura ? updatedAp : a));
        toast.success(res.data.message || "Orden de Compra procesada y vinculada correctamente.");
      } else if (res.data.ok) {
        setFormsState(prev => ({
          ...prev,
          [idApertura]: {
            ...prev[idApertura],
            orden_adjunta: res.data.orden_adjunta,
            tiene_archivo_fisico: res.data.tiene_archivo_fisico || false,
            extension_archivo_fisico: res.data.extension_archivo_fisico || null
          }
        }));
        setAperturas(prev => prev.map(a => a.id_apertura === idApertura ? { 
          ...a, 
          orden_adjunta: res.data.orden_adjunta,
          tiene_archivo_fisico: res.data.tiene_archivo_fisico || false,
          extension_archivo_fisico: res.data.extension_archivo_fisico || null
        } : a));
        toast.success(res.data.message || "Orden de Compra adjuntada correctamente.");
      }
    } catch (err) {
      toast.dismiss(uploadToast);
      console.error("Error al subir archivo:", err);
      toast.error(err.response?.data?.error || "Error al intentar subir el archivo.");
    } finally {
      setUploadingOcId(null);
      event.target.value = '';
    }
  };

  const handleReprocesarOc = async (idApertura) => {
    setUploadingOcId(idApertura);
    const procToast = toast.info("Re-procesando y actualizando lectura de OC (OCR)...", { autoClose: false });
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(`cotizaciones/apertura_detalle/${idApertura}/reprocesar_oc/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(procToast);
      if (res.data.ok && res.data.apertura) {
        const updatedAp = res.data.apertura;
        setFormsState(prev => ({
          ...prev,
          [idApertura]: initialFormState(updatedAp)
        }));
        setAperturas(prev => prev.map(a => a.id_apertura === idApertura ? updatedAp : a));
        toast.success(res.data.message || "Orden de compra re-procesada y vinculada correctamente.");
      }
    } catch (err) {
      toast.dismiss(procToast);
      console.error("Error al re-procesar OC:", err);
      toast.error(err.response?.data?.error || "Error al intentar re-procesar la Orden de Compra.");
    } finally {
      setUploadingOcId(null);
    }
  };

  const handleVerOrden = (idApertura, tieneFisico, urlAdjunta) => {
    let url = "";
    let name = "";
    let extension = "";

    if (tieneFisico) {
      url = `${api.defaults.baseURL}/cotizaciones/ocfiles/ver/${idApertura}/`;
      name = `${idApertura}`;
      const f = formsState[idApertura];
      extension = f?.extension_archivo_fisico || '.pdf';
      name += extension;
    } else if (urlAdjunta) {
      if (urlAdjunta.startsWith('http://') || urlAdjunta.startsWith('https://')) {
        url = urlAdjunta;
      } else {
        const rootURL = api.defaults.baseURL.replace(/\/api\/?$/, '');
        const relativePath = urlAdjunta.startsWith('/') ? urlAdjunta : `/${urlAdjunta}`;
        url = `${rootURL}${relativePath}`;
      }
      name = urlAdjunta.substring(urlAdjunta.lastIndexOf('/') + 1) || "Enlace Externo";
      
      const lastDot = urlAdjunta.lastIndexOf('.');
      if (lastDot !== -1 && urlAdjunta.length - lastDot <= 5) {
        extension = urlAdjunta.substring(lastDot).toLowerCase();
      }
    }

    if (url) {
      const cleanUrl = url.replace(/([^:]\/)\/+/g, "$1");
      setPreviewDoc({ url: cleanUrl, name, extension });
    } else {
      toast.error("No hay ningún documento adjunto para visualizar.");
    }
  };

  const saveTimeoutRef = useRef({});

  const autoSaveForm = (idApertura, updatedForm) => {
    if (saveTimeoutRef.current[idApertura]) {
      clearTimeout(saveTimeoutRef.current[idApertura]);
    }
    saveTimeoutRef.current[idApertura] = setTimeout(async () => {
      try {
        const token = localStorage.getItem("access_token");
        const costSumObj = 
          Number(updatedForm.orden_compra_equipos) +
          Number(updatedForm.orden_compra_materiales) +
          Number(updatedForm.orden_compra_hh) +
          Number(updatedForm.orden_compra_entrega) +
          Number(updatedForm.orden_compra_costo_servicios) +
          Number(updatedForm.orden_compra_otros);

        const calculatedUtility = Number(updatedForm.total_orden) - costSumObj;

        const payload = {
          numero_orden: updatedForm.numero_orden || "",
          fecha_orden: updatedForm.fecha_orden ? (updatedForm.fecha_orden instanceof Date ? updatedForm.fecha_orden.toISOString().split('T')[0] : updatedForm.fecha_orden) : null,
          fecha_recepcion: updatedForm.fecha_factura ? (updatedForm.fecha_factura instanceof Date ? updatedForm.fecha_factura.toISOString().split('T')[0] : updatedForm.fecha_factura) : null,
          fecha_factura: updatedForm.fecha_factura ? (updatedForm.fecha_factura instanceof Date ? updatedForm.fecha_factura.toISOString().split('T')[0] : updatedForm.fecha_factura) : null,
          total_orden: Number(updatedForm.total_orden || 0),
          orden_plazo: Number(updatedForm.orden_plazo_valor || 0),
          orden_plazo_valor: Number(updatedForm.orden_plazo_valor || 0),
          orden_plazo_unidad: updatedForm.orden_plazo_unidad || 1,
          fecha_real_entrega: updatedForm.fecha_entrega ? (updatedForm.fecha_entrega instanceof Date ? updatedForm.fecha_entrega.toISOString().split('T')[0] : updatedForm.fecha_entrega) : null,
          fecha_entrega: updatedForm.fecha_entrega ? (updatedForm.fecha_entrega instanceof Date ? updatedForm.fecha_entrega.toISOString().split('T')[0] : updatedForm.fecha_entrega) : null,
          orden_devengo_mes: updatedForm.mes_entrega || null,
          mes_entrega: updatedForm.mes_entrega || null,
          orden_compra_estado: updatedForm.estado_orden || 1,
          estado_orden: updatedForm.estado_orden || 1,
          prio: updatedForm.prio || '0',
          envio: updatedForm.envio || 1,
          doc: updatedForm.doc !== undefined ? updatedForm.doc : null,
          ti1: updatedForm.ti1 !== undefined ? updatedForm.ti1 : null,
          orden_compra_equipos: Number(updatedForm.orden_compra_equipos || 0),
          orden_compra_materiales: Number(updatedForm.orden_compra_materiales || 0),
          orden_compra_hh: Number(updatedForm.orden_compra_hh || 0),
          orden_compra_entrega: Number(updatedForm.orden_compra_entrega || 0),
          orden_compra_costo_servicios: Number(updatedForm.orden_compra_costo_servicios || 0),
          orden_compra_otros: Number(updatedForm.orden_compra_otros || 0),
          uti_des: Number(calculatedUtility.toFixed(2))
        };

        const res = await api.patch(`cotizaciones/apertura_detalle/${idApertura}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data) {
          setAperturas(prev => prev.map(a => a.id_apertura === idApertura ? res.data : a));
        }
      } catch (err) {
        console.error("Error al auto-guardar apertura:", err);
      }
    }, 800);
  };

  // Borrar toda la Orden de Compra confirmada
  const handleDeleteAperturaConfirmada = async (idApertura) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.delete(`cotizaciones/apertura_detalle/${idApertura}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Orden de compra eliminada correctamente.");
      
      const restAperturas = aperturas.filter(a => a.id_apertura !== idApertura);
      setAperturas(restAperturas);
      setFormsState(prev => {
        const next = { ...prev };
        delete next[idApertura];
        return next;
      });
    } catch (err) {
      console.error("Error al eliminar la apertura:", err);
      toast.error(err.response?.data?.error || "Error al intentar eliminar la orden de compra.");
    }
  };

  const handleConfirmarEliminacion = (idApertura) => {
    toast.error(({ closeToast }) => (
      <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
        <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 border-b border-rose-100">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-rose-100">
            <Icon name="trash" className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">Eliminar Registro</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] text-gray-600 leading-tight">¿Estás seguro de que deseas eliminar permanentemente esta orden de compra?</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-4 pb-3">
          <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
          <button
            onClick={() => { handleDeleteAperturaConfirmada(idApertura); closeToast(); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-red-200 hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <span>Confirmar Eliminación</span>
            <Icon name="trash-2" className="h-3 w-3 opacity-70" />
          </button>
        </div>
      </div>
    ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
  };

  // Cargar colaboradores activos al montar
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await api.get("users/usuarios-activos/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsuariosActivos(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error al cargar colaboradores activos:", err);
      }
    };
    fetchUsuarios();
  }, []);

  const assignedEmails = useMemo(() => {
    const firstAp = visibleAperturas[0] || aperturas[0];
    if (!firstAp?.responsables) return [];
    return firstAp.responsables.split(/[;,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [visibleAperturas, aperturas]);

  const filteredUsuarios = useMemo(() => {
    let list = usuariosActivos;
    if (filterAssignedOnly) {
      list = list.filter(u => assignedEmails.includes(u.correo?.toLowerCase()));
    }
    const query = searchUserQuery.trim().toLowerCase();
    if (!query) return list;
    list = list.filter(u => 
      (u.nombre_completo || '').toLowerCase().includes(query) ||
      (u.correo || '').toLowerCase().includes(query)
    );
    list = list.sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''));
    return list;
  }, [usuariosActivos, searchUserQuery, filterAssignedOnly, assignedEmails]);

  // Asignar/desasignar colaborador de la apertura administrativa
  const toggleResponsable = async (email) => {
    const referenceAp = visibleAperturas.find(ap => ap.responsables) || visibleAperturas[0] || aperturas[0];
    if (!referenceAp) return;

    let currentList = referenceAp.responsables ? referenceAp.responsables.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];
    const normalizedEmail = email.trim();
    
    const existsIndex = currentList.findIndex(e => e.toLowerCase() === normalizedEmail.toLowerCase());
    
    if (existsIndex >= 0) {
      currentList.splice(existsIndex, 1);
    } else {
      currentList.push(normalizedEmail);
    }
    const newResponsables = currentList.join(';');

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.patch(`cotizaciones/apertura_detalle/${referenceAp.id_apertura}/`, {
        responsables: newResponsables
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update ALL OCs in the state array to ensure they stay synchronized
      setAperturas(prev => prev.map(a => ({ ...a, responsables: res.data.responsables })));
      toast.success("Asignación de personal actualizada.");
    } catch (err) {
      console.error("Error al actualizar responsables:", err);
      toast.error("No se pudo actualizar la asignación de personal.");
    }
  };

  const handleDeleteAperturaLocal = (idApertura) => {
    setDeletedOcIds(prev => {
      const next = new Set(prev);
      next.add(idApertura);
      return next;
    });
    toast.info("Orden de compra removida localmente. Haz clic en 'Guardar Cambios' para aplicar permanentemente.");
  };

  // Guardar cambios en todas las OCs modificadas y procesar eliminaciones por lotes
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      
      // 1. Process pending local deletions
      if (deletedOcIds.size > 0) {
        const deletePromises = Array.from(deletedOcIds).map(idApertura => {
          return api.delete(`cotizaciones/apertura_detalle/${idApertura}/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        });
        await Promise.all(deletePromises);
      }

      // 2. Process updates for remaining dirty cards
      const remainingAperturas = aperturas.filter(ap => !deletedOcIds.has(ap.id_apertura));
      const dirtyAperturas = remainingAperturas.filter(ap => {
        const f = formsState[ap.id_apertura];
        return f ? isFormDirty(f, ap) : false;
      });

      const updatePromises = dirtyAperturas.map(ap => {
        const f = formsState[ap.id_apertura];
        const costSumObj = 
          Number(f.orden_compra_equipos) +
          Number(f.orden_compra_materiales) +
          Number(f.orden_compra_hh) +
          Number(f.orden_compra_entrega) +
          Number(f.orden_compra_costo_servicios) +
          Number(f.orden_compra_otros);
        const utility = Number(f.total_orden) - costSumObj;

        const payload = {
          ...f,
          fecha_orden: f.fecha_orden ? (f.fecha_orden instanceof Date ? f.fecha_orden.toISOString() : f.fecha_orden) : null,
          fecha_entrega: f.fecha_entrega ? (f.fecha_entrega instanceof Date ? f.fecha_entrega.toISOString() : f.fecha_entrega) : null,
          fecha_factura: f.fecha_factura ? (f.fecha_factura instanceof Date ? f.fecha_factura.toISOString() : f.fecha_factura) : null,
          mes_entrega: f.mes_entrega ? parseInt(f.mes_entrega, 10) : null,
          orden_plazo_valor: f.orden_plazo_valor ? parseInt(f.orden_plazo_valor, 10) : 0,
          orden_plazo_unidad: f.orden_plazo_unidad ? parseInt(f.orden_plazo_unidad, 10) : 1,
          uti_des: utility
        };

        return api.put(`cotizaciones/apertura_detalle/${ap.id_apertura}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });

      await Promise.all(updatePromises);
      
      // Clear local deletions set
      setDeletedOcIds(new Set());

      // Fetch the fresh synced list from database
      const resList = await api.get(`cotizaciones/aperturas_por_registro/${activeIdRegistro}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(resList.data) ? resList.data : [resList.data];
      
      // Sync responsibles list in memory
      const sharedResponsibles = list.find(a => a.responsables)?.responsables || "";
      const syncedList = list.map(a => ({ ...a, responsables: sharedResponsibles }));
      
      setAperturas(syncedList);
      
      const newForms = {};
      syncedList.forEach(ap => {
        newForms[ap.id_apertura] = initialFormState(ap);
      });
      setFormsState(newForms);

      toast.success("Órdenes de compra actualizadas correctamente.");
    } catch (err) {
      console.error("Error al guardar cambios de las aperturas:", err);
      toast.error("Ocurrió un error al intentar guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = useMemo(() => {
    const formsDirty = aperturas.some(ap => {
      if (deletedOcIds.has(ap.id_apertura)) return false;
      const fObj = formsState[ap.id_apertura];
      return fObj ? isFormDirty(fObj, ap) : false;
    });
    return formsDirty || deletedOcIds.size > 0;
  }, [aperturas, formsState, deletedOcIds]);

  const totals = useMemo(() => {
    let totalOrden = 0;
    let costEquipos = 0;
    let costMateriales = 0;
    let costHH = 0;
    let costEntrega = 0;
    let costServicios = 0;
    let costOtros = 0;
    let totalCost = 0;

    visibleAperturas.forEach(ap => {
      const f = formsState[ap.id_apertura];
      if (f) {
        totalOrden += Number(f.total_orden || 0);
        costEquipos += Number(f.orden_compra_equipos || 0);
        costMateriales += Number(f.orden_compra_materiales || 0);
        costHH += Number(f.orden_compra_hh || 0);
        costEntrega += Number(f.orden_compra_entrega || 0);
        costServicios += Number(f.orden_compra_costo_servicios || 0);
        costOtros += Number(f.orden_compra_otros || 0);
      }
    });

    totalCost = costEquipos + costMateriales + costHH + costEntrega + costServicios + costOtros;
    const utility = totalOrden - totalCost;

    return {
      totalOrden,
      costEquipos,
      costMateriales,
      costHH,
      costEntrega,
      costServicios,
      costOtros,
      totalCost,
      utility
    };
  }, [visibleAperturas, formsState]);

  if (loading) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest animate-pulse">Cargando Apertura...</span>
      </div>
    );
  }

  const clientName = quote.cliente_nombre || quote.id_cliente?.nombre || quote.representante_nombre || "S/N";

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-700 font-sans">
    
      {/* 70% MAIN PANEL - Scrollable Content */}
      <div className="w-full xl:w-8/12 flex flex-col space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible font-sans">
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              {/* Botón Atrás */}
              <button
                onClick={() => navigate('/comercial/aperturas')}
                className="mr-5 p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group"
              >
                <Icon name="arrow-left" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                    {quote.codigo || 'APERTURA'}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* METRICAS / KPIS DEL PRESUPUESTO - ENFASIS EXTRA BOLD    */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
          
          {/* KPI 1: MONTO TOTAL OCs */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monto Total OCs</span>
                {/* 💥 FUENTE INYECTADA CON PESO SUPREMO: font-black y tracking-tighter */}
                <h3 className="text-xl font-black text-slate-950 tracking-tighter tabular-nums">
                  {currencySymbol} {Number(totals.totalOrden || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                <Icon name="file-text" className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5 mt-2">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight block">
                Consolidado de {visibleAperturas.length} {visibleAperturas.length === 1 ? 'OC Activa' : 'OC Activas'}
              </span>
            </div>
          </div>

          {/* KPI 2: COSTO TOTAL COMPRA */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costo Total Compra</span>
                <h3 className="text-xl font-black text-slate-950 tracking-tighter tabular-nums">
                  {currencySymbol} {Number(totals.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500 shrink-0">
                <Icon name="shopping-bag" className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5 mt-2">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight block">
                Suma de partidas aprobadas
              </span>
            </div>
          </div>

          {/* KPI 3: UTILIDAD NETO */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Utilidad Neta</span>
                <h3 className={cn("text-xl font-black tracking-tighter tabular-nums", totals.utility >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {currencySymbol} {Number(totals.utility || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className={cn("p-1.5 rounded-lg shrink-0", totals.utility >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                <Icon name="trending-up" className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5 mt-2 flex justify-between items-center">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight block">
                Diferencia Ingreso - Egreso
              </span>
              <span className={cn(
                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide border",
                totals.utility >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
              )}>
                {totals.utility >= 0 ? 'Rentable' : 'Déficit'}
              </span>
            </div>
          </div>

          {/* KPI 4: MARGEN COMERCIAL */}
          {(() => {
            const margenCalculado = totals.totalOrden > 0 ? (totals.utility / totals.totalOrden) * 100 : 0;
            const esRentable = margenCalculado >= 20;
            const esAceptable = margenCalculado >= 0 && margenCalculado < 20;

            return (
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Margen Comercial</span>
                    <h3 className={cn(
                      "text-xl font-black tracking-tighter tabular-nums",
                      esRentable ? "text-emerald-600" : esAceptable ? "text-amber-500" : "text-red-600"
                    )}>
                      {margenCalculado.toFixed(2)} %
                    </h3>
                  </div>
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    esRentable ? "bg-emerald-50 text-emerald-600" : esAceptable ? "bg-amber-50 text-amber-500" : "bg-red-50 text-red-600"
                  )}>
                    <Icon name={esRentable ? "activity" : "alert-circle"} className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-1.5 mt-2">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight block">
                    Rentabilidad porcentual global
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* TABLA DE RESUMEN PRESUPUESTO */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-4 font-sans">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Icon name="table" className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              Desglose Presupuestal por Orden de Compra
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {visibleAperturas.length} Registros Activos
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
            <table className="min-w-[850px] md:min-w-full table-fixed divide-y divide-slate-100 text-center text-xs">
              <thead className="bg-slate-50/70 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="w-[16%] py-3.5 text-left pl-4 font-extrabold text-slate-700">No. Orden</th>
                  <th className="w-[12%] py-3.5 font-semibold">Emisión</th>
                  <th className="w-[14%] py-3.5 font-bold text-indigo-950">Suministros</th>
                  <th className="w-[12%] py-3.5 font-semibold">H.H. Propios</th>
                  <th className="w-[12%] py-3.5 font-semibold">Costo Serv.</th>
                  <th className="w-[10%] py-3.5 font-semibold">Otros</th>
                  <th className="w-[12%] py-3.5 font-semibold">Margen Neto</th>
                  <th className="w-[12%] py-3.5 text-right pr-4 font-extrabold text-slate-700">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600 font-medium">
                {visibleAperturas.map(ap => {
                  const f = formsState[ap.id_apertura];
                  if (!f) return null;

                  const costSum = 
                    Number(f.orden_compra_equipos) +
                    Number(f.orden_compra_materiales) +
                    Number(f.orden_compra_hh) +
                    Number(f.orden_compra_entrega) +
                    Number(f.orden_compra_costo_servicios) +
                    Number(f.orden_compra_otros);
                  const utility = Number(f.total_orden) - costSum;

                  const totalSuministrosRow = Number(f.orden_compra_equipos || 0) + Number(f.orden_compra_materiales || 0);

                  const renderAmount = (val) => {
                    const num = Number(val) || 0;
                    if (num === 0) return <span className="text-slate-300 font-normal">—</span>;
                    return <span className="text-slate-700 font-semibold">{currencySymbol} {num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                  };

                  return (
                    <tr key={ap.id_apertura} className="hover:bg-slate-50/50 transition-colors h-11 group">
                      <td className="text-left pl-4 text-slate-900 font-bold tracking-tight">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="truncate" title={f.numero_orden}>{f.numero_orden || 'S/N'}</span>
                        </div>
                      </td>
                      <td className="text-slate-500 font-normal">
                        {f.fecha_orden 
                          ? (f.fecha_orden instanceof Date 
                              ? f.fecha_orden.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : new Date(f.fecha_orden).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }))
                          : '—'}
                      </td>
                      <td className="bg-indigo-50/10 font-semibold">{renderAmount(totalSuministrosRow)}</td>
                      <td>{renderAmount(f.orden_compra_hh)}</td>
                      <td>{renderAmount(f.orden_compra_costo_servicios)}</td>
                      <td>{renderAmount(f.orden_compra_otros)}</td>
                      <td>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border",
                          utility >= 0 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-red-50 text-red-700 border-red-100"
                        )}>
                          {currencySymbol} {Number(utility).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="text-right pr-4 text-slate-950 font-extrabold text-[11.5px]">
                        {currencySymbol} {Number(f.total_orden || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                
                <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-slate-200 text-[11px] h-12 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)]">
                  <td colSpan={2} className="text-right text-[10px] text-slate-500 font-extrabold tracking-wider pr-2">
                    RESUMEN CONSOLIDADO :
                  </td>
                  <td className="text-indigo-950 font-bold bg-indigo-50/30">
                    {currencySymbol} {Number((totals.costEquipos || 0) + (totals.costMateriales || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>{currencySymbol} {Number(totals.costHH || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{currencySymbol} {Number(totals.costServicios || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{currencySymbol} {Number(totals.costOtros || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-lg text-[10.5px] font-black shadow-sm text-white",
                      (totals.utility || 0) >= 0 ? "bg-emerald-600" : "bg-red-600"
                    )}>
                      {currencySymbol} {Number(totals.utility || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="text-right pr-4 text-indigo-700 font-black text-xs">
                    {currencySymbol} {Number(totals.totalOrden || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 📋 SECCIÓN: COCKPIT DE ÓRDENES DE COMPRA APILADAS          */}
        <div className="space-y-6 font-sans"> 
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Icon name="file-text" className="h-4 w-4 text-indigo-600" />
              </div>
              Órdenes de Compra Vinculadas ({visibleAperturas.length})
            </h2>
            
            <input 
              type="file" 
              id="new-oc-file-input"
              className="hidden" 
              accept=".pdf"
              onChange={handleCrearNuevaOCConArchivo} 
            />
            <button
              onClick={() => document.getElementById('new-oc-file-input').click()}
              disabled={isProcessingNewOc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-[10px] font-black text-emerald-700 uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingNewOc ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Icon name="plus" className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Agregar Nueva OC</span>
                </>
              )}
            </button>
          </div>

          {visibleAperturas.map((ap, index) => {
            const f = formsState[ap.id_apertura];
            if (!f) return null;

            const isCardDirty = isFormDirty(f, ap);
            const isExpanded = ocExpanded[ap.id_apertura] !== false;
            
            const stateBadgeStyle = f.estado_orden === 1 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    f.estado_orden === 4 ? "bg-red-50 text-red-700 border-red-100" :
                                    "bg-amber-50 text-amber-700 border-amber-100";

            const priorityBadgeStyle = f.prio === '1' ? "bg-amber-50 text-amber-800 border-amber-100" :
                                       f.prio === '2' ? "bg-red-50 text-red-800 border-red-100" :
                                       "bg-slate-50 text-slate-600 border-slate-200";

            const currentEstadoOrdenNombre = f.estado_orden === 1 ? "ADJUDICADO" :
                                             f.estado_orden === 4 ? "ANULADO" : "PENDIENTE";

            const currentPrioridadNombre = f.prio === '1' ? "URGENTE" :
                                           f.prio === '2' ? "CRÍTICA" : "NORMAL";

            const hasCheckedSupplies = f.doc === null || f.doc === undefined || f.doc.split(',').map(s => s.trim()).filter(Boolean).length > 0;
            const hasCheckedServices = f.ti1 === null || f.ti1 === undefined || f.ti1.split(',').map(s => s.trim()).filter(Boolean).length > 0;
            
            const showSupplies = hasCheckedSupplies || (!hasCheckedSupplies && !hasCheckedServices);
            const showServices = hasCheckedServices || (!hasCheckedSupplies && !hasCheckedServices);

            return (
              <div key={ap.id_apertura} className="relative overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-5 transition-all duration-300">
                {uploadingOcId === ap.id_apertura && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in duration-200">
                    <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700">Procesando OCR...</span>
                  </div>
                )}
                
                {/* 1️⃣ CABECERA ELEGANTE DE LA TARJETA (CONTROL DE EXPANSIÓN Y ACCIONES) */}
                <div className="flex justify-between items-center border-b pb-3 border-slate-100 flex-wrap gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button 
                      type="button"
                      onClick={() => toggleOc(ap.id_apertura)}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                      <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="h-4 w-4 transition-transform" />
                    </button>
                    
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      OC: {f.numero_orden || <span className="text-slate-400 italic font-normal">Sin Número ({index + 1})</span>}
                    </span>
                    
                    <div className={cn("flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border shadow-sm", stateBadgeStyle)}>
                      <Icon name="refresh-cw" className="h-2 w-2 mr-1 animate-spin-slow" />
                      {currentEstadoOrdenNombre}
                    </div>
                  </div>

                  {/* MENÚ DE ACCIONES FLUIDO */}
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="file" 
                      id={`file-input-${ap.id_apertura}`}
                      className="hidden" 
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, ap.id_apertura)} 
                    />

                    {(f.tiene_archivo_fisico || f.orden_adjunta) ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVerOrden(ap.id_apertura, f.tiene_archivo_fisico, f.orden_adjunta)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                        >
                          <Icon name="eye" className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Ver PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => document.getElementById(`file-input-${ap.id_apertura}`).click()}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer shadow-sm"
                          title="Reemplazar archivo"
                        >
                          <Icon name="upload" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`file-input-${ap.id_apertura}`).click()}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                      >
                        <Icon name="upload" className="h-3.5 w-3.5" />
                        <span>Adjuntar Digital</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleConfirmarEliminacion(ap.id_apertura)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                    >
                      <Icon name="trash-2" className="h-3.5 w-3.5 text-red-600" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                {/* CONTENIDO DESPLEGABLE CON ANIMACIÓN */}
                {isExpanded && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    
                    {/* 2️⃣ GRILLA DE CAMPOS ADMINISTRATIVOS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                      {/* Nro Orden */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Número de Orden</label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={f.numero_orden || ''}
                            onChange={(e) => handleChange(ap.id_apertura, 'numero_orden', e.target.value.toUpperCase())}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-[11px] font-bold uppercase focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 shadow-sm"
                            placeholder="Ej. OC-2026-001"
                          />
                          <Icon name="hash" className="h-3 w-3 text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Fecha Orden */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fecha Emisión</label>
                        <DatePicker
                          selected={f.fecha_orden}
                          onChange={(date) => handleChange(ap.id_apertura, 'fecha_orden', date)}
                          dateFormat="dd/MM/yyyy"
                          locale="es"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 shadow-sm"
                          placeholderText="Seleccionar fecha..."
                        />
                      </div>

                      {/* Fecha Recepción */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fecha Recepción</label>
                        <DatePicker
                          selected={f.fecha_factura}
                          onChange={(date) => handleChange(ap.id_apertura, 'fecha_factura', date)}
                          dateFormat="dd/MM/yyyy"
                          locale="es"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 shadow-sm"
                          placeholderText="Seleccionar fecha..."
                        />
                      </div>

                      {/* Total de la Orden */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Orden</label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={
                              isTotalFocused[ap.id_apertura]
                                ? (totalInputState[ap.id_apertura] ?? String(f.total_orden || ''))
                                : (f.total_orden !== undefined && f.total_orden !== null
                                    ? Number(f.total_orden).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : '0.00')
                            }
                            onFocus={() => {
                              setIsTotalFocused(prev => ({ ...prev, [ap.id_apertura]: true }));
                              setTotalInputState(prev => ({ ...prev, [ap.id_apertura]: String(f.total_orden || '') }));
                            }}
                            onBlur={() => {
                              setIsTotalFocused(prev => ({ ...prev, [ap.id_apertura]: false }));
                              const cleanVal = (totalInputState[ap.id_apertura] || '').replace(/,/g, '');
                              const parsedVal = parseFloat(cleanVal) || 0;
                              handleChange(ap.id_apertura, 'total_orden', parsedVal);
                            }}
                            onChange={(e) => {
                              const typedVal = e.target.value;
                              setTotalInputState(prev => ({ ...prev, [ap.id_apertura]: typedVal }));
                              const cleanVal = typedVal.replace(/,/g, '');
                              const parsedVal = parseFloat(cleanVal) || 0;
                              handleChange(ap.id_apertura, 'total_orden', parsedVal);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-1.5 text-[11px] font-black focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-indigo-600 shadow-sm"
                            placeholder="0.00"
                          />
                          <span className="absolute left-3 text-[11px] font-black text-indigo-600 pointer-events-none">$</span>
                        </div>
                      </div>

                      {/* Tiempo Entrega */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Plazo de Entrega</label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            value={f.orden_plazo_valor || ''}
                            onChange={(e) => handleChange(ap.id_apertura, 'orden_plazo_valor', parseInt(e.target.value) || 0)}
                            className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 shadow-sm"
                            placeholder="0"
                          />
                          <select
                            value={f.orden_plazo_unidad || 1}
                            onChange={(e) => handleChange(ap.id_apertura, 'orden_plazo_unidad', parseInt(e.target.value, 10))}
                            className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer text-slate-700 shadow-sm"
                          >
                            <option value={1}>DÍAS</option>
                            <option value={2}>SEMANAS</option>
                            <option value={3}>MESES</option>
                          </select>
                        </div>
                      </div>

                      {/* Fecha Entrega */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fecha Entrega Real</label>
                        <DatePicker
                          selected={f.fecha_entrega}
                          onChange={(date) => handleChange(ap.id_apertura, 'fecha_entrega', date)}
                          dateFormat="dd/MM/yyyy"
                          locale="es"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 shadow-sm"
                          placeholderText="Seleccionar fecha..."
                        />
                      </div>

                      {/* Pago Mes */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mes Contable Devengo</label>
                        <select
                          value={f.mes_entrega ? parseInt(f.mes_entrega, 10) : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleChange(ap.id_apertura, 'mes_entrega', val ? String(val).padStart(2, '0') : '');
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer text-slate-700 shadow-sm"
                        >
                          <option value="">SELECCIONAR MES...</option>
                          <option value={1}>ENERO</option>
                          <option value={2}>FEBRERO</option>
                          <option value={3}>MARZO</option>
                          <option value={4}>ABRIL</option>
                          <option value={5}>MAYO</option>
                          <option value={6}>JUNIO</option>
                          <option value={7}>JULIO</option>
                          <option value={8}>AGOSTO</option>
                          <option value={9}>SEPTIEMBRE</option>
                          <option value={10}>OCTUBRE</option>
                          <option value={11}>NOVIEMBRE</option>
                          <option value={12}>DICIEMBRE</option>
                        </select>
                      </div>

                      {/* Estado */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estado de Cobro</label>
                        <select
                          value={f.estado_orden || 1}
                          onChange={(e) => handleChange(ap.id_apertura, 'estado_orden', parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer text-slate-700 shadow-sm"
                        >
                          <option value={1}>ADJUDICADO</option>
                          <option value={2}>PENDIENTE</option>
                          <option value={4}>ANULADO</option>
                        </select>
                      </div>
                    </div>

                    {/* 3️⃣ SUBSECCIÓN: PARTIDAS Y SUMINISTROS (CHECKBOXES CON DISEÑO PREMIUM) */}
                    <div className="border border-slate-100 rounded-xl p-4 space-y-4">
                      {showSupplies && (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="package" className="h-3.5 w-3.5 text-indigo-500" />
                                Suministros Vinculados a esta Partida
                              </span>
                              {(() => {
                                const excludedSuministros = sortedGruposSuministros.filter(g => !isSuministroChecked(f.doc, g.codigo_grupo));
                                if (excludedSuministros.length === 0) return null;
                                return (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleToggleSuministroGroup(ap.id_apertura, e.target.value);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-sm outline-none"
                                  >
                                    <option value="" disabled>+ Vincular Suministro</option>
                                    {excludedSuministros.map(g => (
                                      <option key={g.codigo_grupo} value={g.codigo_grupo}>
                                        {g.codigo_grupo} - {g.nombre_grupo}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              Costo: {formatMoney(quoteTotals.equiposCost + quoteTotals.materialesCost)} | Venta: {formatMoney(quoteTotals.equiposSale + quoteTotals.materialesSale)}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {(() => {
                              const checkedGruposSuministros = sortedGruposSuministros.filter(g => isSuministroChecked(f.doc, g.codigo_grupo));
                              if (checkedGruposSuministros.length === 0) {
                                return (
                                  <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No hay suministros vinculados a esta OC</span>
                                  </div>
                                );
                              }
                              return checkedGruposSuministros.map((grupo) => {
                                const isChecked = true;
                                const isExpanded = gruposExpandidos[grupo.codigo_grupo] !== false;
                                const totalGrupo = (grupo.items || []).reduce((acc, curr) => acc + (Number(curr.venta_total) || 0), 0) * (grupo.cantidad || 1);
                                const costGrupo = (grupo.items || []).reduce((acc, curr) => acc + (Number(curr.costo_total) || 0), 0) * (grupo.cantidad || 1);

                                return (
                                  <div 
                                    key={grupo.codigo_grupo} 
                                    className={cn(
                                      "border border-slate-150 rounded-xl overflow-hidden bg-white shadow-sm relative transition-all duration-200",
                                      !isChecked && "opacity-60 bg-gray-50/30"
                                    )}
                                  >
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 transition-colors">
                                      <div className="flex items-center gap-2.5">
                                        <div 
                                          onClick={() => toggleGrupo(grupo.codigo_grupo)}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <Icon 
                                            name="chevron-down" 
                                            className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", !isExpanded && "-rotate-90")} 
                                          />
                                          <span className={cn("text-[10px] font-black uppercase tracking-wide", isChecked ? "text-slate-800" : "text-slate-500")}>
                                            {grupo.nombre_grupo}
                                          </span>
                                          <span className="text-[8px] bg-slate-100 text-slate-600 font-black px-1.5 py-0.5 rounded">
                                            {grupo.items?.length || 0} Items
                                          </span>
                                          {!isChecked && (
                                            <span className="text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                              No Incluido en OC
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[9.5px] text-slate-500 font-bold">
                                          Costo: <strong className="text-slate-700">{formatMoney(costGrupo)}</strong>
                                        </span>
                                        <span className="text-[9.5px] text-slate-500 font-bold">
                                          Venta: <strong className="text-slate-700">{formatMoney(totalGrupo)}</strong>
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">Cant: <strong className="text-slate-700">{grupo.cantidad}</strong></span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSuministroGroup(ap.id_apertura, grupo.codigo_grupo);
                                          }}
                                          className={cn(
                                            "p-1 rounded-lg transition-colors cursor-pointer",
                                            isChecked ? "hover:bg-rose-50 text-slate-400 hover:text-rose-600" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                                          )}
                                          title={isChecked ? "Desvincular Suministro" : "Vincular Suministro"}
                                        >
                                          <Icon name={isChecked ? "trash-2" : "plus-circle"} className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="overflow-x-auto border-t border-slate-100">
                                        <table className="min-w-[800px] md:min-w-full divide-y divide-slate-100 text-[10px]">
                                          <thead className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[8px] text-center">
                                            <tr>
                                              <th className="py-2 w-[12%]">Código</th>
                                              <th className="py-2 text-left px-3 w-[40%]">Descripción</th>
                                              <th className="py-2 w-[15%]">Marca/Proveedor</th>
                                              <th className="py-2 w-[8%]">Cant.</th>
                                              <th className="py-2 w-[10%] text-right">P. Unit.</th>
                                              <th className="py-2 w-[10%] text-right pr-4">Total</th>
                                              <th className="py-2 w-[5%]"></th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50 text-slate-700 uppercase font-semibold text-center">
                                            {(grupo.items || []).map((item, idx) => (
                                              <tr key={item.id_suministro || idx} className="hover:bg-slate-50/30 h-9">
                                                <td className="font-bold text-slate-900">{item.codigo_item || '-'}</td>
                                                <td className="text-left px-3 text-slate-800 font-medium normal-case">{item.descripcion || '-'}</td>
                                                <td className="text-slate-500 font-medium">{item.marca_nombre || item.proveedor || '-'}</td>
                                                <td className="text-slate-800 font-bold">{item.cantidad || 0}</td>
                                                <td className="text-right text-slate-600">{formatMoney(item.precio_venta)}</td>
                                                <td className="text-right pr-4 text-slate-900 font-bold">{formatMoney(item.venta_total)}</td>
                                                <td className="py-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleEliminarItemSuministro(item.id_suministro, grupo.codigo_grupo)}
                                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                    title="Eliminar Ítem"
                                                  >
                                                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </>
                      )}

                      {/* Servicios */}
                      {showServices && (
                        <div className={cn("space-y-3", showSupplies && "pt-4 border-t border-slate-100")}>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="wrench" className="h-3.5 w-3.5 text-indigo-500" />
                                Servicios Vinculados a esta Partida
                              </span>
                              {(() => {
                                const excludedServicios = sortedGruposServicios.filter(g => !isServicioChecked(f.ti1, g.id_servicio));
                                if (excludedServicios.length === 0) return null;
                                return (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleToggleServicioGroup(ap.id_apertura, e.target.value);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-sm outline-none"
                                  >
                                    <option value="" disabled>+ Vincular Servicio</option>
                                    {excludedServicios.map(g => (
                                      <option key={g.id_servicio} value={g.id_servicio}>
                                        {g.tituloGeneral ? g.tituloGeneral.split('\n')[0] : 'Grupo'}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              Costo: {formatMoney(quoteTotals.hhCost + quoteTotals.serviciosCost + quoteTotals.otrosCost)} | Venta: {formatMoney(quoteTotals.hhSale + quoteTotals.serviciosSale + quoteTotals.otrosSale)}
                            </span>
                          </div>

                          {(() => {
                            const checkedGruposServicios = sortedGruposServicios.filter(g => isServicioChecked(f.ti1, g.id_servicio));
                            if (checkedGruposServicios.length === 0) {
                              return (
                                <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No hay servicios vinculados a esta OC</span>
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-3">
                                {checkedGruposServicios.map((grupo) => {
                                  const isChecked = true;
                                  const isExpanded = gruposExpandidos[`srv-${grupo.id_servicio}`] !== false;
                                  
                                  let srvCost = 0;
                                  let srvSale = 0;
                                  const qty = Number(grupo.cantidad || 1);
                                  (grupo.subgrupos || []).forEach(sub => {
                                    (sub.items || []).forEach(item => {
                                      srvCost += Number(item.costo_total || 0) * qty;
                                      srvSale += Number(item.cotizado_total || 0) * qty;
                                    });
                                  });

                                  const getSubgrupoWeight = (sub) => {
                                    const code = sub.tipoCodigo || "";
                                    if (code.endsWith("04") || sub.id_tipo_gasto === 4 || sub.id_tipo_gasto === 3) return 1;
                                    if (code.endsWith("05") || sub.id_tipo_gasto === 5 || sub.id_tipo_gasto === 4) return 2;
                                    if (code.endsWith("06") || sub.id_tipo_gasto === 6 || sub.id_tipo_gasto === 5) return 3;
                                    return 99;
                                  };
                                  const sortedSubgrupos = [...(grupo.subgrupos || [])].sort((a, b) => getSubgrupoWeight(a) - getSubgrupoWeight(b));

                                  return (
                                    <div 
                                      key={grupo.id_servicio} 
                                      className={cn(
                                        "border border-slate-150 rounded-xl overflow-hidden bg-white shadow-sm relative transition-all duration-200",
                                        !isChecked && "opacity-60 bg-gray-50/30"
                                      )}
                                    >
                                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                          <div 
                                            onClick={() => toggleGrupo(`srv-${grupo.id_servicio}`)}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <Icon 
                                              name="chevron-down" 
                                              className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", !isExpanded && "-rotate-90")} 
                                            />
                                            <span className={cn("text-[10px] font-black uppercase tracking-wide", isChecked ? "text-slate-800" : "text-slate-500")}>
                                              {grupo.tituloGeneral || 'GRUPO SERVICIOS'}
                                            </span>
                                            <span className="text-[8px] bg-slate-100 text-slate-600 font-black px-1.5 py-0.5 rounded">
                                              {grupo.subgrupos?.reduce((acc, curr) => acc + (curr.items?.length || 0), 0) || 0} Items
                                            </span>
                                            {!isChecked && (
                                              <span className="text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                No Incluido en OC
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-[9.5px] text-slate-500 font-bold">
                                            Costo: <strong className="text-slate-700">{formatMoney(srvCost)}</strong>
                                          </span>
                                          <span className="text-[9.5px] text-slate-500 font-bold">
                                            Venta: <strong className="text-slate-700">{formatMoney(srvSale)}</strong>
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold">Cant: <strong className="text-slate-700">{grupo.cantidad || 1}</strong></span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleServicioGroup(ap.id_apertura, grupo.id_servicio);
                                            }}
                                            className={cn(
                                              "p-1 rounded-lg transition-colors cursor-pointer",
                                              isChecked ? "hover:bg-rose-50 text-slate-400 hover:text-rose-600" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                                            )}
                                            title={isChecked ? "Desvincular Servicio" : "Vincular Servicio"}
                                          >
                                            <Icon name={isChecked ? "trash-2" : "plus-circle"} className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <div className="p-4 bg-slate-50/20 space-y-4">
                                          {sortedSubgrupos.map((subgrupo) => {
                                            if (!subgrupo.items || subgrupo.items.length === 0) return null;

                                            let subCost = 0;
                                            let subSale = 0;
                                            (subgrupo.items || []).forEach(item => {
                                              subCost += Number(item.costo_total || 0) * qty;
                                              subSale += Number(item.cotizado_total || 0) * qty;
                                            });

                                            const subKey = `srv-sub-${ap.id_apertura}-${grupo.id_servicio}-${subgrupo.tipoCodigo || subgrupo.id_servicio}`;
                                            const isSubExpanded = gruposExpandidos[subKey] !== false;

                                            return (
                                              <div key={subgrupo.id_servicio} className="border border-slate-150 rounded-lg overflow-hidden bg-white shadow-xs">
                                                <div
                                                  onClick={() => toggleGrupo(subKey)}
                                                  className="cursor-pointer px-4 py-2 bg-slate-50/80 hover:bg-slate-100/50 flex justify-between items-center transition-colors border-b border-slate-100"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div className={`transition-transform duration-200 ${isSubExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                                      <Icon name="chevron-down" className="h-3 w-3 text-slate-400" />
                                                    </div>
                                                    <span className="text-[9.5px] font-black text-slate-700 tracking-wider uppercase">
                                                      {subgrupo.tipoNombre || subgrupo.titulo || (subgrupo.tipoCodigo?.endsWith('04') ? "MANO DE OBRA" : subgrupo.tipoCodigo?.endsWith('05') ? "GASTOS DE SERVICIOS" : "OTROS")}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 rounded-full">
                                                      {subgrupo.items.length}
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-3">
                                                    <span className="text-[9px] text-slate-500 font-bold">
                                                      Costo: <strong className="text-slate-700">{formatMoney(subCost)}</strong>
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-bold">
                                                      Venta: <strong className="text-indigo-700">{formatMoney(subSale)}</strong>
                                                    </span>
                                                  </div>
                                                </div>

                                                {isSubExpanded && (() => {
                                                  const isMO = subgrupo.tipoCodigo?.endsWith('04') || subgrupo.id_tipo_gasto === 4 || subgrupo.id_tipo_gasto === 3;
                                                  const isGastos = subgrupo.tipoCodigo?.endsWith('05') || subgrupo.id_tipo_gasto === 5 || subgrupo.id_tipo_gasto === 4;
                                                  const isOtros = subgrupo.tipoCodigo?.endsWith('06') || subgrupo.id_tipo_gasto === 6 || subgrupo.id_tipo_gasto === 5;

                                                  if (isMO) {
                                                    return (
                                                      <div className="overflow-x-auto border-t border-slate-100">
                                                        <table className="min-w-[800px] md:min-w-full divide-y divide-slate-100 text-[10px]">
                                                          <thead className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[8px] text-center">
                                                            <tr>
                                                              <th className="py-2 w-[12%]">Cód. Personal</th>
                                                              <th className="py-2 text-left px-3 w-[26%]">Descripción / Tarea</th>
                                                              <th className="py-2 w-[7%]">Cant. (H)</th>
                                                              <th className="py-2 w-[6%]">Días</th>
                                                              <th className="py-2 w-[6%]">Horas</th>
                                                              <th className="py-2 w-[10%] text-right">Costo H/D</th>
                                                              <th className="py-2 w-[11%] text-right">Costo Total</th>
                                                              <th className="py-2 w-[8%]">Util. %</th>
                                                              <th className="py-2 w-[11%] text-right">Cotizado Total</th>
                                                              <th className="py-2 w-[3%]"></th>
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-50 text-slate-700 uppercase font-semibold text-center">
                                                            {subgrupo.items.map((item, idx) => (
                                                              <tr key={item.id_servicio || idx} className="hover:bg-slate-55/30 h-9">
                                                                <td className="font-bold text-slate-900">{item.codigo_item || '-'}</td>
                                                                <td className="text-left px-3 text-slate-800 font-medium normal-case">{item.descripcion_item || '-'}</td>
                                                                <td className="text-slate-800 font-bold">{item.cantidad_hombres || 0}</td>
                                                                <td className="text-slate-600 font-semibold">{item.cantidad_dias || 0}</td>
                                                                <td className="text-slate-600">{item.horas || 0}</td>
                                                                <td className="text-right text-slate-600">{formatMoney(item.costo_hombre_dia)}</td>
                                                                <td className="text-right text-slate-600 font-medium">{formatMoney(item.costo_total)}</td>
                                                                <td className="text-teal-600 font-bold">{item.porcentaje || 0}%</td>
                                                                <td className="text-right text-slate-900 font-bold">{formatMoney(item.cotizado_total)}</td>
                                                                <td className="py-1">
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => handleEliminarItemServicio(item.id_servicio)}
                                                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                                    title="Eliminar Ítem"
                                                                  >
                                                                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                                                                  </button>
                                                                </td>
                                                              </tr>
                                                            ))}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    );
                                                  }
                                                if (isGastos) {
                                                  return (
                                                    <div className="overflow-x-auto border-t border-slate-100">
                                                      <table className="min-w-[800px] md:min-w-full divide-y divide-slate-100 text-[10px]">
                                                        <thead className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[8px] text-center">
                                                          <tr>
                                                            <th className="py-2 w-[12%]">Tipo Gasto</th>
                                                            <th className="py-2 text-left px-3 w-[45%]">Concepto</th>
                                                            <th className="py-2 w-[8%]">Cant. (H)</th>
                                                            <th className="py-2 w-[8%]">Días</th>
                                                            <th className="py-2 w-[12%] text-right">Precio Unit.</th>
                                                            <th className="py-2 w-[12%] text-right pr-4">Total</th>
                                                            <th className="py-2 w-[3%]"></th>
                                                          </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50 text-slate-700 uppercase font-semibold text-center">
                                                          {subgrupo.items.map((item, idx) => (
                                                            <tr key={item.id_servicio || idx} className="hover:bg-slate-55/30 h-9">
                                                              <td className="font-bold text-slate-900">{item.codigo_item || '-'}</td>
                                                              <td className="text-left px-3 text-slate-800 font-medium normal-case">{item.descripcion_item || '-'}</td>
                                                              <td className="text-slate-800 font-bold">{item.cantidad_hombres || 0}</td>
                                                              <td className="text-slate-600 font-semibold">{item.cantidad_dias || 0}</td>
                                                              <td className="text-right text-slate-600">{formatMoney(item.costo_hombre_dia)}</td>
                                                              <td className="text-right pr-4 text-slate-900 font-bold">{formatMoney(item.cotizado_total)}</td>
                                                              <td className="py-1">
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleEliminarItemServicio(item.id_servicio)}
                                                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                                  title="Eliminar Ítem"
                                                                >
                                                                  <Icon name="trash-2" className="h-3.5 w-3.5" />
                                                                </button>
                                                              </td>
                                                            </tr>
                                                          ))}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  );
                                                }

                                                // fallback to Otros
                                                return (
                                                  <div className="overflow-x-auto border-t border-slate-100">
                                                    <table className="min-w-[800px] md:min-w-full divide-y divide-slate-100 text-[10px]">
                                                      <thead className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[8px] text-center">
                                                        <tr>
                                                          <th className="py-2 w-[12%]">Cód. Gasto</th>
                                                          <th className="py-2 text-left px-3 w-[35%]">Concepto</th>
                                                          <th className="py-2 w-[8%]">Cantidad</th>
                                                          <th className="py-2 w-[11%] text-right">Costo Unit.</th>
                                                          <th className="py-2 w-[12%] text-right">Costo Total</th>
                                                          <th className="py-2 w-[8%]">Util. %</th>
                                                          <th className="py-2 w-[11%] text-right pr-4">Venta Total</th>
                                                          <th className="py-2 w-[3%]"></th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-50 text-slate-700 uppercase font-semibold text-center">
                                                        {subgrupo.items.map((item, idx) => (
                                                          <tr key={item.id_servicio || idx} className="hover:bg-slate-55/30 h-9">
                                                            <td className="font-bold text-slate-900">{item.codigo_item || '-'}</td>
                                                            <td className="text-left px-3 text-slate-800 font-medium normal-case">{item.descripcion_item || '-'}</td>
                                                            <td className="text-slate-800 font-bold">{item.cantidad_hombres || 0}</td>
                                                            <td className="text-right text-slate-600">{formatMoney(item.costo_hombre_dia)}</td>
                                                            <td className="text-right text-slate-600 font-medium">{formatMoney(item.costo_total)}</td>
                                                            <td className="text-teal-600 font-bold">{item.porcentaje || 0}%</td>
                                                            <td className="text-right pr-4 text-slate-900 font-bold">{formatMoney(item.cotizado_total)}</td>
                                                            <td className="py-1">
                                                              <button
                                                                type="button"
                                                                onClick={() => handleEliminarItemServicio(item.id_servicio)}
                                                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                                title="Eliminar Ítem"
                                                              >
                                                                <Icon name="trash-2" className="h-3.5 w-3.5" />
                                                              </button>
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    </div>

                    {/* 4️⃣ PANEL DE DESGLOSE DE COSTOS DEL PRESUPUESTO (UX DE ALTO IMPACTO) */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex justify-between items-center pb-1 border-b border-slate-200/60">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Icon name="coins" className="h-3.5 w-3.5 text-indigo-500" />
                          Desglose Analítico de Costos Reales
                        </h4>
                        
                        {/* ⚡ BOTÓN DE AUTOMATIZACIÓN ULTRA RÁPIDA (REDUCE CLICS Y TECLADO) */}
                        <button
                          type="button"
                          onClick={() => {
                            // Automatización en caliente: Lee los montos actuales de la cotización y los precarga
                            handleChange(ap.id_apertura, 'orden_compra_equipos', quoteTotals.equiposCost || 0);
                            handleChange(ap.id_apertura, 'orden_compra_materiales', quoteTotals.materialesCost || 0);
                            handleChange(ap.id_apertura, 'orden_compra_hh', quoteTotals.hhCost || 0);
                            handleChange(ap.id_apertura, 'orden_compra_costo_servicios', quoteTotals.serviciosCost || 0);
                            toast.info("Costos sugeridos del presupuesto cargados automáticamente");
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
                        >
                          <Icon name="zap" className="h-3 w-3 text-indigo-600 animate-pulse" />
                          Sugerir Costos del Presupuesto
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        {[
                          { key: 'orden_compra_equipos', label: 'Equipos ($)' },
                          { key: 'orden_compra_materiales', label: 'Materiales ($)' },
                          { key: 'orden_compra_hh', label: 'H.H. Propios ($)' },
                          { key: 'orden_compra_entrega', label: 'H.H. Otras Áreas ($)' },
                          { key: 'orden_compra_costo_servicios', label: 'Costo Serv. ($)' },
                          { key: 'orden_compra_otros', label: 'Otros Costos ($)' }
                        ].map((field) => (
                          <div key={field.key} className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight block">{field.label}</label>
                            <input
                              type="number"
                              step="0.01"
                              value={f[field.key] || ''}
                              onChange={(e) => handleChange(ap.id_apertura, field.key, parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50/50 border border-transparent rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 text-right focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                              placeholder="0.00"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 30% SIDEBAR - Sticky/Meta Panel */}
      <div className="w-full xl:w-4/12 space-y-6">
        {/* BOTONES */}
        <div className="flex items-center gap-2.5 bg-white border border-gray-200 shadow-sm rounded-2xl p-4">
          <button
            onClick={() => setShowAsignarPanel(!showAsignarPanel)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all h-[42px] uppercase group border",
              showAsignarPanel 
                ? "bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 shadow-md" 
                : "bg-indigo-50/50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/50 hover:border-indigo-300 hover:shadow-md"
            )}
          >
            <Icon name="users" className={cn("h-3.5 w-3.5 transition-transform group-hover:scale-110", showAsignarPanel ? "text-white" : "text-indigo-600")} />
            Asignar
          </button>

          <button
            onClick={handleConfirmarEliminacionRegistro}
            disabled={eliminarCotizacion.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50/50 border border-red-200 rounded-xl text-[10px] font-black text-red-700 hover:bg-red-100/50 hover:border-red-300 hover:shadow-md transition-all h-[42px] uppercase group disabled:opacity-50"
          >
            {eliminarCotizacion.isPending ? (
              <div className="h-3.5 w-3.5 mr-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="trash-2" className="h-3.5 w-3.5 text-red-600 group-hover:scale-110 transition-transform" />
            )}
            Eliminar
          </button>
        </div>

        {/* PANEL ASIGNACION INLINE */}
        {showAsignarPanel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-4 font-sans animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center border-b pb-2 border-gray-150">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="users" className="h-3.5 w-3.5 text-indigo-500" />
                Asignación de Personal
              </h4>
              <button 
                type="button"
                onClick={() => setShowAsignarPanel(false)} 
                className="w-5 h-5 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Buscador inteligente */}
            <div className="relative">
              <input
                type="text"
                placeholder="BUSCAR COLABORADOR..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full bg-slate-55/65 border border-transparent rounded-xl pl-8 pr-8 py-2 text-[10px] font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-900 shadow-inner placeholder:text-slate-350"
              />
              <Icon name="search" className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchUserQuery && (
                <button
                  type="button"
                  onClick={() => setSearchUserQuery("")}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                >
                  <Icon name="x" className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filtros de visualización */}
            <div className="flex items-center gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setFilterAssignedOnly(false)}
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors border",
                  !filterAssignedOnly 
                    ? "bg-slate-950 border-slate-950 text-white shadow-sm" 
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                Todos ({usuariosActivos.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAssignedOnly(true)}
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors border",
                  filterAssignedOnly 
                    ? "bg-indigo-600 border-indigo-700 text-white shadow-sm" 
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                Asignados ({assignedEmails.length})
              </button>
            </div>

            {/* Listado de colaboradores */}
            <div className="max-h-[260px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredUsuarios.length === 0 ? (
                <div className="text-center py-6 text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">
                  Sin resultados
                </div>
              ) : (
                filteredUsuarios.map((usuario) => {
                  const isAssigned = assignedEmails.includes(usuario.correo?.toLowerCase());
                  return (
                    <div
                      key={usuario.id_usuario}
                      onClick={() => toggleResponsable(usuario.correo)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-200 select-none cursor-pointer group",
                        isAssigned 
                          ? "bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50/70" 
                          : "bg-transparent border-transparent hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar con Iniciales y Color Gradient */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 shadow-sm border",
                          isAssigned 
                            ? `bg-gradient-to-tr ${getAvatarColor(usuario.nombre_completo)} text-white border-transparent`
                            : "bg-slate-50 text-slate-500 border-slate-200/60 group-hover:border-indigo-250 group-hover:bg-white"
                        )}>
                          {getInitials(usuario.nombre_completo)}
                        </div>
                        
                        <div className="min-w-0">
                          <p className={cn(
                            "text-[10.5px] uppercase tracking-tight truncate leading-none transition-colors", 
                            isAssigned ? "font-black text-indigo-900" : "font-bold text-slate-600 group-hover:text-slate-800"
                          )}>
                            {usuario.nombre_completo}
                          </p>
                          <p className={cn(
                            "text-[8px] truncate mt-0.5 lowercase leading-none",
                            isAssigned ? "text-indigo-450" : "text-slate-400"
                          )}>
                            {usuario.correo || "sin correo"}
                          </p>
                        </div>
                      </div>

                      {/* Indicador Checkbox Moderno */}
                      <div className="shrink-0 ml-2">
                        {isAssigned ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-650 text-white flex items-center justify-center shadow-sm shadow-indigo-150 animate-in zoom-in duration-200">
                            <Icon name="check" className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 text-slate-350 flex items-center justify-center group-hover:border-indigo-400 group-hover:bg-indigo-50/40 transition-all duration-200">
                            <Icon name="plus" className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* CARD DATOS COTIZACION */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden font-sans">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-black text-gray-900 flex items-center text-[11px] uppercase tracking-wider">
              <Icon name="clipboard-list" className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Datos Cotización
            </h3>
          </div>

          <div className="p-4 space-y-4">

            {/* Referencia */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter block mb-1">
                Referencia del Proyecto
              </label>
              <p className="text-[10px] font-black uppercase leading-snug text-gray-900 break-words">
                {quote?.referencia || 'SIN REFERENCIA ASIGNADA'}
              </p>
            </div>

            {/* Grid 2 columnas: Tipo Cotizacion, Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <CompactField label="Tipo Cotización">
                {quote?.tipo_cotizacion_nombre || '---'}
              </CompactField>
              <CompactField label="Fecha">
                {quote?.fecha ? new Date(quote.fecha).toLocaleDateString('sv-SE') : '---'}
              </CompactField>
            </div>

            {/* Grid 2 columnas: Area, Estado */}
            <div className="grid grid-cols-2 gap-3">
              <CompactField label="Área">
                {quote?.area_nombre || '---'}
              </CompactField>
              
              <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-center min-h-[50px]">
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5 block">Estado</span>
                <div>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase border",
                    quote?.estado_nombre?.toLowerCase() === 'adjudicado' || quote?.estado_nombre?.toLowerCase() === 'adjudicada'
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : quote?.estado_nombre?.toLowerCase() === 'perdida'
                      ? "bg-red-50 text-red-700 border-red-200"
                      : quote?.estado_nombre?.toLowerCase() === 'en seguimiento'
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {quote?.estado_nombre || 'PENDIENTE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 2 columnas: Cliente, Representante */}
            <div className="grid grid-cols-2 gap-3">
              <CompactField label="Cliente (Para)">
                {quote?.cliente_nombre || 'SIN CLIENTE ASIGNADO'}
              </CompactField>
              <CompactField label="Representante">
                {quote?.representante_nombre || '---'}
              </CompactField>
            </div>

            {/* Grid 3 columnas: Entrega Suministros, Entrega Servicios, Validez Oferta */}
            <div className="grid grid-cols-3 gap-3">
              <CompactField label="Entrega Suministros">
                {quote?.entrega_suministros || quote?.tiempo_entrega_suministros || '0'}{' '}
                <span className="text-[9px] text-gray-400 font-bold uppercase">
                  {quote?.suministros_unidad || quote?.id_unidad_tiempo_entrega_suministros_nombre || 'DÍAS'}
                </span>
              </CompactField>

              <CompactField label="Entrega Servicios">
                {quote?.entrega_servicios || quote?.tiempo_entrega_servicios || '0'}{' '}
                <span className="text-[9px] text-gray-400 font-bold uppercase">
                  {quote?.servicios_unidad || quote?.id_unidad_tiempo_entrega_servicios_nombre || 'DÍAS'}
                </span>
              </CompactField>

              <CompactField label="Validez Oferta">
                {quote?.validez_oferta || '0'}{' '}
                <span className="text-[9px] text-gray-400 font-bold uppercase">
                  {quote?.validez_unidad || quote?.id_unidad_tiempo_validez_nombre || 'DÍAS'}
                </span>
              </CompactField>
            </div>

            {/* Grid 3 columnas: Tipo Moneda, Tipo Cambio, IGV */}
            <div className="grid grid-cols-3 gap-3">
              <CompactField label="Tipo Moneda">
                {quote?.tipo_moneda === 'D' ? 'DÓLARES' : 'SOLES'}
              </CompactField>

              <CompactField label="Tipo Cambio">
                {quote?.tipo_cambio || '1.00'}
              </CompactField>

              <CompactField label="IGV">
                {quote?.igv === 'I' || quote?.igv === 'S' ? 'INCLUYE' : 'NO INCLUYE'}
              </CompactField>
            </div>

            {/* Grid 2 columnas: Forma Pago, Lugar Entrega */}
            <div className="grid grid-cols-2 gap-3">
              <CompactField label="Forma Pago">
                {quote?.forma_pago || '---'}
              </CompactField>

              <CompactField label="Lugar Entrega">
                {quote?.lugar || quote?.lugar_entrega || '---'}
              </CompactField>
            </div>

            {/* Total Cotización (col-span-2) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest leading-none mb-1">
                    Total Cotización
                  </span>
                  <span className="text-xs font-black uppercase text-indigo-150 leading-none">
                    Importe Global
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-white">
                    {quote?.tipo_moneda === 'D' ? '$' : 'S/.'} {Number(quote?.total_cotizacion || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Previsualización de Documento */}
      {previewDoc && createPortal(
        <div className="fixed inset-0 bg-slate-900/20 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            style={{
              height: '88vh'
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Icon name="file-text" className="h-4 w-4 text-indigo-600" />
                  Previsualización de Orden de Compra: {previewDoc.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[9.5px] font-black transition-colors uppercase shadow-sm cursor-pointer"
                  >
                    <span>Abrir Completo</span>
                    <Icon name="external-link" className="h-3 w-3" />
                  </a>
                )}
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div 
              className="flex-1 bg-slate-50 p-4 overflow-hidden"
              onMouseEnter={(e) => {
                const iframe = e.currentTarget.querySelector('iframe');
                if (iframe) {
                  try {
                    iframe.focus();
                    iframe.contentWindow?.focus();
                  } catch (err) {
                    console.error("Error focusing iframe on hover:", err);
                  }
                }
              }}
            >
              {previewDoc.url ? (
                previewDoc.extension === '.pdf' ? (
                  <iframe 
                    src={previewDoc.url} 
                    className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm" 
                    title="Previsualización PDF" 
                    onLoad={(e) => {
                      const iframe = e.target;
                      setTimeout(() => {
                        try {
                          iframe.focus();
                          iframe.contentWindow?.focus();
                        } catch (err) {
                          console.error("Error focusing iframe on load:", err);
                        }
                      }, 50);
                    }}
                  />
                ) : ['.png', '.jpg', '.jpeg', '.webp'].includes(previewDoc.extension) ? (
                  <div className="w-full h-full flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-auto">
                    <img 
                      src={previewDoc.url} 
                      alt="Previsualización de imagen" 
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  // Mensaje de que no es previsualizable directamente (ej: Excel, Word, o enlace externo)
                  <div className="w-full h-full flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="max-w-md w-full text-center space-y-4 font-sans">
                      <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                        <Icon name="alert-circle" className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">No se puede previsualizar inline</h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Este archivo o enlace ({previewDoc.extension || 'Externo'}) no se puede embeber directamente en el navegador. Haz clic en el botón de abajo para abrirlo o descargarlo.
                        </p>
                      </div>
                      <a
                        href={previewDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black tracking-wider uppercase transition-all shadow-md cursor-pointer"
                      >
                        <span>Abrir / Descargar Archivo</span>
                        <Icon name="external-link" className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sin archivo
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Closing sidebar and main wrapper */}
      </div>
    </div>
  );
}

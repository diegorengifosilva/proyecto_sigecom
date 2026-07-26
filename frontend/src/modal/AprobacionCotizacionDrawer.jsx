// src/modal/AprobacionCotizacionDrawer.jsx
// 🚀 VERSIÓN DRAWER — Side Panel Premium para Cotizaciones
// Mantiene la misma lógica de negocio del Modal original, solo cambia el contenedor.
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  FileCheck2,
  Settings2,
  ChevronUp,
  SquareStar,
  ShieldCheck,
  FileText,
  UserPlus,
  Copy,
  Trash,
  FilePlus,
  Send,
  SquareArrowUp,
  MessageSquareMore,
  Phone,
  ChartScatter,
  PlusSquare,
  BanknoteArrowDown,
  Paperclip,
  RefreshCw,
  Undo2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import InfoTabs from "@/components/ui/InfoTabs";
import CondicionesModal from "./Gestion/CondicionesModal";
import GenerarCodigoModal from "./GenerarCodigoModal";
import DescuentosModal from "./Gestion/DescuentosModal";
import EnviarCotiModal from "./Gestion/EnviarCotiModal";
import ProbabilidadModal from "./Gestion/ProbabilidadModal";
import MensajesModal from "./Gestion/MensajesModal";
import SeguimientoModal from "./Gestion/SeguimientoModal";
import CopiaCotizacionModal from "./Gestion/CopiaCotizacionModal";
import NuevaVersionModal from "./Gestion/NuevaVersionModal";
import RetornarCotizacionModal from "./Gestion/RetornarCotizacionModal";
import EliminarCotizacionModal from "./Gestion/EliminarCotizacionModal";
import EnviarCotiAprobacionModal from "./Gestion/EnviarCotiAprobacionModal";
import AdjuntosModal from "./Gestion/AdjuntosModal";
import AgregarGrupoSuministroModal from "../dashboard/Suministros/AgregarGrupoSuministroModal";
import RegistroItemModal from "../dashboard/Suministros/RegistroItemModal";
import RegistroItemBuscadorModal from "../dashboard/Suministros/RegistroItemBuscadorModal";
import ImportarXLS1Modal from "../dashboard/Suministros/ImportarXLS1Modal";
import ImportarXLS2Modal from "../dashboard/Suministros/ImportarXLS2Modal";
import ServicioModal from "../dashboard/Servicios/ServicioModal";
import AgregarSubgrupoGastoModal from "../dashboard/Servicios/AgregarSubgrupoGastoModal";
import RegistroItemManoObraModal from "../dashboard/Servicios/RegistroItemManoObraModal";
import RegistroItemGastosServicioModal from "../dashboard/Servicios/RegistroItemGastosServicioModal";
import RegistroItemOtrosModal from "../dashboard/Servicios/RegistroItemOtrosModal";
import EstadoCotizacionModal from "./EstadoCotizacionModal";
import AsignarCotiModal from "./Gestion/AsignarCotiModal";
import { crearCotizacion } from "../api/cotizaciones";
import { tableToExcel } from "../utils/excel";
import { calcularItemSegunProveedor, resolverEndpointPorCodigo } from "../dashboard/Suministros/tables/tablaUtils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { fromJSON } from "postcss";
import ActionMenu from "../components/ui/ActionMenu";
import ClienteModal from "../dashboard/Tablas/EstructuraComercial/Modal/ClienteModal";

const ACCIONES_POR_MODO = {
  C: {
    guardar: true,
    reporte: false,
    salir: true,
    estado: false,
    seguimiento: false,
    probabilidad: false,
  },
  R: {
    guardar: true,
    reporte: true,
    salir: true,
    estado: false,
    seguimiento: false,
    probabilidad: false,
  },
  A: {
    guardar: true,
    reporte: true,
    salir: true,
    estado: false,
    seguimiento: false,
    probabilidad: false,
  },
  S: {
    guardar: false,
    reporte: true,
    salir: true,
    estado: true,
    seguimiento: true,
    probabilidad: true,
  },
};

export default function AprobacionCotizacionDrawer({ open, onClose, cotizacion, modo, tipo, dashboard, onRefrescar, esOportunidad, variant = "drawer" }) {
  const [data, setData] = useState(cotizacion || {});
  const [originalData, setOriginalData] = useState(cotizacion || {});

  useEffect(() => {
    setData(cotizacion || {});
    setOriginalData(cotizacion || {});
  }, [cotizacion]);

  const isDirty =
    JSON.stringify(data) !== JSON.stringify(originalData);
  const [loading, setLoading] = useState(false);
  const [tcamb, setTcamb] = useState(1);
  const [error, setError] = useState("");
  const [suministros, setSuministros] = useState([]);
  const [servicios, setServicios] = useState([]);
  const esNueva = tipo === "N";
  const esVer = tipo === "V";
  const [openCondiciones, setOpenCondiciones] = useState(false);
  const [condicionesHtml, setCondicionesHtml] = useState("");
  const [openGenerarCodigo, setOpenGenerarCodigo] = useState(false);
  const [openDescuentos, setOpenDescuentos] = useState(false);
  const [descuentosForm, setDescuentosForm] = useState({
    aplicar: false,
    afecto: "",
    porcentaje: "",
    importe: "",
  });
  const [openEnviarCoti, setOpenEnviarCoti] = useState(false);
  const [openEncargados, setOpenEncargados] = useState(false);
  const [openContactos, setOpenContactos] = useState(false);
  const [openProbabilidad, setOpenProbabilidad] = useState(false);
  const [openMensajes, setOpenMensajes] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [openSeg, setOpenSeg] = useState(false);
  const [openCopia, setOpenCopia] = useState(false);
  const [openNuevaVersion, setOpenNuevaVersion] = useState(false);
  const [openRetornar, setOpenRetornar] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [openEnviarAprobacion, setOpenEnviarAprobacion] = useState(false);
  const [loadingEnviar, setLoadingEnviar] = useState(false);
  const [openAdjuntos, setOpenAdjuntos] = useState(false);
  const [openEstadoCoti, setOpenEstadoCoti] = useState(false);
  const [openAsignar, setOpenAsignar] = useState(false);
  const [openCodigo, setOpenCodigo] = useState(false);
  const [codigo, setCodigo] = useState(""); // si lo quieres en el estado
  // SUMINISTROS
  const [openGrupoModal, setOpenGrupoModal] = useState(false);
  const [gruposSuministros, setGruposSuministros] = useState({});
  const [openItemModal, setOpenItemModal] = useState(false);
  const [grupoActivo, setGrupoActivo] = useState(null);
  const [openRegistroItem, setOpenRegistroItem] = useState(false);
  const [openImportarXLS1, setOpenImportarXLS1] = useState(false);
  const [openImportarXLS2, setOpenImportarXLS2] = useState(false);
  const [totalGeneral, setTotalGeneral] = useState(0);
  // SERVICIOS
  const [selectedServicioId, setSelectedServicioId] = useState(null);
  const [selectedSubgrupoId, setSelectedSubgrupoId] = React.useState(null);
  const [gruposServicios, setGruposServicios] = useState({});
  const [servicioActivo, setServicioActivo] = useState(null);
  const [openServicioModal, setOpenServicioModal] = useState(false);
  const [openSubgrupoModal, setOpenSubgrupoModal] = useState(false);
  const [subgrupoActivo, setSubgrupoActivo] = useState(null);
  const [selectedTipoCodigo, setSelectedTipoCodigo] = useState(null);
  const [openRegistroMO, setOpenRegistroMO] = useState(false);
  const [openRegistroGS, setOpenRegistroGS] = useState(false);
  const [openRegistroOtros, setOpenRegistroOtros] = useState(false);
  const abrirModalRegistroPorTipo = (tipoCodigo, servicioId, subgrupoId, item = null) => {
    const servicio = gruposServicios[servicioId];
    if (!servicio) return console.warn("❌ Servicio no encontrado:", servicioId);

    const subgrupo = servicio.subgrupos?.find(sg => sg.id === subgrupoId);
    if (!subgrupo) return console.warn("❌ Subgrupo no encontrado:", subgrupoId);

    // 🔹 Si tipoCodigo viene undefined (editar), lo tomamos del subgrupo
    tipoCodigo = tipoCodigo ?? subgrupo.tipoCodigo;

    setSelectedServicioId(servicioId);
    setSelectedSubgrupoId(subgrupoId);
    setSelectedTipoCodigo(tipoCodigo);
    setItemActivo(item);

    // cerramos todos por seguridad
    setOpenRegistroMO(false);
    setOpenRegistroGS(false);
    setOpenRegistroOtros(false);

    switch (tipoCodigo) {
      case "04": setOpenRegistroMO(true); break;
      case "05": setOpenRegistroGS(true); break;
      case "06": setOpenRegistroOtros(true); break;
      default: console.warn("⚠️ Tipo de gasto no reconocido:", tipoCodigo);
    }
  };
  const [loadingSuministros, setLoadingSuministros] = useState(false);
  const [campoError, setCampoError] = useState(null);
  const acciones = ACCIONES_POR_MODO[modo] || {};
  const [itemActivo, setItemActivo] = useState(null);
  const [cotizacionVista, setCotizacionVista] = useState(cotizacion?.num_reg);
  const [cotizacionEditable, setCotizacionEditable] = useState(null);
  const [tabActiva, setTabActiva] = useState("datos");
  const DASHBOARD_TABS = {
    C: ["datos", "suministros", "servicios", "gestion"],
    O: ["datos"],
  };
  const tabsToShow = DASHBOARD_TABS[dashboard] ?? ["datos"];

  const [openReporte, setOpenReporte] = useState(false);
  const [htmlReporte, setHtmlReporte] = useState("");
  const [loadingReporte, setLoadingReporte] = useState(false);

  const [openClienteModal, setOpenClienteModal] = useState(false);

  // ==========
  // MEJORA
  // =========
  const queryClient = useQueryClient();

  const crearMutation = useMutation({
    mutationFn: crearCotizacion,
    onSuccess: (res) => {
      const cot = res?.cotizacion;

      setData(prev => ({
        ...prev,
        num_reg: cot?.num_reg ?? prev.num_reg,
        numero: cot?.numero ?? prev.numero,
        acu_e: condicionesHtml,
      }));

      toast.success("Cotización guardada correctamente");

      // 🔥 aquí está la magia
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
    },
    onError: () => {
      toast.error("Error al guardar la cotización");
    },
  });

  // =======
  // NUMREG
  // ========
  const numReg = data?.num_reg || cotizacion?.num_reg;

  //=========================//
  // DATOS DE LA COTIZACIÓN //
  //=========================//
  const fetchCotizacionDetalle = async (num_reg) => {
    if (!num_reg) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.get(`cotizaciones/cotizacion_detalle/${num_reg}/`);

      setData(res.data);

      // 🔥 HIDRATAR DESCUENTO DESDE BACKEND
      const afectoMap = {
        T: "t",
        S: "su",
        M: "ser",
      };

      const descuentoForm = {
        aplicar: Number(res.data.des_a) === 1,
        afecto: afectoMap[res.data.des_t] || "",
        porcentaje: res.data.des_p || "",
        importe: res.data.des_m || "",
      };

      setDescuentosForm(descuentoForm);

      // 🔑 Fuente de verdad
      const tc = Number(res.data.tcamb || 1);
      setTcamb(tc);

    } catch (err) {
      console.error("Error cargando detalles de cotización:", err);
      setError("No se pudo cargar la información de la cotización.");
    } finally {
      setLoading(false);
    }
  };

  console.log("🧭 Modal activo en dashboard:", dashboard);

  //===============//
  // OPORTUNIDADES //
  //===============//
  const fetchOportunidadDetalle = async (num_reg) => {
    if (!num_reg) return;

    setLoading(true);
    try {
      const res = await api.get(`oportunidades/modal/${num_reg}/`);

      // 🔍 ESTE ES EL LOG QUE NECESITAMOS VER
      console.log("📂 [DEBUG] DATOS DE OPORTUNIDAD RECIBIDOS:", {
        num_reg: res.data.num_reg,
        f_recp: res.data.f_recp,
        f_limite: res.data.f_limite,
        estado_op: res.data.estado_op,
        coment: res.data.coment,
        objeto_completo: res.data
      });

      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando oportunidad:", err);
      setError("No se pudo cargar el seguimiento.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar solo la cabecera (detalle) usando el número original
  useEffect(() => {
    if (open && cotizacion?.num_reg) {
      // Determinamos si es oportunidad basándonos en tu lógica (ej. el campo 'cotit' o un flag)
      const esOP = cotizacion.es_oportunidad || cotizacion.cotit === 'S' || cotizacion.cotit === 'V';

      if (esOP) {
        fetchOportunidadDetalle(cotizacion.num_reg);
      } else {
        fetchCotizacionDetalle(cotizacion.num_reg);
      }

      cargarMensajes();
      setCotizacionVista(cotizacion.num_reg);
      setCotizacionEditable(null);
      setTabActiva("datos");
    }
  }, [open, cotizacion]);

  //=============//
  // SUMINISTROS //
  //=============//
  const fetchSuministros = async (num_reg) => {
    if (!num_reg) return;

    try {
      const res = await api.get(
        `cotizacion/${num_reg}/suministros/`
      );

      const rows = Array.isArray(res.data) ? res.data : [];
      const grupos = mapSuministrosBackendToState(rows);

      setGruposSuministros(grupos);
      setSuministros(rows);

    } catch (err) {
      console.error("Error cargando suministros:", err);
      setGruposSuministros({});
      setSuministros([]);
    }
  };

  // Agregar o Editar Grupo
  const handleAgregarGrupoSuministro = (form) => {
    setGruposSuministros(prev => {
      // 1. DETERMINAR EL COSTO DE ENVÍO CON FALLBACK
      // Si el modal devuelve 0, intentamos usar el envío general de la cotización (data)
      const envioGeneral = data?.tven === "T" ? (data?.env_tot || 0) : (data?.env_par || 0);
      const costoEnvioFinal = Number(form.costoEnvio) > 0 ? Number(form.costoEnvio) : Number(envioGeneral);

      // ✏️ EDITAR EXISTENTE
      if (form._key && prev[form._key]) {
        const grupoPrev = prev[form._key];

        return {
          ...prev,
          [form._key]: {
            ...grupoPrev,
            titulo: form.nombre,
            cantidad: Number(form.cantidad),
            totalGrupo: form.totalGrupo,
            nroLineasPdf: Number(form.nroLineasPdf),

            // Sincronizamos todos los campos con el valor final validado
            costoEnvio: costoEnvioFinal,
            env_tot: costoEnvioFinal,
            env_par: costoEnvioFinal,
            cost_env: costoEnvioFinal,
            tog: form.totalGrupo ? 1 : 0,

            header: {
              ...grupoPrev.header,
              can: Number(form.cantidad),
            },
          },
        };
      }

      // ➕ CREAR NUEVO GRUPO
      const existentes = Object.keys(prev)
        .map(k => parseInt(k.substring(0, 2), 10))
        .filter(n => !isNaN(n));

      const maxContador = existentes.length > 0 ? Math.max(...existentes) : 0;
      const nuevoContador = maxContador + 1;
      const nuevoCog = String(nuevoContador).padStart(2, "0") + form.tipo;

      return {
        ...prev,
        [nuevoCog]: {
          cog: nuevoCog,
          titulo: form.nombre,
          cantidad: Number(form.cantidad),
          totalGrupo: form.totalGrupo,
          nroLineasPdf: Number(form.nroLineasPdf),
          items: [],
          header: {
            can: Number(form.cantidad),
            tot: 0,
          },
          // Aplicamos el valor final validado también al crear
          costoEnvio: costoEnvioFinal,
          env_tot: costoEnvioFinal,
          env_par: costoEnvioFinal,
          cost_env: costoEnvioFinal,
        },
      };
    });
  };

  useEffect(() => {
    if (gruposSuministros && Object.keys(gruposSuministros).length > 0) {
      console.log("%c >>> ESTADO ACTUAL DE GRUPOS (AL CARGAR MODAL) <<<", "background: #222; color: #bada55; pading: 2px;");

      Object.values(gruposSuministros).forEach((g, index) => {
        console.log(`GRUPO [${index}] - Título: ${g.titulo}`);
        console.log(`   -> env_tot: ${g.env_tot}`);
        console.log(`   -> env_par: ${g.env_par}`);
        console.log(`   -> costoEnvio: ${g.costoEnvio}`);
      });

      console.log("------------------------------------------------");
    }
  }, [gruposSuministros]);

  const normalizarSuministros = (rows) => {
    const grupos = {};

    rows.forEach(r => {
      const cog = r.cog;

      // 🧱 Crear grupo (nig = 0)
      if (r.nig === 0) {
        grupos[cog] = {
          cog,
          tipo: r.mov || "EQUIPOS", // o lo que uses
          titulo: r.nog,
          cantidad: Number(r.can),
          totalGrupo: Number(r.tog || 0),
          nroLineasPdf: 0,
          items: [],
          header: {
            can: Number(r.can),
            tot: Number(r.tog || 0),
          },
          _persistido: true,
        };
        return;
      }

      // 📦 Agregar item
      if (!grupos[cog]) {
        console.warn("Item sin grupo:", cog);
        return;
      }

      grupos[cog].items.push({
        id: r.num,
        nig: r.nig,
        cod: r.cod,
        des: r.des,
        pro: r.pro,
        can: Number(r.can),
        puc: Number(r.puc),
        tou: Number(r.tou),
        cau: Number(r.cau),
        toc: Number(r.toc),
        val: Number(r.val),
        tot: Number(r.tot),
        tpr: r.tpr,
        tde: r.tde,
        ent: r.ent,
        enu: r.enu,
        obs: r.obs,
      });
    });

    return grupos;
  };

  // Agregar / Editar Item
  const handleAgregarItem = (form) => {
    if (!grupoActivo) return;

    const esEdicion = Boolean(form.id);

    const itemProcesado = {
      id: esEdicion ? form.id : `I${Date.now()}`,
      num: esEdicion ? form.num : Date.now(),

      // Identificadores y Textos
      cod: form.codigo || form.cod, // Soporta ambos nombres por si acaso
      des: form.descripcion || form.des,
      pro: form.marca || form.pro,
      tpr: form.proveedor || form.tpr,
      tde: form.unidad || form.tde,
      obs: form.observacion || form.obs || "",

      // Valores Numéricos Base
      can: Number(form.cantidad || 0),
      puc: Number(form.costoPrecio || form.puc || 0),
      tou: Number(form.utilidad || form.tou || 0),
      cau: Number(form.porcentaje || form.cau || 0),
      toc: Number(form.costoTotal || form.toc || 0),
      val: Number(form.ventaPrecio || form.val || 0),
      tot: Number(form.ventaTotal || form.tot || 0),
      cost_c_env: Number(form.costoConEnvio || form.cost_c_env || 0),

      // 🚀 CAMPOS CRÍTICOS PARA EL ENVÍO (Nuevos)
      cost_env: Number(form.costoEnvio || form.cost_env || 0),
      por_env: Number(form.porcentajeEnvio || form.por_env || 0),
      utilidadTotal: form.utilidadTotal, // Opcional, para visualización en UI

      // Logística
      ent: form.entrega ? Number(form.entrega) : null,
      enu: form.entrega_uni || form.enu || "D",
    };

    setGruposSuministros(prev => {
      const itemsActuales = prev[grupoActivo]?.items || [];

      const nuevosItems = esEdicion
        ? itemsActuales.map(item =>
          item.id === form.id ? itemProcesado : item
        )
        : [...itemsActuales, itemProcesado];

      return {
        ...prev,
        [grupoActivo]: {
          ...(prev[grupoActivo] || { titulo: "", items: [] }),
          items: nuevosItems,
        },
      };
    });
  };

  const calcularItemConEnvio = (item, todosLosItemsDelGrupo, costoEnvioGrupo, tipoVenta) => {
    const tVenta = tipoVenta?.toUpperCase();

    const cantidad = Number(item.can || 0);
    const costoPrecioUnitario = Number(item.puc || 0);
    const costoTotalLinea = Number((costoPrecioUnitario * cantidad).toFixed(2)); // TOC
    const porcentajeUtil = Number(item.cau || 0);

    const listaItems = Array.isArray(todosLosItemsDelGrupo)
      ? todosLosItemsDelGrupo
      : Object.values(todosLosItemsDelGrupo || {});

    const sumaVentaGrupo = listaItems.reduce((acc, it) => acc + Number(it.toc || 0), 0);

    let costoEnvioUnitario = 0;
    let porcentajeEnvio = 0;

    // ==========================================
    // CASO 1: VENTA TOTAL (T) -> Prorrateo
    // ==========================================
    if (tVenta === "T") {
      const ratioEnvio = sumaVentaGrupo > 0 ? (costoTotalLinea / sumaVentaGrupo) : 0;

      // Aquí SÍ calculamos y guardamos por_env
      porcentajeEnvio = sumaVentaGrupo > 0
        ? Number(((costoPrecioUnitario / sumaVentaGrupo) * 100).toFixed(2))
        : 0;

      const envioTotalParaEsteItem = costoEnvioGrupo * ratioEnvio;
      costoEnvioUnitario = cantidad > 0 ? envioTotalParaEsteItem / cantidad : 0;
    }

    // ==========================================
    // CASO 2: VENTA PARCIAL (P) -> Envío Directo
    // ==========================================
    else if (tVenta === "P") {
      costoEnvioUnitario = cantidad > 0 ? costoEnvioGrupo / cantidad : 0;

      // 🚩 MEJORA: En modo P, forzamos por_env a 0 para que no se guarde ni procese
      porcentajeEnvio = 0;

      console.log(` > Modo Parcial: Envio U. ${costoEnvioUnitario.toFixed(4)} | por_env anulado.`);
    }

    // ==========================================
    // PROCESO DE RETORNO (T y P)
    // ==========================================
    if (tVenta === "T" || tVenta === "P") {
      const costoConEnvio = costoPrecioUnitario + costoEnvioUnitario;
      const utilidadUnitaria = (costoConEnvio * porcentajeUtil) / 100;
      const ventaPrecioUnitario = costoConEnvio + utilidadUnitaria;

      return {
        ...item,
        can: cantidad,
        puc: costoPrecioUnitario,
        toc: costoTotalLinea,
        cau: porcentajeUtil,
        tou: Number(utilidadUnitaria.toFixed(4)),
        val: Number(ventaPrecioUnitario.toFixed(2)),
        tot: Number((ventaPrecioUnitario * cantidad).toFixed(2)),
        cost_env: Number(costoEnvioUnitario.toFixed(4)),
        por_env: porcentajeEnvio, // Será > 0 solo si es "T"
        cost_c_env: Number(costoConEnvio.toFixed(4)),
        utilidadTotal: Number(((ventaPrecioUnitario - costoConEnvio) * cantidad).toFixed(2))
      };
    }

    // Caso 3: Estándar (Sin envío)
    else {
      const utilidadUnitaria = (costoPrecioUnitario * porcentajeUtil) / 100;
      const ventaPrecioUnitario = costoPrecioUnitario + utilidadUnitaria;
      return {
        ...item,
        can: cantidad,
        puc: costoPrecioUnitario,
        toc: costoTotalLinea,
        cau: porcentajeUtil,
        tou: Number(utilidadUnitaria.toFixed(4)),
        val: Number(ventaPrecioUnitario.toFixed(2)),
        tot: Number((ventaPrecioUnitario * cantidad).toFixed(2)),
        cost_env: 0,
        por_env: 0,
        cost_c_env: costoPrecioUnitario,
        utilidadTotal: Number((utilidadUnitaria * cantidad).toFixed(2))
      };
    }
  };

  const mapSuministrosBackendToState = (rows = []) => {
    const grupos = {};

    rows.forEach((row) => {
      const grupoId = row.cog;

      if (!grupos[grupoId]) {
        grupos[grupoId] = {
          id: grupoId,
          cog: grupoId, // Asegúrate de tener 'cog' disponible
          tipo: "SUMINISTROS",
          titulo: row.nog || "",
          cantidad: 0,
          totalGrupo: 0,
          nroLineasPdf: 0,
          // 🚀 CAMPOS NUEVOS PARA EL MODAL:
          env_tot: 0,
          env_par: 0,
          cost_env: 0,
          tog: 0,
          header: {
            can: 0,
            tot: 0,
          },
          items: [],
        };
      }

      // 🟡 CABECERA DEL GRUPO (nig === 0)
      if (row.nig === 0) {
        grupos[grupoId].titulo = row.nog;
        grupos[grupoId].cantidad = Number(row.can || 0);
        grupos[grupoId].header.can = Number(row.can || 0);
        grupos[grupoId].header.tot = Number(row.tot || 0);
        grupos[grupoId].totalGrupo = Number(row.tot || 0);

        // 🚩 AQUÍ ESTABA EL ERROR: Mapeamos los valores de envío de la DB al estado
        grupos[grupoId].env_tot = Number(row.env_tot || 0);
        grupos[grupoId].env_par = Number(row.env_par || 0);
        grupos[grupoId].cost_env = Number(row.cost_env || 0);
        grupos[grupoId].tog = Number(row.tog || 0);

        return;
      }

      // 🟢 ITEM REAL (nig > 0)
      const item = {
        id: `I-${row.num}`,
        num: row.num,
        cod: row.cod,
        des: row.des,
        pro: row.pro,
        tde: row.tde,
        can: Number(row.can || 0),
        val: Number(row.val || 0),
        tot: Number(row.tot || 0),
        puc: Number(row.puc || 0),
        toc: Number(row.toc || 0),
        cau: Number(row.cau || 0),
        tou: Number(row.tou || 0),
        // También guardamos el envío por item por si acaso
        env_tot: Number(row.env_tot || 0),
        env_par: Number(row.env_par || 0),
        cost_env: Number(row.cost_env || 0),
        mov: row.mov,
        tpr: row.tpr,
        ent: row.ent,
        enu: row.enu,
        obs: row.obs,
      };

      grupos[grupoId].items.push(item);

      // acumulados
      grupos[grupoId].header.can += item.can;
      grupos[grupoId].header.tot += item.tot;
      // Nota: Aquí decides si el totalGrupo es la suma de items o el valor de cabecera
    });

    return grupos;
  };

  // Actualizar Lista
  const handleRefreshSuministros = async () => {
    if (loadingSuministros) return;

    try {
      setLoadingSuministros(true);

      // 1️⃣ Limpias cambios temporales del frontend
      setGruposSuministros({});

      // 2️⃣ Vuelves a cargar desde backend
      await fetchSuministros();

    } catch (error) {
      console.error("Error actualizando suministros", error);
    } finally {
      setLoadingSuministros(false);
    }
  };

  // Duplicar Grupo
  const handleDuplicarGrupo = (cogOriginal) => {
    setGruposSuministros(prev => {
      const grupo = prev[cogOriginal];
      if (!grupo) return prev;

      // 1️⃣ contador global (igual que agregar)
      const existentes = Object.keys(prev)
        .map(k => parseInt(k.substring(0, 2), 10))
        .filter(n => !isNaN(n));

      const maxContador = existentes.length > 0 ? Math.max(...existentes) : 0;
      const nuevoContador = maxContador + 1;

      // 2️⃣ tipo desde el cog original (últimos 2 dígitos)
      const tipo = cogOriginal.substring(2, 4);

      const nuevoCog = String(nuevoContador).padStart(2, "0") + tipo;

      // 3️⃣ duplicamos items sin romper referencias
      const nuevosItems = grupo.items.map((item, idx) => ({
        ...item,
        id: `I${Date.now()}_${idx}`,
        cog: nuevoCog,
        nig: idx + 1,
      }));

      return {
        ...prev,
        [nuevoCog]: {
          ...grupo,
          cog: nuevoCog,
          titulo: `${grupo.titulo} - Copia`,
          items: nuevosItems,
          header: {
            ...grupo.header,
          },
        },
      };
    });
  };

  const recalcularTotales = (grupo) => {
    if (!grupo?.items || !Array.isArray(grupo.items)) {
      return {
        ...grupo,
        items: [],
        subtotal: 0,
      };
    }

    let subtotal = 0;

    const itemsActualizados = grupo.items.map(item => {
      const cantidad = Number(item?.cantidad || 0);
      const precio = Number(item?.precio_unitario || 0);
      const total = cantidad * precio;

      subtotal += total;

      return {
        ...item,
        total,
      };
    });

    return {
      ...grupo,
      items: itemsActualizados,
      subtotal,
    };
  };

  const recalcularItemImport = (item) => {
    const cantidad = Number(item.can || 0);
    const precio = Number(item.val || item.puc || 0);

    return {
      ...item,
      tot: cantidad * precio,
    };
  };

  // 🔹 Construye los ítems desde el XLS usando la MISMA lógica que RegistroItemModal
  const buildGruposFromXLS = async (
    excelRows,
    gruposExistentes = {},
    grupoActivo,
    tcamb = 1
  ) => {
    if (!grupoActivo) {
      console.error("❌ Grupo no definido");
      return gruposExistentes;
    }

    // =====================
    // 🔥 Validación Excel
    // =====================
    if (!Array.isArray(excelRows) || excelRows.length === 0) {
      alert("El archivo Excel está vacío.");
      return gruposExistentes;
    }

    if (!excelRows.some(r => r.Codigo || r.codigo)) {
      alert("El Excel no tiene columna Código.");
      return gruposExistentes;
    }

    console.log("📥 Importación XLS →", grupoActivo);

    const grupoOriginal = gruposExistentes[grupoActivo] || {};
    const itemsExistentes = grupoOriginal.items || [];

    const grupo = { ...grupoOriginal };
    grupo.tipo = grupo.tipo || "SUMINISTRO";
    grupo.titulo = grupo.titulo || grupoActivo;

    // =====================
    // 🔥 Cache para rendimiento
    // =====================
    const cacheCodigos = new Map();

    // =====================
    // 🔁 Fallback proveedor Excel → TPR
    // =====================
    const mapProveedorExcelToTPR = (proveedor = "") => {
      const p = proveedor.toLowerCase();
      if (p.includes("rockwell")) return "01";
      if (p.includes("rittal")) return "03";
      if (p.includes("phoenix")) return "05";
      if (p.includes("schneider")) return "06";
      if (p.includes("ls")) return "07";
      return "";
    };

    // =====================
    // 1️⃣ Base
    // =====================
    const itemsBase = excelRows.map(row => ({
      id: crypto.randomUUID(),
      cod: String(row.Codigo || row.codigo || "").trim(),
      des: String(row.Descripcion || row.descripcion || "").trim(),
      can: Number(row.Cant || row.cant || 1),
      proveedorExcel: String(row.Proveedor || row.proveedor || "").trim(),
      pendienteResolver: true,
    }));

    let nuevos = 0;
    let actualizados = 0;
    let noEncontrados = 0;

    // =====================
    // 2️⃣ Resolver
    // =====================
    const processedItems = await Promise.all(
      itemsBase.map(async item => {
        const key = item.cod?.toUpperCase();

        if (!key || ["S/C", "."].includes(key)) {
          return { ...item, pendienteResolver: false };
        }

        // 🔥 Cache
        if (cacheCodigos.has(key)) {
          return cacheCodigos.get(key);
        }

        try {
          const tprPorCodigo = await resolverEndpointPorCodigo(item.cod);

          let tprFinal = tprPorCodigo && tprPorCodigo !== "99"
            ? tprPorCodigo
            : mapProveedorExcelToTPR(item.proveedorExcel);

          if (!tprFinal) {
            noEncontrados++;
            return { ...item, pendienteResolver: false };
          }

          const endpointMap = {
            "01": "/cotizaciones/rockwell/",
            "03": "/cotizaciones/rittal/",
            "05": "/cotizaciones/ceyesa/",
            "06": "/cotizaciones/alm-articulos/?proveedor=Schneider",
            "07": "/cotizaciones/alm-articulos/?proveedor=LS Industrial Systems",
            "99": "/cotizaciones/alm-articulos/?proveedor=OTROS",
          };

          const endpoint = endpointMap[tprFinal];
          if (!endpoint) return item;

          const res = await api.get(endpoint, { params: { search: item.cod } });
          const rows = Array.isArray(res.data) ? res.data : [];

          const encontrado = rows.find(r =>
            String(r.codigo).toUpperCase() === key ||
            String(r.ocodigo).toUpperCase() === key
          );

          let calc;

          if (!encontrado) {
            noEncontrados++;

            calc = calcularItemSegunProveedor(
              {
                codigo: item.cod,
                descripcion: item.des,
                proveedor: item.proveedorExcel,
                pgc: "UNI",
                precio: 0,
              },
              tprFinal,
              tcamb,
              item.can,
              item.proveedorExcel
            );
          } else {
            calc = calcularItemSegunProveedor(
              encontrado,
              tprFinal,
              tcamb,
              item.can,
              item.proveedorExcel
            );
          }

          const normalizado = {
            ...item,
            tpr: calc.tpr ?? tprFinal,
            cod: calc.codigo ?? item.cod,
            des: calc.descripcion ?? item.des,
            pro: item.proveedorExcel,
            tde: calc.unidad ?? "UNI",
            can: calc.cantidad ?? 1,
            puc: calc.costoPrecio ?? 0,
            tou: calc.utilidad ?? 0,
            cau: calc.porcentaje ?? 0,
            toc: calc.costoTotal ?? 0,
            val: calc.ventaPrecio ?? 0,
            tot: calc.ventaTotal ?? 0,
            pendienteResolver: false,
          };

          cacheCodigos.set(key, normalizado);
          nuevos++;

          return normalizado;

        } catch (err) {
          console.error("Error XLS", item.cod, err);
          return item;
        }
      })
    );

    // =====================
    // 🔥 Anti-duplicados + actualización automática
    // =====================
    const mapaItems = new Map();

    itemsExistentes.forEach(item => {
      mapaItems.set(item.cod?.toUpperCase(), item);
    });

    processedItems.forEach(item => {
      const key = item.cod?.toUpperCase();

      if (!key) {
        mapaItems.set(crypto.randomUUID(), item);
        return;
      }

      if (mapaItems.has(key)) {
        const existente = mapaItems.get(key);

        actualizados++;

        const nuevaCantidad =
          Number(existente.can || 0) + Number(item.can || 0);

        let actualizado = {
          ...existente,
          can: nuevaCantidad,
        };

        // 🔥 recalculo inmediato
        actualizado = recalcularItemImport(actualizado);

        mapaItems.set(key, actualizado);
      } else {
        mapaItems.set(key, item);
      }
    });

    const todosLosItems = Array.from(mapaItems.values());

    // =====================
    // 🔥 Recalculo automático
    // =====================
    grupo.items = todosLosItems.map((item, idx) => {
      const recalculado = recalcularItemImport(item);

      return {
        ...recalculado,
        nig: idx + 1,
      };
    });

    // =====================
    // 🔥 Recalculo total grupo
    // =====================
    const subtotal = grupo.items.reduce(
      (acc, item) => acc + Number(item.tot || 0),
      0
    );

    const cantidadTotal = grupo.items.reduce(
      (acc, item) => acc + Number(item.can || 0),
      0
    );

    grupo.subtotal = subtotal;
    grupo.total = subtotal;
    grupo.cantidad = cantidadTotal;

    // =====================
    // 🔥 Logs UX
    // =====================
    console.log("✔ Nuevos:", nuevos);
    console.log("🔁 Actualizados:", actualizados);
    console.log("⚠ No encontrados:", noEncontrados);

    alert(
      `Importación completada:
      ✔ ${nuevos} nuevos
      🔁 ${actualizados} actualizados
      ⚠ ${noEncontrados} sin coincidencia`
    );

    return {
      ...gruposExistentes,
      [grupoActivo]: grupo,
    };
  };

  // 🔹 Maneja la importación desde XLS (ya sea del modal o de un submodal)
  const handleImportarDesdeXLS = async (excelRowsOrFile) => {
    if (!grupoActivo) {
      console.error("❌ No hay grupo activo");
      return;
    }

    if (Array.isArray(excelRowsOrFile)) {
      const gruposActualizados = await buildGruposFromXLS(
        excelRowsOrFile,
        gruposSuministros,
        grupoActivo,
        tcamb
      );
      setGruposSuministros(gruposActualizados);
      return;
    }

    if (!(excelRowsOrFile instanceof Blob)) {
      console.error("❌ Archivo inválido");
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const gruposActualizados = await buildGruposFromXLS(
          excelRows,
          gruposSuministros,
          grupoActivo,
          tcamb
        );

        setGruposSuministros(gruposActualizados);
      } catch (err) {
        console.error("❌ Error procesando XLS", err);
      }
    };

    reader.readAsArrayBuffer(excelRowsOrFile);
  };

  const recalcularTotalesSuministros = (grupos = {}) => {
    let totalGeneral = 0;

    const nuevosGrupos = Object.fromEntries(
      Object.entries(grupos).map(([cog, grupo]) => {
        const subtotalGrupo = grupo.items.reduce(
          (acc, item) => acc + Number(item.tot || 0),
          0
        );

        const cantidadGrupo = Number(grupo.cantidad || 0);

        totalGeneral += subtotalGrupo * cantidadGrupo;

        return [
          cog,
          {
            ...grupo,
            totalGrupo: +subtotalGrupo.toFixed(2),
            header: {
              ...grupo.header,
              tot: +subtotalGrupo.toFixed(2),
            },
          },
        ];
      })
    );

    return {
      grupos: nuevosGrupos,
      totalGeneral: +totalGeneral.toFixed(2),
    };
  };

  useEffect(() => {
    const total = recalcularTotalesSuministros(gruposSuministros);

    setTotalGeneral(total);
  }, [gruposSuministros]);

  //============//
  // SERVICIOS  //
  //============//
  const fetchServicios = async (num_reg) => {
    if (!num_reg) return;

    try {
      const res = await api.get(`cotizaciones/lista_servicios/${num_reg}/`);

      const lista = Array.isArray(res.data) ? res.data : [];

      setServicios(lista);

    } catch (err) {
      console.error("Error cargando servicios:", err);
      setServicios([]);
    }
  };

  // IDs
  const buildSubgrupoId = (servicioId, index) =>
    `SG_BACK_${servicioId}_${index}`;

  // Agregar o Editar Servicio
  const handleAgregarServicio = (form) => {
    setGruposServicios(prev => {
      let nuevoState;

      if (form._key && prev[form._key]) {
        const servicioPrev = prev[form._key];

        nuevoState = {
          ...prev,
          [form._key]: {
            ...servicioPrev,
            tituloGeneral: form.nombre,
            cantidad: Number(form.cantidad),
            lineasPdf: Number(form.lineasPdf),
            detalle: form.detalle,
            header: {
              ...servicioPrev.header,
              can: Number(form.cantidad),
            },
          },
        };
      } else {
        const id = form.cog ?? `S${Date.now()}`;

        nuevoState = {
          ...prev,
          [id]: {
            id,
            tituloGeneral: form.nombre,
            cantidad: Number(form.cantidad),
            lineasPdf: Number(form.lineasPdf),
            detalle: form.detalle,
            subgrupos: [],
            header: {
              can: Number(form.cantidad),
              tot: 0,
            },
          },
        };
      }

      // 🔥 GUARDAR EN BACKEND
      const payload = mapServiciosStateToPayload(nuevoState);
      serviciosMutation.mutate(payload);

      return nuevoState;
    });
  };

  // Diccionario de tipos de subgrupos
  const tipoSubgrupoDict = {
    "04": "MANO DE OBRA",
    "05": "GASTOS SERVICIO",
    "06": "OTROS",
    // agrega más según tu DB
  };

  // Normalizador 
  const normalizarTipoSubgrupo = (sub) => {
    if (sub.tipoNombre) return sub;

    return {
      ...sub,
      tipoNombre: tipoSubgrupoDict[sub.tipoCodigo] ?? sub.tipoCodigo,
    };
  };

  // Agregar Subgrupo
  const handleAgregarSubgrupo = (form, servicioId) => {
    setGruposServicios(prev => {
      const servicio = prev[servicioId];
      if (!servicio) return prev;

      // ✏️ editar
      if (form._key) {
        return {
          ...prev,
          [servicioId]: {
            ...servicio,
            subgrupos: servicio.subgrupos.map(sg =>
              sg.id === form._key
                ? {
                  ...sg,
                  titulo: form.nombre,
                  tipoCodigo: form.tipoGasto,
                  tipoNombre: tipoSubgrupoDict[form.tipoGasto],
                }
                : sg
            ),
          },
        };
      }

      // ➕ crear
      const nuevoIndex = servicio.subgrupos.length;
      const nuevoSubgrupo = normalizarTipoSubgrupo({
        id: buildSubgrupoId(servicioId, nuevoIndex),
        titulo: form.nombre,
        tipoCodigo: form.tipoGasto,
        items: [],
        subtotal: 0,
      });

      return {
        ...prev,
        [servicioId]: {
          ...servicio,
          subgrupos: [...servicio.subgrupos, nuevoSubgrupo],
        },
      };
    });
  };

  // Agregar Items (diagnóstico completo)
  const handleAgregarItemServicio = (form) => {
    if (!selectedServicioId || !selectedSubgrupoId) return;

    const esEdicion = Boolean(form.num);

    const itemProcesado = {
      id: esEdicion ? form.id : `IT_${Date.now()}`,
      num: esEdicion ? form.num : Date.now(),
      cod: form.codigoTipoGasto ?? form.personal ?? form.codigo ?? "",
      des: form.concepto ?? form.descripcion ?? "",
      can: Number(form.hombres ?? form.cantidad ?? 0),
      tde: Number(form.dias ?? form.unidad ?? 0),
      pro: Number(form.horas ?? form.pro ?? 0),
      puc: Number(form.costoDia ?? form.costoPrecio ?? form.precio ?? 0),
      tou: Number(form.utilidad ?? 0),
      cau: Number(form.porcentaje ?? 0),
      toc: Number(form.costoTotal ?? 0),
      val: Number(form.cotizadoDia ?? form.ventaPrecio ?? form.precio ?? 0),
      tot: Number(form.cotizadoTotal ?? form.ventaTotal ?? form.total ?? 0),
      tpr: form.area ?? "",
    };

    setGruposServicios(prev => {
      const servicio = prev[selectedServicioId];
      if (!servicio) return prev;

      const subgrupo = servicio.subgrupos?.find(sg => sg.id === selectedSubgrupoId);
      if (!subgrupo) return prev;

      const itemsActuales = subgrupo.items || [];
      const nuevosItems = esEdicion
        ? itemsActuales.map(item =>
          item.num === form.num ? itemProcesado : item
        )
        : [...itemsActuales, itemProcesado];

      return {
        ...prev,
        [selectedServicioId]: {
          ...servicio,
          subgrupos: servicio.subgrupos.map(sg =>
            sg.id === selectedSubgrupoId
              ? { ...sg, items: nuevosItems }
              : sg
          ),
        },
      };
    });
  };

  const mapServiciosStateToPayload = (serviciosObj) => {
    const grupos = {};

    Object.values(serviciosObj).forEach(servicio => {
      const grupoId = servicio.id;

      if (!grupos[grupoId]) {
        grupos[grupoId] = {
          id: grupoId,
          tipo: "SERVICIOS",
          titulo: servicio.nombre || "",
          tituloGeneral: servicio.nombre || "",
          cantidad: Number(servicio.cantidad || 0),
          totalGrupo: 0,
          nroLineasPdf: Number(servicio.lineasPdf || 0),
          header: {
            can: 0,
            tot: 0,
          },
          items: [],
        };
      }

      // Recorrer subgrupos
      (servicio.subgrupos || []).forEach(sub => {
        (sub.items || []).forEach(it => {
          const itemProcesado = {
            id: it.id,
            num: it.num,
            cod: it.cod,
            des: it.des,
            pro: it.pro,
            tde: it.tde,
            can: Number(it.can || 0),
            puc: Number(it.puc || 0),
            toc: Number(it.toc || 0),
            cau: Number(it.cau || 0),
            tou: Number(it.tou || 0),
            val: Number(it.val || 0),
            tot: Number(it.tot || 0),
            mov: it.mov || sub.tipoCodigo || "", // tipo de movimiento
            tpr: it.tpr || "",
          };

          grupos[grupoId].items.push(itemProcesado);
          grupos[grupoId].header.can += itemProcesado.can;
          grupos[grupoId].header.tot += itemProcesado.tot;
          grupos[grupoId].totalGrupo += itemProcesado.tot;
        });
      });
    });

    return Object.values(grupos); // devuelve un array de grupos
  };

  // DUPLICAR SERVICIO
  const handleDuplicarServicio = (servicioIdOriginal) => {
    setGruposServicios(prev => {
      const servicio = prev[servicioIdOriginal];
      if (!servicio) return prev;

      const nuevoServicioId = `S_${Date.now()}`;

      const nuevosSubgrupos = (servicio.subgrupos || []).map(sub => {
        const nuevoSubId = `${nuevoServicioId}_${sub.tipoCodigo}`;

        const nuevosItems = (sub.items || []).map(item => ({
          ...item,
          id: `${nuevoSubId}_${Date.now()}`,
          num: undefined,        // 🔴 CLAVE: rompe vínculo de edición
        }));

        return {
          ...sub,
          id: nuevoSubId,
          items: nuevosItems,
          subtotal: 0,           // 🔴 se recalcula
        };
      });

      return {
        ...prev,
        [nuevoServicioId]: {
          id: nuevoServicioId,
          tituloGeneral: `${servicio.tituloGeneral} (Copia)`,
          cantidad: servicio.cantidad,
          lineasPdf: servicio.lineasPdf,
          detalle: servicio.detalle,
          subgrupos: nuevosSubgrupos,
          header: {
            can: servicio.cantidad,
            tot: 0,               // 🔴 no heredado
          },
        },
      };
    });
  };

  const serviciosMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`cotizacion/${numReg}/servicios/`, payload),

    onSuccess: (data, payload) => {
      // 🔥 sincroniza cache
      queryClient.setQueryData(
        ["servicios", numReg],
        data
      );

      // 🔥 opcional: mantener coherencia global
      setServicios(data);

      toast.success("Servicios guardados correctamente");

      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg],
      });
    },
  });

  // Actualizar areas
  useEffect(() => {
    const areaActual = data?.area_codigo; // El código que viene de la cotización
    if (!areaActual) return;

    setGruposServicios(prev => {
      let huboCambio = false;
      const nuevoState = {};

      // Recorremos cada Servicio
      Object.keys(prev).forEach(servicioId => {
        const servicio = prev[servicioId];

        const nuevosSubgrupos = (servicio.subgrupos || []).map(sg => {
          // Recorremos los items de cada subgrupo
          const nuevosItems = (sg.items || []).map(item => {
            // 🔴 Si el item tiene un área (tpr) diferente a la actual, lo marcamos para cambio
            if (item.tpr !== areaActual) {
              huboCambio = true;
              return { ...item, tpr: areaActual };
            }
            return item;
          });

          return { ...sg, items: nuevosItems };
        });

        nuevoState[servicioId] = { ...servicio, subgrupos: nuevosSubgrupos };
      });

      // Solo actualizamos el estado y disparamos el guardado si realmente hubo cambios
      if (huboCambio) {
        // 🔥 Opcional: Si quieres que se guarde en la DB automáticamente al cambiar el área:
        const payload = mapServiciosStateToPayload(nuevoState);
        serviciosMutation.mutate(payload);

        return nuevoState;
      }

      return prev;
    });
  }, [data?.area_codigo]); // Se dispara cuando cambia el código de área en la cabecera

  // =========
  // GESTION
  // =========
  // Preview cotización (HTML o PDF)
  const handleAbrirCotizacionPDF = () => {
    if (!numReg) {
      console.warn("⚠️ No hay num_reg para generar el PDF");
      return;
    }

    window.open(
      `/api/cotizaciones/${numReg}/pdf/`,
      980,
      700
    );
  };

  const handleAbrirReporteHTML = () => {
    if (!numReg) {
      console.warn("⚠️ No hay num_reg para generar el reporte");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL;

    // Calculamos el tamaño máximo disponible de la pantalla
    const ancho = window.screen.availWidth;
    const alto = window.screen.availHeight;

    // Usamos la función windowsOpen (o window.open si es el estándar)
    // Pasándole las dimensiones máximas
    windowsOpen(
      `${API_URL}/cotizaciones/${numReg}/reporte-html/`,
      ancho,
      alto
    );
  };

  const handleDescargarWordProfesional = () => {
    if (!numReg) return;

    const API_URL = import.meta.env.VITE_API_URL;
    const url = `${API_URL}/cotizaciones/word/${numReg}/`;

    // Creamos un link invisible para forzar la descarga del archivo
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cotizacion_${numReg}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const condicionesGenerales = useMutation({
    mutationFn: (texto) =>
      api.post(
        `cotizaciones/condiciones-generales/${numReg}/`,
        { condiciones: texto }
      ),

    onSuccess: (_, texto) => {
      // 🔥 sincroniza cache inmediatamente
      queryClient.setQueryData(
        ["condiciones-generales", numReg],
        texto
      );

      // 🔥 mantiene coherencia global
      setCondicionesHtml(texto);

      toast.success("Condiciones guardadas correctamente");

      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg],
      });
    },
  });

  const condicionesQuery = useQuery({
    queryKey: ["condiciones-generales", numReg],
    queryFn: async () => {
      const res = await api.get(
        `cotizaciones/condiciones-generales/${numReg}/`
      );
      return res.data.condiciones;
    },
    enabled: openCondiciones, // 👈 solo cuando abre
  });

  const generarCodigo = useMutation({
    mutationFn: () => api.post(`/cotizaciones/generar_codigo/${numReg}/`),

    onSuccess: (res) => {
      const nuevoCodigo = res.data.codigo;

      // 1. 🔥 ACTUALIZACIÓN LOCAL (Para el Modal e InfoTabs)
      // Inyectamos el código directamente en el objeto 'data'
      setData(prev => ({
        ...prev,
        numero: nuevoCodigo
      }));

      // Actualizamos el estado 'codigo' por compatibilidad
      setCodigo(nuevoCodigo);

      toast.success("Código guardado correctamente");

      // 2. 🔄 ACTUALIZACIÓN GLOBAL (Para la Tabla del Dashboard)
      // Usamos la llave exacta que definiste en el useQuery del Dashboard.
      // 'exact: false' es clave para que invalide la query aunque tenga filtros.
      queryClient.invalidateQueries({
        queryKey: ["aprobacion-cotizaciones"],
        exact: false
      });

      // 3. 🔍 REFRESCAR OTRAS VISTAS (Opcional pero recomendado)
      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg]
      });

      // Si usas "oportunidades" en la misma vista, también la limpiamos
      queryClient.invalidateQueries({
        queryKey: ["oportunidades"],
        exact: false
      });
    },

    onError: () => {
      toast.error("Error guardando código");
    },
  });

  const handleAsignarUsuario = useMutation({
    mutationFn: ({ numReg, payload }) =>
      api.patch(`/cotizaciones/${numReg}/asignar-regus/`, {
        regus: payload.usuario,
        referencia: payload.descripcion,
      }),

    onSuccess: (res, { payload }) => {
      // 🔥 actualizar estado local inmediatamente
      setData(prev => ({
        ...prev,
        regus: payload.usuario_nombre,
        referencia: payload.descripcion,
      }));

      toast.success("Usuario y referencia asignados correctamente");

      // 🔄 invalidar queries para refrescar dashboards/tablas
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg],
      });

      // Cerrar modal
      setOpenAsignar(false);
    },

    onError: () => {
      toast.error("No se pudo asignar el usuario o referencia");
    },
  });

  // 🔹 Mutate para guardar descuento
  const guardarDescuentoMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/cotizaciones/${numReg}/descuento/`, payload),

    onSuccess: (res) => {
      toast.success("Descuento guardado correctamente");

      // 🔥 actualizar estado local del total si existe
      if (res.data?.tot_c !== undefined) {
        setTotalFinal(res.data.tot_c);
      }

      // 🔄 refrescar TODAS las vistas que usan cotizaciones
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });
      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg],
      });
    },

    onError: () => {
      toast.error("No se pudo guardar el descuento");
    },
  });

  // 🔹 Recibe datos del submodal
  const handleGuardarDescuento = (payload) => {
    setDescuentosForm(payload); // actualiza estado local
    guardarDescuentoMutation.mutate(payload); // guarda directamente en backend
  };

  const handleResetDescuento = useMutation({
    mutationFn: () =>
      api.post(`cotizaciones/${numReg}/descuento/`, {
        aplicar: false,
        afecto: "t",
        porcentaje: "",
        importe: "",
      }),

    onSuccess: () => {
      toast.success("Descuento eliminado correctamente");

      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg],
      });

      // 🔥 Limpia estado local
      setDescuentosForm({
        aplicar: false,
        afecto: "t",
        porcentaje: "",
        importe: "",
      });
    },
  });

  const cargarMensajes = async () => {
    if (!numReg) return;

    try {
      const res = await api.get(
        `cotizacion/${numReg}/mensajes/`
      );

      setMensajes(Array.isArray(res.data) ? res.data : []);

    } catch (err) {
      console.error("Error cargando mensajes", err);
      setMensajes([]);
    }
  };

  const eliminarCotizacion = useMutation({
    mutationFn: () => api.delete(`cotizaciones/${numReg}/`),

    onSuccess: () => {
      toast({
        title: "Cotización eliminada",
        description: "El registro fue eliminado correctamente.",
        variant: "destructive",
      });

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });

      cerrarTodo();
    },

    onError: () => {
      toast.error("Error eliminando la cotización");
    },
  });

  const handleNuevaVersion = useMutation({
    mutationFn: () =>
      api.post(`cotizaciones/nueva-version/${cotizacionVista}/`),

    onSuccess: (res) => {
      const { num_reg, cotin } = res.data;

      // Mensaje de usuario
      toast.success(`Versión ${cotin} creada`);

      // Cerramos modal
      setOpenNuevaVersion(false);

      // Guardamos la nueva versión
      setCotizacionEditable(num_reg);

      // Cambiamos a TAB Datos
      setTabActiva("datos");

      // Refrescar lista
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });

    },

    onError: () => {
      toast.error("Error al crear nueva versión");
    },
  });

  useEffect(() => {

    if (tabActiva === "datos" && cotizacionEditable) {
      console.log("➡️ Pasando a vista:", cotizacionEditable);
      setCotizacionVista(cotizacionEditable);
      setCotizacionEditable(null);
    }
  }, [tabActiva, cotizacionEditable]);

  useEffect(() => {
    if (!cotizacionVista) return;

    console.log("🔄 Iniciando carga integral para:", cotizacionVista);

    const cargarDatosCompletos = async () => {
      setLoading(true);
      try {
        // Lanzamos ambas peticiones en paralelo
        const [resCotizacion, resOportunidad] = await Promise.all([
          api.get(`cotizaciones/cotizacion_detalle/${cotizacionVista}/`),
          api.get(`oportunidades/modal/${cotizacionVista}/`).catch(err => {
            console.warn("⚠️ No se encontró registro de oportunidad para este ID, usando datos vacíos.");
            return { data: {} }; // Si falla la op, devolvemos objeto vacío para no romper el flujo
          })
        ]);

        // --- FUSIÓN DE DATA ---
        // Combinamos ambos mundos en un solo objeto para el estado 'data'
        const dataHibrida = {
          ...resCotizacion.data,
          ...resOportunidad.data,
          // Limpiamos fechas de oportunidad para que los inputs HTML5 las reconozcan
          f_recp: resOportunidad.data?.f_recp?.split('T')[0] || "",
          f_limite: resOportunidad.data?.f_limite?.split('T')[0] || "",
          cotif: resCotizacion.data?.cotif?.split('T')[0] || ""
        };

        console.log("📦 [DEBUG] DATA HIBRIDA FINAL:", dataHibrida);
        setData(dataHibrida);

        // --- LOGICA DE COTIZACIÓN (Hidratación) ---
        const afectoMap = { T: "t", S: "su", M: "ser" };
        setDescuentosForm({
          aplicar: Number(resCotizacion.data.des_a) === 1,
          afecto: afectoMap[resCotizacion.data.des_t] || "",
          porcentaje: resCotizacion.data.des_p || "",
          importe: resCotizacion.data.des_m || "",
        });

        setTcamb(Number(resCotizacion.data.tcamb || 1));

      } catch (err) {
        console.error("❌ Error en la carga dual:", err);
        setError("Error al cargar la información del registro.");
      } finally {
        setLoading(false);
      }
    };

    // Ejecutamos la carga principal
    cargarDatosCompletos();

    // Cargas secundarias (tablas/mensajes)
    fetchSuministros(cotizacionVista);
    fetchServicios(cotizacionVista);
    cargarMensajes();

  }, [cotizacionVista]);

  const handleCopiarCotizacion = useMutation({
    mutationFn: () =>
      api.post(`cotizaciones/${numReg}/generar-copia/`),

    onSuccess: () => {
      toast.success("Copia de cotización creada correctamente sin COTIN");
      setOpenCopia(false);

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
    },

    onError: () => {
      toast.error("Error al crear la copia de la cotización");
    },
  });

  const enviarCotizacionAprobacion = useMutation({
    mutationFn: () =>
      api.patch(`cotizaciones//enviar-aprobacion/${numReg}/`, {
        estado_codigo: 3,
      }),

    onSuccess: () => {
      toast.success("Cotización enviada a aprobación");
      setOpenEnviarAprobacion(false);

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
    },

    onError: () => {
      toast.error("Error enviando la cotización a aprobación");
    },
  });

  const cerrarCotizacion = useMutation({
    mutationFn: () =>
      api.patch(`cotizaciones/${numReg}/cerrar/`),

    onSuccess: () => {
      toast.success("Cotización cerrada correctamente");
      setOpenEnviarAprobacion(false);

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
    },

    onError: () => {
      toast.error("Error cerrando la cotización");
    },
  });

  const retornarCotizacion = useMutation({
    mutationFn: () =>
      api.patch(`cotizaciones/${numReg}/retornar/`),

    onSuccess: () => {
      toast.success("Cotización retornada a edición");
      setOpenRetornar(false); // si tienes modal de confirmación

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
    },

    onError: () => {
      toast.error("Error al retornar la cotización");
    },
  });

  //=========================================//
  // CARGAR SUMINISTROS Y SERVICIOS (USANDO num_reg)
  //=========================================//
  useEffect(() => {
    if (!open) return;

    const reg = data?.num_reg || cotizacion?.num_reg;

    if (reg) {
      fetchSuministros(reg);
      fetchServicios(reg);
    }
  }, [open, data?.num_reg, cotizacion?.num_reg]);

  // ==============================
  // CONTROL POR ESTADO ENVIO
  // ==============================
  const envio = Number(data?.envio ?? 0);

  // Puede guardar solo si NO está enviado
  const canSave = envio !== 3;

  // =====================
  // GUARDAR COTIZACIÓN
  // =====================
  const handleGuardarCotizacion = () => {
    if (crearMutation.isPending) return;

    const campoFaltante = validarCamposObligatorios();
    if (campoFaltante) {
      setCampoError(campoFaltante.key);
      toast.warning(`Falta completar: ${campoFaltante.label}`);
      irACampo(campoFaltante.key);
      setTimeout(() => setCampoError(null), 3000);
      return;
    }

    // 🔹 Mapear suministros para incluir subtotal en la cabecera
    const suministrosPayload = Object.fromEntries(
      Object.entries(gruposSuministros).map(([cog, grupo]) => {
        const valorRespaldo = data?.tven === "T" ? (grupo.env_tot || 0) : (grupo.env_par || 0);
        const costoEnvioGrupo = Number(grupo.costoEnvio ?? valorRespaldo);

        const tipoVentaGlobal = data?.tven;
        const itemsDelGrupo = grupo.items || [];

        console.log(`DEBUG GUARDADO - Grupo: ${grupo.titulo}, Costo final usado: ${costoEnvioGrupo}`);

        // 1️⃣ Recalculamos cada ítem usando la lógica de prorrateo por TOC
        const itemsProcesados = itemsDelGrupo.map((item, idx) => {
          const itemCalculado = calcularItemConEnvio(
            item,
            itemsDelGrupo,
            costoEnvioGrupo,
            tipoVentaGlobal
          );


          return itemCalculado;
        });

        // 2️⃣ Sumatoria real de los items recalculados para el total del grupo
        const subtotalItems = itemsProcesados.reduce(
          (acc, item) => acc + (Number(item.tot) || 0),
          0
        );

        return [
          cog,
          {
            ...grupo,
            costoEnvio: costoEnvioGrupo,
            tipoEnvio: grupo.tipoEnvio || "TOTAL",
            total: Number(subtotalItems.toFixed(2)), // Total raíz
            // 🚩 CLAVE: Sincronizamos el header con el nuevo total para evitar el 50288.34
            header: {
              ...grupo.header,
              tot: Number(subtotalItems.toFixed(2))
            },
            items: itemsProcesados,
          },
        ];
      })
    );

    // 🔹 Mapear servicios de la misma manera si quieres hacer totales consistentes
    const serviciosPayload = Object.fromEntries(
      Object.entries(gruposServicios).map(([cog, grupo]) => {
        let totalGrupo = 0;
        const items = [];

        (grupo.subgrupos || []).forEach(sub => {
          (sub.items || []).forEach(it => {
            // DETERMINAR EL ÁREA (tpr)
            // Si el ítem tiene 'area', lo usamos. Si no, usamos el del subgrupo.
            const areaParaItem = it.area || sub.tipoCodigo;

            const itemProcesado = {
              ...it,
              tpr: areaParaItem, // 🚩 Aquí se asigna el código de área (8, 2, 3, etc.)
              tipoCodigo: sub.tipoCodigo,
              can: Number(it.can || 0),
              puc: Number(it.puc || 0),
              toc: Number(it.toc || 0),
              cau: Number(it.cau || 0),
              tou: Number(it.tou || 0),
              val: Number(it.val || 0),
              tot: Number(it.tot || 0),
            };

            // DEBUG: Para ver qué área se le está asignando a cada ítem antes de enviar
            console.log(`👷 MO Item: ${it.des?.substring(0, 20)}... | Area(tpr): ${areaParaItem}`);

            items.push(itemProcesado);
            totalGrupo += itemProcesado.tot;
          });
        });

        totalGrupo *= Number(grupo.cantidad || 1);

        return [
          cog,
          {
            ...grupo,
            cantidad: Number(grupo.cantidad ?? 1),
            items,
            total: +totalGrupo.toFixed(2)
          },
        ];
      })
    );

    // ── CONFIGURACIÓN DEL PAYLOAD DE OPORTUNIDAD (ESPEJO TOTAL) ──
    const oportunidadPayload = {
      // Identificación y Seguimiento
      num_reg_cot: null,
      cotin: data.numero || data.cotin || "",
      cotif: data.fecha || data.cotif,
      refer: data.referencia || data.refer || "",
      f_recp: data.f_recp || data.fecha,
      f_limite: data.f_limite || null,
      f_emi: data.f_emi || null,
      estado_op: Number(data.estado_op ?? 0), // 0: Pendiente por defecto
      coment: data.coment || "",

      // Clasificación Comercial
      prob: data.prob || "0",
      cotit: data.cotit || "",
      area: data.area_codigo || data.area || "",
      tven: data.tven || "1",
      estad: data.estado_codigo || "2", // Estado de coti (2: Pendiente)
      envio: Number(data.estado_op) === 3 ? 2 : 0, // 🚩 LA LÓGICA CLAVE

      // Cliente y Contacto
      empre: data.cliente_codigo || data.empre || "",
      nombr: data.nombr || "",
      cargr: data.cargr || "",
      codir: data.codir || "",
      teler: data.teler || "",
      movir: data.movir || "",
      mailr: data.mailr || "",

      // Pago / Moneda / Totales (Pestaña DATOS)
      tot_c: Number(data.tot_c || 0),
      forma_pago: data.forma_pago || "",
      lugar: data.lugar || "",
      tmone: data.tmone || "D", // Dólares por defecto
      tcamb: Number(data.tcamb || 0),
      igv: data.igv || "S",

      // Tiempos y Validez
      plazo: Number(data.plazo || 0),
      tot_d: data.tot_d || "D",
      por_c: Number(data.por_c || 0),
      tot_s: data.tot_s || "D",
      valid: Number(data.valid || 0),
      acu_s: data.acu_s || "D",

      // Responsables
      codic: data.codic || "",
      nombc: data.nombc || "",
      codit: data.codit || "",
      nombt: data.nombt || "",

      // Descuentos y Metadatos
      des_a: data.des_a || "N",
      des_t: data.des_t || "N",
      des_m: Number(data.des_m || 0),
      des_p: Number(data.des_p || 0),
      acu_e: condicionesHtml || "", // El HTML de términos y condiciones
      regus: data.regus || "",
      anno: data.anno || new Date().getFullYear().toString(),
      mes: data.mes || (new Date().getMonth() + 1).toString().padStart(2, '0'),
      anno_a: data.anno_a || "2026"
    };

    // DEBUG para que veas qué se va a la tabla vc_mov_oportunidades
    //console.log("🎯 OPORTUNIDAD PAYLOAD:", oportunidadPayload);

    const payload = {
      ...data,
      origen: dashboard,
      detalle: {
        ...data.detalle,
      },
      acu_e: condicionesHtml,
      suministros: suministrosPayload,
      servicios: serviciosPayload,
      // OPORTUNIDAD
      f_emi: data.f_emi || null,
      f_limite: data.f_limite || null,
      por_c: Number(data.por_c ?? 0),
      num_reg_cot: data.num_reg_cot
        ? Number(data.num_reg_cot)
        : null,
      oportunidad: oportunidadPayload,

      descuento: {
        aplicar: descuentosForm.aplicar,
        aplicaA:
          descuentosForm.afecto === "t"
            ? "TOTAL"
            : descuentosForm.afecto === "su"
              ? "SUMINISTROS"
              : "SERVICIOS",
        porcentaje: Number(descuentosForm.porcentaje || 0),
        importe: Number(descuentosForm.importe || 0),
      },
    };

    console.log("🎯 OPORTUNIDAD PAYLOAD:", oportunidadPayload);
    console.log("🎯 PAYLOAD FINAL:", payload);
    console.log("📦 PAYLOAD PARA GUARDAR:", payload);
    console.log("📦 Guardando desde dashboard:", dashboard);

    crearMutation.mutate(payload);
  };

  // ======================
  // CAMPOS OBLIGATORIOS
  // ======================
  const CAMPOS_OBLIGATORIOS = [
    { key: "fecha", label: "Fecha" },
    { key: "referencia", label: "Referencia" },
    { key: "id_cliente", label: "Para (Cliente)" },
    { key: "prob", label: "Probabilidad" },
    { key: "cotit", label: "Tipo Cotización" },
    { key: "area_codigo", label: "Área" },
  ];

  // Validar campos obligatorios
  const validarCamposObligatorios = () => {
    for (const campo of CAMPOS_OBLIGATORIOS) {
      const valor = data[campo.key];

      if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ""
      ) {
        return campo; // ⛔ devolvemos el primero que falla
      }
    }
    return null;
  };

  const irACampo = (campoKey) => {
    const el = document.getElementById(campoKey);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      el.focus?.();
    }
  };


  // =============================
  // Función para cerrar todo
  // =============================
  const cerrarTodo = () => {
    setOpenEliminar(false); // submodal
    onClose();              // modal padre (Dashboard)
  };

  // =============================
  // Función para abrir ventana
  // =============================
  const windowsOpen = (url, alto = 980, ancho = 500) => {
    const left = (screen.width - alto) / 2;
    const top = (screen.height - ancho) / 2;

    const specs = `resizable=yes,location=1,status=1,scrollbars=yes,width=${alto},height=${ancho},top=${top},left=${left}`;

    const popup = window.open(url, "detalle", specs);
    if (popup) popup.focus();
  };

  // =====================
  // REPORTES
  // =====================
  // Reporte Suministros
  const handleReporteSuministros = () => {
    if (!numReg) {
      console.warn("⚠️ No hay num_reg para generar el reporte");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL;

    windowsOpen(
      `${API_URL}/cotizaciones/reportes/reporte_suministros_html/${numReg}/`,
      980,
      700
    );
  };

  // Reporte Suministros Excel
  const handleExportSuministrosExcel = () => {
    if (!numReg) return console.warn("⚠️ No hay num_reg para generar Excel");

    const API_URL = import.meta.env.VITE_API_URL;

    window.location.href =
      `${API_URL}/cotizaciones/reportes/reporte_suministros_excel/${numReg}/`;
  };

  // Reporte Servicios
  const handleReporteServicios = () => {
    if (!numReg) {
      console.warn("⚠️ No hay num_reg para generar el reporte");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL;

    windowsOpen(
      `${API_URL}/cotizaciones/reportes/reporte_servicios_html/${numReg}/`,
      980,
      700
    );

  };

  // Reporte Detallado Cotizacion
  const handleReporteDetallado = () => {
    if (!numReg) return;

    const API_URL = import.meta.env.VITE_API_URL;

    window.open(
      `${API_URL}/cotizaciones/reportes/reporte_detallado_cotizacion/${numReg}/`,
      "_blank",
      "width=800,height=450,scrollbars=yes,resizable=yes"
    );
  };

  // Reportes Detallado Excel
  const handleExportDetalladoExcel = () => {
    if (!numReg) return console.warn("⚠️ No hay num_reg para generar Excel");

    const API_URL = import.meta.env.VITE_API_URL;

    window.location.href =
      `${API_URL}/cotizaciones/reportes/reporte_detallado_excel/${numReg}/`;
  };

  // Reporte Detallado Cotizacion
  const handleReporteResumen = () => {
    if (!numReg) return;

    const API_URL = import.meta.env.VITE_API_URL;

    window.open(
      `${API_URL}/cotizaciones/reportes/reporte_resumen_cotizacion/${numReg}/`,
      "_blank",
      "width=800,height=450,scrollbars=yes,resizable=yes"
    );
  };

  // Reporte Venta Total
  const handleReporteVentaTotal = () => {
    if (!numReg) return;

    const API_URL = import.meta.env.VITE_API_URL;

    window.open(
      `${API_URL}/cotizaciones/reportes/reporte_venta_total/${numReg}/`,
      "_blank",
      "width=800,height=450,scrollbars=yes,resizable=yes"
    );
  };

  // Reporte Venta Parcial
  const handleReporteVentaParcial = () => {
    if (!numReg) return;

    const API_URL = import.meta.env.VITE_API_URL;

    window.open(
      `${API_URL}/cotizaciones/reportes/reporte_venta_parcial/${numReg}/`,
      "_blank",
      "width=800,height=450,scrollbars=yes,resizable=yes"
    );
  };

  //=====================
  // ACTTULIZAR TOTALES
  //=====================
  // 🔹 Totales locales dinámicos
  const [totalesLocales, setTotalesLocales] = useState({
    suministros: 0,
    servicios: 0,
    total: 0,
  });

  // 🔹 Recalcular totales cada vez que cambian gruposSuministros o gruposServicios
  useEffect(() => {
    const totalSuministrosBase = Object.values(gruposSuministros || {}).reduce(
      (acc, grupo) => {
        const subtotal = (grupo.items || []).reduce(
          (sum, it) => sum + Number(it.tot || 0),
          0
        );
        const cantidad = Number(grupo.cantidad || 1);
        return acc + subtotal * cantidad;
      },
      0
    );

    const totalServiciosBase = Object.values(gruposServicios || {}).reduce(
      (acc, srv) => {
        const subtotalSrv = (srv.subgrupos || []).reduce(
          (sAcc, sg) =>
            sAcc +
            (sg.items || []).reduce(
              (iAcc, it) => iAcc + Number(it.tot || 0),
              0
            ),
          0
        );
        const cantidadSrv = Number(srv.cantidad || 1);
        return acc + subtotalSrv * cantidadSrv;
      },
      0
    );

    let totalSuministros = totalSuministrosBase;
    let totalServicios = totalServiciosBase;

    const importeDescuento =
      descuentosForm?.aplicar ? Number(descuentosForm.importe || 0) : 0;

    // 🔹 Aplicar descuento según afectación
    if (importeDescuento > 0) {
      switch (descuentosForm?.afecto) {
        case "su":
          totalSuministros = Math.max(
            totalSuministrosBase - importeDescuento,
            0
          );
          break;

        case "ser":
          totalServicios = Math.max(
            totalServiciosBase - importeDescuento,
            0
          );
          break;

        case "t":
          // se aplica después al total
          break;

        default:
          break;
      }
    }

    let totalGeneral = totalSuministros + totalServicios;

    if (importeDescuento > 0 && descuentosForm?.afecto === "t") {
      totalGeneral = Math.max(
        totalSuministrosBase +
        totalServiciosBase -
        importeDescuento,
        0
      );
    }

    setTotalesLocales({
      suministros: totalSuministros,
      servicios: totalServicios,
      total: totalGeneral,
    });

  }, [gruposSuministros, gruposServicios, descuentosForm]);

  // 🔹 Descuento calculado
  const descuentoAplicado = (() => {
    if (!descuentosForm?.aplicar) return 0;

    const importe = Number(descuentosForm.importe || 0);
    const porcentaje = Number(descuentosForm.porcentaje || 0);

    if (importe > 0) return Math.min(importe, totalesLocales.total);

    if (porcentaje > 0) {
      return Math.min(
        totalesLocales.total * (porcentaje / 100),
        totalesLocales.total
      );
    }

    return 0;
  })();

  const totalFinal = Math.max(
    totalesLocales.total - descuentoAplicado,
    0
  );

  // LUEGO PASAR A FORMATMONEY.JS
  const formatMoney = (value) => {
    if (value === null || value === undefined) return "-";

    const simbolo = data?.moneda_simbolo || "S/";

    return `${simbolo} ${new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value))}`;
  };

  const isPage = variant === "page";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY — Sombra ligera (SIN backdrop-blur pesado en overlay = +rendimiento) */}
          {!isPage && (
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/25 z-[100]"
              style={{ willChange: "opacity" }}
            />
          )}

          {/* SIDE PANEL — Performance-optimized Slide */}
          <motion.div
            key="drawer-panel"
            initial={isPage ? false : { x: "100%" }}
            animate={isPage ? false : { x: 0 }}
            exit={isPage ? undefined : { x: "100%" }}
            transition={isPage ? undefined : { type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            className={
              isPage
                ? "min-h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col"
                : "fixed right-0 top-0 h-screen w-full max-w-5xl bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.06)] z-[101] flex flex-col border-l border-slate-200/80"
            }
            style={isPage ? undefined : { willChange: "transform" }}
            onKeyDown={isPage ? undefined : (e) => e.key === "Escape" && onClose()}
            tabIndex={isPage ? undefined : -1}
            ref={isPage ? undefined : (el) => el?.focus()}
          >

            {/* ENCABEZADO EJECUTIVO ERP */}
            <div className="relative bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              {/* IZQUIERDA */}
              <div className="flex items-center gap-4">
                {/* Avatar inteligente cliente */}
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-sm lg:text-base shadow-lg shadow-teal-100">
                  {data?.cliente_nombre?.charAt(0) || "C"}
                </div>
                {/* CONTEXTO DOCUMENTO */}
                <div>
                  {/* Breadcrumb ERP */}
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Gestión Comercial / {esOportunidad ? "Oportunidades" : "Cotizaciones"}
                  </p>

                  {/* Número documento */}
                  <div className="flex items-center gap-2">

                    <h2 className="text-sm lg:text-xl font-black tracking-tight text-slate-800 uppercase leading-none">
                      {esOportunidad ? "Oportunidad" : "Cotización"} {data?.numero || ""}
                    </h2>

                    {/* Registro interno */}
                    <span className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] lg:text-[11px] font-bold rounded-md border border-slate-200">
                      {data?.num_reg || ""}
                    </span>

                  </div>

                  {/* Cliente */}
                  <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase mt-0.5 truncate max-w-[200px] lg:max-w-none">
                    {data?.cliente_nombre || "Seleccione un cliente"}
                  </p>

                </div>
              </div>

              {/* DERECHA → PANEL EJECUTIVO */}
              <div className="flex gap-4 lg:gap-8 items-center">
                {/* Área / Tipo */}
                <div className="hidden sm:block text-right border-r border-slate-100 pr-4">
                  <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Área / Tipo
                  </p>
                  <p className="text-[10px] lg:text-xs font-black text-teal-600 uppercase mt-1">
                    {data?.area_nombre || "General"} • {data?.tipo_nombre || "Venta"}
                  </p>
                </div>

                {/* Probabilidad */}
                <div className="hidden lg:block text-right">
                  <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Probabilidad
                  </p>

                  <p className="text-[10px] lg:text-xs font-black text-indigo-600 mt-1">
                    {['Baja', 'Media', 'Alta', 'Muy Alta'][data?.prob ?? 0]}
                  </p>
                </div>

              </div>

            </div>

            {/* CONTENIDO SCROLLABLE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ESTADOS */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando datos...</span>
                  </div>
                </div>
              ) : !data ? (
                <p className="text-gray-500 text-center py-4">No se encontró la cotización.</p>
              ) : (
                <>
                  {/* TABS DINÁMICOS */}
                  <InfoTabs
                    data={data}
                    setData={setData}
                    suministros={Array.isArray(suministros) ? suministros : []} // siempre un array
                    servicios={Array.isArray(servicios) ? servicios : []}
                    esOportunidad={esOportunidad}
                    modo={modo}
                    esNueva={esNueva}
                    esVer={esVer}
                    openEncargados={openEncargados}
                    setOpenEncargados={setOpenEncargados}
                    activeTab={tabActiva}
                    onChangeTab={setTabActiva}
                    totalesLocales={totalesLocales}
                    openClienteModal={() => setOpenClienteModal(true)}
                    // SUMINISTROS
                    openGrupoModal={openGrupoModal}
                    setOpenGrupoModal={setOpenGrupoModal}
                    gruposSuministros={gruposSuministros}
                    setGruposSuministros={setGruposSuministros}
                    openItemModal={openItemModal}
                    setOpenItemModal={setOpenItemModal}
                    openRegistroItem={openRegistroItem}
                    setOpenRegistroItem={setOpenRegistroItem}
                    grupoActivo={grupoActivo}
                    setGrupoActivo={setGrupoActivo}
                    handleRefreshSuministros={handleRefreshSuministros}
                    loadingSuministros={loadingSuministros}
                    setLoadingSuministros={setLoadingSuministros}
                    onDuplicarGrupo={handleDuplicarGrupo}
                    openImportarXLS1={openImportarXLS1}
                    setOpenImportarXLS1={setOpenImportarXLS1}
                    setOpenImportarXLS2={setOpenImportarXLS2}
                    // SERVICIOS
                    gruposServicios={gruposServicios}
                    setGruposServicios={setGruposServicios}
                    setServicioActivo={setServicioActivo}
                    openServicioModal={openServicioModal}
                    setOpenServicioModal={setOpenServicioModal}
                    selectedServicioId={selectedServicioId}
                    setSelectedServicioId={setSelectedServicioId}
                    handleDuplicarServicio={handleDuplicarServicio}
                    selectedSubgrupoId={selectedSubgrupoId}
                    setSelectedSubgrupoId={setSelectedSubgrupoId}
                    openSubgrupoModal={openSubgrupoModal}
                    setOpenSubgrupoModal={setOpenSubgrupoModal}
                    setSubgrupoActivo={setSubgrupoActivo}
                    selectedTipoCodigo={selectedTipoCodigo}
                    setSelectedTipoCodigo={setSelectedTipoCodigo}
                    onAgregarItemServicio={abrirModalRegistroPorTipo}
                    openRegistroMO={openRegistroMO}
                    setOpenRegistroMO={setOpenRegistroMO}
                    openRegistroGS={openRegistroGS}
                    setOpenRegistroGS={setOpenRegistroGS}
                    openRegistroOtros={openRegistroOtros}
                    setOpenRegistroOtros={setOpenRegistroOtros}
                    itemActivo={itemActivo}
                    setItemActivo={setItemActivo}
                    // GESTION
                    descuentosForm={descuentosForm}
                    openContactos={openContactos}
                    setOpenContactos={setOpenContactos}
                    openCondiciones={openCondiciones}
                    setOpenCondiciones={setOpenCondiciones}
                    openGenerarCodigo={openGenerarCodigo}
                    setOpenGenerarCodigo={setOpenGenerarCodigo}
                    onAbrirCotizacionPDF={handleAbrirCotizacionPDF}
                    openDescuentos={openDescuentos}
                    setOpenDescuentos={setOpenDescuentos}
                    openEnviarCoti={openEnviarCoti}
                    setOpenEnviarCoti={setOpenEnviarCoti}
                    openProbabilidad={openProbabilidad}
                    setOpenProbabilidad={setOpenProbabilidad}
                    openMensajes={openMensajes}
                    setOpenMensajes={setOpenMensajes}
                    mensajes={mensajes}
                    openSeg={openSeg}
                    setOpenSeg={setOpenSeg}
                    openCopia={openCopia}
                    setOpenCopia={setOpenCopia}
                    openNuevaVersion={openNuevaVersion}
                    setOpenNuevaVersion={setOpenNuevaVersion}
                    openRetornar={openRetornar}
                    setOpenRetornar={setOpenRetornar}
                    openEliminar={openEliminar}
                    setOpenEliminar={setOpenEliminar}
                    openEnviarAprobacion={openEnviarAprobacion}
                    setOpenEnviarAprobacion={setOpenEnviarAprobacion}
                    openAdjuntos={openAdjuntos}
                    setOpenAdjuntos={setOpenAdjuntos}
                    openEstadoCoti={openEstadoCoti}
                    setOpenEstadoCoti={setOpenEstadoCoti}
                    openAsignar={openAsignar}
                    setOpenAsignar={setOpenAsignar}
                    onReporteSuministros={handleReporteSuministros}
                    onExportSuministrosExcel={handleExportSuministrosExcel}
                    onReporteServicios={handleReporteServicios}
                    onReporteDetallado={handleReporteDetallado}
                    onExportDetalladoExcel={handleExportDetalladoExcel}
                    onReporteResumen={handleReporteResumen}
                    onReporteVentaTotal={handleReporteVentaTotal}
                    onReporteVentaParcial={handleReporteVentaParcial}
                    tabsToShow={tabsToShow}
                  />

                  {/* SUBMODALES */}
                  <ClienteModal
                    open={openClienteModal}
                    onClose={() => setOpenClienteModal(false)}
                    onGuardar={(nuevoCliente) => {
                      // Lógica para actualizar tu lista local o recargar
                      setOpenClienteModal(false);
                    }}
                  />

                  {/* SUMINISTROS */}
                  <AgregarGrupoSuministroModal
                    open={openGrupoModal}
                    onClose={() => setOpenGrupoModal(false)}
                    onConfirm={handleAgregarGrupoSuministro}
                    grupo={grupoActivo}
                    tipoVenta={data?.tven}
                  />

                  <RegistroItemModal
                    open={openItemModal}
                    onClose={() => setOpenItemModal(false)}
                    onConfirm={handleAgregarItem}
                    item={itemActivo}
                    num_reg={numReg}
                    tipoVenta={data?.tven}
                    costoEnvioGrupo={
                      data?.tven === "T"
                        ? (gruposSuministros?.[grupoActivo]?.env_tot || 0)
                        : (gruposSuministros?.[grupoActivo]?.env_par || 0)
                    }
                    sumaVentaGrupo={
                      (gruposSuministros?.[grupoActivo]?.items || []).reduce(
                        (acc, item) => acc + Number(item.toc || 0),
                        0
                      )
                    }
                    env_tot={data?.env_tot || 0}
                    env_par={data?.env_par || 0}
                  />

                  <RegistroItemBuscadorModal
                    open={openRegistroItem}
                    onClose={() => {
                      setOpenRegistroItem(false);
                      setGrupoActivo(null);
                    }}
                    item={itemActivo}
                    num_reg={numReg}
                    onSelect={(formItem) => {
                      handleAgregarItem(formItem);
                    }}
                  />

                  <ImportarXLS1Modal
                    open={openImportarXLS1}
                    onClose={() => setOpenImportarXLS1(false)}
                    onSelectFile={handleImportarDesdeXLS}
                  />

                  <ImportarXLS2Modal
                    open={openImportarXLS2}
                    onClose={() => setOpenImportarXLS2(false)}
                    onSelectFile={handleImportarDesdeXLS}
                  />

                  {/* SERVICIOS */}
                  <ServicioModal
                    open={openServicioModal}
                    onClose={() => {
                      setOpenServicioModal(false);
                      setServicioActivo(null); // 🧹 limpieza sana
                    }}
                    onAceptar={handleAgregarServicio}
                    servicio={servicioActivo}
                  />

                  <AgregarSubgrupoGastoModal
                    open={openSubgrupoModal}
                    subgrupo={subgrupoActivo}
                    onClose={() => {
                      setOpenSubgrupoModal(false);
                      setSubgrupoActivo(null);
                    }}
                    onConfirm={(form) => {
                      handleAgregarSubgrupo(form, form.servicioId || selectedServicioId);
                    }}
                  />

                  <RegistroItemManoObraModal
                    open={openRegistroMO}
                    onClose={() => setOpenRegistroMO(false)}
                    onConfirm={handleAgregarItemServicio}
                    item={itemActivo}
                    areaCotizacion={data?.area_codigo}
                  />

                  <RegistroItemGastosServicioModal
                    open={openRegistroGS}
                    onClose={() => setOpenRegistroGS(false)}
                    onConfirm={handleAgregarItemServicio}
                    item={itemActivo}
                  />

                  <RegistroItemOtrosModal
                    open={openRegistroOtros}
                    onClose={() => setOpenRegistroOtros(false)}
                    onConfirm={handleAgregarItemServicio}
                    item={itemActivo}
                  />

                  {/* GESTION */}
                  <CondicionesModal
                    open={openCondiciones}
                    onClose={() => setOpenCondiciones(false)}
                    condicionesIniciales={condicionesQuery.data}
                    onAceptar={(nuevoTexto) => {
                      setCondicionesHtml(nuevoTexto);
                      condicionesGenerales.mutate(nuevoTexto);
                      setOpenCondiciones(false);
                    }}
                    tipoVenta={data?.tven}
                  />

                  <GenerarCodigoModal
                    open={openGenerarCodigo}
                    onClose={() => setOpenGenerarCodigo(false)}
                    numReg={data?.num_reg || cotizacion?.num_reg}
                    codigoExistente={data?.numero}
                    onGuardado={() => generarCodigo.mutateAsync()}
                  />

                  <AsignarCotiModal
                    open={openAsignar}
                    onClose={() => setOpenAsignar(false)}
                    onConfirm={(payload) => handleAsignarUsuario.mutate({ numReg, payload })}
                    setOpenContactos={setOpenContactos}
                    referencia={data?.referencia}
                  />

                  <DescuentosModal
                    open={openDescuentos}
                    setOpen={setOpenDescuentos}
                    formValues={descuentosForm}
                    setFormValues={setDescuentosForm}
                    onClose={() => setOpenDescuentos(false)}
                    onGuardar={handleGuardarDescuento}
                    onReset={() => handleResetDescuento.mutate()}
                    num_reg={numReg}
                    tot_c={data?.tot_c}
                    des_m={data?.des_m}
                  />

                  <EnviarCotiModal
                    open={openEnviarCoti}
                    onClose={() => setOpenEnviarCoti(false)}
                    num_reg={numReg}
                    onAceptar={() => cerrarCotizacion.mutate()}
                    loading={loadingEnviar}
                  />

                  <EnviarCotiAprobacionModal
                    open={openEnviarAprobacion}
                    onClose={() => setOpenEnviarAprobacion(false)}
                    onAceptar={() => enviarCotizacionAprobacion.mutate()}
                    loading={loadingEnviar}
                  />

                  <RetornarCotizacionModal
                    open={openRetornar}
                    onClose={() => setOpenRetornar(false)}
                    onAceptar={() => retornarCotizacion.mutate()}
                    envio={data?.envio}
                  />

                  <ProbabilidadModal
                    open={openProbabilidad}
                    onClose={() => setOpenProbabilidad(false)}
                    probActual={data?.prob}
                    num_reg={numReg}
                  />

                  <MensajesModal
                    open={openMensajes}
                    onClose={() => {
                      setOpenMensajes(false);
                      cargarMensajes(); // 🔥 refresca el contador
                    }}
                    num_reg={numReg}
                    mensajes={mensajes}
                  />

                  <AdjuntosModal
                    open={openAdjuntos}
                    onClose={() => setOpenAdjuntos(false)}
                    num_reg={numReg}
                  />

                  <SeguimientoModal
                    open={openSeg}
                    onClose={() => setOpenSeg(false)}
                    num_reg={numReg}
                  />

                  <CopiaCotizacionModal
                    open={openCopia}
                    onClose={() => setOpenCopia(false)}
                    onAceptar={() => handleCopiarCotizacion.mutate()}
                  />

                  <NuevaVersionModal
                    open={openNuevaVersion}
                    onClose={() => setOpenNuevaVersion(false)}
                    num_reg={numReg}
                    onAceptar={() => handleNuevaVersion.mutate()}
                  />

                  <EliminarCotizacionModal
                    open={openEliminar}
                    onClose={() => setOpenEliminar(false)}
                    onCerrarTodo={cerrarTodo}
                    onAceptar={() => eliminarCotizacion.mutate()}
                    loading={loading}
                    cotin={data?.numero}
                  />

                  <EstadoCotizacionModal
                    open={openEstadoCoti}
                    onClose={() => setOpenEstadoCoti(false)}
                    num_reg={numReg}
                  />

                </>
              )}
            </div>
            {/* FIN del contenido scrollable */}

            {/* ACCIONES — Footer Sticky */}
            <div className="sticky bottom-0 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 px-6 py-2 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 z-10">

              {/* LADO IZQUIERDA: GESTIÓN DE LA COTIZACIÓN */}
              <div className="flex items-center gap-2">
                {/* 1. CONFIGURACIÓN: Personalización y Salida */}
                <ActionMenu
                  title="Herramientas Generales"
                  align="start"
                  customTrigger={
                    <button className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-600 rounded-xl border border-slate-200 shadow-sm transition-all group">
                      <Settings2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600" />
                      Herramientas
                    </button>
                  }
                >
                  <div className="p-1.5 space-y-0.5 w-64">
                    <button onClick={() => handleAbrirCotizacionPDF(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <FileText className="w-3.5 h-3.5 text-cyan-600" /> Generar Archivo PDF
                    </button>
                    <div className="h-[1px] bg-slate-100 my-1" />
                    <button onClick={() => setOpenCondiciones(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" /> Condiciones Generales
                    </button>
                    <button onClick={() => setOpenDescuentos(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <BanknoteArrowDown className="w-3.5 h-3.5 text-cyan-600" /> Descuentos
                    </button>
                    <button onClick={() => setOpenGenerarCodigo(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <Hash className="w-3.5 h-3.5 text-cyan-600" /> Generar Código
                    </button>
                    <button onClick={() => setOpenAsignar(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <UserPlus className="w-3.5 h-3.5 text-cyan-600" /> Asignar a otro Usuario
                    </button>
                  </div>
                </ActionMenu>

                {/* 2. FLUJO Y ESTADOS: Acciones que mueven la cotización */}
                <ActionMenu
                  title="Estado y Versiones"
                  align="start"
                  customTrigger={
                    <button className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-600 rounded-xl border border-slate-200 shadow-sm transition-all group">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                      Flujo
                    </button>
                  }
                >
                  <div className="p-1.5 space-y-0.5 w-60">
                    <button onClick={() => setOpenEnviarCoti(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-teal-50 rounded-lg transition-all">
                      <Send className="w-3.5 h-3.5 text-cyan-600" /> Enviar al Cliente
                    </button>
                    <button onClick={() => setOpenEnviarAprobacion(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-teal-50 rounded-lg transition-all">
                      <Send className="w-3.5 h-3.5 text-cyan-600" /> Enviar para Aprobación
                    </button>
                    <button onClick={() => setOpenRetornar(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-teal-50 rounded-lg transition-all">
                      <Undo2 className="w-3.5 h-3.5 text-cyan-600" /> Retornar para Corrección
                    </button>

                    <div className="h-[1px] bg-slate-100 my-1" /> {/* SEPARADOR */}

                    <button onClick={() => setOpenNuevaVersion(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-teal-50 rounded-lg transition-all">
                      <FilePlus className="w-3.5 h-3.5 text-cyan-600" /> Generar Nueva Versión
                    </button>
                    <button onClick={() => setOpenCopia(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-teal-50 rounded-lg transition-all">
                      <Copy className="w-3.5 h-3.5 text-cyan-600" /> Generar Copia
                    </button>

                    <div className="h-[1px] bg-slate-100 my-1" />

                    <button onClick={() => setOpenEliminar(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 hover:bg-teal-50 rounded-lg transition-all">
                      <Trash className="w-3.5 h-3.5 text-cyan-600" /> Eliminar
                    </button>
                  </div>
                </ActionMenu>

                {/* 3. SEGUIMIENTO: Herramientas de análisis y contacto */}
                <ActionMenu
                  title="Seguimiento Comercial"
                  align="start"
                  customTrigger={
                    <button className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-600 rounded-xl border border-slate-200 shadow-sm transition-all group">
                      <History className="w-3.5 h-3.5 text-cyan-500" />
                      Seguimiento
                    </button>
                  }
                >
                  <div className="p-1.5 space-y-0.5 w-56">
                    <button onClick={() => setOpenSeg(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <Phone className="w-3.5 h-3.5 text-cyan-600" /> Bitácora de Seguimiento
                    </button>
                    <button onClick={() => setOpenMensajes(true)} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <div className="flex items-center gap-2">
                        <MessageSquareMore className="w-3.5 h-3.5 text-cyan-500" /> Mensajes
                      </div>
                      <span className="bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded text-[9px]">{mensajes.length}</span>
                    </button>
                    <button onClick={() => setOpenProbabilidad(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <ChartScatter className="w-3.5 h-3.5 text-cyan-600" /> Probabilidad
                    </button>
                    <button onClick={() => setOpenAdjuntos(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-cyan-50 rounded-lg transition-all">
                      <Paperclip className="w-3.5 h-3.5 text-cyan-500" /> Archivos Adjuntos
                    </button>
                  </div>
                </ActionMenu>
              </div>

              {/* LADO DERECHO: ACCIONES PRINCIPALES */}
              <div className="flex gap-2">
                {acciones.reporte && (
                  <Button
                    variant="ghost"
                    onClick={handleAbrirReporteHTML}
                    className="text-[11px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50 border border-blue-200/50 rounded-xl h-9 px-6 transition-all"
                  >
                    Reporte
                  </Button>
                )}

                {/* BOTÓN GUARDAR CON ESTADO PENDING */}
                {acciones.guardar && data.envio !== 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={crearMutation.isPending}
                    className={`text-[11px] font-black uppercase tracking-widest rounded-xl h-9 px-6 transition-all border 
                      ${crearMutation.isPending
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "text-emerald-700 hover:bg-emerald-50 border-emerald-200/60"
                      }`}
                    onClick={handleGuardarCotizacion}
                  >
                    {crearMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                )}

                {acciones.salir && (
                  <Button
                    variant="ghost"
                    className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50 border border-red-200/60 rounded-xl h-9 px-6 transition-all"
                    onClick={onClose}
                  >
                    Salir
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

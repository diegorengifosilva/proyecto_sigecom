// src/dashboard/cotizaciones/AprobacionCotizacionModal.jsx
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePenLine, File, X, Info, LayoutDashboard, Save, LogOut, ChevronRight } from "lucide-react"; import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import InfoTabs from "@/components/ui/InfoTabs";
import CondicionesModal from "./Gestion/CondicionesModal";
import GenerarCodigoModal from "./GenerarCodigoModal";
import DescuentosModal from "./Gestion/DescuentosModal";


import ProbabilidadModal from "./Gestion/ProbabilidadModal";
import MensajesModal from "./Gestion/MensajesModal";
import SeguimientoModal from "./Gestion/SeguimientoModal";
import CopiaCotizacionModal from "./Gestion/CopiaCotizacionModal";
import NuevaVersionModal from "./Gestion/NuevaVersionModal";
import RetornarCotizacionModal from "./Gestion/RetornarCotizacionModal";
import EliminarCotizacionModal from "./Gestion/EliminarCotizacionModal";
import EnviarCotiAprobacionModal from "./Gestion/EnviarCotiModal";
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
import { tableToExcel } from "../utils/excel";
import { calcularItemSegunProveedor, resolverEndpointPorCodigo } from "../dashboard/Suministros/tables/tablaUtils";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { crearCotizacion } from "@/api/cotizaciones";
import { toast } from "react-toastify";
import { fromJSON } from "postcss";

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

export default function OportunidadesModal({ open, onClose, cotizacion, modo, tipo, dashboard, onRefrescar }) {
  const [data, setData] = useState(cotizacion || {});
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

    console.log("🚀 abrirModalRegistroPorTipo", {
      tipoCodigo,
      servicioId,
      subgrupoId,
      item,
    });

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
  const acciones = ACCIONES_POR_MODO[modo] || {};
  const [itemActivo, setItemActivo] = useState(null);
  const [cotizacionVista, setCotizacionVista] = useState(cotizacion?.num_reg);
  const [cotizacionEditable, setCotizacionEditable] = useState(null);
  const [tabActiva, setTabActiva] = useState("datos");
  const DASHBOARD_TABS = {
    C: ["datos", "suministros", "servicios", "gestion"],
    R: ["datos", "suministros", "servicios", "gestion"],
    A: ["datos", "suministros", "servicios", "gestion"],
    S: ["datos", "suministros", "servicios"],
  };
  const tabsToShow = DASHBOARD_TABS[dashboard] ?? ["datos"];

  const [openReporte, setOpenReporte] = useState(false);
  const [htmlReporte, setHtmlReporte] = useState("");
  const [loadingReporte, setLoadingReporte] = useState(false);

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

      console.log("🧾 DESCUENTOS RAW BACKEND:", {
        des_a: res.data.des_a,
        des_t: res.data.des_t,
        des_p: res.data.des_p,
        des_m: res.data.des_m,
      });

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

      console.log("🧾 DESCUENTO HIDRATADO:", descuentoForm);

      // 🔑 Fuente de verdad
      const tc = Number(res.data.tcamb || 1);
      setTcamb(tc);

      console.log("📄 DETALLE CARGADO:", res.data);
      console.log("💱 TCAMB de cotización:", tc);

    } catch (err) {
      console.error("Error cargando detalles de cotización:", err);
      setError("No se pudo cargar la información de la cotización.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar solo la cabecera (detalle) usando el número original
  useEffect(() => {
    if (open && cotizacion?.num_reg) {
      fetchCotizacionDetalle(cotizacion.num_reg);
      cargarMensajes();
      setCotizacionVista(cotizacion.num_reg);
      setCotizacionEditable(null); // reset de seguridad
      setTabActiva("datos");     // UX limpia
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

      console.log("Suministros mapeados a UI:", grupos);

    } catch (err) {
      console.error("Error cargando suministros:", err);
      setGruposSuministros({});
      setSuministros([]);
    }
  };

  // Agregar o Editar Grupo
  const handleAgregarGrupoSuministro = (form) => {
    setGruposSuministros(prev => {

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
            header: {
              ...grupoPrev.header,
              can: Number(form.cantidad),
            },
          },
        };
      }

      // ➕ CREAR NUEVO GRUPO (CONTADOR GLOBAL)
      const existentes = Object.keys(prev)
        .map(k => parseInt(k.substring(0, 2), 10))
        .filter(n => !isNaN(n));

      const maxContador = existentes.length > 0 ? Math.max(...existentes) : 0;
      const nuevoContador = maxContador + 1;

      const tipo = form.tipo; // "01" | "02"
      const nuevoCog = String(nuevoContador).padStart(2, "0") + tipo;

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
        },
      };
    });
  };

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
      id: esEdicion ? form.id : `I${Date.now()}`, // 🔥 clave
      num: esEdicion ? form.num : Date.now(),
      cod: form.codigo,
      des: form.descripcion,
      pro: form.marca,
      tpr: form.proveedor,
      tde: form.unidad,
      can: Number(form.cantidad),
      puc: Number(form.costoPrecio),
      tou: Number(form.utilidad),
      cau: Number(form.porcentaje),
      toc: Number(form.costoTotal),
      val: Number(form.ventaPrecio),
      tot: Number(form.ventaTotal),
      ent: form.entrega ? Number(form.entrega) : null,
      enu: form.entrega_uni || "D",
      obs: form.observacion || "",
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

  const mapSuministrosBackendToState = (rows = []) => {
    const grupos = {};

    rows.forEach((row) => {
      const grupoId = row.cog;

      if (!grupos[grupoId]) {
        grupos[grupoId] = {
          id: grupoId,
          tipo: "SUMINISTROS",
          titulo: row.nog || "",
          cantidad: 0,
          totalGrupo: 0,
          nroLineasPdf: 0,
          header: {
            can: 0,
            tot: 0,
          },
          items: [],
        };
      }

      // 🟡 CABECERA DEL GRUPO
      if (row.nig === 0) {
        grupos[grupoId].titulo = row.nog;
        grupos[grupoId].cantidad = Number(row.can || 0);
        grupos[grupoId].header.can = Number(row.can || 0);
        grupos[grupoId].header.tot = Number(row.tot || 0);
        grupos[grupoId].totalGrupo = Number(row.tot || 0);
        return;
      }

      // 🟢 ITEM REAL
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
      grupos[grupoId].totalGrupo += item.tot;
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
    console.log("🔁 Recalculando total suministros:", total);

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
      console.log("🧠 Servicios cargados:", lista);

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
    mutationFn: () =>
      api.post(`/cotizaciones/generar_codigo/${numReg}/`),

    onSuccess: (res) => {
      const nuevoCodigo = res.data.codigo;

      // 🔥 actualizar estado local
      setCodigo(nuevoCodigo);

      toast.success("Código guardado correctamente");

      // 🔄 refrescar dashboards / tablas
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });

      // 🔍 refrescar detalle
      queryClient.invalidateQueries({
        queryKey: ["cotizacion-detalle", numReg],
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
    console.log("📥 DESCUENTO RECIBIDO EN MODAL PADRE:", payload);
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
      console.log("🆕 Nueva versión creada:", num_reg);

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
    console.log("🧭 Tab:", tabActiva, "Editable:", cotizacionEditable);

    if (tabActiva === "datos" && cotizacionEditable) {
      console.log("➡️ Pasando a vista:", cotizacionEditable);
      setCotizacionVista(cotizacionEditable);
      setCotizacionEditable(null);
    }
  }, [tabActiva, cotizacionEditable]);

  useEffect(() => {
    if (!cotizacionVista) return;

    console.log("🔄 Cargando DETALLE para:", cotizacionVista);

    fetchCotizacionDetalle(cotizacionVista);
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

    console.log("USANDO num_reg PARA SUMINISTROS Y SERVICIOS:", reg);

    if (reg) {
      fetchSuministros(reg);
      fetchServicios(reg);
    }
  }, [open, data?.num_reg, cotizacion?.num_reg]);

  // Debug general
  useEffect(() => {
    console.log(
      "DATA FINAL DEL MODAL:",
      JSON.stringify(
        { detalle: data, suministros, servicios },
        null,
        2
      )
    );
  }, [data, suministros, servicios]);

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
        // 🔹 Suma de totales de los items del grupo
        const subtotalItems = grupo.items.reduce(
          (acc, item) => acc + Number(item.tot || 0),
          0
        );

        // 🔹 Total real considerando la cantidad del grupo
        const totalGrupo = subtotalItems * Number(grupo.cantidad || 1);

        return [
          cog,
          {
            ...grupo,
            total: +subtotalItems.toFixed(2), // 👈 TOTAL REAL para nig=0
            items: grupo.items,
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
            const itemProcesado = {
              ...it,
              tipoCodigo: sub.tipoCodigo, // 🔹 Asignamos el tipo del subgrupo
              can: Number(it.can || 0),
              puc: Number(it.puc || 0),
              toc: Number(it.toc || 0),
              cau: Number(it.cau || 0),
              tou: Number(it.tou || 0),
              val: Number(it.val || 0),
              tot: Number(it.tot || 0),
            };
            items.push(itemProcesado);
            totalGrupo += itemProcesado.tot;
          });
        });

        totalGrupo *= Number(grupo.cantidad || 1);

        return [
          cog,
          {
            ...grupo,
            cantidad: Number(grupo.cantidad ?? 1), // 🔴 CLAVE
            items,                        // items ya procesados
            total: +totalGrupo.toFixed(2) // total listo para nig=0 y backend
          },
        ];
      })
    );

    console.log("💾 TOTAL A GUARDAR:", {
      totalSinDescuento: totalesLocales.total,
      descuento: descuentoAplicado,
      totalFinal,
    });

    const payload = {
      ...data,
      detalle: {
        ...data.detalle,
        // ❌ NO enviar tot_c calculado
      },
      acu_e: condicionesHtml,
      suministros: suministrosPayload,
      servicios: serviciosPayload,
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

    console.log("📝 PAYLOAD SUMINISTROS ANTES DE GUARDAR", suministrosPayload);

    console.log("🚀 PAYLOAD FINAL ENVIADO:", payload.detalle.tot_c);

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:w-[92vw] lg:w-[90vw] xl:max-w-[175vh] h-fit max-h-[95vh] md:max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-3 sm:p-5 border-none">

        {/* ENCABEZADO OPTIMIZADO */}
        <div className="relative bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Reducimos el tamaño del contenedor del icono en pantallas pequeñas */}
            <div className="w-9 h-9 lg:w-12 lg:h-12 bg-teal-600 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <LayoutDashboard className="text-white w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm lg:text-xl font-black tracking-tight text-slate-800 uppercase leading-none">
                  Cotización {data?.numero || ""}
                </h2>
                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] lg:text-[11px] font-bold rounded-md border border-slate-200">
                  {data?.num_reg || ""}
                </span>
              </div>
              <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase mt-0.5 truncate max-w-[200px] lg:max-w-none">
                {data?.cliente_nombre || "Seleccione un cliente"}
              </p>
            </div>
          </div>

          {/* Indicadores en una sola línea para ahorrar altura */}
          <div className="flex gap-4 lg:gap-8 items-center">
            <div className="hidden sm:block text-right border-r border-slate-100 pr-4">
              <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Área / Tipo</p>
              <p className="text-[10px] lg:text-xs font-black text-teal-600 uppercase mt-1">
                {data?.area_nombre || "General"} • {data?.tipo_nombre || "Venta"}
              </p>
            </div>
            {/* Botón de cierre o acciones del modal */}
          </div>
        </div>

        {/* ESTADOS */}
        {loading ? (
          <p className="text-gray-500 text-center py-4">Cargando cotización...</p>
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
              modo={modo}
              esNueva={esNueva}
              esVer={esVer}
              openEncargados={openEncargados}
              setOpenEncargados={setOpenEncargados}
              activeTab={tabActiva}
              onChangeTab={setTabActiva}
              totalesLocales={totalesLocales}
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
              tabsToShow={tabsToShow}
            />

            {/* SUMINISTROS */}
            <AgregarGrupoSuministroModal
              open={openGrupoModal}
              onClose={() => setOpenGrupoModal(false)}
              onConfirm={handleAgregarGrupoSuministro}
              grupo={grupoActivo}
            />

            <RegistroItemModal
              open={openItemModal}
              onClose={() => setOpenItemModal(false)}
              onConfirm={handleAgregarItem}
              item={itemActivo}
              num_reg={numReg}
              tipoVenta={data?.tven}
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
            />

            <GenerarCodigoModal
              open={openGenerarCodigo}
              onClose={() => setOpenGenerarCodigo(false)}
              numReg={data?.num_reg || cotizacion?.num_reg}
              codigoExistente={codigo}   // estado del padre
              onGuardado={() => generarCodigo.mutate()} // se llama desde el submodal
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

            {/* ACCIONES */}
            <div className="sticky bottom-0 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 px-6 py-2 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 z-10">

              {/* LADO IZQUIERDO: GESTIÓN DE LA COTIZACIÓN */}
              <div className="flex items-center gap-2">
                {/* Contenedor sutil para botones de estado/seguimiento */}
                <div className="flex gap-1 bg-white/50 p-1 rounded-xl border border-slate-200/60 shadow-sm">
                  {acciones.estado && (
                    <Button
                      variant="ghost"
                      className="text-[10px] font-black uppercase tracking-tight text-sky-700 hover:bg-sky-100 h-8 px-4 rounded-lg transition-all"
                      onClick={setOpenEstadoCoti}
                    >
                      Estado
                    </Button>
                  )}

                  {acciones.seguimiento && (
                    <Button
                      variant="ghost"
                      className="text-[10px] font-black uppercase tracking-tight text-purple-700 hover:bg-purple-100 h-8 px-4 rounded-lg transition-all"
                      onClick={setOpenSeg}
                    >
                      Seguimiento
                    </Button>
                  )}

                  {acciones.probabilidad && (
                    <Button
                      variant="ghost"
                      className="text-[10px] font-black uppercase tracking-tight text-teal-700 hover:bg-teal-100 h-8 px-4 rounded-lg transition-all"
                      onClick={setOpenProbabilidad}
                    >
                      Probabilidad
                    </Button>
                  )}
                </div>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

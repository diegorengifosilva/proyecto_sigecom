// src/dashboard/cotizaciones/CotizacionNuevaModal.jsx
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LayoutDashboard, FilePenLine, File, LogOut, Info } from "lucide-react"; import { Button } from "@/components/ui/button";
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
import ServicioModal from "../dashboard/Servicios/ServicioModal";
import AgregarSubgrupoGastoModal from "../dashboard/Servicios/AgregarSubgrupoGastoModal";
import RegistroItemManoObraModal from "../dashboard/Servicios/RegistroItemManoObraModal";
import RegistroItemGastosServicioModal from "../dashboard/Servicios/RegistroItemGastosServicioModal";
import RegistroItemOtrosModal from "../dashboard/Servicios/RegistroItemOtrosModal";
import AsignarCotiModal from "./Gestion/AsignarCotiModal";
import ImportarXLS1Modal from "../dashboard/Suministros/ImportarXLS1Modal";
import ImportarXLS2Modal from "../dashboard/Suministros/ImportarXLS2Modal";
import { calcularItemSegunProveedor, resolverEndpointPorCodigo } from "../dashboard/Suministros/tables/tablaUtils";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crearCotizacion } from "@/api/cotizaciones";
import { toast } from "react-toastify";

export default function CotizacionNuevaModal({ open, onClose, cotizacion, modo, tipo, dashboard, cotizaciones = [], esOportunidad }) {

  // ==========================
  // DATA INICIAL (LIMPIA)
  // ==========================
  const [data, setData] = useState({
    num_reg: "",
    fecha: new Date().toISOString().split("T")[0],
    estado_codigo: 2,
    tot_d: "D",
    tot_s: "D",
    tmone: "D",
    tcamb: "3.362",
    acu_s: "D",
    nombc: "",
    telec: "",
    mov1c: "",
    mov2c: "",
    mov3c: "",
    mailc: "",
  });
  const [loading, setLoading] = useState(false);
  const [suministros] = useState([]);
  const [servicios] = useState([]);
  const esNueva = tipo === "N";
  const esVer = tipo === "V";
  const [tcamb, setTcamb] = useState(3.355);
  // Submodales
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
  const [openAsignar, setOpenAsignar] = useState(false);
  // SUMINISTROS
  const [openGrupoModal, setOpenGrupoModal] = useState(false);
  const [gruposSuministros, setGruposSuministros] = useState({});
  const [openItemModal, setOpenItemModal] = useState(false);
  const [grupoActivo, setGrupoActivo] = useState(null);
  const [openRegistroItem, setOpenRegistroItem] = useState(false);
  const [openImportarXLS1, setOpenImportarXLS1] = useState(false);
  const [openImportarXLS2, setOpenImportarXLS2] = useState(false);
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

  const [itemActivo, setItemActivo] = useState(null);

  const [cotizacionVista, setCotizacionVista] = useState(cotizacion?.num_reg);
  const [cotizacionEditable, setCotizacionEditable] = useState(null);
  const [tabActiva, setTabActiva] = useState("datos");
  const DASHBOARD_TABS = {
    C: ["datos", "suministros", "servicios", "gestion"],
    O: ["datos"],
  };
  const tabsToShow = DASHBOARD_TABS[dashboard] ?? ["datos"];

  // Estado dedicado para el num_reg de oportunidad
  const [nuevoNumOportunidad, setNuevoNumOportunidad] = useState("");

  // Cuando abrimos el modal de Nuevo
  useEffect(() => {
    if (open) {
      const cargarNumOportunidad = async () => {
        try {
          const { data } = await api.get("/siguiente_num_reg_oportunidad/");
          console.log("Respuesta backend num_reg:", data); // <--- aquí lo ves en consola
          setNuevoNumOportunidad(data.num_reg);
        } catch (err) {
          console.error("Error al obtener num_reg:", err);
        }
      };

      cargarNumOportunidad();

      // Limpiamos el resto de la data
      setData({
        num_reg: "", // ya no lo usamos directamente
        fecha: new Date().toISOString().split("T")[0],
        estado_codigo: 2,
        tot_d: "D",
        tot_s: "D",
        tmone: "D",
        tcamb: "3.362",
        acu_s: "D",
        nombc: "",
        telec: "",
        mov1c: "",
        mov2c: "",
        mov3c: "",
        mailc: "",
      });
    }
  }, [open]);

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

  // ==============================
  // CONTROL POR ESTADO ENVIO
  // ==============================
  const envio = Number(data?.envio ?? 0);

  // Puede guardar solo si NO está enviado
  const canSave = envio !== 3;

  useEffect(() => {
    if (!open) {
      // 🧹 OPCIONAL: Puedes limpiar el estado aquí al cerrar si prefieres
      // o dejar que el inicio del modal lo haga.
      return;
    }

    const prepararModal = async () => {
      try {
        // 1. Cargamos datos del usuario actual
        const { data: usuario } = await api.get("users/usuario-actual/");

        if (tipo === "N") {
          // 🆕 ES NUEVA: Calculamos el siguiente num_reg
          const listaNumeros = cotizaciones
            .map((c) => parseInt(c.num_reg))
            .filter((n) => !isNaN(n));

          const maxActual = listaNumeros.length > 0 ? Math.max(...listaNumeros) : 2026000000;
          const proximoReg = maxActual + 1;

          // ✨ RESET TOTAL: Aquí definimos el estado inicial vacío
          setData({
            num_reg: proximoReg,
            fecha: new Date().toISOString().split('T')[0], // Fecha de hoy
            cliente_codigo: "",
            nombr: "",
            referencia: "",
            // ... otros campos que quieras vaciar ...
            suministros: {},
            servicios: {},
            tot_c: 0,

            // Datos del Vendedor (Snapshot del usuario actual)
            regus: usuario?.usuario ?? "",
            nombc: usuario?.nombre_completo ?? "",
            telec: usuario?.telefono ?? "",
            mov1c: usuario?.movil1 ?? "",
            mov2c: usuario?.movil2 ?? "",
            mov3c: usuario?.movil3 ?? "",
            mailc: usuario?.email_usu ?? "",
          });
        } else {
          // 📝 ES EDICIÓN: Solo actualizamos los datos del usuario si es necesario
          // o dejamos los datos que ya vienen en 'data' por el clic en la tabla.
          setData((prev) => ({
            ...prev,
            regus: prev.regus || (usuario?.usuario ?? ""),
          }));
        }

      } catch (err) {
        console.error("Error al preparar el modal de cotización:", err);
      }
    };

    prepararModal();
  }, [open, tipo, cotizaciones]);

  // =====================
  // EDICIÓN DE CAMPOS
  // =====================
  const handleEdit = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // ======================
  // CAMPOS OBLIGATORIOS
  // ======================
  const CAMPOS_OBLIGATORIOS = [
    { key: "fecha", label: "Fecha" },
    { key: "referencia", label: "Referencia" },
    { key: "cliente_codigo", label: "Para (Cliente)" },
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
        const costoEnvioGrupo = Number(grupo.costoEnvio || 0);
        const tipoVentaGlobal = data?.tven;
        const itemsDelGrupo = grupo.items || [];


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

    // ── CONFIGURACIÓN DEL PAYLOAD DE OPORTUNIDAD (ESPEJO TOTAL) ──
    const oportunidadPayload = {
      // Identificación y Seguimiento
      num_reg: nuevoNumOportunidad,
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
      fpago: data.fpago || "",
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
    console.log("🎯 OPORTUNIDAD PAYLOAD:", oportunidadPayload);

    const payload = {
      ...data,
      //num_reg: nuevoNumOportunidad, // Envio de num_reg para oportunidades
      detalle: {
        ...data.detalle,
        // ❌ NO enviar tot_c calculado
      },
      acu_e: condicionesHtml,
      suministros: suministrosPayload,
      servicios: serviciosPayload,
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

    crearMutation.mutate(payload);
  };

  // =============
  // SUMINISTROS
  // =============
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
    const base = Object.keys(gruposSuministros || {}).length > 0
      ? gruposSuministros
      : grupos;

    const grupo = base[cogOriginal];
    if (!grupo) return;

    // Nuevo COG incremental (simple y seguro)
    const existentes = Object.keys(base);
    const maxNum = Math.max(
      ...existentes.map(c => parseInt(c.replace(/\D/g, ""), 10) || 0)
    );
    const nuevoCog = `${grupo.tipo}${maxNum + 1}`;

    const nuevoGrupo = {
      ...grupo,
      cog: nuevoCog,
      titulo: `${grupo.titulo} - Copia`,
      header: {
        ...grupo.header,
        cog: nuevoCog,
        nog: `${grupo.header.nog} - Copia`,
      },
      items: grupo.items.map((item, idx) => ({
        ...item,
        cog: nuevoCog,
        nig: idx + 1,
      })),
    };

    setGruposSuministros(prev => ({
      ...(Object.keys(prev).length > 0 ? prev : grupos),
      [nuevoCog]: nuevoGrupo,
    }));
  };

  // 🔹 Construye los ítems desde el XLS usando la MISMA lógica que RegistroItemModal
  const buildGruposFromXLS = async (
    excelRows,
    gruposExistentes = {},
    grupoActivo,
    tcamb = 1
  ) => {
    if (!grupoActivo) {
      console.error("❌ buildGruposFromXLS: grupoActivo no definido");
      return gruposExistentes;
    }

    console.table(excelRows);

    const grupo = { ...(gruposExistentes[grupoActivo] || {}) };
    grupo.items = [];
    grupo.tipo = grupo.tipo || "SUMINISTRO";
    grupo.titulo = grupo.titulo || grupoActivo;

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
    // 1️⃣ Ítems base (Excel puro)
    // =====================
    const itemsBase = excelRows.map((row, idx) => {
      const item = {
        id: crypto.randomUUID(),
        nig: 0,
        cod: String(row.Codigo || row.codigo || "").trim(),
        des: String(row.Descripcion || row.descripcion || "").trim(), // ❗ no inventar
        can: Number(row.Cant || row.cant || 1),
        proveedorExcel: String(row.Proveedor || row.proveedor || "").trim(),
        tpr: "",
        pro: "",
        tde: "UNI",
        vc_pu: 0,
        vc_tot: 0,
        tot: 0,
        origen: "XLS",
        pendienteResolver: true,
      };

      return item;
    });

    // =====================
    // 2️⃣ Resolver por CÓDIGO (fuente de verdad)
    // =====================
    const processedItems = await Promise.all(
      itemsBase.map(async (item, idx) => {
        const row = idx + 1;

        // ⛔ Sin código válido
        if (!item.cod || ["S/C", "."].includes(item.cod.toUpperCase())) {
          return { ...item, pendienteResolver: false };
        }

        try {

          const tprPorCodigo = await resolverEndpointPorCodigo(item.cod);
          let tprFinal = "";

          if (tprPorCodigo && tprPorCodigo !== "99") {
            tprFinal = tprPorCodigo;
          } else {
            const tprExcel = mapProveedorExcelToTPR(item.proveedorExcel);
            tprFinal = tprExcel || "";
            console.warn(
              `⚠️ [${row}] Código no encontrado, fallback Excel →`,
              tprFinal || "editable"
            );
          }

          if (!tprFinal) {
            return { ...item, pendienteResolver: false };
          }

          // =====================
          // Buscar item en endpoint real
          // =====================
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
            String(r.codigo).toUpperCase() === item.cod.toUpperCase() ||
            String(r.ocodigo).toUpperCase() === item.cod.toUpperCase()
          );

          if (!encontrado) {
            console.warn(`⚠️ [${row}] Código no encontrado en endpoint → usando datos de Excel`);

            // 🔹 Normalizamos directamente usando Excel
            const calcFallback = calcularItemSegunProveedor(
              {
                codigo: item.cod,
                descripcion: item.des,
                proveedor: item.proveedorExcel,
                pgc: item.tde,
                precio: 0 // como no hay precio en DB, dejamos 0
              },
              tprFinal,
              tcamb,
              item.can,
              item.proveedorExcel
            );

            return {
              ...item,
              tpr: calcFallback.tpr ?? tprFinal,
              cod: calcFallback.codigo ?? item.cod,
              des: calcFallback.descripcion ?? item.des,
              pro: calcFallback.proveedor ?? item.proveedorExcel,
              tde: calcFallback.unidad ?? "UNI",
              can: calcFallback.cantidad ?? 1,
              puc: calcFallback.costoPrecio ?? 0,
              tou: calcFallback.utilidad ?? 0,
              cau: calcFallback.porcentaje ?? 0,
              toc: calcFallback.costoTotal ?? 0,
              val: calcFallback.ventaPrecio ?? 0,
              tot: calcFallback.ventaTotal ?? 0,
              pendienteResolver: false,
            };
          }

          // =====================
          // Cálculo ÚNICO (tablaUtils)
          // =====================
          const calc = calcularItemSegunProveedor(
            encontrado,
            tprFinal,
            tcamb,
            item.can,
            item.proveedorExcel
          );

          return {
            ...item,

            // Identidad
            tpr: calc.tpr ?? tprFinal,
            cod: calc.codigo ?? item.cod,
            des: calc.descripcion ?? item.des,
            pro: item.proveedorExcel ?? calc.proveedor ?? "",
            tde: calc.unidad ?? "UNI",
            can: calc.cantidad ?? 1,

            // 💰 Campos que el RegistroItemModal SÍ LEE
            puc: calc.costoPrecio ?? 0,
            tou: calc.utilidad ?? 0,
            cau: calc.porcentaje ?? 0,
            toc: calc.costoTotal ?? 0,
            val: calc.ventaPrecio ?? 0,
            tot: calc.ventaTotal ?? 0,

            pendienteResolver: false,
          };

        } catch (err) {
          console.error(`💥 [${row}] Error procesando`, item.cod, err);
          return item;
        }
      })
    );

    // =====================
    // 3️⃣ Asignar NIG
    // =====================
    grupo.items = processedItems.map((item, idx) => ({
      ...item,
      nig: idx + 1,
    }));

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

  // =============
  // SERVICIOS
  // =============
  // IDs
  const buildSubgrupoId = (servicioId, index) =>
    `SG_BACK_${servicioId}_${index}`;

  // Agregar o Editar Servicio
  const handleAgregarServicio = (form) => {

    setGruposServicios(prev => {

      // ✏️ EDITAR SERVICIO EXISTENTE
      if (form._key && prev[form._key]) {
        const servicioPrev = prev[form._key];

        return {
          ...prev,
          [form._key]: {
            ...servicioPrev,
            tituloGeneral: form.nombre, // 🔹 igual que grupo.titulo
            cantidad: Number(form.cantidad),
            lineasPdf: Number(form.lineasPdf),
            detalle: form.detalle,
            header: {
              ...servicioPrev.header,
              can: Number(form.cantidad), // si quieres reflejarlo en header
            },
          },
        };
      }

      // ➕ CREAR NUEVO SERVICIO
      const id = form.cog ?? `S${Date.now()}`;
      return {
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

  // =========
  // GESTION
  // =========
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
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });

      cerrarTodo();
    },

    onError: () => {
      toast.error("Error eliminando la cotización");
    },
  });

  const handleNuevaVersion = useMutation({
    mutationFn: () =>
      api.post(`cotizaciones/${numReg}/nueva-version/`),

    onSuccess: () => {
      toast.success("Nueva versión creada correctamente");
      setOpenNuevaVersion(false);

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });
    },

    onError: () => {
      toast.error("Error al crear nueva versión");
    },
  });

  const handleCopiarCotizacion = useMutation({
    mutationFn: () =>
      api.post(`cotizaciones/${numReg}/generar-copia/`),

    onSuccess: () => {
      toast.success("Copia de cotización creada correctamente sin COTIN");
      setOpenCopia(false);

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });
    },

    onError: () => {
      toast.error("Error al crear la copia de la cotización");
    },
  });

  const enviarCotizacionAprobacion = useMutation({
    mutationFn: () =>
      api.patch(`cotizaciones/${numReg}/enviar-aprobacion/`, {
        estado_codigo: 3,
      }),

    onSuccess: () => {
      toast.success("Cotización enviada a aprobación");
      setOpenEnviarAprobacion(false);

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });
    },

    onError: () => {
      toast.error("Error enviando la cotización a aprobación");
    },
  });

  const retornarCotizacion = useMutation({
    mutationFn: () =>
      api.patch(`cotizaciones/${numReg}/retornar/`),

    onSuccess: () => {
      toast.success("Cotización retornada a edición");
      setOpenRetornar(false); // si tienes modal de confirmación

      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
    },

    onError: () => {
      toast.error("Error al retornar la cotización");
    },
  });

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

  // =============================
  // Función para cerrar todo
  // =============================
  const cerrarTodo = () => {
    setOpenEliminar(false); // submodal
    onClose();              // modal padre (Dashboard)
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
      `${API_URL}/api/cotizaciones/reportes/reporte_suministros_html/${numReg}/`,
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

  // Reporte Detallado Excel
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

    const importeDescuento =
      descuentosForm?.aplicar ? Number(descuentosForm.importe || 0) : 0;

    let totalSuministros = totalSuministrosBase;
    let totalServicios = totalServiciosBase;

    if (importeDescuento > 0) {
      switch (descuentosForm?.afecto) {
        case "t":
          // Se aplica al total general
          break;

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

        default:
          break;
      }
    }

    let totalGeneral = totalSuministros + totalServicios;

    // Si el descuento afecta al TOTAL
    if (importeDescuento > 0 && descuentosForm?.afecto === "t") {
      totalGeneral = Math.max(
        totalSuministrosBase + totalServiciosBase - importeDescuento,
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

  //============
  // DESCUENTO
  //============
  const handleGuardarDescuento = (payload) => {
    setDescuentosForm(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[175vh] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-lg p-4">

        {/* ENCABEZADO DINÁMICO */}
        <div className="relative bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">

            {/* Color dinámico del Icono: Teal para Cotizaciones, Indigo para Oportunidades */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg 
            ${esOportunidad
                ? "bg-teal-600 shadow-teal-100"
                : "bg-teal-600 shadow-teal-100"}`}
            >
              <LayoutDashboard className="text-white" size={24} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                {/* Título fijo */}
                <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">
                  Nueva Cotización
                </h2>

                {/* Registro interno: solo de DashboardOportunidad */}
                {nuevoNumOportunidad && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md border border-slate-200 uppercase tracking-widest">
                    {/*{nuevoNumOportunidad}*/}
                    {numReg}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                {/* El punto pulsante también cambia de color */}
                <div className={`w-2 h-2 rounded-full animate-pulse ${esOportunidad ? "bg-teal-500" : "bg-teal-500"}`} />

                <p className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                  {data?.cliente_nombre || (esOportunidad ? "Esperando selección de prospecto..." : "Esperando selección de cliente...")}
                </p>
              </div>
            </div>
          </div>

          {/* INDICADORES RÁPIDOS (Opcional, si tienes estos datos) */}
          <div className="hidden md:flex gap-8 mr-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tipo Cotización</p>
              <p className="text-xs font-black text-teal-600 uppercase">{data?.tipo_nombre || ""}</p>
            </div>
            <div className="text-right border-l border-slate-100 pl-8">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Área</p>
              <p className="text-xs font-black text-teal-600 uppercase">{data?.area_nombre || ""}</p>
            </div>
          </div>
        </div>

        <InfoTabs
          mode="new"
          data={data}
          setData={setData}
          suministros={Array.isArray(suministros) ? suministros : []} // siempre un array
          servicios={Array.isArray(servicios) ? servicios : []}
          esOportunidad={esOportunidad}
          modo={modo}
          esNueva={esNueva}
          esVer={esVer}
          activeTab={tabActiva}
          onChangeTab={setTabActiva}
          openEncargados={openEncargados}
          setOpenEncargados={setOpenEncargados}
          campoError={campoError}
          setCampoError={setCampoError}
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
          openAdjuntos={openAdjuntos}
          setOpenAdjuntos={setOpenAdjuntos}
          openEnviarAprobacion={openEnviarAprobacion}
          setOpenEnviarAprobacion={setOpenEnviarAprobacion}
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

        {/* SECCIÓN DE ACCIONES (FOOTER) - STICKY Y OPTIMIZADO */}
        <div className="sticky bottom-0 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 px-6 py-2 flex flex-col sm:flex-row justify-end items-center gap-4 shrink-0 z-10 mt-6">

          {/* LADO IZQUIERDO: GESTIÓN DE LA COTIZACIÓN */}
          <div className="flex items-center gap-2">
            {/* Contenedor sutil para botones de estado/seguimiento */}
            <div className="flex gap-1 bg-white/50 p-1 rounded-xl border border-slate-200/60 shadow-sm">

              {/* BOTÓN CÓDIGO: SIEMPRE VISIBLE */}
              <Button
                variant="ghost"
                className="text-[10px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-100 h-8 px-4 rounded-lg transition-all border border-transparent hover:border-slate-200"
                onClick={setOpenGenerarCodigo}
              >
                Código
              </Button>
            </div>
          </div>

          {/* LADO DERECHO: ACCIONES PRINCIPALES */}
          <div className="flex gap-2">
            {/* REPORTE */}
            <Button
              variant="ghost"
              onClick={() => { console.log("Generar reporte"); }}
              className="text-[11px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50 border border-blue-200/50 rounded-xl h-9 px-6 transition-all"
            >
              Reporte
            </Button>

            {/* BOTÓN GUARDAR DINÁMICO */}
            {canSave && (
              <Button
                type="button"
                variant="ghost"
                disabled={crearMutation.isPending}
                className={`text-[11px] font-black uppercase tracking-widest rounded-xl h-9 px-6 transition-all border 
                  ${crearMutation.isPending
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                    : "text-emerald-700 hover:bg-emerald-50 border-emerald-200/60 shadow-sm"
                  }`}
                onClick={handleGuardarCotizacion}
              >
                {crearMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            )}

            {/* SALIR */}
            <Button
              variant="ghost"
              className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50 border border-red-200/60 rounded-xl h-9 px-6 transition-all"
              onClick={onClose}
            >
              Salir
            </Button>
          </div>
        </div>

        {/* SUMINISTROS */}
        <AgregarGrupoSuministroModal
          open={openGrupoModal}
          onClose={() => setOpenGrupoModal(false)}
          onConfirm={handleAgregarGrupoSuministro}
          grupo={grupoActivo}
          tipoVenta="T"
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
          condicionesIniciales={data?.acu_e}   // ← AQUÍ ESTÁ EL FIX
          num_reg={numReg}
          onAceptar={(nuevoTexto) => {
            setCondicionesHtml(nuevoTexto);  // 🔑 Guardamos solo en estado
            setOpenCondiciones(false);
          }}
        />

        <GenerarCodigoModal
          open={openGenerarCodigo}
          onClose={() => setOpenGenerarCodigo(false)}
          numReg={data?.num_reg}
        />

        <AsignarCotiModal
          open={openAsignar}
          onClose={() => setOpenAsignar(false)}
          onConfirm={(payload) => { }}
        />

        <DescuentosModal
          open={openDescuentos}
          setOpen={setOpenDescuentos}
          formValues={descuentosForm}
          setFormValues={setDescuentosForm}
          onClose={() => setOpenDescuentos(false)}
          onGuardar={handleGuardarDescuento}
          num_reg={numReg}
        />

        <EnviarCotiModal
          open={openEnviarCoti}
          onClose={() => setOpenEnviarCoti(false)}
          num_reg={numReg}
          onAceptar={() => cerrarCotizacion.mutate()}
          loading={loadingEnviar}
        />

        <ProbabilidadModal
          open={openProbabilidad}
          onClose={() => setOpenProbabilidad(false)}
          probActual={data?.prob}
          num_reg={numReg}
        />

        <MensajesModal
          open={openMensajes}
          onClose={() => setOpenMensajes(false)}
          mensajes={mensajes}
        />

        <SeguimientoModal
          open={openSeg}
          onClose={() => setOpenSeg(false)}
        />

        <AdjuntosModal
          open={openAdjuntos}
          onClose={() => setOpenAdjuntos(false)}
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

        <RetornarCotizacionModal
          open={openRetornar}
          onClose={() => setOpenRetornar(false)}
          onAceptar={() => retornarCotizacion.mutate()}
        />

        <EliminarCotizacionModal
          open={openEliminar}
          onClose={() => setOpenEliminar(false)}
          onCerrarTodo={cerrarTodo}
          onAceptar={() => eliminarCotizacion.mutate()}
          loading={loading}
          cotin={data?.numero}
        />

        <EnviarCotiAprobacionModal
          open={openEnviarAprobacion}
          onClose={() => setOpenEnviarAprobacion(false)}
          onAceptar={() => enviarCotizacionAprobacion.mutate()}
          loading={loadingEnviar}
        />

      </DialogContent>
    </Dialog>
  );
}

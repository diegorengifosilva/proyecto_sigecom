import React, { useState, useEffect } from "react";
import { 
  Users, Home, TrendingUp, Package, Layers, FileText, 
  Search, PlusCircle, Edit3, ShieldAlert, Check, X, Loader, Trash2,
  FileSpreadsheet, Download
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";

// Register autoTable plugin
applyPlugin(jsPDF);

const TABS = [
  { id: "proveedores", label: "Proveedores", icon: <Users size={16} /> },
  { id: "almacenes", label: "Almacenes", icon: <Home size={16} /> },
  { id: "grupo_analitico", label: "Grupo Analítico", icon: <TrendingUp size={16} /> },
  { id: "productos", label: "Productos", icon: <Package size={16} /> },
  { id: "centros_costo", label: "Centros de Costo", icon: <Layers size={16} /> },
  { id: "documentos", label: "Documentos Almacén", icon: <FileText size={16} /> },
];

export default function LogisticaTablas() {
  const [activeTab, setActiveTab] = useState("proveedores");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados de datos
  const [proveedores, setProveedores] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [grupoAnalitico, setGrupoAnalitico] = useState([]);
  const [productos, setProductos] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  // Listas de apoyo relacionales
  const [usuarios, setUsuarios] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estados de Modales
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Modal de Confirmación de Eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Formulario Dinámico
  const [formData, setFormData] = useState({});

  // Cargar datos por defecto y de APIs
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar TODO en paralelo simultáneamente para máxima velocidad
      const [
        resUsers, resBrands, resMeasures,
        resProv, resAlm, resProd,
        resGrupo, resCC, resDoc
      ] = await Promise.all([
        api.get("logistica/usuarios/?limit=500").catch(e => { console.warn("[usuarios] err:", e?.response?.status); return null; }),
        api.get("core/tipo_marca/").catch(e => { console.warn("[tipo_marca] err:", e?.response?.status); return null; }),
        api.get("core/unidades_medida/").catch(e => { console.warn("[unidades_medida] err:", e?.response?.status); return null; }),
        api.get("core/clientes/").catch(e => { console.warn("[clientes] err:", e?.response?.status); return null; }),
        api.get("logistica/dashboard/almacenes/").catch(e => { console.warn("[almacenes] err:", e?.response?.status); return null; }),
        api.get("core/productos/").catch(e => { console.warn("[productos] err:", e?.response?.status); return null; }),
        api.get("logistica/grupos-analiticos/").catch(e => { console.warn("[grupos] err:", e?.response?.status); return null; }),
        api.get("logistica/centros-costo/").catch(e => { console.warn("[centros-costo] err:", e?.response?.status); return null; }),
        api.get("logistica/documentos/").catch(e => { console.warn("[documentos] err:", e?.response?.status); return null; }),
      ]);

      // Listas de apoyo relacionales
      const usersData = (resUsers && Array.isArray(resUsers.data)) ? resUsers.data : [];
      if (usersData.length) setUsuarios(usersData);
      if (resBrands && Array.isArray(resBrands.data)) setMarcas(resBrands.data);
      if (resMeasures && Array.isArray(resMeasures.data)) setUnidadesMedida(resMeasures.data);

      // 1. Proveedores
      if (resProv && Array.isArray(resProv.data) && resProv.data.length > 0) {
        setProveedores(resProv.data.map(p => ({
          id_cliente: p.id_cliente,
          codigo: p.id_cliente_formateado || String(p.id_cliente).padStart(5, "0"),
          nombre: p.nombre || "Sin Nombre",
          ruc: p.ruc || "",
          direccion: p.direccion || "",
          representante_legal: p.representante_legal || "",
          pagina_web: p.pagina_web || "",
          estado: p.activo ? "ACTIVO" : "INACTIVO"
        })));
      } else {
        setProveedores([]);
      }

      // 2. Almacenes
      if (resAlm && Array.isArray(resAlm.data)) {
        setAlmacenes(resAlm.data.map(a => ({
          idalmacen: a.idalmacen,
          nombre: a.nombre || "Sin Nombre",
          direccion: a.direccion || "",
          usuario_id_usuario: Number(a.usuario_id_usuario),
          responsable: usersData.find(u => Number(u.id_usuario) === Number(a.usuario_id_usuario))?.nombre || `Responsable #${a.usuario_id_usuario}`,
          activo: a.activo,
          estado: (a.activo === "1" || a.activo === 1) ? "ACTIVO" : "INACTIVO"
        })));
      } else {
        setAlmacenes([]);
      }

      // 3. Productos
      const prodList = resProd && Array.isArray(resProd.data) ? resProd.data : (resProd?.data?.data || []);
      if (Array.isArray(prodList) && prodList.length > 0) {
        setProductos(prodList.map(p => ({
          id_producto: p.id_producto,
          codigo: p.codigo || "",
          codigo2: p.codigo2 || "",
          nombre: p.nombre || "Sin Nombre",
          id_marca: p.id_marca,
          marca_nombre: p.marca_nombre || "Genérico",
          id_medida: p.id_medida,
          medida_nombre: p.medida_nombre || "UND",
          contenido_valor: p.contenido_valor || 1.0,
          descripcion: p.descripcion || "",
          precio_soles: p.precio_soles || 0.00,
          precio_dolares: p.precio_dolares || 0.00,
          cantidad: p.cantidad || 0,
          stock_min: p.stock_min || 0,
          stock_max: p.stock_max || 0,
          descuento: p.descuento || 0.00,
          proveedor: p.proveedor || "",
          estado: p.activo !== 0 ? "ACTIVO" : "INACTIVO"
        })));
      } else {
        setProductos([]);
      }

      // 4. Grupo Analítico
      if (resGrupo && Array.isArray(resGrupo.data)) {
        setGrupoAnalitico(resGrupo.data.map(g => ({
          idgrupo: g.idgrupo,
          descripcion: g.descripcion || "",
          estado: g.activo === "1" ? "ACTIVO" : "INACTIVO"
        })));
      } else {
        setGrupoAnalitico([]);
      }

      // 5. Centros de Costo
      if (resCC && Array.isArray(resCC.data)) {
        setCentrosCosto(resCC.data.map(c => ({
          idcosto_almacen: c.idcosto_almacen,
          codigo: c.codigo || "",
          descripcion: c.descripcion || "",
          estado: c.activo === "1" ? "ACTIVO" : "INACTIVO"
        })));
      } else {
        setCentrosCosto([]);
      }

      // 6. Documentos Almacén
      if (resDoc && Array.isArray(resDoc.data)) {
        setDocumentos(resDoc.data.map(d => ({
          iddocumento_almacen: d.iddocumento_almacen,
          descripcion: d.descripcion || "",
          estado: d.activo === "1" ? "ACTIVO" : "INACTIVO"
        })));
      } else {
        setDocumentos([]);
      }

    } catch (e) {
      console.error("Error al cargar maestros", e);
      toast.error("Error cargando algunos datos maestros");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar según búsqueda y pestaña activa
  const getFilteredData = () => {
    const q = searchQuery.toLowerCase();
    switch (activeTab) {
      case "proveedores":
        return proveedores.filter(item => 
          (item.codigo || "").toLowerCase().includes(q) || 
          (item.nombre || "").toLowerCase().includes(q) || 
          (item.ruc || "").toLowerCase().includes(q)
        );
      case "almacenes":
        return almacenes.filter(item => 
          String(item.idalmacen).toLowerCase().includes(q) || 
          (item.nombre || "").toLowerCase().includes(q) ||
          (item.direccion || "").toLowerCase().includes(q)
        );
      case "grupo_analitico":
        return grupoAnalitico.filter(item => 
          String(item.idgrupo).toLowerCase().includes(q) || 
          (item.descripcion || "").toLowerCase().includes(q)
        );
      case "productos":
        return productos.filter(item => 
          (item.codigo || "").toLowerCase().includes(q) || 
          (item.codigo2 || "").toLowerCase().includes(q) || 
          (item.nombre || "").toLowerCase().includes(q) ||
          (item.marca_nombre || "").toLowerCase().includes(q) ||
          (item.proveedor || "").toLowerCase().includes(q)
        );
      case "centros_costo":
        return centrosCosto.filter(item => 
          (item.codigo || "").toLowerCase().includes(q) || 
          (item.descripcion || "").toLowerCase().includes(q)
        );
      case "documentos":
        return documentos.filter(item => 
          String(item.iddocumento_almacen).toLowerCase().includes(q) || 
          (item.descripcion || "").toLowerCase().includes(q)
        );
      default:
        return [];
    }
  };

  // Abrir modal para crear
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setSelectedItem(null);
    
    // Inicializar formulario vacío según tabla activa
    const initialForm = {};
    if (activeTab === "proveedores") {
      initialForm.nombre = "";
      initialForm.ruc = "";
      initialForm.direccion = "";
      initialForm.representante_legal = "";
      initialForm.pagina_web = "";
      initialForm.estado = "ACTIVO";
    } else if (activeTab === "almacenes") {
      initialForm.nombre = "";
      initialForm.direccion = "";
      initialForm.usuario_id_usuario = "";
      initialForm.estado = "ACTIVO";
    } else if (activeTab === "grupo_analitico") {
      initialForm.descripcion = "";
      initialForm.estado = "ACTIVO";
    } else if (activeTab === "productos") {
      initialForm.codigo = "";
      initialForm.codigo2 = "";
      initialForm.nombre = "";
      initialForm.id_marca = "";
      initialForm.id_medida = "";
      initialForm.contenido_valor = 1.0;
      initialForm.descripcion = "";
      initialForm.precio_soles = 0.00;
      initialForm.precio_dolares = 0.00;
      initialForm.cantidad = 0;
      initialForm.stock_min = 0;
      initialForm.stock_max = 0;
      initialForm.descuento = 0.00;
      initialForm.proveedor = "";
      initialForm.estado = "ACTIVO";
    } else if (activeTab === "centros_costo") {
      initialForm.codigo = "";
      initialForm.descripcion = "";
      initialForm.estado = "ACTIVO";
    } else if (activeTab === "documentos") {
      initialForm.descripcion = "";
      initialForm.estado = "ACTIVO";
    }
    
    setFormData(initialForm);
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setSelectedItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  // Toggle de Estado Rápido
  const handleToggleState = async (item) => {
    const nextState = item.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const nextStateDb = nextState === "ACTIVO" ? "1" : "0";

    try {
      if (activeTab === "proveedores") {
        const payload = {
          id_cliente: item.id_cliente,
          nombre: item.nombre,
          ruc: item.ruc,
          direccion: item.direccion,
          representante_legal: item.representante_legal,
          pagina_web: item.pagina_web,
          activo: nextState === "ACTIVO"
        };
        await api.put("core/clientes/", payload);
        toast.success(`Estado del proveedor ${item.nombre} actualizado`);
      } else if (activeTab === "almacenes") {
        const newActivo = (item.activo === "1" || item.activo === 1) ? "0" : "1";
        const payload = {
          nombre: item.nombre,
          direccion: item.direccion,
          activo: newActivo,
          usuario_id_usuario: Number(item.usuario_id_usuario)
        };
        await api.patch(`logistica/almacenes/${item.idalmacen}/`, payload);
        toast.success(`Estado del almacén '${item.nombre}' ${newActivo === "1" ? "activado" : "desactivado"}`);
      } else if (activeTab === "grupo_analitico") {
        const payload = {
          idgrupo: item.idgrupo,
          descripcion: item.descripcion,
          activo: nextStateDb
        };
        await api.patch(`logistica/grupos-analiticos/${item.idgrupo}/`, payload);
        toast.success(`Estado del grupo analítico ${item.descripcion} actualizado`);
      } else if (activeTab === "productos") {
        const payload = {
          id_producto: item.id_producto,
          activo: nextState === "ACTIVO" ? 1 : 0
        };
        await api.put("core/productos/", payload);
        toast.success(`Estado del producto ${item.nombre} actualizado`);
      } else if (activeTab === "centros_costo") {
        const payload = {
          idcosto_almacen: item.idcosto_almacen,
          codigo: item.codigo,
          descripcion: item.descripcion,
          activo: nextStateDb
        };
        await api.patch(`logistica/centros-costo/${item.idcosto_almacen}/`, payload);
        toast.success(`Estado del centro de costo ${item.descripcion} actualizado`);
      } else if (activeTab === "documentos") {
        const payload = {
          iddocumento_almacen: item.iddocumento_almacen,
          descripcion: item.descripcion,
          activo: nextStateDb
        };
        await api.patch(`logistica/documentos/${item.iddocumento_almacen}/`, payload);
        toast.success(`Estado del documento ${item.descripcion} actualizado`);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(`Error al actualizar el estado del registro: ${err.response?.data?.error || err.message}`);
    }
  };

  // Guardar Formulario
  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (activeTab === "proveedores") {
        const payload = {
          nombre: formData.nombre,
          ruc: formData.ruc,
          direccion: formData.direccion || "Dirección",
          representante_legal: formData.representante_legal || "",
          pagina_web: formData.pagina_web || "",
          activo: formData.estado === "ACTIVO"
        };

        if (isEditMode) {
          payload.id_cliente = selectedItem.id_cliente;
          await api.put("core/clientes/", payload);
          toast.success("Proveedor actualizado correctamente");
        } else {
          await api.post("core/clientes/", payload);
          toast.success("Proveedor registrado correctamente");
        }
      } 
      else if (activeTab === "almacenes") {
        const payload = {
          nombre: formData.nombre,
          direccion: formData.direccion,
          activo: formData.estado === "ACTIVO" ? "1" : "0",
          usuario_id_usuario: formData.usuario_id_usuario ? Number(formData.usuario_id_usuario) : 1
        };

        if (isEditMode) {
          payload.idalmacen = selectedItem.idalmacen;
          await api.put(`logistica/almacenes/${selectedItem.idalmacen}/`, payload);
          toast.success("Almacén actualizado correctamente");
        } else {
          await api.post("logistica/almacenes/", payload);
          toast.success("Almacén registrado correctamente");
        }
      } 
      else if (activeTab === "grupo_analitico") {
        const payload = {
          descripcion: formData.descripcion,
          activo: formData.estado === "ACTIVO" ? "1" : "0"
        };

        if (isEditMode) {
          payload.idgrupo = selectedItem.idgrupo;
          await api.put(`logistica/grupos-analiticos/${selectedItem.idgrupo}/`, payload);
          toast.success("Grupo analítico actualizado correctamente");
        } else {
          await api.post("logistica/grupos-analiticos/crear/", payload);
          toast.success("Grupo analítico registrado correctamente");
        }
      } 
      else if (activeTab === "productos") {
        const payload = {
          codigo: formData.codigo,
          codigo2: formData.codigo2,
          nombre: formData.nombre,
          id_marca: formData.id_marca ? Number(formData.id_marca) : null,
          id_medida: formData.id_medida ? Number(formData.id_medida) : null,
          contenido_valor: formData.contenido_valor ? parseFloat(formData.contenido_valor) : 1.0,
          descripcion: formData.descripcion,
          precio_soles: formData.precio_soles ? parseFloat(formData.precio_soles) : 0.00,
          precio_dolares: formData.precio_dolares ? parseFloat(formData.precio_dolares) : 0.00,
          cantidad: formData.cantidad ? parseInt(formData.cantidad, 10) : 0,
          stock_min: formData.stock_min ? parseInt(formData.stock_min, 10) : 0,
          stock_max: formData.stock_max ? parseInt(formData.stock_max, 10) : 0,
          descuento: formData.descuento ? parseFloat(formData.descuento) : 0.00,
          proveedor: formData.proveedor,
          activo: formData.estado === "ACTIVO" ? 1 : 0
        };

        if (isEditMode) {
          payload.id_producto = selectedItem.id_producto;
          await api.put("core/productos/", payload);
          toast.success("Producto actualizado correctamente");
        } else {
          await api.post("core/productos/", payload);
          toast.success("Producto registrado correctamente");
        }
      } 
      else if (activeTab === "centros_costo") {
        const payload = {
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          activo: formData.estado === "ACTIVO" ? "1" : "0"
        };

        if (isEditMode) {
          payload.idcosto_almacen = selectedItem.idcosto_almacen;
          await api.put(`logistica/centros-costo/${selectedItem.idcosto_almacen}/`, payload);
          toast.success("Centro de costo actualizado correctamente");
        } else {
          await api.post("logistica/centros-costo/crear/", payload);
          toast.success("Centro de costo registrado correctamente");
        }
      } 
      else if (activeTab === "documentos") {
        const payload = {
          descripcion: formData.descripcion,
          activo: formData.estado === "ACTIVO" ? "1" : "0"
        };

        if (isEditMode) {
          payload.iddocumento_almacen = selectedItem.iddocumento_almacen;
          await api.put(`logistica/documentos/${selectedItem.iddocumento_almacen}/`, payload);
          toast.success("Documento actualizado correctamente");
        } else {
          await api.post("logistica/documentos/crear/", payload);
          toast.success("Documento registrado correctamente");
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Error al guardar el registro";
      toast.error(errorMsg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      if (activeTab === "proveedores") {
        await api.delete("core/clientes/", { data: { id_cliente: itemToDelete.id_cliente } });
        toast.success("Proveedor eliminado correctamente");
      } else if (activeTab === "almacenes") {
        await api.delete(`logistica/almacenes/${itemToDelete.idalmacen}/eliminar/`);
        toast.success("Almacén eliminado correctamente");
      } else if (activeTab === "grupo_analitico") {
        await api.delete(`logistica/grupos-analiticos/${itemToDelete.idgrupo}/eliminar/`);
        toast.success("Grupo analítico eliminado correctamente");
      } else if (activeTab === "productos") {
        await api.delete("core/productos/", { data: { id_producto: itemToDelete.id_producto } });
        toast.success("Producto eliminado correctamente");
      } else if (activeTab === "centros_costo") {
        await api.delete(`logistica/centros-costo/${itemToDelete.idcosto_almacen}/eliminar/`);
        toast.success("Centro de costo eliminado correctamente");
      } else if (activeTab === "documentos") {
        await api.delete(`logistica/documentos/${itemToDelete.iddocumento_almacen}/eliminar/`);
        toast.success("Documento eliminado correctamente");
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Error al eliminar el registro";
      toast.error(errorMsg);
    }
  };

  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const exportToExcel = () => {
    const dataToExport = getFilteredData();
    if (dataToExport.length === 0) {
      toast.warn("No hay datos filtrados para exportar");
      return;
    }

    let mappedData = [];
    const label = TABS.find(t => t.id === activeTab)?.label || "Reporte";
    const filename = `${activeTab}_reporte_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (activeTab === "proveedores") {
      mappedData = dataToExport.map(item => ({
        "Código": item.codigo,
        "Razón Social": item.nombre,
        "RUC": item.ruc,
        "Dirección": item.direccion,
        "Representante Legal": item.representante_legal || "-",
        "Pág. Web": item.pagina_web || "-",
        "Estado": item.estado
      }));
    } else if (activeTab === "almacenes") {
      mappedData = dataToExport.map(item => ({
        "ID Almacén": item.idalmacen,
        "Nombre Almacén": item.nombre,
        "Dirección": item.direccion || "-",
        "Responsable": item.responsable,
        "Estado": item.estado
      }));
    } else if (activeTab === "grupo_analitico") {
      mappedData = dataToExport.map(item => ({
        "ID Grupo": item.idgrupo,
        "Descripción": item.descripcion,
        "Estado": item.estado
      }));
    } else if (activeTab === "productos") {
      mappedData = dataToExport.map(item => ({
        "Código": item.codigo,
        "Código Auxiliar": item.codigo2 || "-",
        "Nombre / Descripción": item.nombre,
        "Marca": item.marca_nombre,
        "U.M.": item.medida_nombre,
        "Contenido": item.contenido_valor,
        "Precio Soles": item.precio_soles,
        "Precio Dólares": item.precio_dolares,
        "Stock": item.cantidad,
        "Stock Mínimo": item.stock_min,
        "Stock Máximo": item.stock_max,
        "Descuento (%)": item.descuento,
        "Proveedor": item.proveedor || "-",
        "Estado": item.estado
      }));
    } else if (activeTab === "centros_costo") {
      mappedData = dataToExport.map(item => ({
        "Código": item.codigo,
        "Nombre Centro Costo": item.descripcion,
        "Estado": item.estado
      }));
    } else if (activeTab === "documentos") {
      mappedData = dataToExport.map(item => ({
        "ID Doc": item.iddocumento_almacen,
        "Nombre Documento": item.descripcion,
        "Estado": item.estado
      }));
    }

    // Create Sheet
    const worksheet = XLSX.utils.json_to_sheet(mappedData);

    // Styling configuration
    const headerStyle = {
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "medium", color: { rgb: "312E81" } },
        left: { style: "thin", color: { rgb: "CBD5E1" } },
        right: { style: "thin", color: { rgb: "CBD5E1" } }
      }
    };

    const cellStyleEven = {
      font: { name: "Arial", sz: 9, color: { rgb: "1E293B" } },
      border: {
        top: { style: "thin", color: { rgb: "F1F5F9" } },
        bottom: { style: "thin", color: { rgb: "F1F5F9" } },
        left: { style: "thin", color: { rgb: "F1F5F9" } },
        right: { style: "thin", color: { rgb: "F1F5F9" } }
      }
    };

    const cellStyleOdd = {
      fill: { fgColor: { rgb: "F8FAFC" } }, // Zebra style (Slate-50)
      font: { name: "Arial", sz: 9, color: { rgb: "1E293B" } },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    worksheet["!rows"] = [{ hpx: 28 }]; // Header height

    for (let R = range.s.r; R <= range.e.r; ++R) {
      if (R > 0) worksheet["!rows"][R] = { hpx: 20 }; // Data row height

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = worksheet[cell_ref];
        if (!cell) continue;

        if (R === 0) {
          cell.s = headerStyle;
        } else {
          cell.s = R % 2 === 0 ? cellStyleEven : cellStyleOdd;

          if (typeof cell.v === "number") {
            cell.s = { ...cell.s, alignment: { horizontal: "right" } };
          } else if (cell.v === "ACTIVO" || cell.v === "INACTIVO") {
            cell.s = {
              ...cell.s,
              alignment: { horizontal: "center" },
              font: {
                ...cell.s.font,
                bold: true,
                color: { rgb: cell.v === "ACTIVO" ? "10B981" : "EF4444" } // Green / Red
              }
            };
          }
        }
      }
    }

    // Auto-fit column widths
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 12;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: R })];
        if (cell && cell.v) {
          maxLen = Math.max(maxLen, String(cell.v).length);
        }
      }
      colWidths.push({ wch: maxLen + 3 });
    }
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, label);
    XLSX.writeFile(workbook, filename);
    toast.success(`Reporte de Excel para ${label} exportado correctamente`);
  };

  const exportToPDF = () => {
    const dataToExport = getFilteredData();
    if (dataToExport.length === 0) {
      toast.warn("No hay datos filtrados para exportar");
      return;
    }

    const doc = new jsPDF();
    const label = TABS.find(t => t.id === activeTab)?.label || "Logística";
    const title = `Reporte de ${label}`;
    
    // Top banner header style
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, 220, 38, "F");

    // Title text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(`REPORTE DE ${label.toUpperCase()}`, 14, 18);
    
    // Date and subtitle info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(224, 231, 255); // Indigo-100
    const dateStr = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
    doc.text(`Generado: ${dateStr} | Total registros: ${dataToExport.length}`, 14, 28);

    let columns = [];
    let rows = [];

    if (activeTab === "proveedores") {
      columns = ["Código", "Razón Social", "RUC", "Dirección", "Estado"];
      rows = dataToExport.map(item => [item.codigo, item.nombre, item.ruc, item.direccion || "-", item.estado]);
    } else if (activeTab === "almacenes") {
      columns = ["ID", "Nombre Almacén", "Ubicación / Dirección", "Responsable", "Estado"];
      rows = dataToExport.map(item => [item.idalmacen, item.nombre, item.direccion || "-", item.responsable, item.estado]);
    } else if (activeTab === "grupo_analitico") {
      columns = ["ID Grupo", "Descripción", "Estado"];
      rows = dataToExport.map(item => [item.idgrupo, item.descripcion, item.estado]);
    } else if (activeTab === "productos") {
      columns = ["Código", "Descripción", "Marca", "U.M.", "Stock", "Precio S/.", "Estado"];
      rows = dataToExport.map(item => [
        item.codigo, 
        item.nombre, 
        item.marca_nombre, 
        item.medida_nombre, 
        item.cantidad, 
        `S/. ${parseFloat(item.precio_soles).toFixed(2)}`, 
        item.estado
      ]);
    } else if (activeTab === "centros_costo") {
      columns = ["Código", "Nombre Centro Costo", "Estado"];
      rows = dataToExport.map(item => [item.codigo, item.descripcion, item.estado]);
    } else if (activeTab === "documentos") {
      columns = ["ID Doc", "Nombre Documento", "Estado"];
      rows = dataToExport.map(item => [item.iddocumento_almacen, item.descripcion, item.estado]);
    }

    autoTable(doc, {
      startY: 46,
      head: [columns],
      body: rows,
      theme: 'striped',
      headStyles: { 
        fillColor: [67, 56, 202], // Indigo-700
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 8, 
        textColor: [30, 41, 59] // Slate-800
      },
      columnStyles: {
        0: { halign: 'center' },
        [columns.length - 1]: { halign: 'center' }
      },
      didParseCell: function (data) {
        if (data.column.index === columns.length - 1 && data.cell.section === 'body') {
          if (data.cell.raw === 'ACTIVO') {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald-500
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'INACTIVO') {
            data.cell.styles.textColor = [239, 68, 68]; // Red-500
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { top: 46 }
    });

    doc.save(`${activeTab}_reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`Reporte de PDF para ${label} exportado correctamente`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tablas de Logística</h1>
          <p className="text-sm text-gray-500 font-medium">Mantenimiento de tablas auxiliares y maestros de inventario</p>
        </div>

        {/* Selector de pestañas */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-sm max-w-full overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caja Principal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        
        {/* Barra de Herramientas de la Tabla */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="flex flex-wrap flex-1 max-w-2xl items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder={`Buscar en ${TABS.find(t => t.id === activeTab)?.label}...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-xl transition-all whitespace-nowrap"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Botones de Acción / Reportes */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-2 px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
              title="Exportar reporte PDF filtrado"
            >
              <Download size={14} />
              PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
              title="Exportar reporte Excel filtrado"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm ml-1"
            >
              <PlusCircle size={16} />
              Nuevo Registro
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
              <Loader className="animate-spin text-indigo-600" size={24} />
              <span className="text-xs font-bold uppercase tracking-widest">Cargando datos...</span>
            </div>
          ) : getFilteredData().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
              <ShieldAlert size={32} className="text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-widest">No se encontraron registros</span>
            </div>
          ) : (
            <>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    {activeTab === "proveedores" && (
                      <>
                        <th className="px-6 py-3">Código</th>
                        <th className="px-6 py-3">Razón Social</th>
                        <th className="px-6 py-3">RUC</th>
                        <th className="px-6 py-3">Dirección</th>
                        <th className="px-6 py-3">Representante</th>
                        <th className="px-6 py-3">Pág. Web</th>
                      </>
                    )}
                    {activeTab === "almacenes" && (
                      <>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Nombre Almacén</th>
                        <th className="px-6 py-3">Dirección</th>
                        <th className="px-6 py-3">Responsable (User)</th>
                      </>
                    )}
                    {activeTab === "grupo_analitico" && (
                      <>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Nombre Grupo</th>
                      </>
                    )}
                    {activeTab === "productos" && (
                      <>
                        <th className="px-6 py-3">Código</th>
                        <th className="px-6 py-3">Código Alternativo</th>
                        <th className="px-6 py-3">Descripción Producto</th>
                        <th className="px-6 py-3">Marca</th>
                        <th className="px-6 py-3 text-center">UM</th>
                        <th className="px-6 py-3 text-right">Stock</th>
                        <th className="px-6 py-3 text-right">P. Soles</th>
                        <th className="px-6 py-3 text-right">P. Dólares</th>
                        <th className="px-6 py-3">Proveedor</th>
                      </>
                    )}
                    {activeTab === "centros_costo" && (
                      <>
                        <th className="px-6 py-3">Código</th>
                        <th className="px-6 py-3">Nombre Centro Costo</th>
                      </>
                    )}
                    {activeTab === "documentos" && (
                      <>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Tipo Documento</th>
                      </>
                    )}
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {(() => {
                    const filteredData = getFilteredData();
                    const totalItems = filteredData.length;
                    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                    const indexOfLastItem = currentPage * itemsPerPage;
                    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

                    return currentItems.map((item, idx) => {
                      const isItemActive = item.estado === "ACTIVO";
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          {activeTab === "proveedores" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.codigo}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{item.nombre}</td>
                              <td className="px-6 py-4 font-medium">{item.ruc}</td>
                              <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{item.direccion}</td>
                              <td className="px-6 py-4 text-gray-600">{item.representante_legal || "-"}</td>
                              <td className="px-6 py-4 text-gray-500 max-w-[150px] truncate">{item.pagina_web || "-"}</td>
                            </>
                          )}
                          {activeTab === "almacenes" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.idalmacen}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{item.nombre}</td>
                              <td className="px-6 py-4 text-gray-500">{item.direccion}</td>
                              <td className="px-6 py-4 text-gray-600 font-bold">{item.responsable}</td>
                            </>
                          )}
                          {activeTab === "grupo_analitico" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.idgrupo}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{item.descripcion}</td>
                            </>
                          )}
                          {activeTab === "productos" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.codigo}</td>
                              <td className="px-6 py-4 font-mono text-gray-500">{item.codigo2 || "-"}</td>
                              <td className="px-6 py-4 font-bold text-slate-800 max-w-[280px] truncate" title={item.nombre}>{item.nombre}</td>
                              <td className="px-6 py-4 text-gray-500">{item.marca_nombre}</td>
                              <td className="px-6 py-4 font-mono text-center">{item.medida_nombre}</td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{item.cantidad}</td>
                              <td className="px-6 py-4 text-right font-mono">S/. {Number(item.precio_soles).toFixed(2)}</td>
                              <td className="px-6 py-4 text-right font-mono">$ {Number(item.precio_dolares).toFixed(2)}</td>
                              <td className="px-6 py-4 text-gray-500">{item.proveedor || "-"}</td>
                            </>
                          )}
                          {activeTab === "centros_costo" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.codigo}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{item.descripcion}</td>
                            </>
                          )}
                          {activeTab === "documentos" && (
                            <>
                              <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.iddocumento_almacen}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{item.descripcion}</td>
                            </>
                          )}
                          
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                              isItemActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                            }`}>
                              {item.estado}
                            </span>
                          </td>

                          {/* Botones de Acción */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-all"
                                title="Editar Registro"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleState(item)}
                                className={`p-1.5 hover:bg-slate-100 rounded-lg transition-all ${
                                  isItemActive ? "text-slate-400 hover:text-rose-500" : "text-emerald-500 hover:text-emerald-600"
                                }`}
                                title={isItemActive ? "Desactivar Registro" : "Activar Registro"}
                              >
                                {isItemActive ? <X size={14} /> : <Check size={14} />}
                              </button>
                              <button
                                onClick={() => handleOpenDelete(item)}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                title="Eliminar Registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {/* Controles de Paginación */}
              {(() => {
                const filteredData = getFilteredData();
                const totalItems = filteredData.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                const indexOfLastItem = currentPage * itemsPerPage;
                const indexOfFirstItem = indexOfLastItem - itemsPerPage;

                return (
                  <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50 rounded-b-xl">
                    <span className="text-xs font-semibold text-gray-500">
                      Mostrando <span className="font-bold text-gray-700">{indexOfFirstItem + 1}</span> a{" "}
                      <span className="font-bold text-gray-700">
                        {Math.min(indexOfLastItem, totalItems)}
                      </span>{" "}
                      de <span className="font-bold text-gray-700">{totalItems}</span> registros
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-all"
                      >
                        Anterior
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="text-gray-400 text-xs">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                currentPage === page
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-all"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Modal Agregar / Editar Dinámico */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {isEditMode ? "Editar Registro" : "Nuevo Registro"} - {TABS.find(t => t.id === activeTab)?.label}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {activeTab === "proveedores" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Código</label>
                      <input 
                        type="text" 
                        required
                        disabled={true}
                        value={isEditMode ? (formData.codigo || "") : "Auto-generado"}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 disabled:opacity-70 font-mono" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">RUC</label>
                      <input 
                        type="text" 
                        required
                        maxLength={11}
                        pattern="\d{11}"
                        value={formData.ruc || ""} 
                        onChange={e => setFormData({ ...formData, ruc: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Razón Social / Nombre</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nombre || ""} 
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Dirección Fiscal</label>
                    <input 
                      type="text" 
                      value={formData.direccion || ""} 
                      onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Representante Legal</label>
                      <input 
                        type="text" 
                        value={formData.representante_legal || ""} 
                        onChange={e => setFormData({ ...formData, representante_legal: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Página Web</label>
                      <input 
                        type="text" 
                        value={formData.pagina_web || ""} 
                        onChange={e => setFormData({ ...formData, pagina_web: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "almacenes" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Nombre Almacén</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nombre || ""} 
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Ubicación / Dirección</label>
                    <input 
                      type="text" 
                      value={formData.direccion || ""} 
                      onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Responsable / Supervisor (User)</label>
                    <select 
                      required
                      value={Number(formData.usuario_id_usuario) || ""} 
                      onChange={e => setFormData({ ...formData, usuario_id_usuario: Number(e.target.value) })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">Seleccione Responsable</option>
                      {usuarios.map(u => (
                        <option key={u.id_usuario} value={Number(u.id_usuario)}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeTab === "grupo_analitico" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Nombre Grupo / Descripción</label>
                    <input 
                      type="text" 
                      required
                      value={formData.descripcion || ""} 
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                </>
              )}

              {activeTab === "productos" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Código Item</label>
                      <input 
                        type="text" 
                        required
                        value={formData.codigo || ""} 
                        onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Código Alternativo</label>
                      <input 
                        type="text" 
                        value={formData.codigo2 || ""} 
                        onChange={e => setFormData({ ...formData, codigo2: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Descripción / Nombre del Producto</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nombre || ""} 
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Marca</label>
                      <select 
                        required
                        value={formData.id_marca || ""} 
                        onChange={e => setFormData({ ...formData, id_marca: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      >
                        <option value="">Seleccione Marca</option>
                        {marcas.map(m => (
                          <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Unidad de Medida</label>
                      <select 
                        required
                        value={formData.id_medida || ""} 
                        onChange={e => setFormData({ ...formData, id_medida: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      >
                        <option value="">Seleccione U.M.</option>
                        {unidadesMedida.map(u => (
                          <option key={u.id_medida} value={u.id_medida}>{u.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Contenido Valor</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={formData.contenido_valor || 1.0} 
                        onChange={e => setFormData({ ...formData, contenido_valor: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Precio Soles</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={formData.precio_soles || 0.0} 
                        onChange={e => setFormData({ ...formData, precio_soles: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Precio Dólares</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={formData.precio_dolares || 0.0} 
                        onChange={e => setFormData({ ...formData, precio_dolares: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Cantidad / Stock</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.cantidad || 0} 
                        onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Stock Mínimo</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.stock_min || 0} 
                        onChange={e => setFormData({ ...formData, stock_min: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Stock Máximo</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.stock_max || 0} 
                        onChange={e => setFormData({ ...formData, stock_max: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Descuento (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.descuento || 0.0} 
                        onChange={e => setFormData({ ...formData, descuento: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase">Proveedor</label>
                      <input 
                        type="text" 
                        value={formData.proveedor || ""} 
                        onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Detalles / Descripción Detallada</label>
                    <textarea 
                      value={formData.descripcion || ""} 
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" 
                      rows={2}
                    />
                  </div>
                </>
              )}

              {activeTab === "centros_costo" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Código Centro Costo</label>
                    <input 
                      type="text" 
                      required
                      value={formData.codigo || ""} 
                      onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Nombre Centro Costo</label>
                    <input 
                      type="text" 
                      required
                      value={formData.descripcion || ""} 
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                </>
              )}

              {activeTab === "documentos" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Descripción / Tipo de Documento</label>
                    <input 
                      type="text" 
                      required
                      value={formData.descripcion || ""} 
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2" 
                    />
                  </div>
                </>
              )}

              {/* Selector de Estado */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase">Estado Registro</label>
                <select 
                  value={formData.estado || ""} 
                  onChange={e => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="ACTIVO">Activo / Operativo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              {/* Botones de Formulario */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Confirmar Eliminación</h3>
                <p className="text-xs text-gray-500 font-semibold">
                  ¿Está seguro de que desea eliminar permanentemente este registro de la base de datos?
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Confirmar Borrado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

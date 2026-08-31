import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import api from '@/services/api';
import { toast } from '../utils/toast';
import XLSX from 'xlsx-js-style';
import { calcularItemSegunProveedor, resolverEndpointPorCodigo } from '@/dashboard/Suministros/tables/tablaUtils';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export const recalculateGroupSuministrosValues = (grupo, tipoVenta) => {
  const items = grupo.items || [];
  const cantidadGrupo = Number(grupo.cantidad || 1);
  
  let groupCostoEnvio = 0;
  if (tipoVenta === "P") {
    groupCostoEnvio = Number(grupo.costo_envio_unidad !== undefined && grupo.costo_envio_unidad !== null ? grupo.costo_envio_unidad : (grupo.costo_envio || 0));
  } else if (tipoVenta === "T") {
    groupCostoEnvio = Number(grupo.costo_envio_total !== undefined && grupo.costo_envio_total !== null ? grupo.costo_envio_total : (grupo.costo_envio || 0));
  } else {
    groupCostoEnvio = Number(grupo.costo_envio || 0);
  }

  // 1. Calcular totalCostoItems
  const totalCostoItems = items.reduce((acc, it) => acc + (Number(it.costo_precio || 0) * Number(it.cantidad || 0)), 0);

  // 2. Recalcular cada ítem
  const recalculatedItems = items.map(item => {
    const nextItem = { ...item };
    const cantidad = Number(nextItem.cantidad || 0);
    const costoPrecio = Number(nextItem.costo_precio || 0);

    let costoEnvio = 0;
    let porcentajeEnvio = 0;

    if (tipoVenta === "P") {
      costoEnvio = cantidad > 0 ? groupCostoEnvio / cantidad : 0;
      porcentajeEnvio = costoPrecio > 0 ? ((costoEnvio / costoPrecio) * 100) : 0;
    } else if (tipoVenta === "T") {
      porcentajeEnvio = totalCostoItems > 0 ? (costoPrecio / totalCostoItems) * 100 : 0;
      costoEnvio = (porcentajeEnvio / 100) * groupCostoEnvio;
    }

    const costoConEnvio = costoPrecio + costoEnvio;
    nextItem.costo_envio = Number(costoEnvio.toFixed(2));
    nextItem.porcentaje_envio = Number(porcentajeEnvio.toFixed(2));
    nextItem.costo_con_envio = Number(costoConEnvio.toFixed(2));
    nextItem.costo_envio_unidad = nextItem.costo_envio;
    nextItem.costo_envio_total = Number((costoEnvio * cantidad).toFixed(2));

    // Utilidad
    let porcentajeUtil = Number(nextItem.porcentaje_utilidad || 0);
    let utilidadUnit = (costoConEnvio * porcentajeUtil) / 100;
    nextItem.utilidad = Number(utilidadUnit.toFixed(2));

    // Precio venta & venta total
    const ventaPrecio = costoConEnvio + nextItem.utilidad;
    nextItem.precio_venta = Number(ventaPrecio.toFixed(2));
    nextItem.venta_total = Number((ventaPrecio * cantidad).toFixed(2));
    nextItem.costo_total = Number((costoPrecio * cantidad).toFixed(2));

    return nextItem;
  });

  const totalVentaItems = recalculatedItems.reduce((acc, curr) => acc + Number(curr.venta_total || 0), 0);
  const venta_total = totalVentaItems * cantidadGrupo;

  return {
    ...grupo,
    costo_envio: groupCostoEnvio,
    costo_envio_total: tipoVenta === "T" ? groupCostoEnvio : (grupo.costo_envio_total || 0),
    costo_envio_unidad: tipoVenta === "P" ? groupCostoEnvio : (grupo.costo_envio_unidad || 0),
    venta_total,
    items: recalculatedItems
  };
};

export const useCotizacionSuministros = (numReg, onAddLog) => {
  const [gruposSuministros, setGruposSuministros] = useState({});
  const [originalGruposSuministros, setOriginalGruposSuministros] = useState({});
  const [deletedSuministroIds, setDeletedSuministroIds] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const isSavingRef = useRef(false);

  const isSuministrosDirty = useMemo(() => {
    return JSON.stringify(gruposSuministros) !== JSON.stringify(originalGruposSuministros) || deletedSuministroIds.length > 0;
  }, [gruposSuministros, originalGruposSuministros, deletedSuministroIds]);

  const fetchProveedores = useCallback(async () => {
    try {
      const res = await api.get("/core/tipo_marca/");
      setProveedores(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error cargando proveedores", err);
      setProveedores([]);
    }
  }, []);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);


  const mapSuministrosBackendToState = useCallback((rows = []) => {
    const estructura = {};

    if (!Array.isArray(rows) || rows.length === 0) return estructura;

    rows.forEach((row) => {
      const grupoId = row.codigo_grupo || row.cog;

      if (!estructura[grupoId]) {
        estructura[grupoId] = {
          id: row.id_suministro,
          codigo_grupo: grupoId,
          nombre_grupo: row.nombre_grupo || row.nog || "",
          venta_total: 0,
          cantidad: 0,
          orden: row.orden || 0,
          items: []
        };
      }

      if (row.nivel === 0 || row.nig === 0) {
        estructura[grupoId].id = row.id_suministro;
        estructura[grupoId].nombre_grupo = row.nombre_grupo || row.nog;
        estructura[grupoId].venta_total = Number(row.venta_total || row.tot || 0);
        estructura[grupoId].cantidad = Number(row.cantidad || row.can || 0);
        estructura[grupoId].orden = row.orden || 0;
        estructura[grupoId].costo_envio = Number(row.costo_envio || row.cost_env || 0);
        estructura[grupoId].costo_envio_total = Number(row.costo_envio_total || row.env_tot || 0);
        estructura[grupoId].costo_envio_unidad = Number(row.costo_envio_unidad || row.env_par || 0);
        estructura[grupoId].total_por_grupo = row.total_por_grupo;
      } else {
        estructura[grupoId].items.push({
          ...row,
          cantidad: Number(row.cantidad || row.can || 0),
          precio_venta: Number(row.precio_venta || row.val || 0),
          venta_total: Number(row.venta_total || row.tot || 0),
        });
      }
    });

    return estructura;
  }, []);

  const fetchSuministros = useCallback(async () => {
    if (!numReg) return;
    try {
      const res = await api.get(`cotizaciones/lista_suministros/${numReg}/`);
      const dataPlana = Array.isArray(res.data) ? res.data : (res.data?.suministros || []);
      const mapped = mapSuministrosBackendToState(dataPlana);
      setGruposSuministros(mapped);
      setOriginalGruposSuministros(JSON.parse(JSON.stringify(mapped)));
      setDeletedSuministroIds([]);
    } catch (error) {
      console.error("Error cargando suministros:", error);
      toast.error("Error al sincronizar suministros");
    }
  }, [numReg, mapSuministrosBackendToState]);

  useEffect(() => {
    fetchSuministros();
  }, [fetchSuministros]);

  const handleCalcularTotalGrupo = useCallback((codigo_grupo, customItems = null) => {
    setGruposSuministros(prev => {
      const next = { ...prev };
      const grupo = next[codigo_grupo];
      if (!grupo) return prev;

      const cantidadGrupo = parseFloat(grupo.cantidad || 0);
      const itemsToSum = customItems || grupo.items || [];
      const sumaItems = itemsToSum.reduce((acc, item) => acc + parseFloat(item.venta_total || 0), 0);
      const nuevoTotal = sumaItems * cantidadGrupo;

      next[codigo_grupo] = {
        ...grupo,
        venta_total: nuevoTotal,
        items: itemsToSum
      };
      return next;
    });
  }, []);

  const handleAgregarGrupoSuministro = useCallback((form, setOpenGrupoModal, tipoVenta = null) => {
    const isEdit = Boolean(form._key && gruposSuministros[form._key]);

    setGruposSuministros(prev => {
      const next = { ...prev };
      if (isEdit) {
        const grupo = next[form._key];
        const nextGroup = {
          ...grupo,
          nombre_grupo: form.nombre.toUpperCase(),
          cantidad: Number(form.cantidad),
          costo_envio: Number(form.costoEnvio || 0),
          costo_envio_total: tipoVenta === "T" ? Number(form.costoEnvio || 0) : (grupo.costo_envio_total || 0),
          costo_envio_unidad: tipoVenta === "P" ? Number(form.costoEnvio || 0) : (grupo.costo_envio_unidad || 0),
          items: grupo.items || []
        };
        next[form._key] = recalculateGroupSuministrosValues(nextGroup, tipoVenta);
      } else {
        const existentes = Object.keys(prev)
          .map(k => parseInt(k, 10))
          .filter(n => !isNaN(n));
        const maxContador = existentes.length > 0 ? Math.max(...existentes) : 0;
        const nuevoCodigo = maxContador + 1;
        const tempId = `temp_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newItems = (form.items || []).map((item, idx) => {
          const tempItemId = `temp_item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
          return {
            id_suministro: tempItemId,
            id_registro: numReg,
            codigo_grupo: nuevoCodigo,
            nivel: 1,
            codigo_item: (item.codigo_item || "S/C").toUpperCase(),
            descripcion: (item.descripcion || "S/D").toUpperCase(),
            cantidad: Number(item.cantidad || 0),
            id_marca: item.id_marca || null,
            proveedor: item.proveedor || "",
            id_tipo_gasto: 1,
            observacion: item.observacion || "",
            costo_precio: Number(item.costo_precio || item.costoPrecio || 0),
            porcentaje_utilidad: Number(item.porcentaje_utilidad || item.porcentaje || 20),
            tipo_unidad: item.tipo_unidad || "UNI"
          };
        });

        const existentesOrden = [];
        Object.values(prev).forEach(g => {
          if (g.orden) existentesOrden.push(g.orden);
          if (g.items && Array.isArray(g.items)) {
            g.items.forEach(it => {
              if (it.orden) existentesOrden.push(it.orden);
            });
          }
        });
        const maxOrden = existentesOrden.length > 0 ? Math.max(...existentesOrden) : 0;
        const nuevoOrden = maxOrden + 1;

        const newGroupRaw = {
          id: tempId,
          codigo_grupo: nuevoCodigo,
          nombre_grupo: form.nombre.toUpperCase(),
          cantidad: Number(form.cantidad),
          orden: nuevoOrden,
          items: newItems,
          costo_envio: Number(form.costoEnvio || 0),
          costo_envio_total: tipoVenta === "T" ? Number(form.costoEnvio || 0) : 0,
          costo_envio_unidad: tipoVenta === "P" ? Number(form.costoEnvio || 0) : 0
        };

        next[nuevoCodigo] = recalculateGroupSuministrosValues(newGroupRaw, tipoVenta);
      }
      return next;
    });

    if (setOpenGrupoModal) setOpenGrupoModal(false);
    toast.add(isEdit ? "Suministro actualizado correctamente" : `Suministro "${form.nombre.toUpperCase()}" creado`, isEdit ? "SUMINISTRO ACTUALIZADO" : "SUMINISTRO GUARDADO");
    
    if (onAddLog) {
      onAddLog(isEdit ? `Suministros: Se editó el suministro '${form.nombre.toUpperCase()}'` : `Suministros: Se agregó el suministro '${form.nombre.toUpperCase()}'`);
    }

    return true;
  }, [gruposSuministros, numReg, onAddLog]);

  const handleAgregarItem = useCallback((form, grupoActivo, setOpenItemModal, tipoVenta = null) => {
    const activeGrupoKey = form.cog_override || grupoActivo;
    const isEdit = Boolean(form.id_suministro);

    setGruposSuministros(prev => {
      const next = { ...prev };
      const grupo = next[activeGrupoKey];
      let nuevoOrden = 0;
      if (!isEdit) {
        const existentesOrden = [];
        Object.values(prev).forEach(g => {
          if (g.orden) existentesOrden.push(g.orden);
          if (g.items && Array.isArray(g.items)) {
            g.items.forEach(it => {
              if (it.orden) existentesOrden.push(it.orden);
            });
          }
        });
        const maxOrden = existentesOrden.length > 0 ? Math.max(...existentesOrden) : 0;
        nuevoOrden = maxOrden + 1;
      }

      const payload = {
        id_suministro: isEdit ? form.id_suministro : `temp_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        id_registro: numReg,
        codigo_grupo: parseInt(activeGrupoKey, 10) || 1,
        nivel: 1,
        codigo_item: (form.codigo_item || form.codigo || "S/C").toUpperCase(),
        descripcion: (form.descripcion || "S/D").toUpperCase(),
        cantidad: Number(form.cantidad || 0),
        costo_precio: Number(form.costo_precio || form.costoPrecio || 0),
        porcentaje_utilidad: Number(form.porcentaje_utilidad || form.porcentaje || 0),
        utilidad: Number(form.utilidad || 0),
        precio_venta: Number(form.precio_venta || form.ventaPrecio || 0),
        venta_total: Number(form.venta_total || form.ventaTotal || 0),
        id_marca: form.id_marca || null,
        proveedor: form.proveedor || "",
        id_tipo_gasto: 1,
        observacion: form.observacion || "",
        tipo_unidad: form.tipo_unidad || form.unidad || "UNI",
        costo_envio: Number(form.costo_envio || 0),
        porcentaje_envio: Number(form.porcentaje_envio || 0),
        costo_con_envio: Number(form.costo_con_envio || 0),
        tiempo_entrega: form.tiempo_entrega ? Number(form.tiempo_entrega) : null,
        id_unidad_tiempo_entrega: form.id_unidad_tiempo_entrega || null,
        orden: isEdit ? form.orden : nuevoOrden
      };

      let nextItems = [];
      if (isEdit) {
        nextItems = (grupo.items || []).map(item => item.id_suministro === form.id_suministro ? payload : item);
      } else {
        nextItems = [...(grupo.items || []), payload];
      }

      const rawGroup = {
        ...grupo,
        items: nextItems
      };
      next[activeGrupoKey] = recalculateGroupSuministrosValues(rawGroup, tipoVenta);
      return next;
    });

    if (setOpenItemModal) setOpenItemModal(false);
    toast.add(isEdit ? `Ítem "${form.descripcion.toUpperCase()}" actualizado` : `Ítem "${form.descripcion.toUpperCase()}" añadido`, isEdit ? "ÍTEM ACTUALIZADO" : "ÍTEM AGREGADO");
    
    if (onAddLog) {
      const grupo = gruposSuministros[activeGrupoKey];
      const nom_padre = grupo?.nombre_grupo || "";
      const codigo_item = (form.codigo_item || form.codigo || "S/C").toUpperCase();
      const descripcion = (form.descripcion || "S/D").toUpperCase();
      onAddLog(isEdit ? `Suministros: Se editó el ítem '${codigo_item} - ${descripcion}' - ${nom_padre}` : `Suministros: Se agregó el ítem '${codigo_item} - ${descripcion}' - ${nom_padre}`);
    }

    return true;
  }, [gruposSuministros, numReg, onAddLog]);

  const saveEditItem = useCallback((editingItemId, editForm, setEditingItemId, tipoVenta = null) => {
    let foundGroupKey = null;
    setGruposSuministros(prev => {
      const next = { ...prev };
      let existingItem = null;

      Object.entries(prev).forEach(([key, gp]) => {
        const found = gp.items?.find(it => it.id_suministro === editingItemId);
        if (found) {
          foundGroupKey = key;
          existingItem = found;
        }
      });

      if (!foundGroupKey) return prev;

      const payload = {
        ...existingItem,
        codigo_item: editForm.codigo_item,
        descripcion: editForm.descripcion,
        cantidad: Number(editForm.cantidad),
        costo_precio: Number(editForm.costo_precio || editForm.costoPrecio || 0),
        porcentaje_utilidad: Number(editForm.porcentaje_utilidad || editForm.porcentaje || 0),
        utilidad: Number(editForm.utilidad || 0),
        precio_venta: Number(editForm.precio_venta || editForm.ventaPrecio || 0),
        venta_total: Number(editForm.venta_total || editForm.ventaTotal || 0),
        id_marca: editForm.id_marca || null,
        proveedor: editForm.proveedor || "",
        tipo_unidad: editForm.tipo_unidad || editForm.unidad || "UNI",
        observacion: editForm.observacion || "",
        costo_envio: Number(editForm.costo_envio || 0),
        porcentaje_envio: Number(editForm.porcentaje_envio || 0),
        costo_con_envio: Number(editForm.costo_con_envio || 0),
        tiempo_entrega: editForm.tiempo_entrega ? Number(editForm.tiempo_entrega) : null,
        id_unidad_tiempo_entrega: editForm.id_unidad_tiempo_entrega || null
      };

      const grupo = next[foundGroupKey];
      const nextItems = grupo.items.map(item => item.id_suministro === editingItemId ? payload : item);

      const rawGroup = {
        ...grupo,
        items: nextItems
      };
      next[foundGroupKey] = recalculateGroupSuministrosValues(rawGroup, tipoVenta);
      return next;
    });

    if (setEditingItemId) setEditingItemId(null);
    toast.update(`Ítem "${editForm.descripcion.toUpperCase()}" actualizado`, "ÍTEM ACTUALIZADO");
    
    if (onAddLog && foundGroupKey) {
      const grupo = gruposSuministros[foundGroupKey];
      const nom_padre = grupo?.nombre_grupo || "";
      const codigo_item = (editForm.codigo_item || "S/C").toUpperCase();
      const descripcion = (editForm.descripcion || "S/D").toUpperCase();
      onAddLog(`Suministros: Se editó el ítem '${codigo_item} - ${descripcion}' - ${nom_padre}`);
    }

    return true;
  }, [gruposSuministros, onAddLog]);

  const handleDuplicarGrupo = useCallback((cogOriginal) => {
    const grupo = gruposSuministros[cogOriginal];
    if (!grupo) return;

    setGruposSuministros(prev => {
      const next = { ...prev };
      const existentes = Object.keys(prev)
        .map(k => parseInt(k, 10))
        .filter(n => !isNaN(n));
      const maxContador = existentes.length > 0 ? Math.max(...existentes) : 0;
      const nuevoCog = maxContador + 1;
      const tempGroupId = `temp_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const existentesOrden = [];
      Object.values(prev).forEach(g => {
        if (g.orden) existentesOrden.push(g.orden);
        if (g.items && Array.isArray(g.items)) {
          g.items.forEach(it => {
            if (it.orden) existentesOrden.push(it.orden);
          });
        }
      });
      const maxOrden = existentesOrden.length > 0 ? Math.max(...existentesOrden) : 0;
      const nuevoOrden = maxOrden + 1;

      let itemCounter = nuevoOrden + 1;
      const newItems = (grupo.items || []).map((item, idx) => {
        const tempItemId = `temp_item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          ...item,
          id_suministro: tempItemId,
          codigo_grupo: nuevoCog,
          orden: itemCounter++
        };
      });

      next[nuevoCog] = {
        id: tempGroupId,
        codigo_grupo: nuevoCog,
        nombre_grupo: `${grupo.nombre_grupo} - COPIA`,
        venta_total: grupo.venta_total,
        cantidad: grupo.cantidad,
        orden: nuevoOrden,
        items: newItems
      };
      return next;
    });

    toast.add("Grupo de suministros duplicado", "GRUPO DUPLICADO");
  }, [gruposSuministros]);

  const handleEliminarGrupo = useCallback((codigo_grupo) => {
    const grupo = gruposSuministros[codigo_grupo];
    if (!grupo) return;

    if (!confirm(`¿Está seguro de eliminar el suministro "${grupo.nombre_grupo}" y todos sus ítems asociados?`)) {
      return;
    }

    const toDelete = [];
    if (typeof grupo.id !== 'string' || !grupo.id.startsWith('temp_')) {
      toDelete.push(grupo.id);
    }

    if (toDelete.length > 0) {
      setDeletedSuministroIds(prev => [...prev, ...toDelete]);
    }

    setGruposSuministros(prev => {
      const next = { ...prev };
      delete next[codigo_grupo];
      return next;
    });

    toast.delete(`Suministro "${grupo.nombre_grupo}" eliminado`, "SUMINISTRO ELIMINADO");
    
    if (onAddLog) {
      onAddLog(`Suministros: Se eliminó el suministro '${grupo.nombre_grupo}'`);
    }
  }, [gruposSuministros, onAddLog]);

  const handleEliminarItem = useCallback((itemId, codigo_grupo, tipoVenta = null, skipConfirm = false) => {
    const grupo = gruposSuministros[codigo_grupo];
    const item = grupo?.items?.find(it => it.id_suministro === itemId);
    const desc = item?.descripcion ? ` "${item.descripcion}"` : "";

    if (!skipConfirm && !confirm(`¿Está seguro de eliminar el ítem${desc}?`)) {
      return;
    }

    if (typeof itemId !== 'string' || !itemId.startsWith('temp_')) {
      setDeletedSuministroIds(prev => [...prev, itemId]);
    }

    setGruposSuministros(prev => {
      const next = { ...prev };
      const gp = next[codigo_grupo];
      if (!gp) return prev;

      const remainingItems = (gp.items || []).filter(it => it.id_suministro !== itemId);
      const rawGroup = {
        ...gp,
        items: remainingItems
      };
      next[codigo_grupo] = recalculateGroupSuministrosValues(rawGroup, tipoVenta);
      return next;
    });

    if (!skipConfirm) {
      toast.delete(`Ítem${desc} eliminado correctamente`, "ÍTEM ELIMINADO");
    }
    
    if (onAddLog && item) {
      const nom_padre = grupo?.nombre_grupo || "";
      const codigo_item = (item.codigo_item || "S/C").toUpperCase();
      const descripcion = (item.descripcion || "S/D").toUpperCase();
      onAddLog(`Suministros: Se eliminó el ítem '${codigo_item} - ${descripcion}' - ${nom_padre}`);
    }
  }, [gruposSuministros, onAddLog]);

  const saveSuministros = async (ocultarMap = {}) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      // Sincronizar total_por_grupo desde ocultarMap antes de guardar
      for (const gp of Object.values(gruposSuministros)) {
        if (ocultarMap[gp.codigo_grupo] !== undefined) {
          gp.total_por_grupo = ocultarMap[gp.codigo_grupo] ? 1 : 0;
        }
      }

      if (deletedSuministroIds.length > 0) {
        for (const id of deletedSuministroIds) {
          try {
            await api.delete(`cotizaciones/lista_suministros/${numReg}/`, { params: { id_suministro: id } });
          } catch (err) {
            if (err.response && err.response.status === 404) {
              console.log(`Suministro ${id} ya estaba eliminado (404).`);
              continue;
            }
            throw err;
          }
        }
      }

      const toDec = (val) => {
        if (val === undefined || val === null || val === "" || isNaN(val) || val === "null" || val === "undefined") {
          return null;
        }
        return Number(val).toFixed(2);
      };

      const hasGroupChanged = (gp, origGp) => {
        if (!origGp) return true;
        return (
          gp.nombre_grupo !== origGp.nombre_grupo ||
          gp.cantidad !== origGp.cantidad ||
          gp.costo_envio !== origGp.costo_envio ||
          gp.costo_envio_total !== origGp.costo_envio_total ||
          gp.costo_envio_unidad !== origGp.costo_envio_unidad ||
          gp.total_por_grupo !== origGp.total_por_grupo ||
          gp.orden !== origGp.orden ||
          gp.items?.length !== origGp.items?.length
        );
      };

      const hasItemChanged = (item, origItem) => {
        if (!origItem) return true;
        const fields = [
          'codigo_item', 'descripcion', 'cantidad', 'costo_precio', 
          'porcentaje_utilidad', 'id_marca', 'proveedor', 'observacion', 
          'tipo_unidad', 'costo_envio', 'tiempo_entrega', 'id_unidad_tiempo_entrega', 'orden'
        ];
        return fields.some(f => {
          const v1 = item[f];
          const v2 = origItem[f];
          const cleanV1 = (v1 === undefined || v1 === null) ? "" : String(v1).trim();
          const cleanV2 = (v2 === undefined || v2 === null) ? "" : String(v2).trim();
          return cleanV1 !== cleanV2;
        });
      };

      let hasAdd = false;
      let hasDelete = deletedSuministroIds.length > 0;
      let hasUpdate = false;

      for (const gp of Object.values(gruposSuministros)) {
        const isGroupTemp = typeof gp.id === 'string' && gp.id.startsWith('temp_');
        if (isGroupTemp) {
          hasAdd = true;
        }
        const origGp = originalGruposSuministros[gp.codigo_grupo];
        if (!isGroupTemp && hasGroupChanged(gp, origGp)) {
          hasUpdate = true;
        }
        for (const item of (gp.items || [])) {
          const isItemTemp = typeof item.id_suministro === 'string' && item.id_suministro.startsWith('temp_');
          if (isItemTemp) {
            hasAdd = true;
          } else {
            const origItem = origGp?.items?.find(it => it.id_suministro === item.id_suministro);
            if (hasItemChanged(item, origItem)) {
              hasUpdate = true;
            }
          }
        }
      }

      const tempIdToRealIdMap = new Map();
      const tempGroupCodeToRealGroupCodeMap = new Map();
      const savePromises = [];

      for (const gp of Object.values(gruposSuministros)) {
        const isGroupTemp = typeof gp.id === 'string' && gp.id.startsWith('temp_');
        const origGp = originalGruposSuministros[gp.codigo_grupo];
        let realGroupId = gp.id;
        let realGroupCode = gp.codigo_grupo;

        if (isGroupTemp) {
          const payloadGroup = {
            id_registro: numReg,
            codigo_grupo: Number(gp.codigo_grupo),
            nombre_grupo: gp.nombre_grupo || "",
            nivel: 0,
            cantidad: Number(gp.cantidad || 0),
            venta_total: toDec(gp.venta_total),
            id_tipo_gasto: 1,
            codigo_item: "GRUPO",
            descripcion: "GRUPO",
            orden: Number(gp.orden || 0),
            costo_envio: toDec(gp.costo_envio),
            costo_envio_total: toDec(gp.costo_envio_total),
            costo_envio_unidad: toDec(gp.costo_envio_unidad),
            total_por_grupo: gp.total_por_grupo || 0
          };
          const resGroup = await api.post(`cotizaciones/lista_suministros/${numReg}/`, payloadGroup);
          realGroupId = resGroup.data.id_suministro;
          realGroupCode = resGroup.data.codigo_grupo;

          tempIdToRealIdMap.set(gp.id, realGroupId);
          tempGroupCodeToRealGroupCodeMap.set(gp.codigo_grupo, realGroupCode);

          const itemPromises = (gp.items || []).map(async (item) => {
            const payloadItem = {
              id_registro: numReg,
              codigo_grupo: Number(realGroupCode),
              nivel: 1,
              codigo_item: item.codigo_item || "S/C",
              descripcion: item.descripcion || "S/D",
              cantidad: Number(item.cantidad || 0),
              costo_precio: toDec(item.costo_precio),
              costo_total: toDec(Number(item.costo_precio || 0) * Number(item.cantidad || 0)),
              porcentaje_utilidad: toDec(item.porcentaje_utilidad),
              utilidad: toDec(item.utilidad),
              precio_venta: toDec(item.precio_venta),
              venta_total: toDec(item.venta_total),
              id_marca: (item.id_marca && item.id_marca !== "null" && item.id_marca !== "undefined") ? Number(item.id_marca) : null,
              proveedor: item.proveedor || "",
              id_tipo_gasto: 1,
              observacion: item.observacion || "",
              tipo_unidad: item.tipo_unidad || "UNI",
              costo_envio: toDec(item.costo_envio),
              porcentaje_envio: toDec(item.porcentaje_envio),
              costo_envio_total: toDec(Number(item.costo_envio || 0) * Number(item.cantidad || 0)),
              costo_envio_unidad: toDec(item.costo_envio),
              costo_con_envio: toDec(item.costo_con_envio),
              tiempo_entrega: (item.tiempo_entrega !== "" && item.tiempo_entrega !== undefined && item.tiempo_entrega !== null && !isNaN(item.tiempo_entrega)) ? Number(item.tiempo_entrega) : null,
              id_unidad_tiempo_entrega: (item.id_unidad_tiempo_entrega && item.id_unidad_tiempo_entrega !== "null" && item.id_unidad_tiempo_entrega !== "undefined") ? Number(item.id_unidad_tiempo_entrega) : null,
              orden: Number(item.orden || 0)
            };
            const resItem = await api.post(`cotizaciones/lista_suministros/${numReg}/`, payloadItem);
            tempIdToRealIdMap.set(item.id_suministro, resItem.data.id_suministro);
          });
          await Promise.all(itemPromises);
        } else {
          if (hasGroupChanged(gp, origGp)) {
            const payloadGroup = {
              id_suministro: gp.id,
              id_registro: numReg,
              codigo_grupo: Number(gp.codigo_grupo),
              nombre_grupo: gp.nombre_grupo || "",
              nivel: 0,
              cantidad: Number(gp.cantidad || 0),
              venta_total: toDec(gp.venta_total),
              orden: Number(gp.orden || 0),
              costo_envio: toDec(gp.costo_envio),
              costo_envio_total: toDec(gp.costo_envio_total),
              costo_envio_unidad: toDec(gp.costo_envio_unidad),
              total_por_grupo: gp.total_por_grupo || 0
            };
            savePromises.push(api.put(`cotizaciones/lista_suministros/${numReg}/`, payloadGroup));
          }

          for (const item of (gp.items || [])) {
            const isItemTemp = typeof item.id_suministro === 'string' && item.id_suministro.startsWith('temp_');
            if (isItemTemp) {
              const payloadItem = {
                id_registro: numReg,
                codigo_grupo: Number(gp.codigo_grupo),
                nivel: 1,
                codigo_item: item.codigo_item || "S/C",
                descripcion: item.descripcion || "S/D",
                cantidad: Number(item.cantidad || 0),
                precio_venta: toDec(item.precio_venta),
                venta_total: toDec(item.venta_total),
                costo_precio: toDec(item.costo_precio),
                costo_total: toDec(Number(item.costo_precio || 0) * Number(item.cantidad || 0)),
                porcentaje_utilidad: toDec(item.porcentaje_utilidad),
                utilidad: toDec(item.utilidad),
                id_marca: (item.id_marca && item.id_marca !== "null" && item.id_marca !== "undefined") ? Number(item.id_marca) : null,
                proveedor: item.proveedor || "",
                id_tipo_gasto: 1,
                observacion: item.observacion || "",
                tipo_unidad: item.tipo_unidad || "UNI",
                costo_envio: toDec(item.costo_envio),
                porcentaje_envio: toDec(item.porcentaje_envio),
                costo_envio_total: toDec(Number(item.costo_envio || 0) * Number(item.cantidad || 0)),
                costo_envio_unidad: toDec(item.costo_envio),
                costo_con_envio: toDec(item.costo_con_envio),
                tiempo_entrega: (item.tiempo_entrega !== "" && item.tiempo_entrega !== undefined && item.tiempo_entrega !== null && !isNaN(item.tiempo_entrega)) ? Number(item.tiempo_entrega) : null,
                id_unidad_tiempo_entrega: (item.id_unidad_tiempo_entrega && item.id_unidad_tiempo_entrega !== "null" && item.id_unidad_tiempo_entrega !== "undefined") ? Number(item.id_unidad_tiempo_entrega) : null,
                orden: Number(item.orden || 0)
              };
              const postPromise = api.post(`cotizaciones/lista_suministros/${numReg}/`, payloadItem).then(res => {
                tempIdToRealIdMap.set(item.id_suministro, res.data.id_suministro);
              });
              savePromises.push(postPromise);
            } else {
              const origItem = origGp?.items?.find(it => it.id_suministro === item.id_suministro);
              if (hasItemChanged(item, origItem)) {
                const payloadItem = {
                  id_suministro: item.id_suministro,
                  id_registro: numReg,
                  codigo_grupo: Number(item.codigo_grupo || gp.codigo_grupo),
                  codigo_item: item.codigo_item || "S/C",
                  descripcion: item.descripcion || "S/D",
                  cantidad: Number(item.cantidad || 0),
                  costo_precio: toDec(item.costo_precio),
                  costo_total: toDec(Number(item.costo_precio || 0) * Number(item.cantidad || 0)),
                  porcentaje_utilidad: toDec(item.porcentaje_utilidad),
                  utilidad: toDec(item.utilidad),
                  precio_venta: toDec(item.precio_venta),
                  venta_total: toDec(item.venta_total),
                  id_marca: (item.id_marca && item.id_marca !== "null" && item.id_marca !== "undefined") ? Number(item.id_marca) : null,
                  proveedor: item.proveedor || "",
                  tipo_unidad: item.tipo_unidad || "UNI",
                  observacion: item.observacion || "",
                  costo_envio: toDec(item.costo_envio),
                  porcentaje_envio: toDec(item.porcentaje_envio),
                  costo_envio_total: toDec(Number(item.costo_envio || 0) * Number(item.cantidad || 0)),
                  costo_envio_unidad: toDec(item.costo_envio),
                  costo_con_envio: toDec(item.costo_con_envio),
                  tiempo_entrega: (item.tiempo_entrega !== "" && item.tiempo_entrega !== undefined && item.tiempo_entrega !== null && !isNaN(item.tiempo_entrega)) ? Number(item.tiempo_entrega) : null,
                  id_unidad_tiempo_entrega: (item.id_unidad_tiempo_entrega && item.id_unidad_tiempo_entrega !== "null" && item.id_unidad_tiempo_entrega !== "undefined") ? Number(item.id_unidad_tiempo_entrega) : null,
                  orden: Number(item.orden || 0)
                };
                savePromises.push(api.put(`cotizaciones/lista_suministros/${numReg}/`, payloadItem));
              }
            }
          }
        }
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      const reorderItems = [];
      let counter = 1;
      const sorted = Object.values(gruposSuministros).sort((a, b) => (a.orden || 0) - (b.orden || 0));

      sorted.forEach((grupo) => {
        const realId = tempIdToRealIdMap.get(grupo.id) || grupo.id;
        const realCode = tempGroupCodeToRealGroupCodeMap.get(grupo.codigo_grupo) || grupo.codigo_grupo;
        reorderItems.push({
          id_suministro: realId,
          orden: counter++,
          codigo_grupo: parseInt(realCode, 10)
        });

        if (grupo.items && Array.isArray(grupo.items)) {
          grupo.items.forEach((item) => {
            const realItemId = tempIdToRealIdMap.get(item.id_suministro) || item.id_suministro;
            reorderItems.push({
              id_suministro: realItemId,
              orden: counter++,
              codigo_grupo: parseInt(realCode, 10)
            });
          });
        }
      });

      if (reorderItems.length > 0) {
        await api.put(`cotizaciones/lista_suministros/${numReg}/`, {
          reorder_items: reorderItems
        });
      }

      const updateStateWithRealIdsAndOrders = (prev) => {
        const next = {};
        let orderCounter = 1;

        const sortedGroups = Object.values(prev).sort((a, b) => (a.orden || 0) - (b.orden || 0));

        sortedGroups.forEach((gp) => {
          const realCode = tempGroupCodeToRealGroupCodeMap.get(Number(gp.codigo_grupo)) || Number(gp.codigo_grupo);
          const realId = tempIdToRealIdMap.get(gp.id) || gp.id;
          const groupOrder = orderCounter++;

          const updatedItems = (gp.items || []).map(item => {
            const realItemId = tempIdToRealIdMap.get(item.id_suministro) || item.id_suministro;
            return {
              ...item,
              id_suministro: realItemId,
              codigo_grupo: realCode,
              orden: orderCounter++
            };
          });

          next[realCode] = {
            ...gp,
            id: realId,
            codigo_grupo: realCode,
            orden: groupOrder,
            items: updatedItems
          };
        });
        return next;
      };

      setDeletedSuministroIds([]);
      setGruposSuministros(prev => updateStateWithRealIdsAndOrders(prev));
      setOriginalGruposSuministros(prev => updateStateWithRealIdsAndOrders(prev));

      return {
        type: hasAdd ? 'add' : (hasDelete ? 'delete' : (hasUpdate ? 'update' : 'save')),
        message: hasAdd 
          ? "Suministros agregados correctamente" 
          : (hasDelete 
              ? "Suministro eliminado correctamente" 
              : (hasUpdate 
                  ? "Suministros actualizados correctamente" 
                  : "Suministros guardados")),
        title: hasAdd 
          ? "ITEMS AGREGADOS" 
          : (hasDelete 
              ? "SUMINISTRO ELIMINADO" 
              : (hasUpdate 
                  ? "SUMINISTROS ACTUALIZADOS" 
                  : "SUMINISTROS GUARDADOS"))
      };
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleExportarGrupoXLS = (codigo_grupo) => {
    // 1️⃣ Buscar el grupo de suministro en el estado del Hook
    const grupo = gruposSuministros[codigo_grupo];
    if (!grupo) {
      toast.error("El grupo no existe");
      return;
    }

    // 2️⃣ Inicializar el Workbook vacío
    const wb = XLSX.utils.book_new();
    const ws = {};

    // Configuración estética corporativa
    const HEX_COLOR_BASE = "237573"; // Tu color RGB institucional
    const FONT_NAME = "Segoe UI";

    // Helper profesional para inyectar valores con estilos nativos
    const setCell = (ref, value, style = {}) => {
      ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
      if (Object.keys(style).length > 0) {
        ws[ref].s = style;
      }
    };

    // 🏢 BLOQUE DE CABECERA SUPERIOR
    setCell("A1", `GRUPO: ${grupo.nombre_grupo ? grupo.nombre_grupo.trim() : 'SIN NOMBRE'}`, {
      font: { name: FONT_NAME, size: 14, bold: true, color: { rgb: "1E293B" } }
    });
    setCell("A2", `Cotización N°: ${numReg || '-'}`, {
      font: { name: FONT_NAME, size: 10, color: { rgb: "64748B" } }
    });

    // 📊 CABECERAS DE LA TABLA (Fila 4)
    const headers = [
      "Item", "Código Artículo", "Descripción", "U.M.",
      "Cantidad", "Costo Unitario", "Precio Venta Unitario", "Venta Total", "Proveedor"
    ];

    const headerStyle = {
      fill: { patternType: "solid", fgColor: { rgb: HEX_COLOR_BASE } },
      font: { name: FONT_NAME, size: 11, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "medium", color: { rgb: "1E293B" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    headers.forEach((header, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      setCell(`${colLetter}4`, header, headerStyle);
    });

    // Estilos de bordes para los registros
    const borderData = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    };

    let currentRow = 5;

    // 📦 INYECCIÓN DINÁMICA DE ARTÍCULOS
    if (grupo.items && grupo.items.length > 0) {
      grupo.items.forEach((item, index) => {
        const isZebra = index % 2 !== 0;
        const rowBg = isZebra ? "F8FAFC" : "FFFFFF";

        const cellStyle = (align) => ({
          font: { name: FONT_NAME, size: 10, color: { rgb: "334155" } },
          fill: { patternType: "solid", fgColor: { rgb: rowBg } },
          alignment: { horizontal: align, vertical: "center" },
          border: borderData
        });

        // TRIMMING CRÍTICO: Eliminamos todos los espacios en blanco infinitos de la BD
        const codigoLimpio = item.codigo_item ? item.codigo_item.trim() : "";
        const descripcionLimpia = item.descripcion ? item.descripcion.trim() : "";
        const unidadLimpia = item.tipo_unidad ? item.tipo_unidad.trim() : "UND";
        const proveedorLimpio = item.proveedor ? item.proveedor.trim() : "";

        setCell(`A${currentRow}`, index + 1, cellStyle("center"));
        setCell(`B${currentRow}`, codigoLimpio, cellStyle("left"));
        setCell(`C${currentRow}`, descripcionLimpia, cellStyle("left"));
        setCell(`D${currentRow}`, unidadLimpia, cellStyle("center"));

        // Formateo de números nativos
        setCell(`E${currentRow}`, Number(item.cantidad) || 0, cellStyle("center"));
        ws[`E${currentRow}`].z = '#,##0';

        setCell(`F${currentRow}`, Number(item.costo_precio) || 0, cellStyle("right"));
        ws[`F${currentRow}`].z = '$#,##0.00';

        setCell(`G${currentRow}`, Number(item.precio_venta) || 0, cellStyle("right"));
        ws[`G${currentRow}`].z = '$#,##0.00';

        setCell(`H${currentRow}`, Number(item.venta_total) || 0, cellStyle("right"));
        ws[`H${currentRow}`].z = '$#,##0.00';

        setCell(`I${currentRow}`, proveedorLimpio, cellStyle("center"));

        currentRow++;
      });
    } else {
      setCell(`A${currentRow}`, "No hay ítems en este grupo", {
        font: { name: FONT_NAME, italic: true, color: { rgb: "94A3B8" } },
        alignment: { horizontal: "center" }
      });
      currentRow++;
    }

    // 🧮 FILA DE TOTALES GENERALES
    currentRow++;

    const totalStyle = (align) => ({
      font: { name: FONT_NAME, size: 11, bold: true, color: { rgb: "1E293B" } },
      alignment: { horizontal: align, vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: HEX_COLOR_BASE } }
      }
    });

    const totalCantidad = (grupo.items || []).reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
    const totalVenta = Number(grupo.venta_total) || (grupo.items || []).reduce((acc, curr) => acc + (Number(curr.venta_total) || 0), 0);

    // Ajustado a alineación derecha ("right") para que se alinee perfectamente antes del valor numérico
    setCell(`A${currentRow}`, "TOTAL GENERAL", totalStyle("right"));

    setCell(`E${currentRow}`, totalCantidad, totalStyle("center"));
    ws[`E${currentRow}`].z = '#,##0';

    setCell(`H${currentRow}`, totalVenta, totalStyle("right"));
    ws[`H${currentRow}`].z = '$#,##0.00';

    // Rellenamos las demás celdas con el estilo para asegurar la continuidad de los bordes superior e inferior
    ["B", "C", "D", "F", "G", "I"].forEach(col => {
      setCell(`${col}${currentRow}`, "", totalStyle("left"));
    });

    // 📐 CONTROL RESPONSIVO DINÁMICO DE ANCHOS DE COLUMNA
    ws['!ref'] = `A1:I${currentRow}`;

    // Configuración base por defecto para asegurar anchos mínimos legibles
    const minWidths = [7, 18, 55, 8, 11, 16, 22, 18, 18];
    const colWidths = minWidths.map(w => ({ wch: w }));

    // Escanear todas las celdas generadas en la hoja para ajustar dinámicamente
    for (let c = 0; c < 9; c++) {
      const colLetter = String.fromCharCode(65 + c);
      let maxLength = minWidths[c];

      for (let r = 4; r <= currentRow; r++) {
        // Ignoramos la fila de totales en las columnas A, B, C, D al calcular anchos para que "TOTAL GENERAL" no estire artificialmente la columna A
        if (r === currentRow && c < 4) continue;

        const cellRef = `${colLetter}${r}`;
        if (ws[cellRef] && ws[cellRef].v !== undefined && ws[cellRef].v !== null) {
          let cellText = String(ws[cellRef].v);

          if (ws[cellRef].t === 'n' && ws[cellRef].z && ws[cellRef].z.includes('$')) {
            cellText = `$${Number(ws[cellRef].v).toFixed(2)}`;
          }

          if (cellText.length > maxLength) {
            maxLength = cellText.length;
          }
        }
      }
      colWidths[c].wch = maxLength + 3;
    }

    // Aplicar los anchos auto-calculados al lienzo
    ws['!cols'] = colWidths;

    // 💎 UNIÓN DE CELDAS EXCEL (Agregada combinación A:D para la fila de Totales)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Título Principal (A1:I1)
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Subtítulo de Cotización (A2:I2)
      { s: { r: currentRow - 1, c: 0 }, e: { r: currentRow - 1, c: 3 } } // TOTAL GENERAL combinado de A hasta D (Columna 0 a 3)
    ];

    // 4️⃣ Registrar la pestaña y ejecutar descarga
    const nombreArchivoLimpio = (grupo.nombre_grupo || "GRUPO")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .substring(0, 30);

    XLSX.utils.book_append_sheet(wb, ws, `Grupo ${grupo.codigo_grupo}`);
    XLSX.writeFile(wb, `Suministros_${nombreArchivoLimpio}_${numReg}.xlsx`);

    toast.success("Excel corporativo del grupo descargado");
  };

  const handleExportarGeneralXLS = () => {
    if (!gruposSuministros || Object.keys(gruposSuministros).length === 0) {
      toast.error("No hay datos disponibles para exportar");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = {};

    const HEX_COLOR_BASE = "237573"; // Tu color RGB institucional
    const HEX_BG_GRUPO = "F1F5F9";   // Gris claro profesional para separadores de grupo
    const FONT_NAME = "Segoe UI";

    const setCell = (ref, value, style = {}) => {
      ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
      if (Object.keys(style).length > 0) {
        ws[ref].s = style;
      }
    };

    // 🏢 BLOQUE DE CABECERA SUPERIOR
    setCell("A1", "REPORTE GENERAL DE SUMINISTROS", {
      font: { name: FONT_NAME, size: 14, bold: true, color: { rgb: "1E293B" } }
    });
    setCell("A2", `Cotización N°: ${numReg || '-'}`, {
      font: { name: FONT_NAME, size: 10, color: { rgb: "64748B" } }
    });

    // 📊 CABECERAS PRINCIPALES DE LA TABLA (Fila 4)
    const headers = [
      "Item", "Código Artículo", "Descripción", "U.M.",
      "Cantidad", "Costo Unitario", "Precio Venta Unitario", "Venta Total", "Proveedor"
    ];

    const headerStyle = {
      fill: { patternType: "solid", fgColor: { rgb: HEX_COLOR_BASE } },
      font: { name: FONT_NAME, size: 11, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "medium", color: { rgb: "1E293B" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    headers.forEach((header, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      setCell(`${colLetter}4`, header, headerStyle);
    });

    const borderData = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    };

    let currentRow = 5;
    let totalGeneralCantidad = 0;
    let totalGeneralVenta = 0;
    const mergesConfig = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Título (A1:I1)
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }  // Subtítulo (A2:I2)
    ];

    // 📦 RECORRIDO DE GRUPOS Y ARTÍCULOS (Estructura Jerárquica Limpia)
    Object.values(gruposSuministros).forEach(grupo => {

      // --- 1. FILA SEPARADORA DE GRUPO (Estilo unificado combinado A a D) ---
      const grupoStyle = (align) => ({
        font: { name: FONT_NAME, size: 10, bold: true, color: { rgb: "1E293B" } },
        fill: { patternType: "solid", fgColor: { rgb: HEX_BG_GRUPO } },
        alignment: { horizontal: align, vertical: "center" },
        border: borderData
      });

      const nombreGrupoLimpio = grupo.nombre_grupo ? grupo.nombre_grupo.trim() : "SIN NOMBRE";

      setCell(`A${currentRow}`, `GRUPO: ${nombreGrupoLimpio}`, grupoStyle("left"));
      // Rellenamos las celdas fantasmas del merge para mantener consistencia de bordes
      ["B", "C", "D", "E", "F", "G", "H", "I"].forEach(col => {
        setCell(`${col}${currentRow}`, "", grupoStyle("left"));
      });

      // Registramos combinación A a D para el título del Grupo
      mergesConfig.push({ s: { r: currentRow - 1, c: 0 }, e: { r: currentRow - 1, c: 3 } });
      currentRow++;

      let contadorItems = 1;
      let acumuladoCantidadGrupo = 0;
      let acumuladoVentaGrupo = 0;

      // --- 2. REGISTROS DE ÍTEMS PERTENECIENTES AL GRUPO ---
      if (grupo.items && grupo.items.length > 0) {
        grupo.items.forEach((item, index) => {
          const isZebra = index % 2 !== 0;
          const rowBg = isZebra ? "F8FAFC" : "FFFFFF";

          const itemStyle = (align) => ({
            font: { name: FONT_NAME, size: 10, color: { rgb: "334155" } },
            fill: { patternType: "solid", fgColor: { rgb: rowBg } },
            alignment: { horizontal: align, vertical: "center" },
            border: borderData
          });

          const codigoLimpio = item.codigo_item ? item.codigo_item.trim() : "";
          const descripcionLimpia = item.descripcion ? item.descripcion.trim() : "";
          const unidadLimpia = item.tipo_unidad ? item.tipo_unidad.trim() : "UND";
          const proveedorLimpio = item.proveedor ? item.proveedor.trim() : "";

          const cant = Number(item.cantidad) || 0;
          const vTotal = Number(item.venta_total) || 0;

          setCell(`A${currentRow}`, contadorItems++, itemStyle("center"));
          setCell(`B${currentRow}`, codigoLimpio, itemStyle("left"));
          setCell(`C${currentRow}`, descripcionLimpia, itemStyle("left"));
          setCell(`D${currentRow}`, unidadLimpia, itemStyle("center"));

          setCell(`E${currentRow}`, cant, itemStyle("center"));
          ws[`E${currentRow}`].z = '#,##0';

          setCell(`F${currentRow}`, Number(item.costo_precio) || 0, itemStyle("right"));
          ws[`F${currentRow}`].z = '$#,##0.00';

          setCell(`G${currentRow}`, Number(item.precio_venta) || 0, itemStyle("right"));
          ws[`G${currentRow}`].z = '$#,##0.00';

          setCell(`H${currentRow}`, vTotal, itemStyle("right"));
          ws[`H${currentRow}`].z = '$#,##0.00';

          setCell(`I${currentRow}`, proveedorLimpio, itemStyle("center"));

          // Sumando acumuladores parciales y globales
          acumuladoCantidadGrupo += cant;
          acumuladoVentaGrupo += vTotal;

          currentRow++;
        });
      }

      // --- 3. FILA DE TOTAL INTERMEDIO DEL GRUPO (Inspirado en BORRADOR 2) ---
      const subTotalStyle = (align) => ({
        font: { name: FONT_NAME, size: 10, bold: true, color: { rgb: "475569" } },
        alignment: { horizontal: align, vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "thin", color: { rgb: "CBD5E1" } }
        }
      });

      setCell(`A${currentRow}`, "TOTAL GRUPO", subTotalStyle("right"));
      setCell(`E${currentRow}`, acumuladoCantidadGrupo, subTotalStyle("center"));
      ws[`E${currentRow}`].z = '#,##0';

      setCell(`H${currentRow}`, acumuladoVentaGrupo, subTotalStyle("right"));
      ws[`H${currentRow}`].z = '$#,##0.00';

      ["B", "C", "D", "F", "G", "I"].forEach(col => {
        setCell(`${col}${currentRow}`, "", subTotalStyle("left"));
      });

      // Combinamos el cartel "TOTAL GRUPO" de A a D
      mergesConfig.push({ s: { r: currentRow - 1, c: 0 }, e: { r: currentRow - 1, c: 3 } });

      // Sumar al global definitivo
      totalGeneralCantidad += acumuladoCantidadGrupo;
      totalGeneralVenta += acumuladoVentaGrupo;

      currentRow += 2; // Espaciado en blanco elegante antes del siguiente grupo
    });

    // 🧮 FILA DE TOTALES GENERALES COMERCIALES (Final Absoluto)
    const totalStyle = (align) => ({
      font: { name: FONT_NAME, size: 11, bold: true, color: { rgb: "1E293B" } },
      alignment: { horizontal: align, vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "94A3B8" } },
        bottom: { style: "double", color: { rgb: HEX_COLOR_BASE } } // Doble cierre de ingeniería
      }
    });

    setCell(`A${currentRow}`, "TOTAL GENERAL", totalStyle("right"));
    setCell(`E${currentRow}`, totalGeneralCantidad, totalStyle("center"));
    ws[`E${currentRow}`].z = '#,##0';

    setCell(`H${currentRow}`, totalGeneralVenta, totalStyle("right"));
    ws[`H${currentRow}`].z = '$#,##0.00';

    ["B", "C", "D", "F", "G", "I"].forEach(col => {
      setCell(`${col}${currentRow}`, "", totalStyle("left"));
    });

    // Combinamos el "TOTAL GENERAL" final de A a D
    mergesConfig.push({ s: { r: currentRow - 1, c: 0 }, e: { r: currentRow - 1, c: 3 } });

    // Asignar parámetros del lienzo
    ws['!ref'] = `A1:I${currentRow}`;
    ws['!merges'] = mergesConfig;

    // 📐 CONTROL RESPONSIVO DINÁMICO DE ANCHOS
    const minWidths = [7, 18, 55, 8, 11, 16, 22, 18, 18];
    const colWidths = minWidths.map(w => ({ wch: w }));

    for (let c = 0; c < 9; c++) {
      const colLetter = String.fromCharCode(65 + c);
      let maxLength = minWidths[c];

      for (let r = 4; r <= currentRow; r++) {
        // Ignoramos filas de totales y separadores combinados al medir para evitar distorsiones de anchos en A
        const esFilaEspecial = ws[`A${r}`]?.v && (String(ws[`A${r}`].v).includes("GRUPO:") || String(ws[`A${r}`].v).includes("TOTAL"));
        if (esFilaEspecial && c < 4) continue;

        const cellRef = `${colLetter}${r}`;
        if (ws[cellRef] && ws[cellRef].v !== undefined && ws[cellRef].v !== null) {
          let cellText = String(ws[cellRef].v);

          if (ws[cellRef].t === 'n' && ws[cellRef].z && ws[cellRef].z.includes('$')) {
            cellText = `$${Number(ws[cellRef].v).toFixed(2)}`;
          }

          if (cellText.length > maxLength) {
            maxLength = cellText.length;
          }
        }
      }
      colWidths[c].wch = maxLength + 3;
    }

    ws['!cols'] = colWidths;

    // 4️⃣ Grabar Libro de Trabajo y lanzar descarga limpia
    XLSX.utils.book_append_sheet(wb, ws, "Suministros General");
    XLSX.writeFile(wb, `Reporte_Suministros_${numReg}.xlsx`);

    toast.success("Excel corporativo general descargado con éxito");
  };

  const handleDescargarPlantillaXLS = async () => {
    try {
      const res = await api.get("/cotizaciones/suministros/descargar-plantilla/", {
        responseType: "blob"
      });
      
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Plantilla_Importacion_Suministros.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Plantilla de importación descargada con éxito");
    } catch (err) {
      console.error("Error al descargar la plantilla de importación", err);
      toast.error("Error al descargar la plantilla del servidor");
    }
  };

  const handleImportarDesdeXLS = async (excelRowsOrFile, activeGrupoKey, tcamb = 1) => {
    if (!activeGrupoKey) {
      toast.error("No hay grupo activo seleccionado");
      return;
    }

    const parseExcelRows = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            resolve(rows);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Error de lectura"));
        reader.readAsArrayBuffer(file);
      });
    };

    try {
      let excelRows = [];
      if (Array.isArray(excelRowsOrFile)) {
        excelRows = excelRowsOrFile;
      } else if (excelRowsOrFile instanceof Blob) {
        excelRows = await parseExcelRows(excelRowsOrFile);
      } else {
        toast.error("Archivo inválido");
        return;
      }

      if (excelRows.length === 0) {
        toast.warning("El archivo Excel está vacío.");
        return;
      }

      // A helper to get row value case-insensitively
      const getRowValue = (row, possibleKeys) => {
        for (const k of possibleKeys) {
          const foundKey = Object.keys(row).find(rk => rk.trim().toUpperCase() === k.toUpperCase());
          if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== "") {
            return row[foundKey];
          }
        }
        return undefined;
      };

      if (!excelRows.some(r => getRowValue(r, ["CODIGO", "COD", "CODE"]))) {
        toast.warning("El Excel no tiene columna Código.");
        return;
      }

      const grupo = gruposSuministros[activeGrupoKey];
      if (!grupo) {
        toast.error("El grupo seleccionado no existe");
        return;
      }

      const getOfficialBrandFromDB = (enteredBrand = "") => {
        const entered = String(enteredBrand || "").trim().toUpperCase();
        if (!entered) return null;
        
        // 1. Primero buscar coincidencia exacta
        let match = (proveedores || []).find(p => String(p.nombre || "").toUpperCase().trim() === entered);
        
        // 2. Buscar coincidencia parcial de similitud
        if (!match) {
          match = (proveedores || []).find(p => {
            const official = String(p.nombre || "").toUpperCase().trim();
            return official.includes(entered) || entered.includes(official);
          });
        }
        
        // 3. Casos especiales y abreviaturas
        if (!match) {
          if (entered === "LS" || entered === "LSIS") {
            match = (proveedores || []).find(p => String(p.nombre || "").toUpperCase().includes("LS"));
          }
        }
        
        return match || null;
      };

      const getOfficialBrandName = (enteredBrand = "") => {
        const brandObj = getOfficialBrandFromDB(enteredBrand);
        return brandObj ? brandObj.nombre : enteredBrand;
      };

      const mapProveedorExcelToTPR = (proveedor = "") => {
        const brandObj = getOfficialBrandFromDB(proveedor);
        if (brandObj) {
          return String(brandObj.id_marca).padStart(2, '0');
        }
        return "99"; // default a Otros
      };

      const itemsBase = excelRows.map((row, index) => {
        const cod = String(getRowValue(row, ["CODIGO", "COD", "CODE"]) || "").trim();
        const des = String(getRowValue(row, ["DESCRIPCION", "DESC", "DESCRIPTION"]) || "").trim();
        const can = Number(getRowValue(row, ["CANTIDAD", "CANT", "QTY", "CANT. BUDGET", "CANT."]) || 1);
        const proveedorExcel = String(getRowValue(row, ["MARCA", "PROVEEDOR", "BRAND", "SUPPLIER"]) || "").trim();
        
        const excelCostoUnit = getRowValue(row, ["COSTO UNITARIO", "COSTO UNIT.", "UNIT COST", "PUC", "COSTO_UNITARIO"]);
        const excelUtilidad = getRowValue(row, ["UTILIDAD", "UTIL", "PROFIT", "MARGEN", "UTILIDAD (%)", "UTILIDAD %"]);
        const excelUnidadMedida = getRowValue(row, ["UNIDAD MEDIDA", "UNIDAD", "U.M", "UM", "UNIT", "UNIDAD_MEDIDA"]);
        const excelTiemposEntrega = getRowValue(row, ["TIEMPOS ENTREGA", "TIEMPOS DE ENTREGA", "ENTREGA", "DELIVERY"]);

        return {
          cod,
          des,
          can,
          proveedorExcel,
          excelCostoUnit: excelCostoUnit !== undefined && excelCostoUnit !== "" ? Number(excelCostoUnit) : null,
          excelUtilidad: excelUtilidad !== undefined && excelUtilidad !== "" ? Number(excelUtilidad) : null,
          excelUnidadMedida: excelUnidadMedida !== undefined && excelUnidadMedida !== "" ? String(excelUnidadMedida).trim() : null,
          excelTiemposEntrega: excelTiemposEntrega !== undefined && excelTiemposEntrega !== "" ? Number(excelTiemposEntrega) : null,
          rowIndex: index + 2
        };
      });

      // Validar estrictamente que todos los ítems tengan Marca y Código
      for (const item of itemsBase) {
        if (!item.cod) {
          toast.error(`Error en la fila ${item.rowIndex}: El campo CÓDIGO está vacío. Todos los ítems de la plantilla deben tener código.`);
          return;
        }
        if (!item.proveedorExcel) {
          toast.error(`Error en la fila ${item.rowIndex}: El campo MARCA está vacío. Todos los ítems de la plantilla deben tener marca.`);
          return;
        }
      }

      let nuevos = 0;
      let actualizados = 0;
      let noEncontrados = 0;

      const processedItems = await Promise.all(
        itemsBase.map(async item => {
          const key = item.cod?.toUpperCase();
          if (!key || ["S/C", "."].includes(key)) {
            const costoUnit = item.excelCostoUnit !== null ? item.excelCostoUnit : 0;
            const pctUtilidad = item.excelUtilidad !== null ? item.excelUtilidad : 0;
            const costoTotal = costoUnit * item.can;
            const utilidadMonetaria = costoTotal * (pctUtilidad / 100);
            const ventaPrecio = costoUnit * (1 + pctUtilidad / 100);
            const ventaTotal = ventaPrecio * item.can;
            return {
              ...item,
              tpr: "99",
              cod: item.cod || "S/C",
              des: item.des || "S/D",
              pro: getOfficialBrandName(item.proveedorExcel) || "Otros",
              tde: item.excelUnidadMedida || "UNI",
              can: item.can,
              puc: costoUnit,
              tou: utilidadMonetaria,
              cau: pctUtilidad,
              toc: costoTotal,
              val: ventaPrecio,
              tot: ventaTotal,
              entrega: item.excelTiemposEntrega !== null ? item.excelTiemposEntrega : null,
            };
          }

          try {
            const tprPorCodigo = await resolverEndpointPorCodigo(item.cod);
            let tprFinal = tprPorCodigo && tprPorCodigo !== "99"
              ? tprPorCodigo
              : mapProveedorExcelToTPR(item.proveedorExcel);

            if (!tprFinal) {
              tprFinal = "99";
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
            let calc = null;
            if (endpoint) {
              const res = await api.get(endpoint, { params: { search: item.cod } });
              const rows = Array.isArray(res.data) ? res.data : [];

              const encontrado = rows.find(r =>
                String(r.codigo || "").toUpperCase() === key ||
                String(r.ocodigo || "").toUpperCase() === key
              );

              if (encontrado) {
                calc = calcularItemSegunProveedor(
                  encontrado,
                  tprFinal,
                  tcamb,
                  item.can,
                  item.proveedorExcel
                );
              }
            }

            if (!calc) {
              noEncontrados++;
              calc = calcularItemSegunProveedor(
                {
                  codigo: item.cod,
                  descripcion: item.des,
                  proveedor: item.proveedorExcel,
                  pgc: item.excelUnidadMedida || "UNI",
                  precio: item.excelCostoUnit || 0,
                },
                tprFinal,
                tcamb,
                item.can,
                item.proveedorExcel
              );
            }

            // Override with values from Excel if present
            const costoUnit = item.excelCostoUnit !== null ? item.excelCostoUnit : (calc.costoPrecio ?? 0);
            const pctUtilidad = item.excelUtilidad !== null ? item.excelUtilidad : (calc.porcentaje ?? 0);
            
            const costoTotal = costoUnit * item.can;
            const utilidadMonetaria = costoTotal * (pctUtilidad / 100);
            const ventaPrecio = costoUnit * (1 + pctUtilidad / 100);
            const ventaTotal = ventaPrecio * item.can;

            return {
              ...item,
              tpr: calc.tpr ?? tprFinal,
              cod: calc.codigo ?? item.cod,
              des: item.des || calc.descripcion || "S/D",
              pro: getOfficialBrandName(item.proveedorExcel) || calc.marca || "",
              tde: item.excelUnidadMedida || calc.unidad || "UNI",
              can: item.can,
              puc: costoUnit,
              tou: utilidadMonetaria,
              cau: pctUtilidad,
              toc: costoTotal,
              val: ventaPrecio,
              tot: ventaTotal,
              entrega: item.excelTiemposEntrega !== null ? item.excelTiemposEntrega : null,
            };

          } catch (err) {
            console.error("Error resolviendo XLS item", item.cod, err);
            const costoUnit = item.excelCostoUnit !== null ? item.excelCostoUnit : 0;
            const pctUtilidad = item.excelUtilidad !== null ? item.excelUtilidad : 0;
            const costoTotal = costoUnit * item.can;
            const utilidadMonetaria = costoTotal * (pctUtilidad / 100);
            const ventaPrecio = costoUnit * (1 + pctUtilidad / 100);
            const ventaTotal = ventaPrecio * item.can;
            return {
              ...item,
              tpr: "99",
              cod: item.cod || "S/C",
              des: item.des || "S/D",
              pro: getOfficialBrandName(item.proveedorExcel) || "Otros",
              tde: item.excelUnidadMedida || "UNI",
              can: item.can,
              puc: costoUnit,
              tou: utilidadMonetaria,
              cau: pctUtilidad,
              toc: costoTotal,
              val: ventaPrecio,
              tot: ventaTotal,
              entrega: item.excelTiemposEntrega !== null ? item.excelTiemposEntrega : null,
            };
          }
        })
      );

      const itemsExistentesMap = new Map();
      if (grupo.items) {
        grupo.items.forEach(it => {
          itemsExistentesMap.set(it.codigo_item?.toUpperCase(), it);
        });
      }

      setGruposSuministros(prev => {
        const next = { ...prev };
        const activeGrupo = next[activeGrupoKey];
        if (!activeGrupo) return prev;

        const nextItems = [...(activeGrupo.items || [])];

        processedItems.forEach(item => {
          const key = item.cod?.toUpperCase();
          const existenteIdx = nextItems.findIndex(it => it.codigo_item?.toUpperCase() === key);

          if (existenteIdx !== -1) {
            actualizados++;
            const existente = nextItems[existenteIdx];
            const nuevaCantidad = Number(existente.cantidad || 0) + Number(item.can || 0);
            const nuevoVentaTotal = nuevaCantidad * Number(existente.precio_venta || 0);

            nextItems[existenteIdx] = {
              ...existente,
              cantidad: nuevaCantidad,
              venta_total: nuevoVentaTotal,
            };
          } else {
            nuevos++;
            const tempItemId = `temp_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const payloadCreate = {
              id_suministro: tempItemId,
              id_registro: numReg,
              codigo_grupo: parseInt(activeGrupoKey, 10),
              nivel: 1,
              codigo_item: item.cod || "S/C",
              descripcion: item.des || "S/D",
              cantidad: Number(item.can || 1),
              precio_venta: Number(item.val || 0),
              venta_total: Number(item.tot || 0),
              costo_precio: Number(item.puc || 0),
              costo_total: Number(item.toc || 0),
              utilidad: Number(item.tou || 0),
              porcentaje_utilidad: Number(item.cau || 0),
              proveedor: getOfficialBrandName(item.pro) || getOfficialBrandName(item.proveedorExcel) || "",
              id_marca: parseInt(item.tpr, 10),
              marca_nombre: getOfficialBrandName(item.pro) || getOfficialBrandName(item.proveedorExcel) || "",
              tipo_unidad: item.tde || "UNI",
              id_tipo_gasto: 1,
              tiempo_entrega: item.entrega !== null ? Number(item.entrega) : null,
              id_unidad_tiempo_entrega: item.entrega !== null ? 1 : null,
            };
            nextItems.push(payloadCreate);
          }
        });

        const totalVentaItems = nextItems.reduce((acc, curr) => acc + Number(curr.venta_total || 0), 0);
        const totalVentaGrupo = totalVentaItems * Number(activeGrupo.cantidad || 1);

        next[activeGrupoKey] = {
          ...activeGrupo,
          venta_total: totalVentaGrupo,
          items: nextItems
        };
        return next;
      });

      toast.success("Importación finalizada correctamente");

      alert(
        `Importación completada:
        ✔ ${nuevos} procesados
        🔁 ${actualizados} actualizados en memoria
        ⚠ ${noEncontrados} sin coincidencia de precios`
      );

    } catch (error) {
      console.error("Error al importar XLS:", error);
      toast.error("Error durante la importación del XLS");
    }
  };

  const handleGuardarOrden = (nuevoEstadoGrupos) => {
    setGruposSuministros(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let counter = 1;
      const sorted = Object.values(nuevoEstadoGrupos).sort((a, b) => (a.orden || 0) - (b.orden || 0));

      sorted.forEach((grupo) => {
        if (next[grupo.codigo_grupo]) {
          next[grupo.codigo_grupo].orden = counter++;
          if (next[grupo.codigo_grupo].items && Array.isArray(next[grupo.codigo_grupo].items)) {
            next[grupo.codigo_grupo].items.forEach((item) => {
              item.orden = counter++;
            });
          }
        }
      });
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        predicate: (event) => {
          return !!event.target.closest('[data-drag-handle]');
        }
      },
    })
  );

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // Reordenar Grupos
    if (activeIdStr.startsWith("grupo-") && overIdStr.startsWith("grupo-")) {
      const activeCog = parseInt(activeIdStr.replace("grupo-", ""), 10);
      const overCog = parseInt(overIdStr.replace("grupo-", ""), 10);

      const sorted = Object.values(gruposSuministros).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      const oldIndex = sorted.findIndex(g => g.codigo_grupo === activeCog);
      const newIndex = sorted.findIndex(g => g.codigo_grupo === overCog);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sorted, oldIndex, newIndex);
        const nuevoEstado = { ...gruposSuministros };

        reordered.forEach((grupo, idx) => {
          nuevoEstado[grupo.codigo_grupo].orden = idx + 1;
        });

        setGruposSuministros(nuevoEstado);
        handleGuardarOrden(nuevoEstado);
      }
      return;
    }

    // Reordenar Items (dentro del mismo grupo o entre grupos)
    if (activeIdStr.startsWith("item-")) {
      const activeItemId = parseInt(activeIdStr.replace("item-", ""), 10);

      let fromCog = null;
      let itemToMove = null;
      let itemIndex = -1;

      Object.entries(gruposSuministros).forEach(([cog, grupo]) => {
        const idx = grupo.items.findIndex(i => i.id_suministro === activeItemId);
        if (idx !== -1) {
          fromCog = cog;
          itemToMove = grupo.items[idx];
          itemIndex = idx;
        }
      });

      if (!fromCog || !itemToMove) return;

      let toCog = null;
      let targetIndex = -1;

      if (overIdStr.startsWith("grupo-")) {
        toCog = overIdStr.replace("grupo-", "");
      } else if (overIdStr.startsWith("item-")) {
        const overItemId = parseInt(overIdStr.replace("item-", ""), 10);
        Object.entries(gruposSuministros).forEach(([cog, grupo]) => {
          const idx = grupo.items.findIndex(i => i.id_suministro === overItemId);
          if (idx !== -1) {
            toCog = cog;
            targetIndex = idx;
          }
        });
      }

      if (!toCog) return;

      const nuevoEstado = JSON.parse(JSON.stringify(gruposSuministros));

      nuevoEstado[fromCog].items.splice(itemIndex, 1);

      if (targetIndex !== -1) {
        nuevoEstado[toCog].items.splice(targetIndex, 0, itemToMove);
      } else {
        nuevoEstado[toCog].items.push(itemToMove);
      }

      setGruposSuministros(nuevoEstado);
      handleGuardarOrden(nuevoEstado);
    }
  }, [gruposSuministros, handleGuardarOrden]);

  const handleReporteSuministros = useCallback(() => {
    if (!numReg) return;
  }, [numReg]);

  return {
    gruposSuministros,
    setGruposSuministros,
    fetchSuministros,
    proveedores,
    setProveedores,
    handleCalcularTotalGrupo,
    handleAgregarGrupoSuministro,
    handleAgregarItem,
    saveEditItem,
    handleDuplicarGrupo,
    handleEliminarGrupo,
    handleEliminarItem,
    handleExportarGrupoXLS,
    handleExportarGeneralXLS,
    handleImportarDesdeXLS,
    handleDescargarPlantillaXLS,
    handleGuardarOrden,
    sensors,
    handleDragEnd,
    handleReporteSuministros,
    isSuministrosDirty,
    saveSuministros,
  };
};

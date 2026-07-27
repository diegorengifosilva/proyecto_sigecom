import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/toast";
import api from "@/services/api";

export const useCotizacionAcciones = (numReg, onActionSuccess) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Nueva Versión (Navega al nuevo registro creado)
  const crearNuevaVersion = useMutation({
    mutationFn: () => api.post(`cotizaciones/nueva-version/${numReg}/`),
    onSuccess: (res) => {
      const { id_registro_nuevo, codigo_nuevo } = res.data.data;
      toast.success(`Versión ${codigo_nuevo} creada exitosamente`, "Nueva Versión");

      // Refresca las listas de cotizaciones, oportunidades y aperturas
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["aperturas"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"], refetchType: "none" });

      if (onActionSuccess) onActionSuccess("nueva-version", id_registro_nuevo);

      // Navega al detalle del nuevo registro generado directamente en cotizaciones
      navigate(`/comercial/cotizaciones/${id_registro_nuevo}`);
    },
    onError: () => toast.error("No se pudo crear la nueva versión de la cotización", "Error de Nueva Versión"),
  });

  // 2. Copiar Cotización
  const copiarCotizacion = useMutation({
    mutationFn: (payload) => api.post(`cotizaciones/${numReg}/generar-copia/`, payload),
    onSuccess: (res) => {
      const { id_registro_nuevo } = res.data.data;
      toast.success("Copia de cotización generada exitosamente", "Copia de Registro");

      // Refresca las listas de cotizaciones, oportunidades y aperturas
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["aperturas"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"], refetchType: "none" });

      if (onActionSuccess) onActionSuccess("copiar", id_registro_nuevo);

      // Navega a la copia recién creada directamente en cotizaciones
      navigate(`/comercial/cotizaciones/${id_registro_nuevo}`);
    },
    onError: () => toast.error("No se pudo generar la copia de la cotización", "Error de Copia"),
  });

  // 3. Eliminar Cotización
  const eliminarCotizacion = useMutation({
    mutationFn: (tipoParam) => {
      const path = window.location.pathname;
      let tipo = typeof tipoParam === 'string' ? tipoParam : null;
      if (!tipo) {
        if (path.includes("/oportunidades")) tipo = "oportunidad";
        else if (path.includes("/aperturas")) tipo = "apertura";
        else tipo = "cotizacion";
      }
      return api.delete(`cotizaciones/eliminar/${numReg}/?tipo=${tipo}`);
    },
    onSuccess: (data, variables) => {
      const path = window.location.pathname;
      let tipo = typeof variables === 'string' ? variables : null;
      if (!tipo) {
        if (path.includes("/oportunidades")) tipo = "oportunidad";
        else if (path.includes("/aperturas")) tipo = "apertura";
        else tipo = "cotizacion";
      }

      toast.delete("El registro ha sido eliminado del sistema", "Registro Eliminado");
      // Refresca las listas de cotizaciones, oportunidades y aperturas
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["aperturas"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"], refetchType: "none" });

      if (onActionSuccess) onActionSuccess("eliminar");

      if (path.includes("/oportunidades")) {
        navigate("/comercial/oportunidades");
      } else if (path.includes("/aperturas")) {
        navigate("/comercial/aperturas");
      } else {
        navigate("/comercial/cotizaciones");
      }
    },
    onError: () => toast.error("No se pudo eliminar el registro seleccionado", "Error al Eliminar"),
  });

  // 4. Lógica de Guardado
  const guardarCotizacion = useMutation({
    mutationFn: (payload) => api.post(`/cotizaciones/guardar/`, payload),
    onSuccess: () => {
      toast.success("Cotización guardada");
      // Refresca el detalle actual y las listas globales para reflejar los cambios
      queryClient.invalidateQueries({ queryKey: ["cotizacion-detalle", numReg] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["aperturas"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"], refetchType: "none" });
      if (onActionSuccess) onActionSuccess("guardar");
    },
    onError: () => toast.error("Error al guardar cambios"),
  });

  // 5. Enviar Cotización Aprobación
  const enviarCotizacionAprobacion = useMutation({
    mutationFn: async (arg) => {
      const id = typeof arg === "object" ? arg.id : arg;
      const revert = typeof arg === "object" ? !!arg.revert : false;
      const token = localStorage.getItem("access_token");
      const { data } = await api.patch(
        `cotizaciones/enviar-aprobacion/${id}/${revert ? "?revert=true" : ""}`, 
        {}, 
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      return { data, revert };
    },
    onSuccess: (resData) => {
      const { data: responseData, revert } = resData;
      toast.success(responseData.message || (revert ? "Estado cambiado a Pendiente de Envío exitosamente" : "Cotización enviada al cliente exitosamente"));
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion-detalle", numReg] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["aperturas"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"], refetchType: "none" });
      
      if (onActionSuccess) onActionSuccess(revert ? "revertir-envio" : "enviar-aprobacion", responseData);
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || "Hubo un error al procesar el envío";
      toast.error(errorMsg);
    }
  });

  const handleReporteDetallado = useCallback((setReporteDetalladoOpen) => {
    if (!numReg) return;
    setReporteDetalladoOpen(true);
  }, [numReg]);

  const handleReporteResumen = useCallback((setReporteResumenOpen) => {
    if (!numReg) return;
    setReporteResumenOpen(true);
  }, [numReg]);

  return {
    crearNuevaVersion,
    copiarCotizacion,
    eliminarCotizacion,
    guardarCotizacion,
    enviarCotizacionAprobacion,
    isPending: crearNuevaVersion.isPending || copiarCotizacion.isPending || eliminarCotizacion.isPending || guardarCotizacion.isPending || enviarCotizacionAprobacion.isPending,
    handleReporteDetallado,
    handleReporteResumen
  };
};
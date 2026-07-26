// src/dashboard/cotizaciones/SeguimientoCotizacionesModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InfoTabs from "@/components/ui/InfoTabs";
import CondicionesModal from "../Gestion/CondicionesModal";
import GenerarCodigoModal from "../Gestion/GenerarCodigoModal";
import DescuentosModal from "../Gestion/DescuentosModal";
import EnviarCotiModal from "../Gestion/EnviarCotiModal";

export default function SeguimientoCotizacionesModal({ open, onClose, cotizacion }) {
  const [data, setData] = useState(cotizacion || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suministros, setSuministros] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [openCondiciones, setOpenCondiciones] = useState(false);
  const [openGenerarCodigo, setOpenGenerarCodigo] = useState(false);
  const [openDescuentos, setOpenDescuentos] = useState(false);
  const [descuentosForm, setDescuentosForm] = useState({
    aplicar: false,
    afecto: "",
    porcentaje: "",
    importe: "",
  });
  const [openEnviarCoti, setOpenEnviarCoti] = useState(false);

  //=========================//
  // DATOS DE LA COTIZACIÓN //
  //=========================//
  const fetchCotizacionDetalle = async (numero) => {
    if (!numero) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/cotizaciones/cotizacion_detalle/${numero}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setData(res.data);

    } catch (err) {
      console.error("Error cargando detalles de cotización:", err);
      setError("No se pudo cargar la información de la cotización.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar solo la cabecera (detalle) usando el número original
  useEffect(() => {
    if (open && cotizacion?.numero) {
      fetchCotizacionDetalle(cotizacion.numero);
    }
  }, [open, cotizacion]);

  //=============//
  // SUMINISTROS //
  //=============//
  const fetchSuministros = async (num_reg) => {
    if (!num_reg) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/api/cotizacion/${num_reg}/suministros/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const arr = Array.isArray(res.data) ? res.data : [];
      setSuministros(arr);


    } catch (err) {
      console.error("Error cargando suministros:", err);
      setSuministros([]);
    }
  };

  //============//
  // SERVICIOS  //
  //============//
  const fetchServicios = async (num_reg) => {
    if (!num_reg) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/api/cotizaciones/lista_servicios/${num_reg}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Guardar directamente el objeto con tituloGeneral y subgrupos
      setServicios(res.data);

    } catch (err) {
      console.error("Error cargando servicios:", err);
      setServicios({ tituloGeneral: "", subgrupos: [] });
    }
  };

  const guardarCondiciones = async (nuevoTexto) => {
    try {
      await axios.post(
        `/api/cotizaciones/condiciones-generales/${numero}/`,
        { condiciones_generales: nuevoTexto },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Actualizamos la data en pantalla
      setData((prev) => ({ ...prev, acu_e: nuevoTexto }));

      alert("Condiciones generales actualizadas.");
      setOpenCondiciones(false);

    } catch (error) {
      console.error(error);
      alert("Error guardando condiciones.");
    }
  };

  const cargarCodigo = async () => {
    try {
      const { data } = await axios.get(
        `/api/cotizaciones/${numero}/generar-codigo/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCodigo(data.codigo);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar el código.");
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-lg animate-fadeIn p-4 sm:p-6">

        {/* ENCABEZADO */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800">
            Cotización {data?.numero || ""}
          </DialogTitle>
        </DialogHeader>

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
              suministros={Array.isArray(suministros) ? suministros : []} // siempre un array
              servicios={Array.isArray(servicios) ? servicios : []}
              openCondiciones={openCondiciones}
              setOpenCondiciones={setOpenCondiciones}
              openGenerarCodigo={openGenerarCodigo}
              setOpenGenerarCodigo={setOpenGenerarCodigo}
              openDescuentos={openDescuentos}
              setOpenDescuentos={setOpenDescuentos}
              openEnviarCoti={openEnviarCoti}
              setOpenEnviarCoti={setOpenEnviarCoti}
              tabsToShow={[
                "datos",            // TAB principal
                "suministros",        // TAB contactos
                "servicios",      // TAB condiciones
              ]}
            />

            {/* SUBMODALES */}
            <CondicionesModal
              open={openCondiciones}
              onClose={() => setOpenCondiciones(false)}
              condicionesIniciales={data?.acu_e}   // ← AQUÍ ESTÁ EL FIX
              onAceptar={(nuevoTexto) => {
                setOpenCondiciones(false);
              }}
            />

            <GenerarCodigoModal
              open={openGenerarCodigo}
              onClose={() => setOpenGenerarCodigo(false)}
              codigo={data?.numero}
            />

            <DescuentosModal
              open={openDescuentos}
              setOpen={setOpenDescuentos}
              formValues={descuentosForm}
              setFormValues={setDescuentosForm}
              onClose={() => setOpenDescuentos(false)}
            />

            <EnviarCotiModal
              open={openEnviarCoti}
              onClose={() => setOpenEnviarCoti(false)}
            />

            {/* BOTÓN CERRAR */}
            <div className="flex justify-end mt-4">
              <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
                Cerrar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

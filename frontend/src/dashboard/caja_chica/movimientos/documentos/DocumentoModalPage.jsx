// src/dashboard/movimientos/documentos/DocumentoModalPage.jsx

import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DocumentoModal from "@/caja-chica/liquidaciones/DocumentoModal";

export default function DocumentoModalPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  // Si no hay datos (acceso directo), redirige de vuelta
  if (!state) {
    navigate("/caja-chica/liquidaciones");
    return null;
  }

  const { datosOCR, tipoDocumento, imagen, solicitudId } = state;

  return (
    <DocumentoModal
      isOpen={true}
      onClose={() => navigate("/caja-chica/liquidaciones")}
      datosOCR={datosOCR}
      tipoDocumento={tipoDocumento}
      imagen={imagen}
      solicitud={{ id: solicitudId }}
    />
  );
}
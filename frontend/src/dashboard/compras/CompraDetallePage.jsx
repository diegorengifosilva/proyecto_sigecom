import React from "react";
import { useParams } from "react-router-dom";
import CompraDetalle from "./CompraDetalle";

export default function CompraDetallePage() {
  const { id_solicitud } = useParams();

  return (
    <CompraDetalle idSolicitud={id_solicitud} />
  );
}

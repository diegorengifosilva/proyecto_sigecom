import React from "react";
import { useParams } from "react-router-dom";
import PasajeDetalle from "./PasajeDetalle";

export default function PasajeDetallePage() {
  const { id_pasaje } = useParams();

  return (
    <PasajeDetalle idPasaje={id_pasaje} />
  );
}

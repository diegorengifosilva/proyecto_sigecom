import React from "react";
import { useParams } from "react-router-dom";
import CajaChicaDetalle from "./CajaChicaDetalle";

export default function CajaChicaDetallePage() {
  const { id_caja_chica, nro_solicitud, id } = useParams();

  return (
    <CajaChicaDetalle idCajaChica={id_caja_chica || nro_solicitud || id} />
  );
}

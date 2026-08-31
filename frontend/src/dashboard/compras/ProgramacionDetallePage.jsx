import React from "react";
import { useParams } from "react-router-dom";
import ProgramacionDetalle from "./ProgramacionDetalle";

export default function ProgramacionDetallePage() {
  const { id_apertura } = useParams();

  return (
    <ProgramacionDetalle idApertura={id_apertura} />
  );
}

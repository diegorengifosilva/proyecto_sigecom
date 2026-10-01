import React from "react";
import { useParams } from "react-router-dom";
import PlanInversionDetalle from "./PlanInversionDetalle";

export default function PlanInversionDetallePage() {
  const { id_plan } = useParams();

  return (
    <PlanInversionDetalle idPlan={id_plan} />
  );
}

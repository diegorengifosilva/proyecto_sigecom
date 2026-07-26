import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import CotizacionDetalle from "./CotizacionDetalle";
import AperturasDetalle from "./AperturasDetalle";

export default function CotizacionDetallePage({ esOportunidad = false, forcingApertura = false }) {
  const { numReg } = useParams();
  const [searchParams] = useSearchParams();
  const isApertura = forcingApertura || searchParams.get("tipo") === "apertura";

  if (isApertura) {
    return <AperturasDetalle idRegistro={numReg} />;
  }

  return (
    <CotizacionDetalle numReg={numReg} esOportunidad={esOportunidad} />
  );
}

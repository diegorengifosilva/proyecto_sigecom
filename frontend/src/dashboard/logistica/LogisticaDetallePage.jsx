import React, { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import NuevaLogisticaModal from "@/modal/logistica/NuevaLogisticaModal";

export default function LogisticaDetallePage({ operacion = "E" }) {
  const { numReg } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const listPath =
    operacion === "E" ? "/logistica/entradas" : "/logistica/salidas";
  const tipo = operacion === "E" ? "Entrada" : "Salida";

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sigecom-breadcrumb-label", {
        detail: { path: location.pathname, label: `${tipo} ${numReg}` },
      })
    );
  }, [location.pathname, numReg, tipo]);

  return (
    <div className="animate-in fade-in duration-300 -m-4 md:-m-6">
      <NuevaLogisticaModal
        asPage
        open
        logistica={{ num_reg: numReg }}
        operacion={operacion}
        modo="V"
        onClose={() => navigate(listPath)}
      />
    </div>
  );
}

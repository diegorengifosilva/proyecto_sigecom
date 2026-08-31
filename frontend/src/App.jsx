// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import "@/styles/Home.css";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import 'react-confirm-alert/src/react-confirm-alert.css';

import { AuthProvider } from "@/context/AuthContext.jsx";
import ProtectedRoute from "@/components/layout/ProtectedRoute.jsx";

// AUTH
import LoginPage from "@/auth/login/LoginPage.jsx";
import RegisterPage from "@/auth/register/RegisterPage.jsx";

// LAYOUT PRINCIPAL
import DashboardLayout from "@/dashboard/layout/DashboardLayout.jsx";

// COMERCIAL
import DashboardComercial from "./dashboard/comercial/Home/DashboardComercial";
import Comercial from "./dashboard/comercial/Comercial";
import CotizacionDetallePage from "./dashboard/comercial/CotizacionDetallePage";
import CotizacionNuevaModal from "./modal/CotizacionNuevaModal";
import EstructuraComercial from "./dashboard/Tablas/EstructuraComercial/EstructuraComercial";
import ParametrosVentas from "./dashboard/Tablas/ParametrosVentas/ParametrosVentas";
import CatalogoMarcas from "./dashboard/Tablas/CatalogoMarcas/CatalogoMarcas";
import GastosAnalisis from "./dashboard/Tablas/Gastos_Analisis/GastosAnalisis";

// LOGISTICA
import LogisticaDashboard from "./dashboard/logistica/LogisticaDashboard";
import LogisticaDetallePage from "./dashboard/logistica/LogisticaDetallePage";
import LogisticaTablas from "./dashboard/logistica/LogisticaTablas";
import Compras from "./dashboard/compras/Compras";
import CompraDetallePage from "./dashboard/compras/CompraDetallePage";
import ProgramacionDetallePage from "./dashboard/compras/ProgramacionDetallePage";

// CAJA CHICA
import CajaChicaHome from "./dashboard/caja_chica/principal/DashboardHome";
import SolicitudDashboard from "./dashboard/caja_chica/solicitudes/SolicitudDashboard";
import NuevaSolicitud from "./dashboard/caja_chica/solicitudes/NuevaSolicitud";
import MisSolicitudes from "./dashboard/caja_chica/solicitudes/MisSolicitudes";
import DetallesSolicitud from "./dashboard/caja_chica/solicitudes/DetallesSolicitud";
import AtencionSolicitudes from "./dashboard/caja_chica/atencion_solicitudes/AtencionSolicitudes";
import LiquidacionesPendientes from "./dashboard/caja_chica/liquidaciones/LiquidacionesPendientes";
import PresentarDocumentacionModal from "./dashboard/caja_chica/liquidaciones/PresentarDocumentacionModal";
import SubirArchivoModal from "./dashboard/caja_chica/liquidaciones/SubirArchivoModal";
import AprobacionLiquidaciones from "./dashboard/caja_chica/aprobacion_liquidacion/AprobacionLiquidaciones";
import CajaChicaArqueo from "./dashboard/caja_chica/caja_chica/CajaChica";
import RegistroActividades from "./dashboard/caja_chica/registro_actividades/RegistroActividades";
import Reportes from "./dashboard/caja_chica/reportes/Reportes";

// NUEVOS PORTALES / MODULOS
import Sugerencias from "./dashboard/sugerencias/Sugerencias";
import SugerenciaDetalle from "./dashboard/sugerencias/SugerenciaDetalle";
import ConfiguracionUsuariosPage from "./dashboard/usuarios/ConfiguracionUsuariosPage";

import { KeyboardProvider } from "@/context/KeyboardContext.jsx";
import MockModulePage from "@/dashboard/layout/MockModulePage";
import * as Icons from "lucide-react";

// Redirecciona rutas singulares legacy a sus plurales unificados
const RedirectToPlural = ({ type }) => {
  const { numReg } = useParams();
  return <Navigate to={`/comercial/${type}/${numReg}`} replace />;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <KeyboardProvider>

          <ToastContainer position="top-right" autoClose={3000} />

          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Base Protected Path */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Inicio */}
              <Route path="home" element={<DashboardComercial />} />

              {/* Módulo Comercial */}
              <Route path="comercial">
                {/* Listado principal: /sigecom/comercial (redirige al tab por defecto) */}
                <Route index element={<Navigate to="cotizaciones" replace />} /> 
                
                {/* Pestañas individuales y detalles del módulo comercial con nombres unificados en plural */}
                <Route path="oportunidades" element={<Comercial defaultTab="oportunidades" />} />
                <Route path="oportunidades/:numReg" element={<CotizacionDetallePage esOportunidad />} />

                <Route path="cotizaciones" element={<Comercial defaultTab="cotizaciones" />} />
                <Route path="cotizaciones/:numReg" element={<CotizacionDetallePage />} />

                <Route path="aperturas" element={<Comercial defaultTab="aperturas" />} />
                <Route path="aperturas/:numReg" element={<CotizacionDetallePage forcingApertura />} />

                <Route path="programacion" element={<Comercial defaultTab="programacion" />} />
                
                {/* Redirecciones de compatibilidad para URLs legacy en singular */}
                <Route path="cotizacion/:numReg" element={<RedirectToPlural type="cotizaciones" />} />
                <Route path="oportunidad/:numReg" element={<RedirectToPlural type="oportunidades" />} />
                <Route path="apertura/:numReg" element={<RedirectToPlural type="aperturas" />} />
                
                {/* Detalle legacy genérico */}
                <Route path=":numReg" element={<CotizacionDetallePage />} />
                
                {/* Nueva: /sigecom/comercial/nueva */}
                <Route path="nueva" element={<CotizacionNuevaModal />} />
              </Route>

              {/* Módulo Logistica */}
              <Route path="logistica">
                <Route index element={<Navigate to="entradas" replace />} />
                <Route path="entradas">
                  <Route index element={<LogisticaDashboard defaultTab="entrada" />} />
                  <Route path=":numReg" element={<LogisticaDetallePage operacion="E" />} />
                </Route>
                <Route path="salidas">
                  <Route index element={<LogisticaDashboard defaultTab="salida" />} />
                  <Route path=":numReg" element={<LogisticaDetallePage operacion="S" />} />
                </Route>
                <Route path="kardex" element={<LogisticaDashboard defaultTab="kardex" />} />
                <Route path="tablas" element={<LogisticaTablas />} />
              </Route>

              {/* Módulo Maestro / Tablas */}
              <Route path="maestro">
                <Route path="catalogo" element={<CatalogoMarcas />} />
                <Route path="estructura" element={<EstructuraComercial />} />
                <Route path="parametros" element={<ParametrosVentas />} />
                <Route path="gastos" element={<GastosAnalisis />} />
              </Route>

              {/* Otros Módulos */}
              <Route path="proyectos" element={<MockModulePage title="Proyectos" />} />

              {/* Módulo Compras */}
              <Route path="compras">
                <Route index element={<Navigate to="programacion" replace />} />
                <Route path="programacion" element={<Compras defaultTab="programacion" />} />
                <Route path="programacion/:id_apertura" element={<ProgramacionDetallePage />} />
                <Route path="atencion" element={<Compras defaultTab="atencion" />} />
                <Route path="atencion/:id_solicitud" element={<CompraDetallePage />} />
                <Route path="liquidaciones" element={<Compras defaultTab="liquidaciones" />} />
              </Route>

              {/* Módulo Caja Chica */}
              <Route path="caja-chica">
                <Route index element={<CajaChicaHome />} />
                <Route path="solicitud" element={<SolicitudDashboard />} />
                <Route path="solicitud/nueva" element={<NuevaSolicitud />} />
                <Route path="solicitud/mis-solicitudes" element={<MisSolicitudes />} />
                <Route path="solicitudes/:nro_solicitud" element={<DetallesSolicitud />} />
                <Route path="atencion-solicitudes" element={<AtencionSolicitudes />} />
                <Route path="liquidaciones/presentar" element={<LiquidacionesPendientes />} />
                <Route path="liquidaciones/presentar/:id" element={<PresentarDocumentacionModal />} />
                <Route path="liquidaciones/solicitud/:id/documento" element={<SubirArchivoModal />} />
                <Route path="gastos/aprobacion-liquidacion" element={<AprobacionLiquidaciones />} />
                <Route path="movimientos/arqueo" element={<CajaChicaArqueo />} />
                <Route path="registros/actividades" element={<RegistroActividades />} />
                <Route path="reportes" element={<Reportes />} />
              </Route>
              <Route path="almacen" element={<MockModulePage title="Almacén" />} />
              <Route path="finanzas" element={<MockModulePage title="Finanzas" />} />
              <Route path="audit" element={<MockModulePage title="Auditoría" />} />

              {/* Sugerencias y Quejas */}
              <Route path="sugerencias" element={<Sugerencias />} />
              <Route path="sugerencias/:id" element={<SugerenciaDetalle />} />

              {/* Configuración de Usuarios */}
              <Route path="usuarios" element={<ConfiguracionUsuariosPage />} />
            </Route>

            {/* Redirects actualizados */}
            <Route path="/" element={<Navigate to="/comercial" replace />} />
            <Route path="*" element={<Navigate to="/comercial" replace />} />
          </Routes>

        </KeyboardProvider>
      </AuthProvider>
    </Router>
  );
}

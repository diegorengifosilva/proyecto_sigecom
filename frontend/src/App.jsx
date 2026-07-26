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
import CotizacionesHome from "./dashboard/comercial/Home/CotizacionesHome";
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

import { KeyboardProvider } from "@/context/KeyboardContext.jsx";
import MockModulePage from "@/dashboard/layout/MockModulePage";
import * as Icons from "lucide-react";

// Redirecciona rutas singulares legacy a sus plurales unificados
const RedirectToPlural = ({ type }) => {
  const { numReg } = useParams();
  return <Navigate to={`/sigecom/comercial/${type}/${numReg}`} replace />;
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
              path="/sigecom/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Inicio */}
              <Route path="home" element={<CotizacionesHome />} />

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
              <Route path="compras" element={<MockModulePage title="Compras" />} />
              <Route path="almacen" element={<MockModulePage title="Almacén" />} />
              <Route path="finanzas" element={<MockModulePage title="Finanzas" />} />
              <Route path="audit" element={<MockModulePage title="Auditoría" />} />
            </Route>

            {/* Redirects actualizados */}
            <Route path="/" element={<Navigate to="/sigecom/comercial" replace />} />
            <Route path="*" element={<Navigate to="/sigecom/comercial" replace />} />
          </Routes>

        </KeyboardProvider>
      </AuthProvider>
    </Router>
  );
}

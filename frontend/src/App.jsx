// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import GlobalNavbar from "@/dashboard/layout/GlobalNavbar.jsx";

// DASHBOARDS DE PRUEBA PARA COTIZACIONES
import CotizacionesHome from "./dashboard/comercial/Home/CotizacionesHome";
import AprobacionCotizacion from "./dashboard/comercial/AprobacionCotizacion";
import CotizacionDetallePage from "./dashboard/comercial/CotizacionDetallePage";
import LogisticaDashboard from "./dashboard/logistica/LogisticaDashboard";
import AlmacenDashboard from "./dashboard/almacen/AlmacenDashboard";

// TABLAS
import EstructuraComercial from "./dashboard/Tablas/EstructuraComercial/EstructuraComercial";
import ParametrosVentas from "./dashboard/Tablas/ParametrosVentas/ParametrosVentas";
import CatalogoMarcas from "./dashboard/Tablas/CatalogoMarcas/CatalogoMarcas";
import GastosAnalisis from "./dashboard/Tablas/Gastos_Analisis/GastosAnalisis";

// MODAL NUEVA COTIZACIÓN
import CotizacionNuevaModal from "./modal/CotizacionNuevaModal";

import { KeyboardProvider } from "@/context/KeyboardContext.jsx";
import MockModulePage from "@/dashboard/layout/MockModulePage";
import * as Icons from "lucide-react";

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

            {/* Protected */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Home */}
              <Route path="cotizaciones-home" element={<CotizacionesHome />} />

              {/* Aprobación */}
              <Route
                path="aprobacion-cotizacion"
                element={<AprobacionCotizacion />}
              />

              <Route
                path="cotizacion-detalle/:numReg"
                element={<CotizacionDetallePage />}
              />

              <Route
                path="oportunidad-detalle/:numReg"
                element={<CotizacionDetallePage esOportunidad />}
              />

              {/* Logística */}
              <Route
                path="logistica/dashboard"
                element={<LogisticaDashboard />}
              />

              {/* Nueva Cotización */}
              <Route
                path="cotizaciones/nueva"
                element={<CotizacionNuevaModal />}
              />

              {/* Estructura y Comercial */}
              <Route
                path="tablas/estructura"
                element={<EstructuraComercial />}
              />

              {/* Parámetros de Ventas */}
              <Route
                path="tablas/parametros"
                element={<ParametrosVentas />}
              />
              {/* Catálogo de Productos */}
              <Route
                path="tablas/catalogo"
                element={<CatalogoMarcas />}
              />
              {/* Clasificación de Gastos y Análisis */}
              <Route
                path="tablas/gastos"
                element={<GastosAnalisis />}
              />
              {/* Otros Módulos */}
              <Route path="compras" element={<MockModulePage title="Compras" icon={Icons.ShoppingCart} />} />
              <Route path="almacen" element={<AlmacenDashboard />} />
              <Route path="finanzas" element={<MockModulePage title="Finanzas" icon={Icons.DollarSign} />} />
              <Route path="proyectos" element={<MockModulePage title="Proyectos" icon={Icons.Briefcase} />} />
              <Route path="audit" element={<MockModulePage title="Auditoría" icon={Icons.ShieldCheck} />} />
            </Route>

            {/* Redirect */}
            <Route
              path="/"
              element={<Navigate to="/dashboard/aprobacion-cotizacion" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard/aprobacion-cotizacion" replace />}
            />
          </Routes>

        </KeyboardProvider>
      </AuthProvider>
    </Router>
  );
}

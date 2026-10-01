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
import ClienteDetalle from "./dashboard/Tablas/EstructuraComercial/ClienteDetalle";
import MaestroCompras from "./dashboard/Tablas/MaestroCompras/MaestroCompras";
import ParametrosVentas from "./dashboard/Tablas/ParametrosVentas/ParametrosVentas";
import CatalogoMarcas from "./dashboard/Tablas/CatalogoMarcas/CatalogoMarcas";
import GastosAnalisis from "./dashboard/Tablas/Gastos_Analisis/GastosAnalisis";

// LOGISTICA Y COMPRAS
import LogisticaDashboard from "./dashboard/logistica/LogisticaDashboard";
import LogisticaDetallePage from "./dashboard/logistica/LogisticaDetallePage";
import LogisticaTablas from "./dashboard/logistica/LogisticaTablas";
import Compras from "./dashboard/compras/Compras";
import ComprasDashboard from "./dashboard/compras/ComprasDashboard";
import ComprasTrazabilidadHub from "./dashboard/compras/ComprasTrazabilidadHub";
import ComprasProveedoresHub from "./dashboard/compras/ComprasProveedoresHub";
import ComprasReportesEjecutivosHub from "./dashboard/compras/ComprasReportesEjecutivosHub";
import ComprasPresupuestoHub from "./dashboard/compras/ComprasPresupuestoHub";
import CompraDetallePage from "./dashboard/compras/CompraDetallePage";
import PasajeDetallePage from "./dashboard/compras/PasajeDetallePage";
import CajaChicaDetallePage from "./dashboard/compras/CajaChicaDetallePage";
import ProgramacionDetallePage from "./dashboard/compras/ProgramacionDetallePage";
import PlanInversionDetallePage from "./dashboard/compras/PlanInversionDetallePage";

// CAJA CHICA
import CajaChica from "./dashboard/caja_chica/CajaChica";
import CajaChicaDashboard from "./dashboard/caja_chica/CajaChicaDashboard";
import CajaChicaPortalHub from "./dashboard/caja_chica/CajaChicaPortalHub";
import CajaChicaDestinatarioHub from "./dashboard/caja_chica/CajaChicaDestinatarioHub";
import CajaChicaClientesHub from "./dashboard/caja_chica/CajaChicaClientesHub";
import CajaChicaArqueoReportesHub from "./dashboard/caja_chica/CajaChicaArqueoReportesHub";
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
import PlanInversionAnual from "./dashboard/plan_inversion/PlanInversionAnual";

// MODULO HSEQ
import HseqDashboard from "./dashboard/hseq/HseqDashboard";
import CapacitacionesHseqHub from "./dashboard/hseq/CapacitacionesHseqHub";
import InduccionCompetenciasHub from "./dashboard/hseq/InduccionCompetenciasHub";
import ColaboradoresPortalHub from "./dashboard/hseq/ColaboradoresPortalHub";
import AdministracionHseqHub from "./dashboard/hseq/AdministracionHseqHub";
import ColaboradorLegajoDetalle from "./dashboard/hseq/ColaboradorLegajoDetalle";

// MODULO PROYECTOS (COMPLETO)
import ProjectsHome from "./dashboard/proyectos/pages/Dashboard/Home";
import ProjectsList from "./dashboard/proyectos/pages/Dashboard/Proyectos";
import SoloDetalles from "./dashboard/proyectos/pages/Dashboard/SoloDetalles";
import ProjectEvaluations from "./dashboard/proyectos/pages/Dashboard/Evaluaciones";
import GestionRiesgos from "./dashboard/proyectos/pages/Dashboard/GestionRiesgos";
import ReportesEjecutivos from "./dashboard/proyectos/pages/Dashboard/ReportesEjecutivos";

// MODULO RRHH
import RrhhDashboard from "./dashboard/rrhh/RrhhDashboard";
import RrhhPersonalHub from "./dashboard/rrhh/RrhhPersonalHub";
import RrhhDesarrolloHub from "./dashboard/rrhh/RrhhDesarrolloHub";
import RrhhNominaPortalHub from "./dashboard/rrhh/RrhhNominaPortalHub";
import RrhhColaboradorDetalle from "./dashboard/rrhh/RrhhColaboradorDetalle";

// MODULO EMERGENCIAS Y BRIGADAS
import EmergenciasDashboard from "./dashboard/emergencias/EmergenciasDashboard";
import EmergenciasBrigadistasHub from "./dashboard/emergencias/EmergenciasBrigadistasHub";
import EmergenciasOperacionesHub from "./dashboard/emergencias/EmergenciasOperacionesHub";
import EmergenciasEquipamientoHub from "./dashboard/emergencias/EmergenciasEquipamientoHub";

// MODULO SALUD OCUPACIONAL (EMO)
import SaludDashboard from "./dashboard/salud_ocupacional/SaludDashboard";
import SaludEmoHub from "./dashboard/salud_ocupacional/SaludEmoHub";
import SaludVigilanciaHub from "./dashboard/salud_ocupacional/SaludVigilanciaHub";
import SaludHabilitacionesHub from "./dashboard/salud_ocupacional/SaludHabilitacionesHub";

// MODULO SEGURIDAD Y ADMINISTRACION GENERAL
import SeguridadUsuarios from "./dashboard/seguridad/SeguridadUsuarios";
import SeguridadClaves from "./dashboard/seguridad/SeguridadClaves";
import SeguridadAuditoria from "./dashboard/seguridad/SeguridadAuditoria";

// MODULO CAPA DE INTEGRACION SIGECOM
import IntegracionMonitor from "./dashboard/integracion/IntegracionMonitor";
import IntegracionComercial from "./dashboard/integracion/IntegracionComercial";
import IntegracionPersonas from "./dashboard/integracion/IntegracionPersonas";
import IntegracionIncidencias from "./dashboard/integracion/IntegracionIncidencias";


import { KeyboardProvider } from "@/context/KeyboardContext.jsx";
import OutlookLauncher, { isOutlookLaunchPath } from "@/utils/OutlookLauncher.jsx";
import MockModulePage from "@/dashboard/layout/MockModulePage";
import * as Icons from "lucide-react";

// Redirecciona rutas singulares legacy a sus plurales unificados
const RedirectToPlural = ({ type }) => {
  const { numReg } = useParams();
  return <Navigate to={`/comercial/${type}/${numReg}`} replace />;
};

export default function App() {
  if (isOutlookLaunchPath()) {
    return <OutlookLauncher />;
  }

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
                <Route index element={<Navigate to="comercial" replace />} />
                <Route path="comercial">
                  <Route index element={<EstructuraComercial />} />
                  <Route path=":id" element={<ClienteDetalle />} />
                  <Route path="cliente/:id" element={<ClienteDetalle />} />
                </Route>
                <Route path="compras">
                  <Route index element={<MaestroCompras />} />
                  <Route path=":id" element={<ClienteDetalle />} />
                  <Route path="cliente/:id" element={<ClienteDetalle />} />
                </Route>
                <Route path="catalogo" element={<CatalogoMarcas />} />
                <Route path="estructura" element={<EstructuraComercial />} />
                <Route path="parametros" element={<ParametrosVentas />} />
                <Route path="gastos" element={<GastosAnalisis />} />
              </Route>

              {/* Otros Módulos */}
              <Route path="proyectos" element={<MockModulePage title="Proyectos" />} />

              {/* Módulo Compras */}
              <Route path="compras">
                <Route index element={<ComprasDashboard />} />
                <Route path="dashboard" element={<ComprasDashboard />} />
                <Route path="ciclo" element={<Navigate to="/compras/programacion" replace />} />
                <Route path="operaciones" element={<Navigate to="/compras/programacion" replace />} />
                <Route path="trazabilidad" element={<ComprasTrazabilidadHub defaultTab="rastreador" />} />
                <Route path="proveedores" element={<ComprasProveedoresHub defaultTab="proveedores" />} />
                <Route path="reportes" element={<ComprasReportesEjecutivosHub defaultTab="centro" />} />
                <Route path="presupuesto" element={<ComprasReportesEjecutivosHub defaultTab="proyecto" />} />

                {/* Deep links legacy hacia Compras */}
                <Route path="programacion" element={<Compras defaultTab="programacion" />} />
                <Route path="programacion/:id_apertura" element={<ProgramacionDetallePage />} />
                <Route path="plan-inversion/:id_plan" element={<PlanInversionDetallePage />} />
                <Route path="atencion" element={<Compras defaultTab="atencion" />} />
                <Route path="atencion/:id_solicitud" element={<CompraDetallePage />} />
                <Route path="pasajes/:id_pasaje" element={<PasajeDetallePage />} />
                <Route path="caja-chica/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="liquidaciones" element={<Compras defaultTab="liquidaciones" />} />
              </Route>

              {/* Módulo Caja Chica */}
              <Route path="caja-chica">
                <Route index element={<CajaChicaDashboard />} />
                <Route path="dashboard" element={<CajaChicaDashboard />} />
                <Route path="operaciones" element={<CajaChica defaultTab="atencion" />} />
                <Route path="portal" element={<CajaChicaPortalHub defaultTab="resumen" />} />
                <Route path="destinatario" element={<CajaChicaDestinatarioHub defaultTab="rendicion" />} />
                <Route path="clientes" element={<CajaChicaClientesHub defaultTab="clientes" />} />
                <Route path="arqueo-reportes" element={<CajaChicaArqueoReportesHub defaultTab="arqueo" />} />

                {/* Deep links legacy hacia Caja Chica */}
                <Route path="atencion" element={<CajaChica defaultTab="atencion" />} />
                <Route path="atencion/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="liquidaciones" element={<CajaChica defaultTab="liquidaciones" />} />
                <Route path="liquidaciones/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="aprobacion" element={<CajaChica defaultTab="aprobacion" />} />
                <Route path="aprobacion/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="caja_chica" element={<CajaChica defaultTab="caja_chica" />} />
                <Route path="caja_chica/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="caja-chica" element={<CajaChica defaultTab="caja_chica" />} />
                <Route path="caja-chica/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="guias_salida" element={<CajaChica defaultTab="guias_salida" />} />
                <Route path="guias_salida/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="guias-salida" element={<CajaChica defaultTab="guias_salida" />} />
                <Route path="guias-salida/:id_caja_chica" element={<CajaChicaDetallePage />} />
                <Route path="pasajes/:id_pasaje" element={<PasajeDetallePage />} />
                <Route path="solicitud" element={<CajaChicaPortalHub defaultTab="resumen" />} />
                <Route path="solicitud/nueva" element={<CajaChicaPortalHub defaultTab="solicitud-nueva" />} />
                <Route path="solicitud/mis-solicitudes" element={<CajaChicaPortalHub defaultTab="mis-solicitudes" />} />
                <Route path="solicitudes/:nro_solicitud" element={<CajaChicaDetallePage />} />
                <Route path="solicitud/:nro_solicitud" element={<CajaChicaDetallePage />} />
                <Route path="atencion-solicitudes" element={<CajaChica defaultTab="atencion" />} />
                <Route path="liquidaciones/presentar" element={<CajaChica defaultTab="liquidaciones" />} />
                <Route path="liquidaciones/presentar/:id" element={<PresentarDocumentacionModal />} />
                <Route path="liquidaciones/solicitud/:id/documento" element={<SubirArchivoModal />} />
                <Route path="gastos/aprobacion-liquidacion" element={<CajaChica defaultTab="aprobacion" />} />
                <Route path="movimientos/arqueo" element={<CajaChicaArqueoReportesHub defaultTab="arqueo" />} />
                <Route path="registros/actividades" element={<CajaChicaArqueoReportesHub defaultTab="actividades" />} />
                <Route path="reportes" element={<CajaChicaArqueoReportesHub defaultTab="reportes" />} />
                <Route path=":id_caja_chica" element={<CajaChicaDetallePage />} />
              </Route>
              <Route path="almacen" element={<MockModulePage title="Almacén" />} />
              <Route path="finanzas" element={<MockModulePage title="Finanzas" />} />
              <Route path="audit" element={<MockModulePage title="Auditoría" />} />

              {/* Sugerencias y Quejas */}
              <Route path="sugerencias" element={<Sugerencias />} />
              <Route path="sugerencias/:id" element={<SugerenciaDetalle />} />

              {/* Configuración de Usuarios */}
              <Route path="usuarios" element={<ConfiguracionUsuariosPage />} />

              {/* Plan de Inversión Anual (TI / SuperAdmin) */}
              <Route path="plan-inversion-anual" element={<PlanInversionAnual />} />
              <Route path="plan-inversion-anual/:id_plan" element={<PlanInversionDetallePage />} />

              {/* Módulo HSEQ */}
              <Route path="hseq">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<HseqDashboard />} />

                {/* 1. Gestión de Capacitaciones */}
                <Route path="capacitaciones" element={<CapacitacionesHseqHub />} />
                <Route path="capacitaciones/programa" element={<CapacitacionesHseqHub defaultTab="programa" />} />
                <Route path="capacitaciones/evaluaciones" element={<CapacitacionesHseqHub defaultTab="evaluaciones" />} />
                <Route path="capacitaciones/encuestas" element={<CapacitacionesHseqHub defaultTab="encuestas" />} />
                <Route path="capacitaciones/seguimiento" element={<CapacitacionesHseqHub defaultTab="seguimiento" />} />

                {/* 2. Inducción y Competencias */}
                <Route path="induccion-competencias" element={<InduccionCompetenciasHub />} />
                <Route path="induccion-competencias/inducciones" element={<InduccionCompetenciasHub defaultTab="inducciones" />} />
                <Route path="induccion-competencias/competencias" element={<InduccionCompetenciasHub defaultTab="competencias" />} />
                <Route path="induccion-competencias/certificaciones" element={<InduccionCompetenciasHub defaultTab="certificaciones" />} />

                {/* 3. Colaboradores y Portal */}
                <Route path="colaboradores-portal" element={<ColaboradoresPortalHub />} />
                <Route path="colaboradores-portal/colaboradores" element={<ColaboradoresPortalHub defaultTab="colaboradores" />} />
                <Route path="colaboradores-portal/mi-capacitacion" element={<ColaboradoresPortalHub defaultTab="mi-capacitacion" />} />
                <Route path="colaboradores-portal/mi-induccion" element={<ColaboradoresPortalHub defaultTab="mi-induccion" />} />

                {/* 4. Administración y Datos */}
                <Route path="administracion" element={<AdministracionHseqHub />} />
                <Route path="administracion/configuracion" element={<AdministracionHseqHub defaultTab="configuracion" />} />
                <Route path="administracion/importacion" element={<AdministracionHseqHub defaultTab="importacion" />} />

                {/* Redirecciones y deep links legacy para compatibilidad */}
                <Route path="programa" element={<CapacitacionesHseqHub defaultTab="programa" />} />
                <Route path="evaluaciones" element={<CapacitacionesHseqHub defaultTab="evaluaciones" />} />
                <Route path="encuestas" element={<CapacitacionesHseqHub defaultTab="encuestas" />} />
                <Route path="seguimiento" element={<CapacitacionesHseqHub defaultTab="seguimiento" />} />
                <Route path="inducciones" element={<InduccionCompetenciasHub defaultTab="inducciones" />} />
                <Route path="competencias" element={<InduccionCompetenciasHub defaultTab="competencias" />} />
                <Route path="certificaciones-tar" element={<InduccionCompetenciasHub defaultTab="certificaciones" />} />
                <Route path="colaboradores" element={<ColaboradoresPortalHub defaultTab="colaboradores" />} />
                <Route path="colaboradores/:id" element={<ColaboradorLegajoDetalle />} />
                <Route path="mi-capacitacion" element={<ColaboradoresPortalHub defaultTab="mi-capacitacion" />} />
                <Route path="mi-induccion" element={<ColaboradoresPortalHub defaultTab="mi-induccion" />} />
                <Route path="configuracion" element={<AdministracionHseqHub defaultTab="configuracion" />} />
                <Route path="importacion" element={<AdministracionHseqHub defaultTab="importacion" />} />
              </Route>

              {/* Módulo Proyectos (COMPLETO) */}
              <Route path="proyectos">
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<ProjectsHome />} />
                <Route path="dashboard" element={<Navigate to="/proyectos/home" replace />} />
                <Route path="mis-proyectos" element={<ProjectsList />} />
                <Route path="lista" element={<Navigate to="/proyectos/mis-proyectos" replace />} />
                <Route path="mis-proyectos/:codigo" element={<SoloDetalles />} />
                <Route path=":id" element={<SoloDetalles />} />
                
                {/* Atajos y Vistas Operativas unificadas en Mis Proyectos */}
                <Route path="cronograma" element={<ProjectsList defaultTab="cronograma" />} />
                <Route path="costos" element={<ProjectsList defaultTab="costos" />} />
                <Route path="recursos" element={<ProjectsList defaultTab="recursos" />} />
                <Route path="avance" element={<ProjectsList defaultTab="avance" />} />
                <Route path="cronogramas" element={<ProjectsList defaultTab="cronograma" />} />

                {/* Evaluaciones Estratégicas */}
                <Route path="evaluaciones" element={<ProjectEvaluations />} />
                <Route path="evaluaciones/nueva" element={<ProjectEvaluations defaultTab="nueva" />} />
                <Route path="evaluaciones/historial" element={<ProjectEvaluations defaultTab="historial" />} />
                <Route path="evaluaciones/escenarios" element={<ProjectEvaluations defaultTab="escenarios" />} />

                {/* Gestión de Riesgos */}
                <Route path="riesgos" element={<GestionRiesgos />} />
                <Route path="riesgos/registrar" element={<GestionRiesgos defaultTab="registrar" />} />
                <Route path="riesgos/impacto" element={<GestionRiesgos defaultTab="impacto" />} />

                {/* Reportes Ejecutivos */}
                <Route path="reportes" element={<ReportesEjecutivos />} />
                <Route path="reportes/proyecto" element={<ReportesEjecutivos defaultTab="proyecto" />} />
                <Route path="reportes/comparativo" element={<ReportesEjecutivos defaultTab="comparativo" />} />
                <Route path="reportes/exportar" element={<ReportesEjecutivos defaultTab="exportar" />} />
              </Route>

              {/* Módulo Recursos Humanos (RR. HH.) */}
              <Route path="rrhh">
                <Route index element={<RrhhDashboard />} />
                {/* Hubs principales */}
                <Route path="personal" element={<RrhhPersonalHub defaultTab="colaboradores" />} />
                <Route path="desarrollo" element={<RrhhDesarrolloHub defaultTab="inducciones" />} />
                <Route path="nomina-portal" element={<RrhhNominaPortalHub defaultTab="planillas" />} />
                <Route path="colaboradores/:id" element={<RrhhColaboradorDetalle />} />

                {/* Deep links legacy hacia Hubs */}
                <Route path="reclutamiento" element={<RrhhPersonalHub defaultTab="reclutamiento" />} />
                <Route path="colaboradores" element={<RrhhPersonalHub defaultTab="colaboradores" />} />
                <Route path="estructura" element={<RrhhPersonalHub defaultTab="estructura" />} />
                <Route path="inducciones" element={<RrhhDesarrolloHub defaultTab="inducciones" />} />
                <Route path="capacitaciones" element={<RrhhDesarrolloHub defaultTab="capacitaciones" />} />
                <Route path="boletines" element={<RrhhDesarrolloHub defaultTab="boletines" />} />
                <Route path="emos" element={<RrhhNominaPortalHub defaultTab="emos" />} />
                <Route path="planillas" element={<RrhhNominaPortalHub defaultTab="planillas" />} />
                <Route path="integraciones" element={<RrhhNominaPortalHub defaultTab="integraciones" />} />
                <Route path="mi-informacion" element={<RrhhNominaPortalHub defaultTab="mi-informacion" />} />
              </Route>

              {/* Módulo Gestión de Emergencias y Brigadas */}
              <Route path="emergencias">
                <Route index element={<EmergenciasDashboard />} />
                {/* Hubs principales */}
                <Route path="brigadistas" element={<EmergenciasBrigadistasHub defaultTab="conformacion" />} />
                <Route path="operaciones" element={<EmergenciasOperacionesHub defaultTab="programa" />} />
                <Route path="equipamiento" element={<EmergenciasEquipamientoHub defaultTab="equipos" />} />

                {/* Deep links legacy hacia Hubs */}
                <Route path="conformacion" element={<EmergenciasBrigadistasHub defaultTab="conformacion" />} />
                <Route path="salud" element={<EmergenciasBrigadistasHub defaultTab="salud" />} />
                <Route path="competencias" element={<EmergenciasBrigadistasHub defaultTab="competencias" />} />
                <Route path="programa" element={<EmergenciasOperacionesHub defaultTab="programa" />} />
                <Route path="intervenciones" element={<EmergenciasOperacionesHub defaultTab="intervenciones" />} />
                <Route path="informes" element={<EmergenciasOperacionesHub defaultTab="informes" />} />
                <Route path="acciones" element={<EmergenciasOperacionesHub defaultTab="acciones" />} />
                <Route path="equipos" element={<EmergenciasEquipamientoHub defaultTab="equipos" />} />
                <Route path="inspecciones" element={<EmergenciasEquipamientoHub defaultTab="inspecciones" />} />
                <Route path="formatos" element={<EmergenciasEquipamientoHub defaultTab="formatos" />} />
              </Route>

              {/* Módulo Salud Ocupacional y Vigilancia Médica (EMO) */}
              <Route path="salud-ocupacional">
                <Route index element={<SaludDashboard />} />
                {/* Hubs principales */}
                <Route path="gestion-emo" element={<SaludEmoHub defaultTab="expedientes" />} />
                <Route path="vigilancia" element={<SaludVigilanciaHub defaultTab="gestion-medica" />} />
                <Route path="habilitaciones-red" element={<SaludHabilitacionesHub defaultTab="habilitaciones" />} />

                {/* Deep links legacy hacia Hubs */}
                <Route path="expedientes" element={<SaludEmoHub defaultTab="expedientes" />} />
                <Route path="agenda" element={<SaludEmoHub defaultTab="agenda" />} />
                <Route path="vigencias" element={<SaludEmoHub defaultTab="vigencias" />} />
                <Route path="retiros" element={<SaludEmoHub defaultTab="retiros" />} />
                <Route path="gestion-medica" element={<SaludVigilanciaHub defaultTab="gestion-medica" />} />
                <Route path="vida-saludable" element={<SaludVigilanciaHub defaultTab="vida-saludable" />} />
                <Route path="colaboradores" element={<SaludVigilanciaHub defaultTab="colaboradores" />} />
                <Route path="documentos" element={<SaludVigilanciaHub defaultTab="documentos" />} />
                <Route path="habilitaciones" element={<SaludHabilitacionesHub defaultTab="habilitaciones" />} />
                <Route path="clientes" element={<SaludHabilitacionesHub defaultTab="clientes" />} />
                <Route path="clinicas" element={<SaludHabilitacionesHub defaultTab="clinicas" />} />
                <Route path="correcciones" element={<SaludHabilitacionesHub defaultTab="correcciones" />} />
                <Route path="drive-sync" element={<SaludHabilitacionesHub defaultTab="drive-sync" />} />
              </Route>

              {/* Módulo Seguridad y Administración General */}
              <Route path="seguridad">
                <Route index element={<Navigate to="usuarios" replace />} />
                <Route path="usuarios" element={<SeguridadUsuarios />} />
                <Route path="claves" element={<SeguridadClaves />} />
                <Route path="auditoria" element={<SeguridadAuditoria />} />
              </Route>
              <Route path="administracion/usuarios" element={<Navigate to="/seguridad/usuarios" replace />} />
              <Route path="mi-cuenta/clave" element={<Navigate to="/seguridad/claves" replace />} />

              {/* Módulo Capa de Integración SIGECOM */}
              <Route path="integracion">
                <Route index element={<Navigate to="monitor" replace />} />
                <Route path="monitor" element={<IntegracionMonitor />} />
                <Route path="comercial" element={<IntegracionComercial />} />
                <Route path="personas" element={<IntegracionPersonas />} />
                <Route path="incidencias" element={<IntegracionIncidencias />} />
              </Route>
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

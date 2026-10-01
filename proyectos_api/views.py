from rest_framework import viewsets, permissions, status
from .models import (
    ProyectoEv, HistorialEv, TareaEv, CurvaEv, GastoReal, HorasHombreReal,
    AvanceFisico, AvanceFinanciero, MiembroEquipoEv, CronogramaVersion, Tarea,
    DocumentoProyecto, Riesgo, Cambio, RecursoProyecto, AsignacionRecursoTarea,
    ChecklistCalidad, ItemChecklist, Comunicacion, Compra, Nota, InformeEjecutivo
)
from .serializers import (
    ProyectoEvSerializer, HistorialEvSerializer, TareaEvSerializer,
    CurvaEvSerializer, GastoRealSerializer, HorasHombreRealSerializer,
    AvanceFisicoSerializer, AvanceFinancieroSerializer, MiembroEquipoEvSerializer,
    RiesgoSerializer, CambioSerializer, RecursoProyectoSerializer,
    AsignacionRecursoTareaSerializer, ChecklistCalidadSerializer, ItemChecklistSerializer,
    ComunicacionSerializer, CompraSerializer, NotaSerializer, InformeEjecutivoSerializer
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from .models import CurvaEv, ProyectoEv, TareaEv
from .services import calcular_curva_s, actualizar_metricas_ev, generar_cronograma, cargar_cronograma_desde_excel
from django.shortcuts import get_object_or_404
from datetime import datetime
from django.utils import timezone

class ProyectoEvViewSet(viewsets.ModelViewSet):
    queryset = ProyectoEv.objects.all().order_by('-fecha_creacion')
    serializer_class = ProyectoEvSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = ProyectoEv.objects.all().order_by('-fecha_creacion')
        estado = self.request.query_params.get('estado')
        unidad = self.request.query_params.get('unidad_negocio')
        search = self.request.query_params.get('search')
        usuario = self.request.query_params.get('usuario')

        if estado:
            qs = qs.filter(estado=estado)
        if unidad:
            qs = qs.filter(unidad_negocio=unidad)
        if usuario:
            qs = qs.filter(usuario_id=usuario)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(nombre__icontains=search) |
                Q(codigo__icontains=search) |
                Q(cliente__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        user_id = self.request.user.id if self.request.user and self.request.user.is_authenticated else 1
        serializer.save(usuario_id=user_id)

    @action(detail=False, methods=['get'], url_path='cronograma')
    def vista_cronograma(self, request):
        """
        Vista rápida de cronogramas de todos los proyectos del usuario
        GET /api/proyectos-ev/proyectos/cronograma/
        """
        proyectos = self.get_queryset()
        data = []

        for proyecto in proyectos:
            # Obtener cronograma activo
            cronograma = CronogramaVersion.objects.filter(
                proyecto=proyecto,
                es_activa=True
            ).first()

            if cronograma:
                tareas_count = cronograma.tareas.count()
                tareas_completadas = cronograma.tareas.filter(es_resumen=False).count()

                data.append({
                    'proyecto_id': proyecto.id,
                    'proyecto_codigo': proyecto.codigo,
                    'proyecto_nombre': proyecto.nombre,
                    'cronograma_id': cronograma.id,
                    'cronograma_nombre': cronograma.nombre,
                    'total_tareas': tareas_count,
                    'tareas_completadas': tareas_completadas,
                    'fecha_actualizacion': cronograma.fecha_modificacion,
                })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='costos')
    def vista_costos(self, request):
        """
        Vista rápida de costos de todos los proyectos del usuario
        GET /api/proyectos-ev/proyectos/costos/
        """
        proyectos = self.get_queryset()
        data = []

        for proyecto in proyectos:
            # Obtener última curva EV
            ultima_curva = CurvaEv.objects.filter(proyecto=proyecto).order_by('-fecha').first()

            presupuesto = proyecto.presupuesto_total or 0
            ac = ultima_curva.ac if ultima_curva else 0
            ev = ultima_curva.ev if ultima_curva else 0
            cpi = round(ev / ac, 2) if ac > 0 else 0

            data.append({
                'proyecto_id': proyecto.id,
                'proyecto_codigo': proyecto.codigo,
                'proyecto_nombre': proyecto.nombre,
                'presupuesto_total': presupuesto,
                'costo_actual': ac,
                'valor_ganado': ev,
                'cpi': cpi,
                'variacion_costo': ev - ac,
            })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='recursos')
    def vista_recursos(self, request):
        """
        Vista rápida de recursos de todos los proyectos del usuario
        GET /api/proyectos-ev/proyectos/recursos/
        """
        proyectos = self.get_queryset()
        data = []

        for proyecto in proyectos:
            recursos_count = RecursoProyecto.objects.filter(proyecto=proyecto).count()
            recursos_activos = RecursoProyecto.objects.filter(
                proyecto=proyecto,
                estado='activo'
            ).count()

            asignaciones_count = AsignacionRecursoTarea.objects.filter(
                recurso__proyecto=proyecto
            ).count()

            data.append({
                'proyecto_id': proyecto.id,
                'proyecto_codigo': proyecto.codigo,
                'proyecto_nombre': proyecto.nombre,
                'total_recursos': recursos_count,
                'recursos_activos': recursos_activos,
                'asignaciones': asignaciones_count,
            })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='avance')
    def vista_avance(self, request):
        """
        Vista rápida de avance de todos los proyectos del usuario
        GET /api/proyectos-ev/proyectos/avance/
        """
        proyectos = self.get_queryset()
        data = []

        for proyecto in proyectos:
            # Obtener última curva EV
            ultima_curva = CurvaEv.objects.filter(proyecto=proyecto).order_by('-fecha').first()

            if ultima_curva:
                pv = ultima_curva.pv or 0
                ev = ultima_curva.ev or 0
                ac = ultima_curva.ac or 0
                spi = round(ev / pv, 2) if pv > 0 else 0
                cpi = round(ev / ac, 2) if ac > 0 else 0

                # Calcular % de avance
                presupuesto = proyecto.presupuesto_total or 1
                avance_porcentaje = round((ev / presupuesto) * 100, 1) if presupuesto > 0 else 0
            else:
                spi = 0
                cpi = 0
                avance_porcentaje = 0
                ev = 0
                pv = 0
                ac = 0

            data.append({
                'proyecto_id': proyecto.id,
                'proyecto_codigo': proyecto.codigo,
                'proyecto_nombre': proyecto.nombre,
                'estado': proyecto.estado,
                'avance_porcentaje': avance_porcentaje,
                'spi': spi,
                'cpi': cpi,
                'ev': ev,
                'pv': pv,
                'ac': ac,
                'fecha_inicio': proyecto.fecha_inicio,
                'fecha_fin': proyecto.fecha_fin,
            })

        return Response(data)

    @action(detail=True, methods=['post'], url_path='analizar-ia')
    def analizar_con_ia(self, request, pk=None):
        """
        Analiza el proyecto usando IA generativa de Gemini.
        Retorna análisis con explicaciones para usuarios no-PMPs.

        POST /api/proyectos-ev/proyectos/{id}/analizar-ia/

        Returns:
            - proyecto_id: ID del proyecto
            - proyecto_nombre: Nombre del proyecto
            - analisis_ia: Objeto con análisis detallado
                - estado_sugerido: Estado recomendado por IA
                - estado_sugerido_explicacion: Explicación en lenguaje simple
                - nivel_riesgo: Nivel de riesgo (BAJO/MEDIO/ALTO/CRÍTICO)
                - nivel_riesgo_explicacion: Por qué tiene ese nivel de riesgo
                - recomendaciones: Lista de acciones recomendadas
                - analisis_completo: Análisis detallado en texto
                - glosario: Términos PMI explicados para no-PMPs
            - fecha_analisis: Timestamp del análisis
        """
        proyecto = self.get_object()

        # Cache diario: si ya hay un análisis de hoy, devolverlo sin recalcular
        ahora = timezone.now()
        if proyecto.analisis_ia_cache and proyecto.analisis_ia_fecha:
            if proyecto.analisis_ia_fecha.date() == ahora.date():
                return Response({
                    'success': True,
                    'proyecto_id': proyecto.id,
                    'proyecto_nombre': proyecto.nombre,
                    'proyecto_codigo': proyecto.codigo,
                    'analisis_ia': proyecto.analisis_ia_cache,
                    'fecha_analisis': proyecto.analisis_ia_fecha.isoformat()
                })

        try:
            from proyectos_api.core.ia_provider import analizar_estado_proyecto
            analisis = analizar_estado_proyecto(proyecto)

            # Guardar cache
            proyecto.analisis_ia_cache = analisis
            proyecto.analisis_ia_fecha = ahora
            proyecto.save(update_fields=['analisis_ia_cache', 'analisis_ia_fecha'])

            return Response({
                'success': True,
                'proyecto_id': proyecto.id,
                'proyecto_nombre': proyecto.nombre,
                'proyecto_codigo': proyecto.codigo,
                'analisis_ia': analisis,
                'fecha_analisis': ahora.isoformat()
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error al analizar proyecto con IA: {str(e)}',
                'proyecto_id': proyecto.id,
                'proyecto_nombre': proyecto.nombre
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class HistorialEvViewSet(viewsets.ModelViewSet):
    serializer_class = HistorialEvSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id") or self.request.query_params.get("proyecto")
        if proyecto_id:
            return HistorialEv.objects.filter(proyecto_id=proyecto_id).order_by('fecha_registro')
        return HistorialEv.objects.all().order_by('fecha_registro')
    
class TareaEvViewSet(viewsets.ModelViewSet):
    serializer_class = TareaEvSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id") or self.request.query_params.get("proyecto")
        if proyecto_id:
            return TareaEv.objects.filter(proyecto_id=proyecto_id)
        return TareaEv.objects.all()
    
class CurvaEvViewSet(viewsets.ModelViewSet):
    serializer_class = CurvaEvSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id") or self.request.query_params.get("proyecto")
        if proyecto_id:
            return CurvaEv.objects.filter(proyecto_id=proyecto_id).order_by('fecha')
        return CurvaEv.objects.all().order_by('fecha')
    

@action(detail=True, methods=['get'], url_path='curvas')
def curvas(self, request, pk=None):
    proyecto = self.get_object()
    curvas = CurvaEv.objects.filter(proyecto=proyecto).order_by('fecha')
    serializer = CurvaEvSerializer(curvas, many=True)
    return Response(serializer.data)

@action(detail=True, methods=['get'], url_path='dashboard')
def dashboard(self, request, pk=None):
    proyecto = self.get_object()
    ultima = CurvaEv.objects.filter(proyecto=proyecto).order_by('-fecha').first()

    if not ultima:
        return Response({'detalle': 'No hay datos de curva'}, status=204)

    cpi = round(ultima.ev / ultima.ac, 2) if ultima.ac else None
    spi = round(ultima.ev / ultima.pv, 2) if ultima.pv else None

    return Response({
        'PV': ultima.pv,
        'EV': ultima.ev,
        'AC': ultima.ac,
        'CPI': cpi,
        'SPI': spi,
        'fecha': ultima.fecha
    })

@action(detail=True, methods=['post'], url_path='generar-curvas')
def generar_curvas(self, request, pk=None):
    proyecto = self.get_object()
    resultados = calcular_curva_s(proyecto)
    serializer = CurvaEvSerializer(resultados, many=True)
    return Response(serializer.data)

class ProyectoDashboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        proyecto = get_object_or_404(ProyectoEv, pk=pk)
        historiales = HistorialEv.objects.filter(proyecto=proyecto).order_by('fecha_registro')
        curvas = CurvaEv.objects.filter(proyecto=proyecto).order_by('fecha')

        # Si no hay curvas, calcular y guardar
        if not curvas.exists():
            curvas = calcular_curva_s(proyecto)
        
        # Actualiza métricas EVM con base a curvas actuales
        actualizar_metricas_ev(proyecto)

        return Response({
            "proyecto": ProyectoEvSerializer(proyecto).data,
            "historiales": [h.fecha_registro for h in historiales],
            "curvas": CurvaEvSerializer(curvas, many=True).data
        })

class CurvasProyectoView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        proyecto = get_object_or_404(ProyectoEv, pk=pk)
        curvas = CurvaEv.objects.filter(proyecto=proyecto).order_by('fecha')
        return Response(CurvaEvSerializer(curvas, many=True).data)
    
class CronogramaProyectoView(APIView):
    def get(self, request, pk):
        proyecto = get_object_or_404(ProyectoEv, pk=pk)
        cronograma = generar_cronograma(proyecto)

        return Response(cronograma, status=status.HTTP_200_OK)

class CargarCronogramaExcelView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [permissions.AllowAny]

    def post(self, request, proyecto_id):
        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response({"error": "Archivo no proporcionado."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            resultado = cargar_cronograma_desde_excel(archivo, proyecto_id)
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GastoRealViewSet(viewsets.ModelViewSet):
    queryset = GastoReal.objects.all()
    serializer_class = GastoRealSerializer

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id")
        if proyecto_id:
            return GastoReal.objects.filter(proyecto_id=proyecto_id)
        return GastoReal.objects.none()

class HorasHombreRealViewSet(viewsets.ModelViewSet):
    queryset = HorasHombreReal.objects.all()
    serializer_class = HorasHombreRealSerializer

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id")
        if proyecto_id:
            return HorasHombreReal.objects.filter(proyecto_id=proyecto_id)
        return HorasHombreReal.objects.none()

class AvanceFisicoViewSet(viewsets.ModelViewSet):
    queryset = AvanceFisico.objects.all()
    serializer_class = AvanceFisicoSerializer

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id")
        if proyecto_id:
            return AvanceFisico.objects.filter(proyecto_id=proyecto_id)
        return AvanceFisico.objects.none()

class AvanceFinancieroViewSet(viewsets.ModelViewSet):
    queryset = AvanceFinanciero.objects.all()
    serializer_class = AvanceFinancieroSerializer

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id")
        if proyecto_id:
            return AvanceFinanciero.objects.filter(proyecto_id=proyecto_id)
        return AvanceFinanciero.objects.none()

class MiembroEquipoEvViewSet(viewsets.ModelViewSet):
    queryset = MiembroEquipoEv.objects.all()
    serializer_class = MiembroEquipoEvSerializer

    def get_queryset(self):
        proyecto_id = self.request.query_params.get("proyecto_id")
        if proyecto_id:
            return MiembroEquipoEv.objects.filter(proyecto_id=proyecto_id)
        return MiembroEquipoEv.objects.none()


# ============================================
# VIEWSETS PARA RIESGOS
# ============================================

class RiesgoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de riesgos"""
    serializer_class = RiesgoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return Riesgo.objects.filter(proyecto_id=proyecto_id)
        return Riesgo.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


# ============================================
# VIEWSETS PARA CONTROL DE CAMBIOS
# ============================================

class CambioViewSet(viewsets.ModelViewSet):
    """ViewSet para control de cambios"""
    serializer_class = CambioSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return Cambio.objects.filter(proyecto_id=proyecto_id)
        return Cambio.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


# ============================================
# VIEWSETS PARA RECURSOS
# ============================================

class RecursoProyectoViewSet(viewsets.ModelViewSet):
    """ViewSet para recursos del proyecto"""
    serializer_class = RecursoProyectoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return RecursoProyecto.objects.filter(proyecto_id=proyecto_id)
        return RecursoProyecto.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


class AsignacionRecursoTareaViewSet(viewsets.ModelViewSet):
    """ViewSet para asignaciones de recursos a tareas"""
    serializer_class = AsignacionRecursoTareaSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return AsignacionRecursoTarea.objects.filter(
                recurso__proyecto_id=proyecto_id
            )
        return AsignacionRecursoTarea.objects.none()


# ============================================
# VIEWSETS PARA CALIDAD
# ============================================

class ChecklistCalidadViewSet(viewsets.ModelViewSet):
    """ViewSet para checklists de calidad"""
    serializer_class = ChecklistCalidadSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return ChecklistCalidad.objects.filter(proyecto_id=proyecto_id)
        return ChecklistCalidad.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


class ItemChecklistViewSet(viewsets.ModelViewSet):
    """ViewSet para ítems de checklist"""
    serializer_class = ItemChecklistSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        checklist_id = self.kwargs.get('checklist_pk')
        if checklist_id:
            return ItemChecklist.objects.filter(checklist_id=checklist_id)
        return ItemChecklist.objects.none()


# ============================================
# VIEWSETS PARA COMUNICACIONES
# ============================================

class ComunicacionViewSet(viewsets.ModelViewSet):
    """ViewSet para comunicaciones del proyecto"""
    serializer_class = ComunicacionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return Comunicacion.objects.filter(proyecto_id=proyecto_id)
        return Comunicacion.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


# ============================================
# VIEWSETS PARA COMPRAS
# ============================================

class CompraViewSet(viewsets.ModelViewSet):
    """ViewSet para compras y contratos"""
    serializer_class = CompraSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return Compra.objects.filter(proyecto_id=proyecto_id)
        return Compra.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


# ============================================
# VIEWSETS PARA NOTAS
# ============================================

class NotaViewSet(viewsets.ModelViewSet):
    """ViewSet para notas del proyecto"""
    serializer_class = NotaSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return Nota.objects.filter(proyecto_id=proyecto_id)
        return Nota.objects.none()

    def perform_create(self, serializer):
        proyecto_id = self.kwargs.get('proyecto_pk')
        serializer.save(proyecto_id=proyecto_id)


# ============================================
# VIEWSETS PARA INFORMES EJECUTIVOS
# ============================================

class InformeEjecutivoViewSet(viewsets.ModelViewSet):
    """ViewSet para informes ejecutivos"""
    serializer_class = InformeEjecutivoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        proyecto_id = self.kwargs.get('proyecto_pk')
        if proyecto_id:
            return InformeEjecutivo.objects.filter(proyecto_id=proyecto_id).order_by('-fecha_generacion')
        return InformeEjecutivo.objects.none()

    def perform_create(self, serializer):
        from .generators_informes import generar_informe

        proyecto_id = self.kwargs.get('proyecto_pk')
        proyecto = get_object_or_404(ProyectoEv, pk=proyecto_id)

        # Guardar el informe
        informe = serializer.save(
            proyecto=proyecto,
            generado_por=(self.request.user if (self.request.user and self.request.user.is_authenticated) else None),
            estado='generando'
        )

        # Generar el informe de forma síncrona
        # En producción, se recomienda usar Celery para generación asíncrona
        generar_informe(informe)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None, proyecto_pk=None):
        """
        Endpoint para descargar el archivo del informe
        """
        informe = self.get_object()

        if not informe.archivo:
            return Response(
                {"error": "El informe no tiene archivo generado"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Retornar el archivo
        from django.http import FileResponse
        return FileResponse(
            informe.archivo.open('rb'),
            as_attachment=True,
            filename=informe.nombre_archivo
        )

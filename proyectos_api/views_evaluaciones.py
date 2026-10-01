"""
ViewSets y endpoints API para Evaluaciones Estratégicas

Endpoints principales:
- /api/evaluaciones/escenarios/ - CRUD de escenarios
- /api/evaluaciones/alternativas/ - CRUD de alternativas
- /api/evaluaciones/evaluaciones/ - CRUD de evaluaciones
- /api/evaluaciones/evaluaciones/{id}/ejecutar/ - Ejecutar evaluación
- /api/evaluaciones/evaluaciones/{id}/resultados/ - Ver resultados
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import datetime

from .models import (
    EscenarioEvaluacion,
    AlternativaProyecto,
    EvaluacionEstrategica,
    ResultadoMetodoEvaluacion
)
from .serializers import (
    EscenarioEvaluacionSerializer,
    AlternativaProyectoSerializer,
    EvaluacionEstrategicaSerializer,
    ResultadoMetodoEvaluacionSerializer,
    EjecutarEvaluacionSerializer
)
from proyectos_api.core.evaluacion_financiera import (
    calcular_vpn,
    calcular_tir,
    calcular_roi,
    calcular_payback,
    calcular_bc,
    evaluar_ponderado,
    evaluar_monte_carlo,
    evaluar_random_forest,
    evaluar_ia_generativa,
    generar_conclusion_evaluacion
)


class EscenarioEvaluacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar escenarios de evaluación.

    Endpoints:
    - GET /api/evaluaciones/escenarios/ - Lista de escenarios
    - POST /api/evaluaciones/escenarios/ - Crear escenario
    - GET /api/evaluaciones/escenarios/{id}/ - Detalle de escenario
    - PUT/PATCH /api/evaluaciones/escenarios/{id}/ - Actualizar escenario
    - DELETE /api/evaluaciones/escenarios/{id}/ - Eliminar escenario
    """
    queryset = EscenarioEvaluacion.objects.all()
    serializer_class = EscenarioEvaluacionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated:
            return EscenarioEvaluacion.objects.filter(usuario=self.request.user)
        return EscenarioEvaluacion.objects.all()

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else User.objects.first()
        serializer.save(usuario=user)

    @action(detail=True, methods=['post'], url_path='marcar-predeterminado')
    def marcar_predeterminado(self, request, pk=None):
        """
        POST /api/evaluaciones/escenarios/{id}/marcar-predeterminado/

        Marca este escenario como predeterminado y desmarca los demás.
        """
        escenario = self.get_object()

        # Desmarcar todos los demás
        EscenarioEvaluacion.objects.filter(
            usuario=request.user,
            es_predeterminado=True
        ).exclude(id=escenario.id).update(es_predeterminado=False)

        # Marcar este
        escenario.es_predeterminado = True
        escenario.save()

        return Response({
            'success': True,
            'mensaje': f'Escenario "{escenario.nombre}" marcado como predeterminado'
        })


class AlternativaProyectoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar alternativas de proyecto.

    Endpoints:
    - GET /api/evaluaciones/alternativas/ - Lista de alternativas
    - POST /api/evaluaciones/alternativas/ - Crear alternativa
    - GET /api/evaluaciones/alternativas/{id}/ - Detalle de alternativa
    - PUT/PATCH /api/evaluaciones/alternativas/{id}/ - Actualizar alternativa
    - DELETE /api/evaluaciones/alternativas/{id}/ - Eliminar alternativa
    """
    queryset = AlternativaProyecto.objects.all()
    serializer_class = AlternativaProyectoSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated:
            return AlternativaProyecto.objects.filter(usuario=self.request.user)
        return AlternativaProyecto.objects.all()

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else User.objects.first()
        serializer.save(usuario=user)

    @action(detail=True, methods=['post'], url_path='calcular-metricas')
    def calcular_metricas(self, request, pk=None):
        """
        POST /api/evaluaciones/alternativas/{id}/calcular-metricas/

        Calcula todas las métricas financieras (VPN, TIR, ROI, Payback, B/C).

        Body (opcional):
        {
            "tasa_descuento": 0.10  # Default: 0.10 (10%)
        }
        """
        alternativa = self.get_object()
        tasa_descuento = float(request.data.get('tasa_descuento', 0.10))

        try:
            # Calcular métricas
            alternativa.vpn = calcular_vpn(
                alternativa.inversion_inicial,
                alternativa.flujos_futuros,
                tasa_descuento
            )
            alternativa.tir = calcular_tir(
                alternativa.inversion_inicial,
                alternativa.flujos_futuros
            )
            alternativa.roi = calcular_roi(
                alternativa.inversion_inicial,
                alternativa.flujos_futuros
            )
            alternativa.payback = calcular_payback(
                alternativa.inversion_inicial,
                alternativa.flujos_futuros
            )
            alternativa.relacion_beneficio_costo = calcular_bc(
                alternativa.inversion_inicial,
                alternativa.flujos_futuros,
                tasa_descuento
            )

            alternativa.save()

            serializer = self.get_serializer(alternativa)

            return Response({
                'success': True,
                'mensaje': 'Métricas calculadas exitosamente',
                'alternativa': serializer.data
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error al calcular métricas: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EvaluacionEstrategicaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar evaluaciones estratégicas.

    Endpoints:
    - GET /api/evaluaciones/evaluaciones/ - Lista de evaluaciones
    - POST /api/evaluaciones/evaluaciones/ - Crear evaluación
    - GET /api/evaluaciones/evaluaciones/{id}/ - Detalle de evaluación
    - PUT/PATCH /api/evaluaciones/evaluaciones/{id}/ - Actualizar evaluación
    - DELETE /api/evaluaciones/evaluaciones/{id}/ - Eliminar evaluación
    - POST /api/evaluaciones/evaluaciones/{id}/ejecutar/ - Ejecutar evaluación
    - GET /api/evaluaciones/evaluaciones/{id}/resultados/ - Ver resultados
    """
    queryset = EvaluacionEstrategica.objects.all()
    serializer_class = EvaluacionEstrategicaSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated:
            return EvaluacionEstrategica.objects.filter(usuario=self.request.user)
        return EvaluacionEstrategica.objects.all()

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else User.objects.first()
        serializer.save(usuario=user)

    @action(detail=True, methods=['post'], url_path='ejecutar')
    def ejecutar_evaluacion(self, request, pk=None):
        """
        POST /api/evaluaciones/evaluaciones/{id}/ejecutar/

        Ejecuta la evaluación aplicando los métodos seleccionados.

        Body:
        {
            "metodos": ["ponderado", "monte_carlo", "ia_generativa"],
            "iteraciones_monte_carlo": 1000,  # Opcional
            "recalcular_metricas": true  # Opcional
        }

        Métodos disponibles:
        - "vpn": Evaluación por Valor Presente Neto
        - "ponderado": Evaluación ponderada
        - "monte_carlo": Simulación Monte Carlo
        - "ia_generativa": IA Generativa (Gemini)
        - "random_forest": IA Random Forest
        """
        evaluacion = self.get_object()

        # Validar datos
        input_serializer = EjecutarEvaluacionSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        metodos = input_serializer.validated_data['metodos']
        iteraciones_mc = input_serializer.validated_data.get('iteraciones_monte_carlo', 1000)
        recalcular = input_serializer.validated_data.get('recalcular_metricas', True)

        # Verificar que hay alternativas
        if evaluacion.alternativas.count() == 0:
            return Response({
                'success': False,
                'error': 'La evaluación no tiene alternativas asignadas'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Recalcular métricas si se solicita
            if recalcular:
                for alt in evaluacion.alternativas.all():
                    alt.calcular_metricas_financieras(float(evaluacion.escenario.tasa_descuento))

            # Eliminar resultados anteriores
            ResultadoMetodoEvaluacion.objects.filter(evaluacion=evaluacion).delete()

            resultados_por_metodo = {}

            # Aplicar cada método
            for metodo in metodos:
                if metodo == 'ponderado':
                    resultados = []
                    for alt in evaluacion.alternativas.all():
                        score, explicacion = evaluar_ponderado(alt, evaluacion.escenario)
                        resultados.append((alt.nombre, score, explicacion))

                        # Guardar resultado
                        ResultadoMetodoEvaluacion.objects.create(
                            evaluacion=evaluacion,
                            alternativa=alt,
                            metodo='ponderado',
                            puntaje=score,
                            puntaje_normalizado=score,
                            comentario=explicacion,
                            explicacion_simple=f"Score ponderado: {score:.3f}/1.000"
                        )

                    resultados_por_metodo['Evaluación Ponderada'] = resultados

                elif metodo == 'monte_carlo':
                    resultados = []
                    for alt in evaluacion.alternativas.all():
                        score, stats, explicacion = evaluar_monte_carlo(alt, evaluacion.escenario, iteraciones_mc)
                        resultados.append((alt.nombre, score, explicacion))

                        # Guardar resultado
                        ResultadoMetodoEvaluacion.objects.create(
                            evaluacion=evaluacion,
                            alternativa=alt,
                            metodo='monte_carlo',
                            puntaje=score,
                            puntaje_normalizado=score,
                            comentario=explicacion,
                            explicacion_simple=f"Promedio de {iteraciones_mc} simulaciones: {score:.3f}",
                            estadisticas_adicionales=stats
                        )

                    resultados_por_metodo['Simulación Monte Carlo'] = resultados

                elif metodo == 'random_forest':
                    alternativas_list = list(evaluacion.alternativas.all())
                    resultados = evaluar_random_forest(alternativas_list, evaluacion.escenario)

                    for nombre_alt, score, explicacion in resultados:
                        alt = next((a for a in alternativas_list if a.nombre == nombre_alt), None)
                        if alt:
                            ResultadoMetodoEvaluacion.objects.create(
                                evaluacion=evaluacion,
                                alternativa=alt,
                                metodo='random_forest',
                                puntaje=score,
                                puntaje_normalizado=score,
                                comentario=explicacion,
                                explicacion_simple=f"Predicción IA: {score:.3f}/1.000"
                            )

                    resultados_por_metodo['IA Random Forest'] = resultados

                elif metodo == 'ia_generativa':
                    resultados = []
                    for alt in evaluacion.alternativas.all():
                        score, explicacion = evaluar_ia_generativa(alt, evaluacion.escenario)
                        resultados.append((alt.nombre, score, explicacion))

                        # Guardar resultado
                        ResultadoMetodoEvaluacion.objects.create(
                            evaluacion=evaluacion,
                            alternativa=alt,
                            metodo='ia_generativa',
                            puntaje=score,
                            puntaje_normalizado=score,
                            comentario=explicacion,
                            explicacion_simple=f"Análisis con IA Gemini: {score:.3f}/1.000"
                        )

                    resultados_por_metodo['IA Generativa (Gemini)'] = resultados

            # Generar conclusión final con IA
            conclusion = generar_conclusion_evaluacion(evaluacion, resultados_por_metodo)

            # Encontrar mejor alternativa (promedio de scores)
            scores_por_alternativa = {}
            for alt in evaluacion.alternativas.all():
                resultados_alt = ResultadoMetodoEvaluacion.objects.filter(
                    evaluacion=evaluacion,
                    alternativa=alt
                )
                if resultados_alt.exists():
                    promedio = sum(r.puntaje_normalizado for r in resultados_alt) / resultados_alt.count()
                    scores_por_alternativa[alt] = float(promedio)

            if scores_por_alternativa:
                mejor_alt = max(scores_por_alternativa, key=scores_por_alternativa.get)
                evaluacion.alternativa_recomendada = mejor_alt
                evaluacion.puntaje_mejor_alternativa = scores_por_alternativa[mejor_alt]

            # Actualizar evaluación
            evaluacion.estado = 'completada'
            evaluacion.fecha_evaluacion = timezone.now()
            evaluacion.conclusion_ia = conclusion
            evaluacion.metodos_aplicados = metodos
            evaluacion.save()

            # Serializar resultados
            serializer = self.get_serializer(evaluacion)

            return Response({
                'success': True,
                'mensaje': f'Evaluación ejecutada con {len(metodos)} métodos',
                'evaluacion': serializer.data,
                'metodos_aplicados': metodos,
                'numero_resultados': ResultadoMetodoEvaluacion.objects.filter(evaluacion=evaluacion).count()
            })

        except Exception as e:
            import traceback
            traceback.print_exc()

            return Response({
                'success': False,
                'error': f'Error al ejecutar evaluación: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='resultados')
    def ver_resultados(self, request, pk=None):
        """
        GET /api/evaluaciones/evaluaciones/{id}/resultados/

        Obtiene todos los resultados de la evaluación agrupados por método.
        """
        evaluacion = self.get_object()

        resultados = ResultadoMetodoEvaluacion.objects.filter(evaluacion=evaluacion)

        if not resultados.exists():
            return Response({
                'success': False,
                'mensaje': 'Esta evaluación no tiene resultados. Ejecuta la evaluación primero.',
                'evaluacion_id': evaluacion.id,
                'estado': evaluacion.estado
            }, status=status.HTTP_404_NOT_FOUND)

        # Agrupar por método
        resultados_por_metodo = {}
        for metodo_code, metodo_nombre in ResultadoMetodoEvaluacion.METODOS_CHOICES:
            resultados_metodo = resultados.filter(metodo=metodo_code)
            if resultados_metodo.exists():
                serializer = ResultadoMetodoEvaluacionSerializer(resultados_metodo, many=True)
                resultados_por_metodo[metodo_nombre] = serializer.data

        return Response({
            'success': True,
            'evaluacion_id': evaluacion.id,
            'evaluacion_nombre': evaluacion.nombre,
            'estado': evaluacion.estado,
            'fecha_evaluacion': evaluacion.fecha_evaluacion,
            'alternativa_recomendada': evaluacion.alternativa_recomendada.nombre if evaluacion.alternativa_recomendada else None,
            'puntaje_mejor_alternativa': float(evaluacion.puntaje_mejor_alternativa) if evaluacion.puntaje_mejor_alternativa else None,
            'conclusion_ia': evaluacion.conclusion_ia,
            'resultados_por_metodo': resultados_por_metodo,
            'total_resultados': resultados.count()
        })


class ResultadoMetodoEvaluacionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para resultados de evaluación.

    Endpoints:
    - GET /api/evaluaciones/resultados/ - Lista de resultados
    - GET /api/evaluaciones/resultados/{id}/ - Detalle de resultado
    """
    queryset = ResultadoMetodoEvaluacion.objects.all()
    serializer_class = ResultadoMetodoEvaluacionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated:
            return ResultadoMetodoEvaluacion.objects.filter(
                evaluacion__usuario=self.request.user
            )
        return ResultadoMetodoEvaluacion.objects.all()

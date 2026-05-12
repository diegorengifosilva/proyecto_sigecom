from django.shortcuts import render

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from rest_framework.decorators import api_view, parser_classes, permission_classes, action, authentication_classes
from .models import (
    Cliente,
    Representante
)
from .serializers import (
    ClienteSerializer,
    RepresentanteSerializer
)

# CLIENTE
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_clientes(request):
    # 1. GET:
    if request.method == "GET":
        clientes = Cliente.objects.all() 
        serializer = ClienteSerializer(clientes, many=True)
        return Response(serializer.data)

    # 2. POST:
    elif request.method == "POST":
        serializer = ClienteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Empresa registrada correctamente",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 3. PUT:
    elif request.method == "PUT":
        codigo = request.data.get("id_cliente")
        try:
            cliente = Cliente.objects.get(pk=codigo)
            serializer = ClienteSerializer(cliente, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "Empresa actualizada correctamente",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Cliente.DoesNotExist:
            return Response({"error": "Empresa no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    # 4. DELETE:
    elif request.method == "DELETE":
        codigo = request.data.get("id_cliente") or request.query_params.get("id_cliente")
        
        if not codigo:
             return Response({"error": "Debe proporcionar el código"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cliente = Cliente.objects.get(pk=codigo)
            cliente.delete()
            return Response({"message": "Empresa eliminada correctamente"}, status=status.HTTP_200_OK)
        except Cliente.DoesNotExist:
            return Response({"error": "Empresa no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "No se puede eliminar: el registro tiene datos asociados"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buscar_clientes_inline(request):
    try:
        # 1. Obtener parámetro de búsqueda
        query = request.query_params.get('q', '').strip()
        
        # 2. Filtrar solo activos
        # OJO: Usamos 'activo="1"' porque en tu modelo es CharField
        clientes_qs = Cliente.objects.filter(activo="1")
        
        # 3. Búsqueda multi-campo
        if query:
            clientes_qs = clientes_qs.filter(
                Q(nombre__icontains=query) | 
                Q(ruc__icontains=query) |
                Q(id_cliente__icontains=query) # AutoField permite icontains en Django
            )
        
        # 4. Selección de campos y límite
        # Traemos solo lo necesario para el buscador de cotizaciones
        resultados = clientes_qs.order_by('nombre').values('id_cliente', 'nombre', 'ruc')[:20]
        
        return Response(list(resultados), status=status.HTTP_200_OK)

    except Exception as e:
        # Esto imprimirá el error real en tu consola de Django para que lo veas
        print(f"❌ Error en buscar_clientes_inline: {str(e)}")
        return Response(
            {"error": "Error interno al buscar clientes", "detail": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# REPRESENTANTES
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_representantes(request):
    
    # 1. GET: Listar todos
    if request.method == "GET":
        representantes = Representante.objects.all()
        serializer = RepresentanteSerializer(representantes, many=True)
        return Response(serializer.data)
    
    # 2. POST: Registro
    elif request.method == "POST":
        serializer = RepresentanteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Representante registrado correctamente",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 3. PUT: Actualizar
    elif request.method == "PUT":
        # Usamos el nuevo nombre de la PK
        pk_id = request.data.get("id_representante")
        try:
            representante = Representante.objects.get(pk=pk_id)
            serializer = RepresentanteSerializer(representante, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "Representante actualizado correctamente",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Representante.DoesNotExist:
            return Response({"error": "Representante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    # 4. DELETE: Eliminar
    elif request.method == "DELETE":
        pk_id = request.data.get("id_representante") or request.query_params.get("id_representante")
        
        if not pk_id:
            return Response({"error": "Debe proporcionar el ID del representante"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            representante = Representante.objects.get(pk=pk_id)
            representante.delete()
            return Response({"message": "Representante eliminado correctamente"}, status=status.HTTP_200_OK)
        except Representante.DoesNotExist:
            return Response({"error": "Representante no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Error al eliminar: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buscar_representantes_inline(request):
    try:
        # cliente_id ahora es el ID entero de la tabla clientes
        cliente_id = request.query_params.get('cliente_id', '').strip()
        query = request.query_params.get('q', '').strip()

        if not cliente_id:
            return Response([], status=status.HTTP_200_OK)

        # Filtramos por la relación ForeignKey y que el representante esté activo (1)
        qs = Representante.objects.filter(id_cliente=cliente_id, activo=1)

        if query:
            qs = qs.filter(nombre_representante__icontains=query)

        # Retornamos los datos necesarios para el autocompletado
        resultados = qs.order_by('nombre_representante').values(
            'id_representante', 
            'nombre_representante', 
            'cargo', 
            'telefono', 
            'movil', 
            'email'
        )[:20]

        return Response(list(resultados), status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

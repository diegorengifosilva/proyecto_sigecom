# users/views.py

# ─── Librerías estándar ─────────────────────────────
import logging

logger = logging.getLogger(__name__)

# ─── Django core ────────────────────────────────────
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.db.models import Q
from rest_framework_simplejwt.authentication import JWTAuthentication

# ─── Django REST Framework ──────────────────────────
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.permissions import IsAuthenticated

CACHE_LIST_KEY = "liquidacion_list"
CACHE_DETAIL_PREFIX = "liquidacion_detail_"

# ─── Modelos y Serializers propios ─────────────────
from .models import (
    Area,
    Cargo,
    Usuario,
    Banco,
    )
from .serializers import (
    AreasSerializer,
    CargosSerializer,
    UsuarioSerializer,
    BancosSerializer,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usuarios_activos(request):
    q = request.GET.get("q", "").strip()
    # Usamos .select_related para traer Area y Cargo en una sola consulta (mejora rendimiento)
    usuarios = Usuario.objects.using("default").select_related('id_area', 'id_cargo').filter(activo=1)

    if q:
        usuarios = usuarios.filter(
            Q(dni__icontains=q) |
            Q(correo__icontains=q) | # Corregido de email_usu a correo
            Q(nombre_completo__icontains=q) |
            Q(usuario__icontains=q)
        )

    serializer = UsuarioSerializer(usuarios, many=True)
    return Response(serializer.data)

# Login DB_VC
@csrf_exempt
@api_view(['POST'])
def login_usuario(request):
    """
    Login seguro usando la tabla Usuarios (base empresarial).
    Usa usuario como identificador único (user_id) en el JWT.
    Compatible con contraseñas planas o hasheadas.
    Devuelve JWT y datos del usuario.
    """
    usuario_input = request.data.get("usuario")
    password_input = request.data.get("contrasena")

    # Validación básica
    if not usuario_input or not password_input:
        return Response(
            {"error": "Debe enviar usuario y contraseña."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Buscar usuario en base principal
        usuario = Usuario.objects.using("default").get(usuario=usuario_input.strip())
    except Usuario.DoesNotExist:
        return Response(
            {"error": "Usuario no encontrado."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Validar contraseña (plana o hasheada)
    password_db = (usuario.contrasena or "").strip()
    if not (password_db == password_input or check_password(password_input, password_db)):
        return Response(
            {"error": "Contraseña incorrecta."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # ==========================
    #  GENERAR TOKEN PERSONALIZADO
    # ==========================
    refresh = RefreshToken()
    access = refresh.access_token

    # Usar usuario como identificador único
    refresh["user_id"] = usuario.usuario
    access["user_id"] = usuario.usuario
    refresh["username"] = usuario.usuario
    access["username"] = usuario.usuario

    # (Opcional) incluir nombre corto o cargo para validaciones rápidas en frontend
    nombre_mod = (usuario.nombre_completo or "").strip()
    if nombre_mod.upper() == "PEDRO EDUARDO BONILLA CORNEJO":
        nombre_mod = "Eduardo Bonilla Cornejo"
    elif nombre_mod.upper() == "ANA CLAUDIA CARBONEL GOMERO":
        nombre_mod = "Claudia Carbonel Gomero"

    refresh["nombre"] = nombre_mod
    access["nombre"] = nombre_mod

    # Serializar datos del usuario
    user_data = UsuarioSerializer(usuario).data

    # Respuesta final
    return Response({
        "access": str(access),
        "refresh": str(refresh),
        "user": user_data
    }, status=status.HTTP_200_OK)

# Datos Usuario
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuario_actual(request):
    """
    Devuelve la información del usuario autenticado usando el JWT.
    Obtiene el usuario desde el claim user_id del token.
    """
    # Decodificar el token manualmente
    jwt_auth = JWTAuthentication()
    header = jwt_auth.get_header(request)
    if header is None:
        return Response({"error": "Token no proporcionado."}, status=status.HTTP_401_UNAUTHORIZED)

    raw_token = jwt_auth.get_raw_token(header)
    validated_token = jwt_auth.get_validated_token(raw_token)

    # Extraer user_id (que es usuario)
    usuario = validated_token.get("user_id")

    if not usuario:
        return Response(
            {"error": "No se pudo obtener el usuario desde el token."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        usuario = Usuario.objects.using("default").get(usuario=usuario)
    except Usuario.DoesNotExist:
        return Response(
            {"error": "Usuario no encontrado en la base de datos."},
            status=status.HTTP_404_NOT_FOUND
        )

    user_data = UsuarioSerializer(usuario).data
    return Response(user_data, status=status.HTTP_200_OK)

# Area
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_areas(request, id_area=None):
    if request.method == "GET":
        if id_area:
            try:
                area = Area.objects.get(pk=id_area)
                serializer = AreasSerializer(area)
                return Response(serializer.data)
            except Area.DoesNotExist:
                return Response({"error": "Área no encontrada"}, status=404)
        # Quitamos el filtro de activo para ver todo el catálogo
        areas = Area.objects.all().order_by("id_area")
        serializer = AreasSerializer(areas, many=True)
        return Response(serializer.data)
    
    elif request.method == "POST":
        serializer = AreasSerializer(data=request.data)
        if serializer.is_valid(): # Corregido: is_valid()
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "PUT":
        pk = id_area or request.data.get("id_area") or request.data.get("codigo")
        try:
            area = Area.objects.get(pk=pk)
            # El frontend envía 'activo' como booleano, en BD es int(11)
            data = request.data.copy()
            if "activo" in data:
                data["activo"] = 1 if data["activo"] in [True, 1, "1", "true", "True"] else 0
            serializer = AreasSerializer(area, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Area.DoesNotExist:
            return Response({"error": "Área no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == "DELETE":
        pk = id_area or request.data.get("id_area") or request.data.get("codigo")
        try:
            area = Area.objects.get(pk=pk)
            area.activo = 0
            area.save()
            return Response({"message": "Área desactivada correctamente"}, status=status.HTTP_200_OK)
        except Area.DoesNotExist:
            return Response({"error": "Área no encontrada"}, status=status.HTTP_404_NOT_FOUND)

# Cargo
@api_view(["GET", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def lista_cargos(request):
    # --- GET: Listar todos los cargos ---
    if request.method == "GET":
        cargos = Cargo.objects.all().order_by("id_cargo")
        serializer = CargosSerializer(cargos, many=True)
        return Response(serializer.data)
    
    # --- POST: Crear un nuevo cargo ---
    elif request.method == "POST":
        serializer = CargosSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- PUT: Actualizar (buscamos por el código enviado en el body) ---
    elif request.method == "PUT":
        codigo = request.data.get("codigo")
        try:
            cargo = Cargo.objects.get(pk=codigo)
            # partial=True permite actualizar solo algunos campos si fuera necesario
            serializer = CargosSerializer(cargo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Cargo.DoesNotExist:
            return Response({"error": "Cargo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cambiar_contrasena(request):
    """
    Cambia la contraseña del usuario autenticado.
    Verifica la contraseña actual antes de realizar el cambio.
    """
    # Decodificar el token manualmente para obtener el usuario
    jwt_auth = JWTAuthentication()
    header = jwt_auth.get_header(request)
    if header is None:
        return Response({"error": "Token no proporcionado."}, status=status.HTTP_401_UNAUTHORIZED)

    raw_token = jwt_auth.get_raw_token(header)
    validated_token = jwt_auth.get_validated_token(raw_token)
    usuario_id = validated_token.get("user_id")

    try:
        usuario = Usuario.objects.using("default").get(usuario=usuario_id)
    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    contrasena_actual = request.data.get("contrasena_actual")
    contrasena_nueva = request.data.get("contrasena_nueva")

    if not contrasena_actual or not contrasena_nueva:
        return Response({"error": "Debe proporcionar la contraseña actual y la nueva."}, status=status.HTTP_400_BAD_REQUEST)

    # Validar contraseña actual
    password_db = (usuario.contrasena or "").strip()
    if not (password_db == contrasena_actual or check_password(contrasena_actual, password_db)):
        return Response({"error": "La contraseña actual es incorrecta."}, status=status.HTTP_400_BAD_REQUEST)

    # Actualizar la contraseña (la hasheamos)
    usuario.contrasena = make_password(contrasena_nueva)
    usuario.save(using="default")

    return Response({"success": "Contraseña cambiada con éxito."}, status=status.HTTP_200_OK)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gestionar_usuario_modulos(request, id_usuario):
    """
    Asigna o remueve los módulos asignados de un usuario específico.
    """
    try:
        usuario = Usuario.objects.using("default").get(pk=id_usuario)
    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    modulo_nombres = request.data.get("modulos", [])
    
    from core.models import Modulo
    modulos = Modulo.objects.using("default").filter(nombre__in=modulo_nombres)
    
    # Actualizar ManyToMany modulos
    usuario.modulos.set(modulos)
    
    return Response({
        "success": True,
        "modulos": list(usuario.modulos.values_list('nombre', flat=True))
    }, status=status.HTTP_200_OK)

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def detalle_usuario(request, id_usuario):
    try:
        usuario = Usuario.objects.using("default").get(pk=id_usuario)
    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = UsuarioSerializer(usuario)
        return Response(serializer.data)

    elif request.method == "PUT":
        data = request.data.copy()
        
        # Hashing the password if new password is sent
        nueva_contrasena = data.get("nueva_contrasena")
        if nueva_contrasena:
            usuario.contrasena = make_password(nueva_contrasena)
            usuario.save(using="default")

        # Serializer partial update
        serializer = UsuarioSerializer(usuario, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_bancos(request):
    bancos = Banco.objects.using("default").filter(activo=1).order_by("nombre")
    serializer = BancosSerializer(bancos, many=True)
    return Response(serializer.data)

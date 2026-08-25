from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import render
from django.http import FileResponse, Http404
import os
from .models import SugerenciaQueja, SugerenciaAdjunto, SugerenciaSeguimiento
from .serializers import (
    SugerenciaQuejaSerializer, 
    GerenciaSerializer,
    SugerenciaAdjuntoSerializer,
    SugerenciaSeguimientoSerializer
)
from core.models import Gerencia

def registrar_seguimiento(sugerencia, detalle, usuario):
    SugerenciaSeguimiento.objects.using("default").create(
        id_registro=sugerencia,
        detalle=detalle,
        usuario=usuario
    )

@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sugerencia_queja_list(request):
    user = request.user
    
    if request.method == 'GET':
        # Solo los usuarios con el módulo "SUGERENCIAS Y QUEJAS" ven todo.
        # Los demás usuarios (incluyendo TI) solo ven sus propias sugerencias/quejas.
        is_admin = user.modulos.filter(nombre="SUGERENCIAS Y QUEJAS").exists()
        
        if is_admin:
            sugerencias = SugerenciaQueja.objects.using("default").select_related('id_usuario', 'id_area', 'id_gerencia').all().order_by('-fecha')
        else:
            sugerencias = SugerenciaQueja.objects.using("default").select_related('id_usuario', 'id_area', 'id_gerencia').filter(id_usuario=user).order_by('-fecha')
            
        serializer = SugerenciaQuejaSerializer(sugerencias, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        data = request.data.copy()
        now = timezone.now()
        
        # Llenar automáticamente los datos del sistema
        data['fecha'] = now.isoformat()
        data['anno'] = now.year
        data['mes'] = now.month
        data['id_usuario'] = user.id_usuario
        
        # Si no se envía id_area, asignar el área del usuario autenticado
        if not data.get('id_area') and user.id_area:
            data['id_area'] = user.id_area.id_area
            
        serializer = SugerenciaQuejaSerializer(data=data)
        if serializer.is_valid():
            instancia = serializer.save()
            tipo_label = "Sugerencia/Mejora" if instancia.tipo == 'S' else "Queja/Error"
            registrar_seguimiento(
                instancia, 
                f"Creación del registro de {tipo_label} por {user.nombre_completo}.", 
                user
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def sugerencia_queja_detail(request, pk):
    try:
        sugerencia = SugerenciaQueja.objects.using("default").get(pk=pk)
    except SugerenciaQueja.DoesNotExist:
        return Response({"error": "Registro no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    user = request.user
    
    if request.method == 'GET':
        is_admin = user.modulos.filter(nombre="SUGERENCIAS Y QUEJAS").exists()
        if not is_admin and sugerencia.id_usuario_id != user.id_usuario:
            return Response({"error": "No tiene permisos para ver este registro"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = SugerenciaQuejaSerializer(sugerencia)
        return Response(serializer.data)
        
    elif request.method == 'PATCH':
        old_estado = sugerencia.estado
        old_gerencia = sugerencia.id_gerencia
        old_solucion = sugerencia.solucion
        
        serializer = SugerenciaQuejaSerializer(sugerencia, data=request.data, partial=True)
        if serializer.is_valid():
            instancia = serializer.save()
            
            # Verificar cambios para trazabilidad
            cambios = []
            if old_estado != instancia.estado:
                cambios.append(f"Estado cambiado de '{old_estado}' a '{instancia.estado}'.")
            if old_gerencia != instancia.id_gerencia:
                nom_old = old_gerencia.nombre if old_gerencia else "General/TI"
                nom_new = instancia.id_gerencia.nombre if instancia.id_gerencia else "General/TI"
                cambios.append(f"Gerencia destinataria cambiada de '{nom_old}' a '{nom_new}'.")
            if old_solucion != instancia.solucion:
                cambios.append("Descripción de solución o medida correctiva actualizada.")
                
            for cambio in cambios:
                registrar_seguimiento(instancia, f"{cambio}", user)
                
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        # Registrar seguimiento de eliminación antes de borrar si se requiere
        sugerencia.delete(using="default")
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_gerencias(request):
    gerencias = Gerencia.objects.using("default").filter(activo=1).order_by('nombre')
    serializer = GerenciaSerializer(gerencias, many=True)
    return Response(serializer.data)

@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sugerencia_trazabilidad(request, pk):
    try:
        sugerencia = SugerenciaQueja.objects.using("default").get(pk=pk)
    except SugerenciaQueja.DoesNotExist:
        return Response({"error": "Registro no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        seguimientos = sugerencia.seguimientos.all().order_by('fecha')
        serializer = SugerenciaSeguimientoSerializer(seguimientos, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        detalle = request.data.get('detalle')
        if not detalle:
            return Response({"error": "El detalle es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
        seguimiento = SugerenciaSeguimiento.objects.using("default").create(
            id_registro=sugerencia,
            detalle=detalle,
            usuario=request.user
        )
        serializer = SugerenciaSeguimientoSerializer(seguimiento)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sugerencia_adjuntos(request, pk):
    try:
        sugerencia = SugerenciaQueja.objects.using("default").get(pk=pk)
    except SugerenciaQueja.DoesNotExist:
        return Response({"error": "Registro no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        adjuntos = sugerencia.adjuntos.all().order_by('-fecha_subida')
        serializer = SugerenciaAdjuntoSerializer(adjuntos, many=True, context={'request': request})
        return Response(serializer.data)
        
    elif request.method == 'POST':
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({"error": "El archivo es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
        adjunto = SugerenciaAdjunto.objects.using("default").create(
            id_registro=sugerencia,
            archivo=archivo,
            nombre=archivo.name,
            subido_por=request.user
        )
        
        registrar_seguimiento(
            sugerencia,
            f"Se adjuntó el archivo '{archivo.name}' por {request.user.nombre_completo}.",
            request.user
        )
        
        serializer = SugerenciaAdjuntoSerializer(adjunto, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

@csrf_exempt
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def sugerencia_adjunto_detail(request, pk):
    try:
        adjunto = SugerenciaAdjunto.objects.using("default").get(pk=pk)
    except SugerenciaAdjunto.DoesNotExist:
        return Response({"error": "Adjunto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    sugerencia = adjunto.id_registro
    nombre = adjunto.nombre
    
    if adjunto.archivo:
        adjunto.archivo.delete(save=False)
        
    adjunto.delete(using="default")
    
    registrar_seguimiento(
        sugerencia,
        f"Se eliminó el archivo '{nombre}' por {request.user.nombre_completo}.",
        request.user
    )
    
    return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def descargar_adjunto(request, pk):
    try:
        adjunto = SugerenciaAdjunto.objects.using("default").get(pk=pk)
    except SugerenciaAdjunto.DoesNotExist:
        return Response({"error": "Archivo no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    # Validar permisos: administradores o el remitente original del ticket
    user = request.user
    is_admin = user.modulos.filter(nombre="SUGERENCIAS Y QUEJAS").exists()
    if not is_admin and adjunto.id_registro.id_usuario_id != user.id_usuario:
        return Response({"error": "No tiene permisos para descargar este archivo"}, status=status.HTTP_403_FORBIDDEN)
        
    file_path = adjunto.archivo.path
    if os.path.exists(file_path):
        response = FileResponse(open(file_path, 'rb'), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{adjunto.nombre}"'
        return response
    else:
        return Response({"error": "El archivo físico no existe en el servidor"}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['GET'])
@permission_classes([])
def sugerencia_reporte_html(request, pk):
    user = request.user
    from django.contrib.auth.models import AnonymousUser
    
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        token_str = request.GET.get('token')
        if token_str:
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                from users.models import Usuario
                validated_token = AccessToken(token_str)
                user_id = validated_token['user_id']
                user = Usuario.objects.using("default").get(usuario=user_id)
            except Exception:
                return Response({"detail": "Token de autenticación inválido o expirado."}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({"detail": "Las credenciales de autenticación no se proveyeron."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        sugerencia = SugerenciaQueja.objects.using("default").get(pk=pk)
    except SugerenciaQueja.DoesNotExist:
        return Response({"error": "Registro no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    is_admin = user.modulos.filter(nombre="SUGERENCIAS Y QUEJAS").exists()
    if not is_admin and sugerencia.id_usuario_id != user.id_usuario:
        return Response({"error": "No tiene permisos para ver este reporte"}, status=status.HTTP_403_FORBIDDEN)
        
    # Paths
    from django.conf import settings
    template_path = os.path.join(settings.BASE_DIR, "RH.FOR.008 Hoja de Quejas o Sugerencias V02.pdf")
    
    if not os.path.exists(template_path):
        return Response({"error": "La plantilla PDF original no se encuentra en el servidor"}, status=status.HTTP_404_NOT_FOUND)
        
    import io
    import textwrap
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from django.http import HttpResponse
    
    # Generate overlay PDF
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    
    # 1. Nº and Year (inside title table cell at y=731)
    can.setFont("Helvetica-Bold", 10)
    registry_no = str(sugerencia.id_registro).zfill(4)
    year_str = sugerencia.fecha.strftime("%y") if sugerencia.fecha else str(timezone.now().year % 100)
    can.drawString(445, 729, registry_no)
    can.drawString(513, 729, year_str)
    
    # 2. Metadata (Fecha, Cargo, Area, Nombre)
    can.setFont("Helvetica", 9)
    fecha_str = sugerencia.fecha.strftime("%d/%m/%Y") if sugerencia.fecha else ""
    can.drawString(160, 715, fecha_str)
    
    cargo_str = "ANÓNIMO" if sugerencia.anonimo == 1 else "PERSONAL / OPERATIVO"
    can.drawString(398, 715, cargo_str)
    
    area_name = (sugerencia.id_area.nombre if sugerencia.id_area else "General / TI").upper()
    can.drawString(160, 702, area_name)
    
    nombre_str = "ANÓNIMO (IDENTIDAD PROTEGIDA)" if sugerencia.anonimo == 1 else (sugerencia.id_usuario.nombre_completo if sugerencia.id_usuario else "Sugerencia").upper()
    can.drawString(167, 690, nombre_str)
    
    # 3. Type Checkbox (Sugerencia / Queja checkboxes)
    can.setFont("Helvetica-Bold", 10)
    if sugerencia.tipo == 'S':
        can.drawString(158, 673, "X") # Sugerencia checkbox
    elif sugerencia.tipo == 'Q':
        can.drawString(366, 673, "X") # Queja checkbox
        
    # 4. Description (multiple lines matching template lines starting at y=631, line-height 15)
    desc_lines = []
    if sugerencia.descripcion:
        # Split by user-entered newlines to preserve paragraph spacing
        for paragraph in sugerencia.descripcion.split('\n'):
            if paragraph.strip() == "":
                desc_lines.append("")
            else:
                desc_lines.extend(textwrap.wrap(paragraph, width=98))
                
    # Limit to max 11 lines to prevent overlapping the priority checkboxes
    if len(desc_lines) > 11:
        desc_lines = desc_lines[:10]
        desc_lines.append("[...] (CONTINÚA EN EL SISTEMA SIGECOM)")
        
    y = 631
    can.setFont("Helvetica", 8.5)
    for line in desc_lines:
        can.drawString(68, y, line)
        y -= 15.0
        
    # 5. Priority Checkbox
    can.setFont("Helvetica-Bold", 10)
    if sugerencia.prioridad == 1:
        can.drawString(249, 453, "X") # Bajo priority
    elif sugerencia.prioridad == 2:
        can.drawString(249, 440, "X") # Medio priority
    elif sugerencia.prioridad == 3:
        can.drawString(249, 427, "X") # Alto priority
        
    # 6. Corrective action/solution (starting at y=370, line-height 15)
    sol_lines = []
    if sugerencia.solucion:
        # Split by user-entered newlines to preserve paragraph spacing
        for paragraph in sugerencia.solucion.split('\n'):
            if paragraph.strip() == "":
                sol_lines.append("")
            else:
                sol_lines.extend(textwrap.wrap(paragraph, width=98))
                
    # Limit to max 12 lines to prevent overlapping the bottom signature/gerencia block
    if len(sol_lines) > 12:
        sol_lines = sol_lines[:11]
        sol_lines.append("[...] (CONTINÚA EN EL SISTEMA SIGECOM)")
        
    y = 370
    can.setFont("Helvetica", 8.5)
    for line in sol_lines:
        can.drawString(68, y, line)
        y -= 15.0
        
    # 7. Gerencia Destinada
    can.setFont("Helvetica-Bold", 9)
    gerencia_str = (sugerencia.id_gerencia.nombre if sugerencia.id_gerencia else "General / TI").upper()
    can.drawString(165, 179, gerencia_str)
    
    can.save()
    
    # Merge overlay with template PDF
    packet.seek(0)
    new_pdf = PdfReader(packet)
    
    template_pdf = PdfReader(template_path)
    page = template_pdf.pages[0]
    page.merge_page(new_pdf.pages[0])
    
    writer = PdfWriter()
    writer.add_page(page)
    
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    
    response = HttpResponse(output_buffer, content_type='application/pdf')
    filename = f"RH.FOR.008_Hoja_Quejas_Sugerencias_{sugerencia.id_registro}.pdf"
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response

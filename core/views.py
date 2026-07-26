from django.shortcuts import render
import re

def generar_iniciales(nombre):
    if not nombre or not isinstance(nombre, str):
        return ""
    
    raw = nombre.strip()
    if not raw:
        return ""
        
    raw_upper = re.sub(r'\s+', ' ', raw.upper())
    if "CEYESA INGENIERIA" in raw_upper or raw_upper == "CEYESA":
        return "CEYESA"
    if "PROSELET" in raw_upper:
        return "PSLT"

    words = [w for w in re.split(r'[,\(\)\.\/\s]+', raw_upper) if w]
    if not words:
        return ""

    legal_suffixes = {
        "SA", "SAC", "SRL", "EIRL", "SAB", "INC", "LLC", "CORP", "CORPORATION",
        "SOCIEDAD", "ANONIMA", "CERRADA", "LIMITADA", "LTDA"
    }

    stop_words = {"DE", "DEL", "LA", "LAS", "LOS", "E", "Y", "EN", "POR", "PARA"}

    generic_business_words = {
        "INGENIERIA", "INGENIERÍA", "ELECTRICA", "ELÉCTRICA", "INDUSTRIAL", "INDUSTRIALES",
        "SERVICIOS", "GENERALES", "SOLUCIONES", "INTEGRALES", "CONSTRUCTORA", "CONSTRUCCION",
        "IMPORTACIONES", "EXPORTACIONES", "PERU", "PERÚ", "EMPRESA", "GRUPO",
        "CORPORACION", "TECNOLOGIA", "TECNOLOGIAS", "SISTEMAS", "COMERCIAL",
        "INVERSIONES", "NEGOCIOS", "CONTRATISTAS"
    }

    clean_words = [w for w in words if w not in stop_words and w not in legal_suffixes]
    main_words = clean_words if clean_words else words

    brand_words = [w for w in main_words if w not in generic_business_words]
    effective_words = brand_words if brand_words else main_words

    if len(effective_words) == 1:
        word = effective_words[0]
        if len(word) <= 6:
            return word
        first_char = word[0]
        rest = word[1:]
        if first_char in ["P", "T", "C", "B", "D", "F", "G"] and rest.startswith("R"):
            rest = rest[1:]
        consonants = re.sub(r'[AEIOUÁÉÍÓÚ]', '', rest)
        abbr = (first_char + consonants)[:5]
        return abbr if len(abbr) >= 3 else word[:6]

    if len(effective_words) == 2:
        w1, w2 = effective_words[0], effective_words[1]
        if len(w1) <= 6 and (w2 in generic_business_words or (words.index(w2) < len(words) and words[words.index(w2)] in generic_business_words)):
            return w1
        initials = "".join([w[0] for w in effective_words])
        if len(initials) >= 3:
            return initials
        return (w1[:3] + w2[0])[:6]

    initials = "".join([w[0] for w in effective_words])[:6]
    if len(initials) >= 3:
        return initials

    return effective_words[0][:6]


from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from rest_framework.decorators import api_view, parser_classes, permission_classes, action, authentication_classes
from .models import (
    Cliente,
    Representante,
    Estado,
    TipoGasto,
    TipoMarca,
    TipoPersonal,
    TipoGastoDetalle,
    Producto,
    Nota,
    UnidadMedida,
)
from .serializers import (
    ClienteSerializer,
    RepresentanteSerializer,
    EstadoSerializer,
    TipoGastoSerializer,
    TipoMarcaSerializer,
    TipoPersonalSerializer,
    TipoGastoDetalleSerializer,
    ProductoSerializer,
    NotaSerializer,
    UnidadMedidaSerializer,
)

# CLIENTE
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_clientes(request):
    # 1. GET:
    if request.method == "GET":
        id_cliente = request.query_params.get("id_cliente")
        if id_cliente:
            try:
                cliente = Cliente.objects.get(pk=id_cliente)
                serializer = ClienteSerializer(cliente)
                return Response(serializer.data)
            except Cliente.DoesNotExist:
                return Response({"error": "Cliente no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        clientes = Cliente.objects.all() 
        serializer = ClienteSerializer(clientes, many=True)
        return Response(serializer.data)

    # 2. POST:
    elif request.method == "POST":
        data = request.data.copy()
        nombre = (data.get("nombre") or "").strip()
        if nombre and not data.get("iniciales"):
            data["iniciales"] = generar_iniciales(nombre)

        if not data.get("fecha_ingreso"):
            from django.utils import timezone
            data["fecha_ingreso"] = timezone.now()

        serializer = ClienteSerializer(data=data)
        if serializer.is_valid():
            cliente = serializer.save()

            # Trazabilidad / Auditoría
            num_reg = data.get("num_reg") or data.get("id_registro") or request.query_params.get("num_reg")
            user_inst = request.user if hasattr(request, "user") and request.user and request.user.is_authenticated else None
            nom_upper = (cliente.nombre or "").upper()
            det_str = f"CLIENTES: Se creó el cliente '{nom_upper}'"
            if cliente.ruc:
                det_str += f" (RUC: {cliente.ruc})"

            if num_reg:
                try:
                    from cotizaciones_api.models import Cotizacion, CotizacionSeguimiento
                    cot_inst = None
                    if str(num_reg).isdigit():
                        cot_inst = Cotizacion.objects.filter(pk=int(num_reg)).first()
                    if not cot_inst:
                        cot_inst = Cotizacion.objects.filter(codigo=str(num_reg)).first()

                    if cot_inst:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot_inst,
                            detalle=det_str,
                            id_usuario=user_inst,
                            activo='1'
                        )
                except Exception as log_err:
                    print("Error registrando trazabilidad de cliente:", log_err)

            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_cliente_legado
                disparar_sincronizacion_cliente_legado(cliente.id_cliente)
            except Exception as sync_err:
                print("Error disparando sincronización de cliente:", sync_err)

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
                cliente_updated = serializer.save()
                try:
                    from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_cliente_legado
                    disparar_sincronizacion_cliente_legado(cliente_updated.id_cliente)
                except Exception as sync_err:
                    print("Error disparando sincronización de cliente:", sync_err)

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
            cliente_id = cliente.id_cliente
            cliente.delete()
            try:
                from cotizaciones_api.services.legacy_sync import disparar_eliminacion_cliente_legado
                disparar_eliminacion_cliente_legado(cliente_id)
            except Exception as sync_err:
                print("Error disparando eliminación de cliente:", sync_err)

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
        clientes_qs = Cliente.objects.filter(activo="1")
        
        # 3. Búsqueda multi-campo
        if query:
            clientes_qs = clientes_qs.filter(
                Q(nombre__icontains=query) | 
                Q(ruc__icontains=query) |
                Q(id_cliente__icontains=query)
            )
        
        # 4. Selección de campos y límite
        resultados = clientes_qs.order_by('nombre').values('id_cliente', 'nombre', 'ruc', 'iniciales', 'tipo')[:20]
        
        return Response(list(resultados), status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error en buscar_clientes_inline: {str(e)}")
        return Response(
            {"error": "Error interno al buscar clientes", "detail": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_representantes(request):
    
    # 1. GET: Listar todos o filtrar por ID
    if request.method == "GET":
        id_representante = request.query_params.get("id_representante")
        id_cliente = request.query_params.get("id_cliente")
        if id_representante:
            try:
                rep = Representante.objects.get(pk=id_representante)
                serializer = RepresentanteSerializer(rep)
                return Response(serializer.data)
            except Representante.DoesNotExist:
                return Response({"error": "Representante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if id_cliente:
            representantes = Representante.objects.filter(id_cliente=id_cliente)
        else:
            representantes = Representante.objects.all()
        serializer = RepresentanteSerializer(representantes, many=True)
        return Response(serializer.data)
    
    # 2. POST: Registro
    elif request.method == "POST":
        serializer = RepresentanteSerializer(data=request.data)
        if serializer.is_valid():
            rep = serializer.save()

            # Trazabilidad / Auditoría
            num_reg = request.data.get("num_reg") or request.data.get("id_registro") or request.query_params.get("num_reg")
            user_inst = request.user if hasattr(request, "user") and request.user and request.user.is_authenticated else None
            rep_nom_upper = (rep.nombre_representante or "").upper()
            cliente_nom_upper = (rep.id_cliente.nombre or "").upper() if rep.id_cliente else ""
            det_str = f"REPRESENTANTES: Se creó el representante '{rep_nom_upper}'"
            if cliente_nom_upper:
                det_str += f" para la empresa '{cliente_nom_upper}'"

            if num_reg:
                try:
                    from cotizaciones_api.models import Cotizacion, CotizacionSeguimiento
                    cot_inst = None
                    if str(num_reg).isdigit():
                        cot_inst = Cotizacion.objects.filter(pk=int(num_reg)).first()
                    if not cot_inst:
                        cot_inst = Cotizacion.objects.filter(codigo=str(num_reg)).first()

                    if cot_inst:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot_inst,
                            detalle=det_str,
                            id_usuario=user_inst,
                            activo='1'
                        )
                except Exception as log_err:
                    print("Error registrando trazabilidad de representante:", log_err)

            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_representante_legado
                disparar_sincronizacion_representante_legado(rep.id_representante)
            except Exception as sync_err:
                print("Error disparando sincronización de representante:", sync_err)

            return Response({
                "message": "Representante registrado correctamente",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 3. PUT: Actualizar
    elif request.method == "PUT":
        pk_id = request.data.get("id_representante")
        try:
            representante = Representante.objects.get(pk=pk_id)
            serializer = RepresentanteSerializer(representante, data=request.data, partial=True)
            if serializer.is_valid():
                rep_updated = serializer.save()
                try:
                    from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_representante_legado
                    disparar_sincronizacion_representante_legado(rep_updated.id_representante)
                except Exception as sync_err:
                    print("Error disparando sincronización de representante:", sync_err)

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
            rep_id = representante.id_representante
            empresa_codigo = str(representante.id_cliente_id)[:5] if representante.id_cliente_id else ""
            representante.delete()
            try:
                from cotizaciones_api.services.legacy_sync import disparar_eliminacion_representante_legado
                disparar_eliminacion_representante_legado(rep_id, empresa_codigo)
            except Exception as sync_err:
                print("Error disparando eliminación de representante:", sync_err)

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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_estados(request):
    """
    Lista los estados activos para las cotizaciones, ordenes de compra o facturacion.
    """
    estados = Estado.objects.filter(activo=1)
    
    cotizaciones = request.query_params.get("cotizaciones")
    orden_compra = request.query_params.get("orden_compra")
    facturacion = request.query_params.get("facturacion")
    
    if cotizaciones is not None:
        try:
            estados = estados.filter(cotizaciones=int(cotizaciones))
        except ValueError:
            pass
            
    if orden_compra is not None:
        try:
            estados = estados.filter(orden_compra=int(orden_compra))
        except ValueError:
            pass
            
    if facturacion is not None:
        try:
            estados = estados.filter(facturacion=int(facturacion))
        except ValueError:
            pass
            
    estados = estados.order_by("nombre")
    serializer = EstadoSerializer(estados, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_tipo_gasto(request):
    tipo_gasto = TipoGasto.objects.filter(activo="1").order_by("codigo")
    serializer = TipoGastoSerializer(tipo_gasto, many=True)
    return Response(serializer.data)

def obtener_siguiente_id_marca():
    # Obtener todos los IDs de marca actuales
    existing_ids = set(TipoMarca.objects.values_list('id_marca', flat=True))
    # Buscar el primer ID libre entre 8 y 98
    for candidate in range(8, 99):
        if candidate not in existing_ids:
            return candidate
    # Si todo del 8 al 98 está lleno, buscar desde 100 en adelante (evitando 99)
    candidate = 100
    while candidate in existing_ids or candidate == 99:
        candidate += 1
    return candidate

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_tipo_marca(request):
    if request.method == "GET":
        tipo_marca = TipoMarca.objects.filter(activo="1").order_by("nombre")
        serializer = TipoMarcaSerializer(tipo_marca, many=True)
        return Response(serializer.data)
    elif request.method == "POST":
        nombre = request.data.get("nombre", "").strip().upper()
        if not nombre:
            return Response({"ok": False, "error": "El nombre de la marca es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if brand already exists (case-insensitive)
        exists = TipoMarca.objects.filter(nombre__iexact=nombre).first()
        if exists:
            if exists.activo != "1":
                exists.activo = "1"
                exists.save()
            serializer = TipoMarcaSerializer(exists)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_200_OK)
        
        next_id = obtener_siguiente_id_marca()
        nueva_marca = TipoMarca.objects.create(id_marca=next_id, nombre=nombre, activo="1")
        
        id_registro = request.data.get("id_registro")
        if id_registro:
            try:
                from cotizaciones_api.models import Cotizacion, CotizacionSeguimiento
                cot = Cotizacion.objects.filter(id_registro=id_registro).first()
                if cot:
                    CotizacionSeguimiento.objects.create(
                        id_registro=cot,
                        detalle=f"Suministros: Agregar nueva marca '{nueva_marca.nombre}'",
                        id_usuario=request.user if request.user.is_authenticated else None,
                        activo='1'
                    )
            except Exception as ex:
                print("Error creating tracking log for brand:", ex)

        serializer = TipoMarcaSerializer(nueva_marca)
        return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_201_CREATED)

    elif request.method == "PUT":
        id_marca = request.data.get("id_marca") or request.data.get("id")
        nombre = request.data.get("nombre", "").strip().upper()
        if not id_marca or not nombre:
            return Response({"ok": False, "error": "El id de la marca y el nombre son requeridos"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            marca = TipoMarca.objects.get(pk=id_marca)
            marca.nombre = nombre
            if "activo" in request.data:
                val_activo = request.data.get("activo")
                marca.activo = "1" if val_activo in [True, 1, "1", "true", "True"] else "0"
            marca.save()
            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_marca_legado
                disparar_sincronizacion_marca_legado(marca.id_marca)
            except Exception as sync_err:
                print("Error disparando sincronización de marca:", sync_err)
            serializer = TipoMarcaSerializer(marca)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_200_OK)
        except TipoMarca.DoesNotExist:
            return Response({"ok": False, "error": "Marca no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == "DELETE":
        id_marca = request.data.get("id_marca") or request.query_params.get("id_marca") or request.data.get("id") or request.query_params.get("id")
        if not id_marca:
            return Response({"ok": False, "error": "El id de la marca es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            marca = TipoMarca.objects.get(pk=id_marca)
            marca.activo = "0"
            marca.save()
            try:
                from cotizaciones_api.services.legacy_sync import disparar_eliminacion_marca_legado
                disparar_eliminacion_marca_legado(marca.id_marca)
            except Exception as sync_err:
                print("Error disparando eliminación de marca:", sync_err)
            return Response({"ok": True, "message": "Marca desactivada correctamente"}, status=status.HTTP_200_OK)
        except TipoMarca.DoesNotExist:
            return Response({"ok": False, "error": "Marca no encontrada"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_tipo_personal(request):
    """
    Lista todos los tipos de personal activos para SIGECOM 5 o crea uno nuevo.
    """
    if request.method == "POST":
        try:
            nombre = request.data.get("nombre")
            id_area = request.data.get("id_area")
            costo_min = request.data.get("costo_min", 0)
            costo_max = request.data.get("costo_max", 0)
            
            if not nombre or not id_area:
                return Response({"ok": False, "error": "Nombre y Área son requeridos"}, status=400)
            
            import re
            from users.models import Area
            try:
                area = Area.objects.get(pk=id_area)
            except Area.DoesNotExist:
                return Response({"ok": False, "error": "El Área especificada no existe"}, status=400)
                
            prefix = str(id_area).zfill(2)
            existing_codes = TipoPersonal.objects.filter(id_area=id_area).values_list('codigo', flat=True)
            
            max_num = 0
            has_separator = False
            zfill_len = 2
            for code in existing_codes:
                if not code:
                    continue
                match = re.match(r'^' + prefix + r'(-?)(\d+)$', code)
                if match:
                    sep, num_str = match.groups()
                    if sep == '-':
                        has_separator = True
                    try:
                        num = int(num_str)
                        if num > max_num:
                            max_num = num
                            zfill_len = len(num_str)
                    except ValueError:
                        pass
            
            next_num = max_num + 1
            if has_separator or any('-' in c for c in existing_codes if c.startswith(prefix)):
                next_code = f"{prefix}-{str(next_num).zfill(zfill_len)}"
            else:
                next_code = f"{prefix}{str(next_num).zfill(zfill_len)}"
                
            nuevo_personal = TipoPersonal.objects.create(
                codigo=next_code,
                nombre=nombre.strip().upper(),
                costo_min=costo_min,
                costo_max=costo_max,
                id_area=area,
                activo=1
            )
            
            # Disparar sincronización asíncrona hacia la BD legado
            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_tipo_personal_legado
                disparar_sincronizacion_tipo_personal_legado(nuevo_personal.id_personal)
            except Exception as sync_err:
                print("Error disparando sincronización de TipoPersonal:", sync_err)
 
            id_registro = request.data.get("id_registro")
            if id_registro:
                try:
                    from cotizaciones_api.models import Cotizacion, CotizacionSeguimiento
                    cot = Cotizacion.objects.filter(id_registro=id_registro).first()
                    if cot:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot,
                            detalle=f"Servicios: Agregar nuevo personal '{nuevo_personal.codigo} - {nuevo_personal.nombre}'",
                            id_usuario=request.user if request.user.is_authenticated else None,
                            activo='1'
                        )
                except Exception as ex:
                    print("Error creating tracking log for personal:", ex)
 
            serializer = TipoPersonalSerializer(nuevo_personal)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_201_CREATED)
 
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)
 
    elif request.method == "PUT":
        try:
            id_personal = request.data.get("id_personal") or request.data.get("id")
            if not id_personal:
                return Response({"ok": False, "error": "El id_personal es requerido"}, status=400)
            
            try:
                personal = TipoPersonal.objects.get(pk=id_personal)
            except TipoPersonal.DoesNotExist:
                return Response({"ok": False, "error": "Tipo de personal no encontrado"}, status=404)
            
            if "nombre" in request.data:
                personal.nombre = request.data.get("nombre").strip().upper()
            if "costo_min" in request.data:
                personal.costo_min = request.data.get("costo_min")
            if "costo_max" in request.data:
                personal.costo_max = request.data.get("costo_max")
            if "id_area" in request.data:
                from users.models import Area
                try:
                    personal.id_area = Area.objects.get(pk=request.data.get("id_area"))
                except Area.DoesNotExist:
                    return Response({"ok": False, "error": "El Área especificada no existe"}, status=400)
            if "activo" in request.data:
                val_activo = request.data.get("activo")
                personal.activo = 1 if val_activo in [True, 1, "1", "true", "True"] else 0
            
            personal.save()
            
            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_tipo_personal_legado
                disparar_sincronizacion_tipo_personal_legado(personal.id_personal)
            except Exception as sync_err:
                print("Error disparando sincronización de TipoPersonal:", sync_err)
                
            serializer = TipoPersonalSerializer(personal)
            return Response({"ok": True, "registro": serializer.data}, status=200)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    elif request.method == "DELETE":
        try:
            id_personal = request.data.get("id_personal") or request.query_params.get("id_personal") or request.data.get("id") or request.query_params.get("id")
            if not id_personal:
                return Response({"ok": False, "error": "El id_personal es requerido"}, status=400)
            
            try:
                personal = TipoPersonal.objects.get(pk=id_personal)
                codigo = personal.codigo
                personal.activo = 0
                personal.save()
                
                try:
                    from cotizaciones_api.services.legacy_sync import disparar_eliminacion_tipo_personal_legado
                    disparar_eliminacion_tipo_personal_legado(codigo)
                except Exception as sync_err:
                    print("Error disparando eliminación de TipoPersonal:", sync_err)
                    
                return Response({"ok": True, "message": "Tipo de personal desactivado correctamente"}, status=200)
            except TipoPersonal.DoesNotExist:
                return Response({"ok": False, "error": "Tipo de personal no encontrado"}, status=404)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    try:
        personal = TipoPersonal.objects.select_related('id_area').filter(activo=1)
        
        serializer = TipoPersonalSerializer(personal, many=True)
        return Response({
            "ok": True,
            "data": serializer.data
        })
        
    except Exception as e:
        return Response({
            "ok": False,
            "error": str(e)
        }, status=500)

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_tgasto_detalle(request):
    """
    Lista el detalle de tipos de gasto activos para SIGECOM 5 o crea uno nuevo.
    """
    if request.method == "POST":
        try:
            nombre = request.data.get("nombre")
            code_prefix = request.data.get("code_prefix") # "05" o "06"
            
            if not nombre or not code_prefix:
                return Response({"ok": False, "error": "Nombre y Prefijo de Código son requeridos"}, status=400)
                
            import re
            from core.models import TipoGasto
            
            parent_gasto = TipoGasto.objects.filter(codigo=code_prefix).first()
            if not parent_gasto:
                parent_gasto = TipoGasto.objects.all().first()
                if not parent_gasto:
                    return Response({"ok": False, "error": f"No se encontró TipoGasto para el prefijo {code_prefix}"}, status=400)
            
            existing_codes = TipoGastoDetalle.objects.filter(codigo__startswith=code_prefix).values_list('codigo', flat=True)
            
            max_num = 0
            has_separator = False
            zfill_len = 3
            for code in existing_codes:
                if not code:
                    continue
                match = re.match(r'^' + code_prefix + r'(-?)(\d+)$', code)
                if match:
                    sep, num_str = match.groups()
                    if sep == '-':
                        has_separator = True
                    try:
                        num = int(num_str)
                        if num > max_num:
                            max_num = num
                            zfill_len = len(num_str)
                    except ValueError:
                        pass
            
            next_num = max_num + 1
            if has_separator or any('-' in c for c in existing_codes if c.startswith(code_prefix)):
                next_code = f"{code_prefix}-{str(next_num).zfill(zfill_len)}"
            else:
                next_code = f"{code_prefix}{str(next_num).zfill(zfill_len)}"
                
            nuevo_gasto = TipoGastoDetalle.objects.create(
                codigo=next_code,
                nombre=nombre.strip().upper(),
                id_tipo_gasto=parent_gasto,
                activo=1
            )
            
            # Disparar sincronización asíncrona hacia la BD legado
            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_gasto_detalle_legado
                disparar_sincronizacion_gasto_detalle_legado(nuevo_gasto.id_gasto_detalle)
            except Exception as sync_err:
                print("Error disparando sincronización de TipoGastoDetalle:", sync_err)

            id_registro = request.data.get("id_registro")
            if id_registro:
                try:
                    from cotizaciones_api.models import Cotizacion, CotizacionSeguimiento
                    cot = Cotizacion.objects.filter(id_registro=id_registro).first()
                    if cot:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot,
                            detalle=f"Servicios: Agregar nuevo Gasto '{nuevo_gasto.codigo} - {nuevo_gasto.nombre}'",
                            id_usuario=request.user if request.user.is_authenticated else None,
                            activo='1'
                        )
                except Exception as ex:
                    print("Error creating tracking log for gasto:", ex)

            serializer = TipoGastoDetalleSerializer(nuevo_gasto)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    elif request.method == "PUT":
        try:
            id_gasto_detalle = request.data.get("id_gasto_detalle") or request.data.get("id")
            if not id_gasto_detalle:
                return Response({"ok": False, "error": "El id_gasto_detalle es requerido"}, status=400)
            
            try:
                gasto = TipoGastoDetalle.objects.get(pk=id_gasto_detalle)
            except TipoGastoDetalle.DoesNotExist:
                return Response({"ok": False, "error": "Tipo de gasto no encontrado"}, status=404)
            
            if "nombre" in request.data:
                gasto.nombre = request.data.get("nombre").strip().upper()
            if "activo" in request.data:
                val_activo = request.data.get("activo")
                gasto.activo = 1 if val_activo in [True, 1, "1", "true", "True"] else 0
            gasto.save()
            
            try:
                from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_gasto_detalle_legado
                disparar_sincronizacion_gasto_detalle_legado(gasto.id_gasto_detalle)
            except Exception as sync_err:
                print("Error disparando sincronización de TipoGastoDetalle:", sync_err)
                
            serializer = TipoGastoDetalleSerializer(gasto)
            return Response({"ok": True, "registro": serializer.data}, status=200)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    elif request.method == "DELETE":
        try:
            id_gasto_detalle = request.data.get("id_gasto_detalle") or request.query_params.get("id_gasto_detalle") or request.data.get("id") or request.query_params.get("id")
            if not id_gasto_detalle:
                return Response({"ok": False, "error": "El id_gasto_detalle es requerido"}, status=400)
            
            try:
                gasto = TipoGastoDetalle.objects.get(pk=id_gasto_detalle)
                codigo = gasto.codigo
                gasto.activo = 0
                gasto.save()
                
                try:
                    from cotizaciones_api.services.legacy_sync import disparar_eliminacion_gasto_detalle_legado
                    disparar_eliminacion_gasto_detalle_legado(codigo)
                except Exception as sync_err:
                    print("Error disparando eliminación de TipoGastoDetalle:", sync_err)
                    
                return Response({"ok": True, "message": "Tipo de gasto desactivado correctamente"}, status=200)
            except TipoGastoDetalle.DoesNotExist:
                return Response({"ok": False, "error": "Tipo de gasto no encontrado"}, status=404)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    try:
        # Usamos select_related para traer el nombre del padre en una sola consulta
        detalles = TipoGastoDetalle.objects.select_related('id_tipo_gasto').filter(activo=1)
        
        serializer = TipoGastoDetalleSerializer(detalles, many=True)
        return Response({
            "ok": True,
            "data": serializer.data
        })
        
    except Exception as e:
        return Response({
            "ok": False,
            "error": str(e)
        }, status=500)

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_productos(request):
    """
    Lista todos los productos activos o crea uno nuevo.
    GET params:
      - search    : busca en nombre, codigo, codigo2
      - id_marca  : filtra por marca
      - page      : número de página (default 1)
      - page_size : tamaño de página (default 50, max 200)
    """
    if request.method == "GET":
        try:
            search    = request.query_params.get('search', None)
            id_marca  = request.query_params.get('id_marca', None)
            page      = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 50)), 200)

            if page < 1:
                page = 1

            # Optimizamos con select_related para traer marca y unidad de medida
            productos = Producto.objects.select_related('id_marca', 'id_medida').filter(activo=1)

            if id_marca:
                productos = productos.filter(id_marca=id_marca)

            if search:
                productos = productos.filter(
                    Q(nombre__icontains=search) |
                    Q(codigo__icontains=search)  |
                    Q(codigo2__icontains=search)
                )

            total       = productos.count()
            total_pages = max(1, (total + page_size - 1) // page_size)
            offset      = (page - 1) * page_size
            productos   = productos.order_by('nombre')[offset: offset + page_size]

            serializer = ProductoSerializer(productos, many=True)
            return Response({
                "ok":          True,
                "data":        serializer.data,
                "total":       total,
                "page":        page,
                "page_size":   page_size,
                "total_pages": total_pages,
            })
            
        except Exception as e:
            return Response({
                "ok": False,
                "error": str(e)
            }, status=500)
            
    elif request.method == "POST":
        try:
            id_marca = request.data.get("id_marca")
            codigo = request.data.get("codigo", "").strip().upper()
            nombre = request.data.get("nombre", "").strip().upper()
            precio_dolares = request.data.get("precio_dolares", 0)

            if not id_marca:
                return Response({"ok": False, "error": "El id_marca es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            if not codigo:
                return Response({"ok": False, "error": "El código de producto es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            if not nombre:
                return Response({"ok": False, "error": "La descripción (nombre) es requerida"}, status=status.HTTP_400_BAD_REQUEST)

            # Verificar si la marca existe
            try:
                marca = TipoMarca.objects.get(id_marca=id_marca)
            except TipoMarca.DoesNotExist:
                return Response({"ok": False, "error": "La marca especificada no existe"}, status=status.HTTP_400_BAD_REQUEST)

            # Obtener campos adicionales
            codigo2 = request.data.get("codigo2", None)
            if isinstance(codigo2, str):
                codigo2 = codigo2.strip().upper() or None
            
            contenido_valor = request.data.get("contenido_valor", 1.00)
            try:
                contenido_valor = float(contenido_valor)
            except (ValueError, TypeError):
                contenido_valor = 1.00

            id_medida = request.data.get("id_medida", None)
            medida = None
            if id_medida:
                try:
                    id_medida_int = int(id_medida)
                    medida = UnidadMedida.objects.get(id_medida=id_medida_int)
                except (ValueError, TypeError, UnidadMedida.DoesNotExist):
                    medida_str = str(id_medida).strip().upper()
                    if medida_str:
                        medida = UnidadMedida.objects.filter(
                            Q(nombre__iexact=medida_str) | Q(codigo__iexact=medida_str)
                        ).first()
                        if not medida:
                            medida = UnidadMedida.objects.create(
                                codigo=medida_str[:50],
                                nombre=medida_str[:100],
                                activo=1
                            )

            descripcion = request.data.get("descripcion", None)
            if isinstance(descripcion, str):
                descripcion = descripcion.strip().upper() or None

            stock_min = request.data.get("stock_min", 0)
            try:
                stock_min = int(stock_min)
            except (ValueError, TypeError):
                stock_min = 0

            stock_max = request.data.get("stock_max", 0)
            try:
                stock_max = int(stock_max)
            except (ValueError, TypeError):
                stock_max = 0

            descuento = request.data.get("descuento", 0.00)
            try:
                descuento = float(descuento)
            except (ValueError, TypeError):
                descuento = 0.00

            proveedor = request.data.get("proveedor", None)
            if isinstance(proveedor, str):
                proveedor = proveedor.strip() or None

            tipo_cambio = request.data.get("tipo_cambio", 1.0)
            try:
                tipo_cambio = float(tipo_cambio)
            except (ValueError, TypeError):
                tipo_cambio = 1.0
            precio_soles = float(precio_dolares) * tipo_cambio

            # Verificar si ya existe un producto con el mismo código para esta marca (insensible a mayúsculas)
            exists = Producto.objects.filter(id_marca=id_marca, codigo__iexact=codigo).first()
            if exists:
                if exists.activo != 1:
                    exists.activo = 1
                exists.nombre = nombre
                exists.precio_dolares = precio_dolares
                exists.precio_soles = precio_soles
                exists.codigo2 = codigo2
                exists.contenido_valor = contenido_valor
                exists.id_medida = medida
                exists.descripcion = descripcion
                exists.stock_min = stock_min
                exists.stock_max = stock_max
                exists.descuento = descuento
                exists.proveedor = proveedor
                exists.save()
                serializer = ProductoSerializer(exists)
                return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_200_OK)

            # Si no existe, crearlo
            nuevo_producto = Producto.objects.create(
                id_marca=marca,
                codigo=codigo,
                nombre=nombre,
                precio_dolares=precio_dolares,
                precio_soles=precio_soles,
                codigo2=codigo2,
                contenido_valor=contenido_valor,
                id_medida=medida,
                descripcion=descripcion,
                stock_min=stock_min,
                stock_max=stock_max,
                descuento=descuento,
                proveedor=proveedor,
                activo=1
            )
            
            id_registro = request.data.get("id_registro")
            if id_registro:
                try:
                    from cotizaciones_api.models import Cotizacion, CotizacionSeguimiento
                    cot = Cotizacion.objects.filter(id_registro=id_registro).first()
                    if cot:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot,
                            detalle=f"Suministros: Agregar nuevo producto '{nuevo_producto.nombre}'",
                            id_usuario=request.user if request.user.is_authenticated else None,
                            activo='1'
                        )
                except Exception as ex:
                    print("Error creating tracking log for product:", ex)

            serializer = ProductoSerializer(nuevo_producto)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "ok": False,
                "error": str(e)
            }, status=500)

    elif request.method == "PUT":
        try:
            id_producto = request.data.get("id_producto")
            if not id_producto:
                return Response({"ok": False, "error": "El id_producto es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                producto = Producto.objects.get(pk=id_producto)
            except Producto.DoesNotExist:
                return Response({"ok": False, "error": "Producto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            
            # Actualizar campos
            id_marca = request.data.get("id_marca")
            if id_marca:
                try:
                    marca = TipoMarca.objects.get(id_marca=id_marca)
                    producto.id_marca = marca
                except TipoMarca.DoesNotExist:
                    return Response({"ok": False, "error": "La marca especificada no existe"}, status=status.HTTP_400_BAD_REQUEST)
            
            if "codigo" in request.data:
                producto.codigo = request.data.get("codigo").strip().upper()
            if "nombre" in request.data:
                producto.nombre = request.data.get("nombre").strip().upper()
            if "precio_dolares" in request.data:
                producto.precio_dolares = float(request.data.get("precio_dolares") or 0)
            if "precio_soles" in request.data:
                producto.precio_soles = float(request.data.get("precio_soles") or 0)
            if "codigo2" in request.data:
                producto.codigo2 = request.data.get("codigo2")
            if "contenido_valor" in request.data:
                producto.contenido_valor = float(request.data.get("contenido_valor") or 1.0)
            if "descripcion" in request.data:
                producto.descripcion = request.data.get("descripcion")
            if "cantidad" in request.data:
                producto.cantidad = int(request.data.get("cantidad") or 0)
            if "stock_min" in request.data:
                producto.stock_min = int(request.data.get("stock_min") or 0)
            if "stock_max" in request.data:
                producto.stock_max = int(request.data.get("stock_max") or 0)
            if "descuento" in request.data:
                producto.descuento = float(request.data.get("descuento") or 0.0)
            if "proveedor" in request.data:
                producto.proveedor = request.data.get("proveedor")
            if "activo" in request.data:
                val_activo = request.data.get("activo")
                producto.activo = 1 if val_activo in [True, "1", 1, "true", "True", "ACTIVO"] else 0
            
            id_medida = request.data.get("id_medida")
            if id_medida:
                try:
                    medida = UnidadMedida.objects.get(id_medida=int(id_medida))
                    producto.id_medida = medida
                except Exception:
                    pass
            
            producto.save()
            serializer = ProductoSerializer(producto)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)
            
    elif request.method == "DELETE":
        try:
            id_producto = request.data.get("id_producto") or request.query_params.get("id_producto")
            if not id_producto:
                return Response({"ok": False, "error": "El id_producto es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                producto = Producto.objects.get(pk=id_producto)
                producto.delete()
                return Response({"ok": True, "message": "Producto eliminado correctamente"}, status=status.HTTP_200_OK)
            except Producto.DoesNotExist:
                return Response({"ok": False, "error": "Producto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                # Fallback to logical delete if foreign key fails
                try:
                    producto = Producto.objects.get(pk=id_producto)
                    producto.activo = 0
                    producto.save()
                    return Response({"ok": True, "message": "El producto tiene transacciones asociadas, se ha desactivado lógicamente"}, status=status.HTTP_200_OK)
                except Exception:
                    return Response({"ok": False, "error": "No se puede eliminar ni desactivar el producto"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def lista_notas(request):
    # --- GET: Listar todas las notas activas ---
    if request.method == "GET":
        try:
            notas = Nota.objects.filter(activo=1).order_by("codigo")
            serializer = NotaSerializer(notas, many=True)
            return Response({
                "ok": True,
                "data": serializer.data
            })
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)
    
    # --- POST: Crear una nueva nota ---
    elif request.method == "POST":
        serializer = NotaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "ok": True, 
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({"ok": False, "errors": serializer.errors}, status=400)

    # --- PUT: Actualizar nota por id_nota ---
    elif request.method == "PUT":
        id_nota = request.data.get("id_nota")
        try:
            nota = Nota.objects.get(pk=id_nota)
            # El frontend envía 'activo' como booleano, en BD es int(11)
            data = request.data.copy()
            if "activo" in data:
                data["activo"] = 1 if data["activo"] in [True, 1, "1", "true", "True"] else 0
            serializer = NotaSerializer(nota, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "ok": True,
                    "data": serializer.data
                })
            return Response({"ok": False, "errors": serializer.errors}, status=400)
        except Nota.DoesNotExist:
            return Response({
                "ok": False, 
                "error": "Nota técnica no encontrada"
            }, status=404)

    # --- DELETE: Desactivar nota ---
    elif request.method == "DELETE":
        id_nota = request.data.get("id_nota") or request.query_params.get("id_nota")
        if not id_nota:
            return Response({"ok": False, "error": "El id_nota es requerido"}, status=400)
        try:
            nota = Nota.objects.get(pk=id_nota)
            nota.activo = 0
            nota.save()
            return Response({"ok": True, "message": "Nota desactivada correctamente"}, status=200)
        except Nota.DoesNotExist:
            return Response({"ok": False, "error": "Nota no encontrada"}, status=404)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def lista_unidades_medida(request):
    if request.method == "GET":
        unidades = UnidadMedida.objects.filter(activo=1).order_by("nombre")
        serializer = UnidadMedidaSerializer(unidades, many=True)
        return Response(serializer.data)
    elif request.method == "POST":
        codigo = request.data.get("codigo", "").strip().upper()
        nombre = request.data.get("nombre", "").strip().upper()
        if not codigo or not nombre:
            return Response({"ok": False, "error": "El código y nombre de unidad son requeridos"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already exists (case-insensitive)
        exists = UnidadMedida.objects.filter(Q(codigo__iexact=codigo) | Q(nombre__iexact=nombre)).first()
        if exists:
            if exists.activo != 1:
                exists.activo = 1
                exists.save()
            serializer = UnidadMedidaSerializer(exists)
            return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_200_OK)
        
        nueva_unidad = UnidadMedida.objects.create(codigo=codigo, nombre=nombre, activo=1)
        serializer = UnidadMedidaSerializer(nueva_unidad)
        return Response({"ok": True, "registro": serializer.data}, status=status.HTTP_201_CREATED)



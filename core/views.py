from django.shortcuts import render

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
        resultados = clientes_qs.order_by('nombre').values('id_cliente', 'nombre', 'ruc', 'iniciales', 'tipo')[:20]
        
        return Response(list(resultados), status=status.HTTP_200_OK)

    except Exception as e:
        # Esto imprimirá el error real en tu consola de Django para que lo veas
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
        if id_representante:
            try:
                rep = Representante.objects.get(pk=id_representante)
                serializer = RepresentanteSerializer(rep)
                return Response(serializer.data)
            except Representante.DoesNotExist:
                return Response({"error": "Representante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

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

@api_view(["GET", "POST"])
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

@api_view(["GET", "POST"])
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

@api_view(["GET", "POST"])
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

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def lista_productos(request):
    """
    Lista todos los productos activos o crea uno nuevo.
    Soporta búsqueda opcional mediante el parámetro 'search' e 'id_marca'.
    """
    if request.method == "GET":
        try:
            search = request.query_params.get('search', None)
            id_marca = request.query_params.get('id_marca', None)
            
            # Optimizamos con select_related para traer marca y unidad de medida
            productos = Producto.objects.select_related('id_marca', 'id_medida').filter(activo=1)
            
            if id_marca:
                productos = productos.filter(id_marca=id_marca)
                
            if search:
                productos = productos.filter(
                    Q(nombre__icontains=search) | 
                    Q(codigo__icontains=search)
                )
            
            # Limitamos a los primeros 100 para no saturar si no hay búsqueda
            if not search:
                productos = productos[:100]

            serializer = ProductoSerializer(productos, many=True)
            return Response({
                "ok": True,
                "data": serializer.data
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

@api_view(["GET", "POST", "PUT"])
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
            serializer = NotaSerializer(nota, data=request.data, partial=True)
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



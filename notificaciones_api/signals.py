import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .models import Notificacion

def enviar_notificacion_email_async(correo_destino, titulo, descripcion, tipo, modulo, referencia_id, meta, id_notificacion):
    try:
        # Salvaguarda: En modo DEBUG (desarrollo) enviamos siempre a diego.rengifo@vc-corporation.com
        # para no perturbar a los usuarios reales con pruebas.
        if getattr(settings, 'DEBUG', False):
            target_correo = "diego.rengifo@vc-corporation.com"
        else:
            target_correo = correo_destino
            
        id_registro = meta.get("id_registro")
        tipo_alerta = meta.get("tipo_alerta")
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        backend_url = "http://localhost:8080" if "localhost" in frontend_url else "http://10.225.94.22:8080"
        
        # Mapear URL según el tipo de alerta o módulo usando el id_registro numérico
        enlace_directo = f"{frontend_url}/comercial"
        if id_registro:
            if "apertura" in str(tipo_alerta):
                enlace_directo = f"{frontend_url}/comercial/aperturas/{id_registro}"
            elif "limite_oportunidad" in str(tipo_alerta) or "conversion" in str(tipo_alerta):
                enlace_directo = f"{frontend_url}/comercial/oportunidades/{id_registro}"
            elif "validez" in str(tipo_alerta) or "delay" in str(tipo_alerta):
                enlace_directo = f"{frontend_url}/comercial/cotizaciones/{id_registro}"
            else:
                enlace_directo = f"{frontend_url}/comercial/cotizaciones/{id_registro}"
                
        enlace_directo += f"?marcar_leido_id={id_notificacion}"

        subject = f"Alerta Comercial: {titulo}"
        
        # Colores del tema según gravedad
        color_tema = "#f59e0b"  # atencion -> Amber
        color_bg_tema = "#fef3c7"
        etiqueta_tipo = "ATENCIÓN"
        if tipo == "urgente":
            color_tema = "#ef4444"  # urgente -> Red
            color_bg_tema = "#fee2e2"
            etiqueta_tipo = "CRÍTICO / URGENTE"
        elif tipo == "informativo":
            color_tema = "#3b82f6"  # informativo -> Blue
            color_bg_tema = "#dbeafe"
            etiqueta_tipo = "INFORMACIÓN"
            
        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta Comercial</title>
</head>
<body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #334155; background-color: #f1f5f9; margin: 0; padding: 24px;">
    <!-- Contenedor Centrado -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f1f5f9; width: 100%; border-spacing: 0;">
        <tr>
            <td align="center" style="padding: 10px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; border-spacing: 0;">
                    
                    <!-- Borde superior de color por gravedad -->
                    <tr>
                        <td height="4" style="background-color: {color_tema}; line-height: 4px; font-size: 1px;">&nbsp;</td>
                    </tr>
                    
                    <!-- Encabezado corporativo -->
                    <tr>
                        <td style="background-color: #237573; padding: 18px 25px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="font-size: 18px; font-weight: bold; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; letter-spacing: 0.5px;">
                                        SIGECOM <span style="font-weight: 300; color: #b2dfdb;">5.0</span>
                                    </td>
                                    <td align="right" style="font-size: 11px; font-weight: bold; color: #b2dfdb; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif; letter-spacing: 1px;">
                                        MÓDULO COMERCIAL
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Cuerpo del Mensaje -->
                    <tr>
                        <td style="padding: 32px 30px;">
                            
                            <!-- Alerta Caja / Badge -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: {color_bg_tema}; border-left: 4px solid {color_tema}; border-radius: 4px; margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 14px 18px;">
                                        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: {color_tema}; letter-spacing: 1px; display: block; margin-bottom: 4px; font-family: 'Segoe UI', Arial, sans-serif;">
                                            ALERTA: {etiqueta_tipo}
                                        </span>
                                        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.3; font-family: 'Segoe UI', Arial, sans-serif;">
                                            {titulo}
                                        </h2>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Mensaje descriptivo -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="font-size: 15px; color: #334155; line-height: 1.6; font-family: 'Segoe UI', Arial, sans-serif;">
                                        <p style="margin: 0 0 16px 0; font-weight: 600; color: #1e293b;">Estimado colaborador,</p>
                                        <p style="margin: 0 0 8px 0;">Te notificamos la siguiente actualización de control comercial:</p>
                                        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 18px; border-radius: 6px; margin: 16px 0; color: #475569; font-style: italic;">
                                            "{descripcion}"
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Botón de Acción -->
                            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 32px auto 16px auto;">
                                <tr>
                                    <td align="center" bgcolor="#237573" style="border-radius: 6px; background-color: #237573;">
                                        <a href="{enlace_directo}" target="_blank" style="font-size: 13px; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 13px 36px; border: 1px solid #237573; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.8px;">
                                            Ver en el Sistema
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Pie de Página -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 30px; text-align: center;">
                            <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.4;">
                                Este es un correo automático del sistema <strong>SIGECOM 5.0</strong>.
                            </p>
                            <p style="font-size: 10px; color: #94a3b8; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                                Soporte TI: <a href="mailto:diego.rengifo@vc-corporation.com" style="color: #237573; text-decoration: none;">diego.rengifo@vc-corporation.com</a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
        text_body = f"{titulo}\n\n{descripcion}\n\nAcceder al sistema: {enlace_directo}"
        from_email_formatted = "Notificaciones SIGECOM <notificaciones.comercial@vc-corporation.com>"
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email_formatted,
            to=[target_correo]
        )
        email.attach_alternative(html_body, "text/html")
        email.send()
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al enviar correo de notificación asíncrono: {e}")

@receiver(post_save, sender=Notificacion)
def notificacion_creada(sender, instance, created, **kwargs):
    if created and instance.id_modulo_id == 1 and not instance.leido:
        # Extraer todos los valores necesarios en el hilo principal antes de lanzar el hilo secundario,
        # evitando así abrir nuevas conexiones de base de datos dentro del hilo asíncrono.
        try:
            usuario = instance.usuario
            usuario_login = usuario.usuario
            
            # En modo DEBUG (local), todos los correos electrónicos se envían a diego.rengifo@vc-corporation.com
            # para que el superadmin pueda monitorear y probar el flujo de todos los usuarios comerciales.
            correo_destino = "diego.rengifo@vc-corporation.com" if getattr(settings, 'DEBUG', False) else (usuario.correo or "diego.rengifo@vc-corporation.com")
            if not correo_destino or "@" not in correo_destino:
                correo_destino = "diego.rengifo@vc-corporation.com"
                
            meta_copy = dict(instance.metadata) if instance.metadata else {}
            modulo_nombre = instance.id_modulo.nombre.lower() if instance.id_modulo else "comercial"
            
            threading.Thread(
                target=enviar_notificacion_email_async,
                args=(
                    correo_destino,
                    instance.titulo,
                    instance.descripcion,
                    instance.tipo,
                    modulo_nombre,
                    instance.referencia_id,
                    meta_copy,
                    instance.id_notificacion
                )
            ).start()
        except Exception as signal_err:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error en el signal de notificacion al preparar el hilo: {signal_err}")

from django.contrib import admin
from .models import TipoSolicitud

@admin.register(TipoSolicitud)
class TipoSolicitudAdmin(admin.ModelAdmin):
    list_display = ('id_tipo', 'nombre', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)


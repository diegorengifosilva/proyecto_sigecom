from django.urls import path
from . import views

urlpatterns = [
    path('clientes/', views.lista_clientes, name='lista_clientes'),
    path('clientes/buscar/', views.buscar_clientes_inline, name='buscar_clientes_inline'),
    path('representantes/', views.lista_representantes, name='lista_representantes'),
    path('representantes/buscar/', views.buscar_representantes_inline, name='buscar_representantes_inline'),
    path("estados/", views.lista_estados, name="lista_estados"),
    path("tipo_gasto/", views.lista_tipo_gasto, name="lista_tipo_gasto"),
    path("tipo_marca/", views.lista_tipo_marca, name="lista_tipo_marca"),
    #path("cotizaciones/categorias/", views.lista_categorias, name="lista_categorias"),
    path("tipo_personal/", views.lista_tipo_personal, name="lista_tipo_personal"),
    #path("cotizaciones/tgasto_d/", views.lista_tgasto_d, name="lista_tgasto_d"),
    path("tipo_gasto_detalle/", views.lista_tgasto_detalle, name="lista_tgasto_detalle"),
    path("productos/", views.lista_productos, name="lista_productos"),
    path("notas/", views.lista_notas, name="lista_notas"),
    path("unidades_medida/", views.lista_unidades_medida, name="lista_unidades_medida"),
]
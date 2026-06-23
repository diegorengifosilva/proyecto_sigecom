from django.urls import path
from . import views

urlpatterns = [
    path('clientes/', views.lista_clientes, name='lista_clientes'),
    path('clientes/buscar/', views.buscar_clientes_inline, name='buscar_clientes_inline'),
    path('representantes/', views.lista_representantes, name='lista_representantes'),
    path('representantes/buscar/', views.buscar_representantes_inline, name='buscar_representantes_inline'),
]
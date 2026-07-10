# users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.login_usuario, name='login_usuario'),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path('usuario-actual/', views.usuario_actual, name='usuario_actual'),
    path('usuarios-activos/', views.usuarios_activos, name='usuarios_activos'),
    path('areas/', views.lista_areas, name='lista_areas'),
    path('cargos/', views.lista_cargos, name='lista_cargos'),
    path('cambiar-contrasena/', views.cambiar_contrasena, name='cambiar_contrasena'),
]
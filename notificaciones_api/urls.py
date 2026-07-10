from django.urls import path
from . import views

urlpatterns = [
    path("", views.notificaciones_usuario, name="notificaciones_usuario"),
    path("<int:pk>/marcar/", views.marcar_notificacion, name="marcar_notificacion"),
    path("marcar-todas/", views.marcar_todas_notificaciones, name="marcar_todas_notificaciones"),
    path("no-leidas/", views.notificaciones_no_leidas, name="notificaciones_no_leidas"),
]

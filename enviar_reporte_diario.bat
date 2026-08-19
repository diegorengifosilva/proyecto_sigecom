@echo off
cd /d "c:\Users\VC-23031\PROYECTOS\SIGECOM_5"
call env\Scripts\activate.bat
python manage.py enviar_reporte_mensual --emails "diego.rengifo@vc-corporation.com,sistemas@vc-corporation.com"

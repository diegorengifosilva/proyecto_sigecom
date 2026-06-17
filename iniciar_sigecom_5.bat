@echo off
rem ====================================================
rem INICIANDO SIGECOM 5.0 (ENTORNO COMPLETO)
rem ====================================================

rem Cambiar al directorio raíz del proyecto
cd /d "%~dp0"

rem ---- Activar entorno virtual ----
call env\Scripts\activate

rem ---- Asegurar que exista la carpeta frontend\dist (evita warning) ----
if not exist "frontend\dist" mkdir "frontend\dist"

rem ---- Aplicar migraciones (si hay cambios) ----
python manage.py migrate

rem ---- Coleccionar archivos estáticos (para que Django sirva CSS/JS en producción) ----
python manage.py collectstatic --noinput

echo [1/2] Iniciando Backend Django...
start "Backend SIGECOM 5.0" cmd /k "python manage.py runserver 0.0.0.0:8000"

echo [2/2] Iniciando Frontend React/Vite...
start "Frontend SIGECOM 5.0" cmd /k "cd frontend && npm run dev"

echo.
echo El sistema se está ejecutando en ventanas separadas.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause

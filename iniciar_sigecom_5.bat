@echo off
echo ===================================================
echo INICIANDO SIGECOM 5.0 (ESTRUCTURA ESCALABLE)
echo ===================================================

cd /d "%~dp0"
set "PATH=C:\Program Files\GTK3-Runtime Win64\bin;%PATH%"


echo [1/2] Iniciando Backend Django...
start "Backend SIGECOM 5.0" cmd /k "env\Scripts\activate && python manage.py runserver 0.0.0.0:8000"

echo [2/2] Iniciando Frontend React/Vite...
start "Frontend SIGECOM 5.0" cmd /k "cd frontend && npm run dev"

echo.
echo El sistema se esta ejecutando en ventanas separadas.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause

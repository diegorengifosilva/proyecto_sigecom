@echo off
echo ===================================================
echo INICIANDO SIGECOM 5.0 (ESTRUCTURA ESCALABLE)
echo ===================================================

cd /d "%~dp0"
set "PATH=C:\Program Files\GTK3-Runtime Win64\bin;%PATH%"

netstat -ano | find "3307" > nul
if %errorlevel% neq 0 (
    echo Iniciando MariaDB en puerto 3307...
    start "MariaDB SIGECOM" /min "C:\mariadb\bin\mysqld.exe" --datadir=C:\mariadb\data --port=3307 --standalone
    timeout /t 3 > nul
)

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

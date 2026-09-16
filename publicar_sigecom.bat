@echo off
echo ===================================================
echo PUBLICAR SIGECOM 5.0 EN ESTE VPS
echo ===================================================
cd /d "%~dp0"

echo.
echo [1/3] Actualizando codigo (git pull)...
git pull
if errorlevel 1 (
  echo ERROR: git pull fallo. Resuelva conflictos y vuelva a intentar.
  pause
  exit /b 1
)

echo.
echo [2/3] Build de frontend de produccion...
call frontend\node_modules\.bin\vite.cmd --version >nul 2>&1
cd frontend
call npm run build
if errorlevel 1 (
  echo ERROR: el build fallo. No se publico un bundle inseguro.
  cd /d "%~dp0"
  pause
  exit /b 1
)
cd /d "%~dp0"

echo.
echo [3/3] Reinicie el backend Waitress para aplicar cambios de Django:
echo   - Cierre la ventana "Backend SIGECOM 5.0"
echo   - Ejecute iniciar_sigecom_5.bat
echo.
echo Luego recargue el sitio con Ctrl+F5.
echo Caddy sirve frontend\dist automaticamente; no hace falta tocar Caddyfile.
pause

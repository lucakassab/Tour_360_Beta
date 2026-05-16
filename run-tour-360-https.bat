@echo off
setlocal

cd /d "%~dp0"

set "PORT=8443"
set "CERT_PASSWORD=tour-360-local"

echo.
echo Tour 360 - servidor HTTPS local
echo --------------------------------
echo Pasta: %CD%
echo Porta: %PORT%
echo.

where node >nul 2>nul
if not %errorlevel%==0 (
  echo Node.js nao encontrado.
  echo Instale o Node.js ou execute este projeto em uma maquina com Node disponivel.
  echo.
  pause
  goto :end
)

if not exist ".certs" mkdir ".certs"

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\create-local-https-cert.ps1" -OutputDir ".certs" -Password "%CERT_PASSWORD%"
if not %errorlevel%==0 (
  echo.
  echo Falha ao criar o certificado HTTPS local.
  pause
  goto :end
)

echo.
echo Abrindo https://localhost:%PORT% ...
start "" "https://localhost:%PORT%"
echo.

node ".\scripts\https-server.js" --port "%PORT%" --pfx ".\.certs\tour-360-local.pfx" --pass "%CERT_PASSWORD%"

:end
endlocal

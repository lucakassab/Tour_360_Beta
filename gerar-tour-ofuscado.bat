@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if not %errorlevel%==0 (
  echo Node.js nao encontrado.
  echo Instale o Node.js antes de gerar a versao ofuscada.
  pause
  exit /b 1
)

node ".\tools\build-obfuscated.js"
if not %errorlevel%==0 (
  echo.
  echo Falha ao gerar a versao ofuscada.
  pause
  exit /b 1
)

echo.
echo Versao ofuscada gerada com sucesso.
echo.
pause

endlocal

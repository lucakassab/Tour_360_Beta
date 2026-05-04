@echo off
setlocal

cd /d "%~dp0"

set "PORT=8000"

echo.
echo Tour 360 - servidor local
echo --------------------------
echo Pasta: %CD%
echo Porta: %PORT%
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  echo Abrindo http://localhost:%PORT% ...
  start "" "http://localhost:%PORT%"
  echo.
  echo Pressione Ctrl+C para parar o servidor.
  echo.
  python -m http.server %PORT%
  goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Abrindo http://localhost:%PORT% ...
  start "" "http://localhost:%PORT%"
  echo.
  echo Pressione Ctrl+C para parar o servidor.
  echo.
  py -m http.server %PORT%
  goto :end
)

echo Python nao encontrado.
echo Instale o Python ou rode manualmente:
echo python -m http.server %PORT%
echo.
pause

:end
endlocal

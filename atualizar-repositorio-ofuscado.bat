@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if not %errorlevel%==0 (
  echo Node.js nao encontrado.
  echo Instale o Node.js antes de atualizar o repositorio.
  pause
  exit /b 1
)

where git >nul 2>nul
if not %errorlevel%==0 (
  echo Git nao encontrado.
  echo Instale o Git antes de atualizar o repositorio.
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

git status --short
echo.

git add -A
git diff --cached --quiet
if %errorlevel%==0 (
  echo Nenhuma alteracao nova para commitar.
  echo Enviando branch atual mesmo assim...
  git push
  pause
  exit /b %errorlevel%
)

set "COMMIT_MESSAGE=%*"
if "%COMMIT_MESSAGE%"=="" set "COMMIT_MESSAGE=Update obfuscated tour"

git commit -m "%COMMIT_MESSAGE%"
if not %errorlevel%==0 (
  echo.
  echo Falha ao criar commit.
  pause
  exit /b 1
)

git push origin main
if not %errorlevel%==0 (
  echo.
  echo Falha ao enviar para o GitHub.
  pause
  exit /b 1
)

echo.
echo Repositorio atualizado com sucesso.
echo Link: https://lucakassab.github.io/Tour_360_Beta/
echo.
pause

endlocal

@echo off
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo Python не найден. Установите Python с python.org
    pause
    exit /b 1
  )
  set PY=py
) else (
  set PY=python
)

echo.
echo  MalSu — локальный сервер
echo  Откройте: http://localhost:8080
echo.
start "" "http://localhost:8080"
%PY% -m http.server 8080
pause

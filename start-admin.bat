@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-admin.ps1"
if errorlevel 1 (
  echo.
  echo Start failed. Press any key to close.
  pause >nul
)

@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-github.ps1"
echo.
echo Press any key to close.
pause >nul
exit /b 1

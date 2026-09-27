@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-admin.ps1" -NoBrowser
if errorlevel 1 exit /b 1
start "" "http://localhost:4000/effects-admin/"

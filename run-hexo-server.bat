@echo off
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Pandoc;%PATH%"

echo.
echo ========================================
echo   Hexo Local Server
echo ========================================
echo.
echo Admin: http://localhost:4000/pro/
echo Site:  http://localhost:4000/
echo.
echo Keep this window open while editing the blog.
echo Press Ctrl+C or close this window to stop the server.
echo.

npm.cmd run server

echo.
echo Hexo server stopped.
pause

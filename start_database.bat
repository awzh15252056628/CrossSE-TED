@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 goto run_python

where py >nul 2>nul
if %errorlevel%==0 goto run_py

echo Python was not found. Upload this folder to GitHub Pages or start another local HTTP server here.
pause
exit /b 1

:run_python
start "" "http://127.0.0.1:8765/index.html"
python -m http.server 8765 --bind 127.0.0.1
goto end

:run_py
start "" "http://127.0.0.1:8765/index.html"
py -3 -m http.server 8765 --bind 127.0.0.1

:end
endlocal

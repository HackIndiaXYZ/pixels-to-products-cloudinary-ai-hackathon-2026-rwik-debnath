@echo off
REM PressWire Windows Launcher (CMD/Explorer)
setlocal enabledelayedexpansion

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_dev.ps1"
pause

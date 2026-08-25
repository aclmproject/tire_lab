@echo off
setlocal
set "ROOT=%~dp0"
set "URL=http://127.0.0.1:48765/"
netstat -ano | findstr /R /C:"127.0.0.1:48765 .*LISTENING" >nul
if errorlevel 1 (
  start "ACLM Tire Lab Local Server" /min powershell.exe -NoLogo -NoProfile -File "%ROOT%Server_ACLM_Tire_Lab.ps1"
  timeout /t 1 /nobreak >nul
)
start "" "%URL%"
endlocal

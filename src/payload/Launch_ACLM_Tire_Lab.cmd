          @echo off
setlocal
set "ROOT=%~dp0"
set "EXPECTED_VERSION=0.6.5"
set "URL=http://127.0.0.1:48765/?build=0.6.5"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "try { $h=Invoke-RestMethod -Uri 'http://127.0.0.1:48765/api/health' -TimeoutSec 2; if ($h.product -eq 'ACLM Historical Tire Lab' -and $h.server_version -eq '%EXPECTED_VERSION%') { exit 0 } } catch {}; exit 1" >nul 2>&1
if errorlevel 1 (
  echo Starting ACLM Historical Tire Lab v%EXPECTED_VERSION%...
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$connections=Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 48765 -State Listen -ErrorAction SilentlyContinue; foreach($connection in $connections){ try { $p=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $connection.OwningProcess); if($p.CommandLine -match 'Server_ACLM_Tire_Lab.ps1'){ Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {} }" >nul 2>&1
  timeout /t 1 /nobreak >nul
  start "ACLM Tire Lab Local Server" /min powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%Server_ACLM_Tire_Lab.ps1"
  timeout /t 2 /nobreak >nul
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "try { $h=Invoke-RestMethod -Uri 'http://127.0.0.1:48765/api/health' -TimeoutSec 4; if ($h.product -eq 'ACLM Historical Tire Lab' -and $h.server_version -eq '%EXPECTED_VERSION%') { exit 0 } } catch {}; exit 1" >nul 2>&1
if errorlevel 1 (
  echo ERROR: Tire Lab v%EXPECTED_VERSION% could not start on port 48765.
  echo Close any old Tire Lab window, then run this launcher again.
  pause
  exit /b 1
)

start "" "%URL%"
endlocal

@echo off
setlocal
set "APPDIR=%LOCALAPPDATA%\ACLM\Historical Tire Lab"
set "SOURCE=%~dp0payload"
set "CACHEBACK=%TEMP%\ACLM_Tire_Lab_cache_%RANDOM%_%RANDOM%"

echo ======================================================
echo        ACLM Historical Tire Lab - Safe Installer
echo ======================================================
echo Application build: v0.6.0
echo.
echo This installer only copies files already included in this ZIP.
echo It does not download or execute software from the Internet.
echo.
if not exist "%SOURCE%\app\index.html" (
  echo ERROR: Installer payload is incomplete.
  pause
  exit /b 1
)

echo Stopping the previous Tire Lab local server, if present...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$target=[IO.Path]::GetFullPath('%APPDIR%\Server_ACLM_Tire_Lab.ps1'); Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and ($_.Name -eq 'powershell.exe' -or $_.Name -eq 'pwsh.exe') -and $_.CommandLine -and $_.CommandLine.IndexOf($target,[StringComparison]::OrdinalIgnoreCase) -ge 0 } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

mkdir "%CACHEBACK%" >nul 2>&1
if exist "%APPDIR%\knowledge_cache.json" copy /Y "%APPDIR%\knowledge_cache.json" "%CACHEBACK%\knowledge_cache.json" >nul
if exist "%APPDIR%\app_manifest_cache.json" copy /Y "%APPDIR%\app_manifest_cache.json" "%CACHEBACK%\app_manifest_cache.json" >nul

if exist "%APPDIR%" rmdir /s /q "%APPDIR%"
mkdir "%APPDIR%" >nul 2>&1
xcopy "%SOURCE%\*" "%APPDIR%\" /E /I /H /Y >nul
if errorlevel 1 (
  echo ERROR: Could not copy Tire Lab files.
  pause
  exit /b 1
)

if exist "%CACHEBACK%\knowledge_cache.json" copy /Y "%CACHEBACK%\knowledge_cache.json" "%APPDIR%\knowledge_cache.json" >nul
if exist "%CACHEBACK%\app_manifest_cache.json" copy /Y "%CACHEBACK%\app_manifest_cache.json" "%APPDIR%\app_manifest_cache.json" >nul
if exist "%CACHEBACK%" rmdir /s /q "%CACHEBACK%"

copy /Y "%APPDIR%\Launch_ACLM_Tire_Lab.cmd" "%USERPROFILE%\Desktop\ACLM Historical Tire Lab.cmd" >nul
echo.
echo Installed to: %APPDIR%
echo The previous local server was stopped so this build starts cleanly.
echo Verified knowledge and manifest caches were preserved.
echo A launcher was copied to your Desktop.
echo Application updates are manual and open in your normal browser.
echo Tire-knowledge JSON updates remain SHA-256 verified.
echo.
choice /C YN /N /M "Launch Tire Lab now? [Y/N] "
if errorlevel 2 exit /b 0
call "%APPDIR%\Launch_ACLM_Tire_Lab.cmd"
endlocal

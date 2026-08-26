          @echo off
setlocal
set "APPDIR=%LOCALAPPDATA%\ACLM\Historical Tire Lab"
set "SOURCE=%~dp0payload"
set "CACHEBACK=%TEMP%\ACLM_Tire_Lab_cache_%RANDOM%_%RANDOM%"
set "USERSTART=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
set "LAUNCHROOT=%USERPROFILE%\Desktop"
if exist "%OneDrive%\Desktop" set "LAUNCHROOT=%OneDrive%\Desktop"
set "LAUNCHLINK=%LAUNCHROOT%\ACLM Historical Tire Lab.lnk"

echo ======================================================
echo     ACLM Historical Tire Lab v0.7.0 - One Launcher
echo ======================================================
echo This installer removes only exact legacy Tire Lab shortcuts.
echo It keeps one canonical launcher that starts the correct server.
echo.
if not exist "%SOURCE%\app\index.html" (
  echo ERROR: Installer payload is incomplete.
  pause
  exit /b 1
)

echo Stopping prior Tire Lab servers...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$target=[IO.Path]::GetFullPath('%APPDIR%\Server_ACLM_Tire_Lab.ps1'); Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and ($_.Name -eq 'powershell.exe' -or $_.Name -eq 'pwsh.exe') -and $_.CommandLine -and ($_.CommandLine.IndexOf($target,[StringComparison]::OrdinalIgnoreCase) -ge 0 -or $_.CommandLine -match 'Server_ACLM_Tire_Lab.ps1') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
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

echo Removing exact legacy Tire Lab launchers...
for %%D in ("%USERPROFILE%\Desktop" "%OneDrive%\Desktop") do (
  if exist "%%~D\ACLM Historical Tire Lab.cmd" del /f /q "%%~D\ACLM Historical Tire Lab.cmd"
  if exist "%%~D\ACLM Historical Tire Lab.lnk" del /f /q "%%~D\ACLM Historical Tire Lab.lnk"
  if exist "%%~D\ACLM Historical Tire Lab (1).lnk" del /f /q "%%~D\ACLM Historical Tire Lab (1).lnk"
  if exist "%%~D\ACLM Tire Lab.lnk" del /f /q "%%~D\ACLM Tire Lab.lnk"
)
if exist "%USERSTART%\ACLM Historical Tire Lab.lnk" del /f /q "%USERSTART%\ACLM Historical Tire Lab.lnk"
if exist "%USERSTART%\ACLM Tire Lab.lnk" del /f /q "%USERSTART%\ACLM Tire Lab.lnk"
if exist "%USERSTART%\Uninstall ACLM Tire Lab.lnk" del /f /q "%USERSTART%\Uninstall ACLM Tire Lab.lnk"
if exist "%USERSTART%\Startup\ACLM Tire Lab Server.lnk" del /f /q "%USERSTART%\Startup\ACLM Tire Lab Server.lnk"
if exist "%USERSTART%\Chrome Apps\ACLM Historical Tire Lab.lnk" del /f /q "%USERSTART%\Chrome Apps\ACLM Historical Tire Lab.lnk"
if exist "%USERSTART%\ACLM Historical Tire Lab" rmdir /s /q "%USERSTART%\ACLM Historical Tire Lab"

echo Creating one canonical launcher...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut('%LAUNCHLINK%'); $s.TargetPath='%APPDIR%\Launch_ACLM_Tire_Lab.cmd'; $s.WorkingDirectory='%APPDIR%'; $s.IconLocation='%APPDIR%\app\ACLM_Tire_Lab.ico,0'; $s.Description='ACLM Historical Tire Lab v0.7.0'; $s.Save()" >nul 2>&1
if not exist "%LAUNCHLINK%" copy /Y "%APPDIR%\Launch_ACLM_Tire_Lab.cmd" "%LAUNCHROOT%\ACLM Historical Tire Lab.cmd" >nul

echo.
echo Installed to: %APPDIR%
echo Legacy ACLM launchers were removed.
echo One canonical launcher remains in: %LAUNCHROOT%
echo Verified knowledge and manifest caches were preserved.
echo.
choice /C YN /N /M "Launch Tire Lab v0.7.0 now? [Y/N] "
if errorlevel 2 exit /b 0
call "%APPDIR%\Launch_ACLM_Tire_Lab.cmd"
endlocal

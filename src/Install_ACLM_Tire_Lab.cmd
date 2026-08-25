@echo off
setlocal
set "APPDIR=%LOCALAPPDATA%\ACLM\Historical Tire Lab"
set "SOURCE=%~dp0payload"

echo ======================================================
echo        ACLM Historical Tire Lab - Safe Installer
echo ======================================================
echo Application build: v0.5.4
echo.
echo This installer only copies files already included in this ZIP.
echo It does not download or execute software from the Internet.
echo.
if not exist "%SOURCE%\app\index.html" (
  echo ERROR: Installer payload is incomplete.
  pause
  exit /b 1
)
if exist "%APPDIR%" rmdir /s /q "%APPDIR%"
mkdir "%APPDIR%" >nul 2>&1
xcopy "%SOURCE%\*" "%APPDIR%\" /E /I /H /Y >nul
if errorlevel 1 (
  echo ERROR: Could not copy Tire Lab files.
  pause
  exit /b 1
)
copy /Y "%APPDIR%\Launch_ACLM_Tire_Lab.cmd" "%USERPROFILE%\Desktop\ACLM Historical Tire Lab.cmd" >nul
echo.
echo Installed to: %APPDIR%
echo A launcher was copied to your Desktop.
echo Application updates are manual and open in your normal browser.
echo Tire-knowledge JSON updates remain SHA-256 verified.
echo.
choice /C YN /N /M "Launch Tire Lab now? [Y/N] "
if errorlevel 2 exit /b 0
call "%APPDIR%\Launch_ACLM_Tire_Lab.cmd"
endlocal

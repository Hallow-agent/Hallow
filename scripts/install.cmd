@echo off
setlocal EnableExtensions

set "HALLOW_INSTALL_PS1_URL=%HALLOW_INSTALL_PS1_URL%"
if "%HALLOW_INSTALL_PS1_URL%"=="" set "HALLOW_INSTALL_PS1_URL=https://hallow-agent.xyz/install.ps1"

where powershell >nul 2>nul
if errorlevel 1 (
  echo error: PowerShell is required to install Hallow on Windows.
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { irm '%HALLOW_INSTALL_PS1_URL%' | iex } catch { Write-Error $_; exit 1 }"
if errorlevel 1 exit /b %errorlevel%

set "HALLOW_CMD=%LOCALAPPDATA%\hallow\bin\hallow.cmd"
echo.
if exist "%HALLOW_CMD%" (
  echo Hallow is installed.
  echo.
  echo Run now:
  echo   "%HALLOW_CMD%" version
  echo   "%HALLOW_CMD%" start
  echo.
  echo After opening a new terminal:
  echo   hallow version
  echo   hallow start
) else (
  echo Hallow installer finished, but the launcher was not found at:
  echo   "%HALLOW_CMD%"
  echo Open a new terminal and try:
  echo   hallow version
)

exit /b 0

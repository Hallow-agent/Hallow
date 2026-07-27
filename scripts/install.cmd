@echo off
setlocal EnableExtensions
title Hallow Agent OS 001 Installer
color 0F

if "%HALLOW_INSTALL_PS1_URL%"=="" set "HALLOW_INSTALL_PS1_URL=https://hallow-agent.xyz/install.ps1"

where powershell >nul 2>nul
if errorlevel 1 (
  echo.
  echo   HALLOW INSTALLATION STOPPED
  echo   PowerShell is required on Windows.
  exit /b 1
)

echo.
echo   HALLOW AGENT OS 001
echo   -----------------------------------------------------
echo   Securely loading the signed project installer...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { irm '%HALLOW_INSTALL_PS1_URL%' | iex } catch { Write-Error $_; exit 1 }"
if errorlevel 1 exit /b %errorlevel%

exit /b 0

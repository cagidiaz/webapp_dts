@echo off
chcp 65001 >nul
title Desinstalar Enlace de Outlook Classic - dTS Instruments
echo ======================================================================
echo    dTS Instruments - Desinstalador de Protocolo de Outlook
echo ======================================================================
echo.
echo Eliminando asociacion del registro de Windows...
reg delete "HKCU\Software\Classes\dts-mail" /f >nul 2>&1

echo Eliminando archivos locales...
if exist "%LOCALAPPDATA%\dTS\outlook_handler.vbs" del /f /q "%LOCALAPPDATA%\dTS\outlook_handler.vbs" >nul 2>&1

echo.
echo ======================================================================
echo    Desinstalacion completada con exito!
echo ======================================================================
echo El protocolo dts-mail ha sido eliminado de tu equipo.
echo.
pause

@echo off
setlocal DisableDelayedExpansion
"%~dp0dTS.OutlookClassic.exe" --pair
if errorlevel 1 (
  echo No se pudo completar la operacion. Revisa el aviso del componente.
  pause
  exit /b 1
)

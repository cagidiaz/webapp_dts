/**
 * Utilidades para la descarga del paquete de configuración del protocolo dts-mail://
 * para Microsoft Outlook Classic en Windows.
 */
export const INSTALLER_BAT_CONTENT = `@echo off
chcp 65001 >nul
title Configuracion de Outlook Classic - dTS Instruments
echo ======================================================================
echo    dTS Instruments - Configurador de Enlace con Outlook Classic
echo ======================================================================
echo.
echo [1/3] Creando directorio local de dTS...
if not exist "%LOCALAPPDATA%\\dTS" mkdir "%LOCALAPPDATA%\\dTS"

echo [2/3] Instalando manejador de Outlook...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b='JyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KJyBkVFMgSW5zdHJ1bWVudHMgLSBNYW5lamFkb3IgZGUgUHJvdG9jb2xvIE5hdGl2byBkdHMtbWFpbDovLyBwYXJhIE1pY3Jvc29mdCBPdXRsb29rCicgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ck9wdGlvbiBFeHBsaWNpdAoKT24gRXJyb3IgUmVzdW1lIE5leHQKCkRpbSByYXdVcmwsIGFjdGlvbiwgaWRQYXJhbSwgZnJvbVBhcmFtLCBzdWJqZWN0UGFyYW0sIHF1ZXJ5UGFyYW0KSWYgV1NjcmlwdC5Bcmd1bWVudHMuQ291bnQgPSAwIFRoZW4gV1NjcmlwdC5RdWl0CgpyYXdVcmwgPSBXU2NyaXB0LkFyZ3VtZW50cygwKQpyYXdVcmwgPSBSZXBsYWNlKHJhd1VybCwgIiIiIiwgIiIpCgpEaW0gdXJsV2l0aG91dFByb3RvY29sLCBxUG9zCklmIEluU3RyKExDYXNlKHJhd1VybCksICJkdHMtbWFpbDovLyIpID0gMSBUaGVuCiAgICB1cmxXaXRob3V0UHJvdG9jb2wgPSBNaWQocmF3VXJsLCAxMikKRWxzZQogICAgdXJsV2l0aG91dFByb3RvY29sID0gcmF3VXJsCkVuZCBJZgoKcVBvcyA9IEluU3RyKHVybFdpdGhvdXRQcm90b2NvbCwgIj8iKQpJZiBxUG9zID4gMCBUaGVuCiAgICBhY3Rpb24gPSBMQ2FzZShMZWZ0KHVybFdpdGhvdXRQcm90b2NvbCwgcVBvcyAtIDEpKQogICAgcXVlcnlQYXJhbSA9IE1pZCh1cmxXaXRob3V0UHJvdG9jb2wsIHFQb3MgKyAxKQpFbHNlCiAgICBhY3Rpb24gPSBMQ2FzZSh1cmxXaXRob3V0UHJvdG9jb2wpCiAgICBxdWVyeVBhcmFtID0gIiIKRW5kIElmCgpJZiBSaWdodChhY3Rpb24sIDEpID0gIi8iIFRoZW4gYWN0aW9uID0gTGVmdChhY3Rpb24sIExlbihhY3Rpb24pIC0gMSkKCkZ1bmN0aW9uIEdldFF1ZXJ5UGFyYW0ocXMsIHBhcmFtTmFtZSkKICAgIERpbSBwYWlycywgaSwga3YKICAgIEdldFF1ZXJ5UGFyYW0gPSAiIgogICAgcGFpcnMgPSBTcGxpdChxcywgIiYiKQogICAgRm9yIGkgPSAwIFRvIFVCb3VuZChwYWlycykKICAgICAgICBrdiA9IFNwbGl0KHBhaXJzKGkpLCAiPSIpCiAgICAgICAgSWYgVUJvdW5kKGt2KSA+PSAxIFRoZW4KICAgICAgICAgICAgSWYgTENhc2Uoa3YoMCkpID0gTENhc2UocGFyYW1OYW1lKSBUaGVuCiAgICAgICAgICAgICAgICBHZXRRdWVyeVBhcmFtID0gVVJMRGVjb2RlKGt2KDEpKQogICAgICAgICAgICAgICAgRXhpdCBGdW5jdGlvbgogICAgICAgICAgICBFbmQgSWYKICAgICAgICBFbmQgSWYKICAgIE5leHQKRW5kIEZ1bmN0aW9uCgpGdW5jdGlvbiBVUkxEZWNvZGUoc3RyKQogICAgRGltIHMKICAgIHMgPSBSZXBsYWNlKHN0ciwgIisiLCAiICIpCiAgICBPbiBFcnJvciBSZXN1bWUgTmV4dAogICAgRGltIG9iakRvYwogICAgU2V0IG9iakRvYyA9IENyZWF0ZU9iamVjdCgiSFRNTEZJTEUiKQogICAgSWYgTm90IG9iakRvYyBJcyBOb3RoaW5nIFRoZW4KICAgICAgICBVUkxEZWNvZGUgPSBvYmpEb2MucGFyZW50V2luZG93LnVuZXNjYXBlKHMpCiAgICBFbHNlCiAgICAgICAgVVJMRGVjb2RlID0gcwogICAgRW5kIElmCiAgICBPbiBFcnJvciBHb1RvIDAKRW5kIEZ1bmN0aW9uCgppZFBhcmFtID0gR2V0UXVlcnlQYXJhbShxdWVyeVBhcmFtLCAiaWQiKQpmcm9tUGFyYW0gPSBHZXRRdWVyeVBhcmFtKHF1ZXJ5UGFyYW0sICJmcm9tIikKc3ViamVjdFBhcmFtID0gR2V0UXVlcnlQYXJhbShxdWVyeVBhcmFtLCAic3ViamVjdCIpCgpEaW0gb2JqT3V0bG9vaywgb2JqTmFtZXNwYWNlLCBvYmpNYWlsLCBvYmpFeHBsb3JlciwgZm91bmRNYWlsClNldCBvYmpPdXRsb29rID0gTm90aGluZwoKT24gRXJyb3IgUmVzdW1lIE5leHQKU2V0IG9iak91dGxvb2sgPSBHZXRPYmplY3QoLCAiT3V0bG9vay5BcHBsaWNhdGlvbiIpCklmIG9iak91dGxvb2sgSXMgTm90aGluZyBUaGVuCiAgICBTZXQgb2JqT3V0bG9vayA9IENyZWF0ZU9iamVjdCgiT3V0bG9vay5BcHBsaWNhdGlvbiIpCkVuZCBJZgpPbiBFcnJvciBHb1RvIDAKCklmIG9iak91dGxvb2sgSXMgTm90aGluZyBUaGVuCiAgICBNc2dCb3ggIk5vIHNlIHB1ZG8gaW5pY2lhciBNaWNyb3NvZnQgT3V0bG9vay4iLCB2YkV4Y2xhbWF0aW9uLCAiZFRTIEluc3RydW1lbnRzIgogICAgV1NjcmlwdC5RdWl0CkVuZCBJZgoKU2V0IG9iak5hbWVzcGFjZSA9IG9iak91dGxvb2suR2V0TmFtZXNwYWNlKCJNQVBJIikKb2JqTmFtZXNwYWNlLkxvZ29uICIiLCAiIiwgRmFsc2UsIEZhbHNlCgpTZWxlY3QgQ2FzZSBhY3Rpb24KICAgIENhc2UgInJlcGx5IgogICAgICAgIGZvdW5kTWFpbCA9IEZhbHNlCiAgICAgICAgSWYgTGVuKGlkUGFyYW0pID4gMCBUaGVuCiAgICAgICAgICAgIE9uIEVycm9yIFJlc3VtZSBOZXh0CiAgICAgICAgICAgIFNldCBvYmpNYWlsID0gb2JqTmFtZXNwYWNlLkdldEl0ZW1Gcm9tSUQoaWRQYXJhbSkKICAgICAgICAgICAgSWYgTm90IG9iak1haWwgSXMgTm90aGluZyBUaGVuCiAgICAgICAgICAgICAgICBEaW0gb2JqUmVwbHkKICAgICAgICAgICAgICAgIFNldCBvYmpSZXBseSA9IG9iak1haWwuUmVwbHlBbGwoKQogICAgICAgICAgICAgICAgb2JqUmVwbHkuRGlzcGxheQogICAgICAgICAgICAgICAgZm91bmRNYWlsID0gVHJ1ZQogICAgICAgICAgICBFbmQgSWYKICAgICAgICAgICAgT24gRXJyb3IgR29UbyAwCiAgICAgICAgRW5kIElmCiAgICAgICAgCiAgICAgICAgSWYgTm90IGZvdW5kTWFpbCBUaGVuCiAgICAgICAgICAgIERpbSBvYmpOZXdNYWlsCiAgICAgICAgICAgIFNldCBvYmpOZXdNYWlsID0gb2JqT3V0bG9vay5DcmVhdGVJdGVtKDApCiAgICAgICAgICAgIElmIExlbihmcm9tUGFyYW0pID4gMCBUaGVuIG9iak5ld01haWwuVG8gPSBmcm9tUGFyYW0KICAgICAgICAgICAgSWYgTGVuKHN1YmplY3RQYXJhbSkgPiAwIFRoZW4KICAgICAgICAgICAgICAgIElmIExlZnQoTENhc2Uoc3ViamVjdFBhcmFtKSwgMykgPD4gInJlOiIgVGhlbgogICAgICAgICAgICAgICAgICAgIG9iak5ld01haWwuU3ViamVjdCA9ICJSZTogIiAmIHN1YmplY3RQYXJhbQogICAgICAgICAgICAgICAgRWxzZQogICAgICAgICAgICAgICAgICAgIG9iak5ld01haWwuU3ViamVjdCA9IHN1YmplY3RQYXJhbQogICAgICAgICAgICAgICAgRW5kIElmCiAgICAgICAgICAgIEVuZCBJZgogICAgICAgICAgICBvYmpOZXdNYWlsLkRpc3BsYXkKICAgICAgICBFbmQgSWYKCiAgICBDYXNlICJzZWFyY2giCiAgICAgICAgU2V0IG9iakV4cGxvcmVyID0gb2JqT3V0bG9vay5BY3RpdmVFeHBsb3JlcgogICAgICAgIElmIG9iakV4cGxvcmVyIElzIE5vdGhpbmcgVGhlbgogICAgICAgICAgICBEaW0gb2JqSW5ib3gKICAgICAgICAgICAgU2V0IG9iakluYm94ID0gb2JqTmFtZXNwYWNlLkdldERlZmF1bHRGb2xkZXIoNikKICAgICAgICAgICAgU2V0IG9iakV4cGxvcmVyID0gb2JqSW5ib3guR2V0RXhwbG9yZXIKICAgICAgICAgICAgb2JqRXhwbG9yZXIuRGlzcGxheQogICAgICAgIEVsc2UKICAgICAgICAgICAgb2JqRXhwbG9yZXIuQWN0aXZhdGUKICAgICAgICBFbmQgSWYKICAgICAgICAKICAgICAgICBEaW0gc2VhcmNoVGVybXMKICAgICAgICBzZWFyY2hUZXJtcyA9ICIiCiAgICAgICAgSWYgTGVuKGZyb21QYXJhbSkgPiAwIFRoZW4gc2VhcmNoVGVybXMgPSAiZGU6IiAmIGZyb21QYXJhbSAmICIgIgogICAgICAgIElmIExlbihzdWJqZWN0UGFyYW0pID4gMCBUaGVuIHNlYXJjaFRlcm1zID0gc2VhcmNoVGVybXMgJiAiIiIiICYgc3ViamVjdFBhcmFtICYgIiIiIgogICAgICAgIElmIExlbihzZWFyY2hUZXJtcykgPiAwIFRoZW4KICAgICAgICAgICAgb2JqRXhwbG9yZXIuU2VhcmNoIFRyaW0oc2VhcmNoVGVybXMpLCAwCiAgICAgICAgRW5kIElmCgogICAgQ2FzZSBFbHNlCiAgICAgICAgZm91bmRNYWlsID0gRmFsc2UKICAgICAgICBJZiBMZW4oaWRQYXJhbSkgPiAwIFRoZW4KICAgICAgICAgICAgT24gRXJyb3IgUmVzdW1lIE5leHQKICAgICAgICAgICAgU2V0IG9iak1haWwgPSBvYmpOYW1lc3BhY2UuR2V0SXRlbUZyb21JRChpZFBhcmFtKQogICAgICAgICAgICBJZiBOb3Qgb2JqTWFpbCBJcyBOb3RoaW5nIFRoZW4KICAgICAgICAgICAgICAgIG9iak1haWwuRGlzcGxheQogICAgICAgICAgICAgICAgZm91bmRNYWlsID0gVHJ1ZQogICAgICAgICAgICBFbmQgSWYKICAgICAgICAgICAgT24gRXJyb3IgR29UbyAwCiAgICAgICAgRW5kIElmCiAgICAgICAgCiAgICAgICAgSWYgTm90IGZvdW5kTWFpbCBUaGVuCiAgICAgICAgICAgIFNldCBvYmpFeHBsb3JlciA9IG9iak91dGxvb2suQWN0aXZlRXhwbG9yZXIKICAgICAgICAgICAgSWYgb2JqRXhwbG9yZXIgSXMgTm90aGluZyBUaGVuCiAgICAgICAgICAgICAgICBEaW0gb2JqSW5ib3gyCiAgICAgICAgICAgICAgICBTZXQgb2JqSW5ib3gyID0gb2JqTmFtZXNwYWNlLkdldERlZmF1bHRGb2xkZXIoNikKICAgICAgICAgICAgICAgIFNldCBvYmpFeHBsb3JlciA9IG9iakluYm94Mi5HZXRFeHBsb3JlcgogICAgICAgICAgICAgICAgb2JqRXhwbG9yZXIuRGlzcGxheQogICAgICAgICAgICBFbHNlCiAgICAgICAgICAgICAgICBvYmpFeHBsb3Jlci5BY3RpdmF0ZQogICAgICAgICAgICBFbmQgSWYKICAgICAgICAgICAgCiAgICAgICAgICAgIERpbSBzZWFyY2hCYWNrdXAKICAgICAgICAgICAgc2VhcmNoQmFja3VwID0gIiIKICAgICAgICAgICAgSWYgTGVuKGZyb21QYXJhbSkgPiAwIFRoZW4gc2VhcmNoQmFja3VwID0gImRlOiIgJiBmcm9tUGFyYW0gJiAiICIKICAgICAgICAgICAgSWYgTGVuKHN1YmplY3RQYXJhbSkgPiAwIFRoZW4gc2VhcmNoQmFja3VwID0gc2VhcmNoQmFja3VwICYgIiIiIiAmIHN1YmplY3RQYXJhbSAmICIiIiIKICAgICAgICAgICAgSWYgTGVuKHNlYXJjaEJhY2t1cCkgPiAwIFRoZW4KICAgICAgICAgICAgICAgIG9iakV4cGxvcmVyLlNlYXJjaCBUcmltKHNlYXJjaEJhY2t1cCksIDAKICAgICAgICAgICAgRW5kIElmCiAgICAgICAgRW5kIElmCkVuZCBTZWxlY3QK'; [IO.File]::WriteAllBytes($env:LOCALAPPDATA + '\\dTS\\outlook_handler.vbs', [Convert]::FromBase64String($b))" >nul

echo [3/3] Registrando protocolo en Windows (sin permisos de Administrador)...
reg add "HKCU\\Software\\Classes\\dts-mail" /ve /d "URL:dTS Instruments Mail Protocol" /f >nul
reg add "HKCU\\Software\\Classes\\dts-mail" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\\Software\\Classes\\dts-mail\\shell\\open\\command" /ve /d "wscript.exe \\"%LOCALAPPDATA%\\dTS\\outlook_handler.vbs\\" \\"%%1\\"" /f >nul

echo.
echo ======================================================================
echo    Configuracion completada con exito!
echo ======================================================================
echo.
echo Ya puedes abrir correos en tu Outlook de escritorio desde la WebApp dTS.
echo La primera vez que abras un correo, el navegador te preguntara:
echo "¿Abrir dTS Instruments Mail Protocol?".
echo Marca la casilla "Permitir siempre" y haz clic en Abrir.
echo.
pause
`;

export const UNINSTALLER_BAT_CONTENT = `@echo off
chcp 65001 >nul
title Desinstalar Enlace de Outlook Classic - dTS Instruments
echo ======================================================================
echo    dTS Instruments - Desinstalador de Protocolo de Outlook
echo ======================================================================
echo.
echo Eliminando asociacion del registro de Windows...
reg delete "HKCU\\Software\\Classes\\dts-mail" /f >nul 2>&1

echo Eliminando archivos locales...
if exist "%LOCALAPPDATA%\\dTS\\outlook_handler.vbs" del /f /q "%LOCALAPPDATA%\\dTS\\outlook_handler.vbs" >nul 2>&1

echo.
echo ======================================================================
echo    Desinstalacion completada con exito!
echo ======================================================================
echo El protocolo dts-mail ha sido eliminado de tu equipo.
echo.
pause
`;

/**
 * Dispara la descarga en el navegador de un archivo generado en el cliente
 * forzando terminaciones de linea CRLF (\r\n) para compatibilidad con Windows cmd.exe.
 */
const triggerFileDownload = (content: string, fileName: string) => {
  // Asegurar explícitamente saltos de línea Windows CRLF (\r\n)
  const normalizedContent = content.replace(/\r?\n/g, '\r\n');
  const blob = new Blob([normalizedContent], { type: 'application/x-bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 300);
};

/**
 * Descarga el instalador automático en 1 clic de Outlook Classic
 */
export const downloadOutlookClassicInstaller = () => {
  triggerFileDownload(INSTALLER_BAT_CONTENT, 'Instalar_Outlook_dTS.bat');
};

/**
 * Descarga el desinstalador limpio de Outlook Classic
 */
export const downloadOutlookClassicUninstaller = () => {
  triggerFileDownload(UNINSTALLER_BAT_CONTENT, 'Desinstalar_Outlook_dTS.bat');
};

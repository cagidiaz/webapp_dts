# Componente Outlook Classic

Versión 1.0.0 para uso interno sin firma Authenticode, conforme a la decisión del usuario. Requiere Windows y Outlook Classic con el buzón configurado. Se compila con .NET Framework de Windows, sin descargar dependencias.

Consultar el [SQL y procedimiento de activación](../docs/propuestas/2026-10-15-fase-4-apertura-exacta-classic.md) antes de instalar.

## Compilación

Desde la raíz del proyecto:

```powershell
# Distribución interna sin certificado; no instala ni despliega
./outlook-classic/Build.ps1

# Pruebas de consola; no instala ni publica
./outlook-classic/Build.ps1 -UnsignedTest
./frontend/scratch/outlook-classic-unsigned/dTS.OutlookClassic.exe --self-test |
  node outlook-classic/verify-helper-proof.cjs
```

La compilación normal genera `frontend/public/downloads/outlook-classic/OutlookClassic.zip`, disponible al desplegar el frontend. Incluye ejecutable, BAT de instalación, vinculación y desinstalación, instrucciones y metadatos con hash SHA256. El hash permite comparar archivos; no acredita la identidad de un editor. No se exige certificado ni argumento especial para ejecutar la distribución interna. La versión normal no incluye los comandos de diagnóstico DEBUG.

## Instalación y retirada

1. SQL ya ejecutado y tablas comprobadas a 15/10/2026. Desplegar backend y frontend y habilitar Classic para la cuenta piloto según la guía de fase 4. En otros entornos, aplicar primero el SQL correspondiente.
2. Extraer todo el ZIP. Ejecutar `Instalar_Outlook_dTS.bat` con el usuario habitual de Windows, sin administrador. El BAT necesita el ejecutable en la misma carpeta.
3. Confirmar en el CRM el código que muestra el componente y volver a su ventana para completar la vinculación.
4. Si se necesita volver a vincular, ejecutar `Vincular_Outlook_dTS.bat`.
5. Para retirar, ejecutar `Desinstalar_Outlook_dTS.bat` y revocar el dispositivo desde el CRM.

La instalación copia el componente a `%LOCALAPPDATA%\dTS\OutlookClassic\1.0.0` y registra `dts-outlook` en HKCU. La clave privada se cifra con DPAPI CurrentUser y el directorio permite acceso al usuario y SYSTEM. Las firmas criptográficas de solicitudes y resultados se mantienen: son independientes de la firma del ejecutable.

Windows puede mostrar un aviso de editor desconocido o aplicar sus políticas de bloqueo. El instalador no modifica antivirus, políticas ni certificados. Cerrar el componente antes de reinstalar la misma versión. El desinstalador elimina el protocolo propio y la clave local; los ejecutables bloqueados pueden requerir limpieza posterior.

Las pruebas nativas no registran el protocolo ni muestran correos. `--verify-reference` solo existe en compilaciones de pruebas y verifica una referencia del diagnóstico de fase 0 sin mostrar el mensaje.

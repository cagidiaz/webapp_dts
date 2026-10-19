# Componente Outlook Classic

> **Entrega del 19/10/2026, pendiente de despliegue:** Outlook verificado para todos los perfiles activos con permiso CRM por rol. Sin listas por correo ni flags de piloto. Ajustes utiliza el ZIP Classic 1.1.0 y la vinculación de equipos. Véase «Uso general de Outlook verificado» al final; las secciones anteriores fechadas describen entregas históricas.

Versión 1.1.1 para uso interno sin firma Authenticode, conforme a la decisión del usuario. Requiere Windows y Outlook Classic con el buzón configurado. Se compila con .NET Framework de Windows, sin descargar dependencias.

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

La instalación copia el componente a `%LOCALAPPDATA%\dTS\OutlookClassic\1.1.1` y registra `dts-outlook` en HKCU. La clave privada se cifra con DPAPI CurrentUser y el directorio permite acceso al usuario y SYSTEM. Las firmas criptográficas de solicitudes y resultados se mantienen: son independientes de la firma del ejecutable.

Windows puede mostrar un aviso de editor desconocido o aplicar sus políticas de bloqueo. El instalador no modifica antivirus, políticas ni certificados. Cerrar el componente antes de reinstalar la misma versión. El desinstalador elimina el protocolo propio y la clave local; los ejecutables bloqueados pueden requerir limpieza posterior.

Las pruebas nativas no registran el protocolo ni muestran correos. `--verify-reference` solo existe en compilaciones de pruebas y verifica una referencia del diagnóstico de fase 0 sin mostrar el mensaje.

## Respuestas en 1.1.0

Además de abrir, el componente permite `reply` y `reply_all` sobre el original verificado, mostrando la respuesta sin enviarla. Se conserva el formato opaco de la URI; el servidor guarda y entrega la acción autorizada. No acepta una orden `send`.

Requiere aplicar el SQL aditivo de `action`; desde el 19/10/2026 las respuestas están disponibles por defecto para usuarios con permiso CRM, sin variable de activación. Los clientes 1.0.0 siguen abriendo mensajes. Tras actualizar, abrir un correo para registrar la versión 1.1.0 del dispositivo antes de responder. La clave cifrada y la vinculación se conservan con el mismo usuario Windows.

[Activación y pruebas](../docs/propuestas/2026-10-16-respuestas-verificadas-outlook.md). Esta versión está compilada y pendiente de aceptación real de las respuestas.

## Uso general de Outlook verificado (19/10/2026)

**Entrega preparada para desplegar y validar.** Se retira el fallback antiguo de apertura y el configurador `dts-mail` de Ajustes y de las descargas públicas. Abrir un mensaje concreto, Responder y Responder a todos utilizan siempre la identidad verificada: Microsoft Graph en Web y componente `dts-outlook` en Classic. Si falta una identidad o un equipo vinculado, se explica el problema y se ofrece la configuración o Web; no se busca otro mensaje por asunto.

La búsqueda de conversaciones se conserva como **«Buscar conversación en Outlook Web»**, independiente de la preferencia Classic/Web. Copiar datos de búsqueda continúa disponible. La redacción de correos nuevos y los eventos de calendario conservan sus flujos existentes; no son el fallback antiguo de apertura de mensajes.

Ajustes descarga **`/downloads/outlook-classic/OutlookClassic.zip`**, versión **1.1.0**, cuando su metadata está publicada, y enlaza a **`/outlook-classic`** para vincular, revisar o revocar equipos propios. Extraer el ZIP completo y ejecutar `Instalar_Outlook_dTS.bat` con el usuario Windows habitual, sin administrador. Si el componente ya estaba instalado y la base restaurada perdió el vínculo, usar `Vincular_Outlook_dTS.bat`. El ejecutable no cambia en esta entrega; no es necesario reinstalar un componente 1.1.0 que funciona y conserva su vínculo.

El acceso se administra mediante los permisos de rol ya existentes para CRM/Contactos y los perfiles activos. No hay excepciones por correo electrónico. Las antiguas variables `CRM_EMAIL_IDENTITY_ENABLED`, `CRM_EMAIL_IDENTITY_EMAILS`, `CRM_OUTLOOK_CLASSIC_ENABLED` y `CRM_EMAIL_REPLY_ENABLED` dejan de controlar el flujo; pueden retirarse de Dokploy al desplegar. No alteran ya la disponibilidad aunque conserven valores antiguos. Se mantienen OAuth por usuario, pertenencia al buzón y cartera, firma de solicitudes, versión compatible del componente y vinculación/revocación de cada equipo. Los permisos se revisan en backend en cada operación.

**Despliegue:** publicar backend y frontend de esta entrega, recargar la app y comprobar perfil activo/rol, apertura Web/Classic, respuestas, descarga del ZIP y búsqueda Web. No requiere SQL adicional si ya están recuperados el esquema de identidad, las tablas Classic y `action`. No se modifica ninguna tabla sincronizada desde BC ni se inicia recuperación histórica. Tras desplegar, comprobar también que denegar el permiso de CRM por rol impide las operaciones aunque el equipo permanezca vinculado.


### Prueba de arranque de Classic sin borrador (19/10/2026)

En Ajustes Generales, «Probar Apertura en Outlook» muestra la ventana principal de Classic sin crear correos ni actividades. Actualizar el ZIP e instalar con `Instalar_Outlook_dTS.bat` (1.1.1); conserva la vinculación. La acción local `dts-outlook://v1/launch` no accede a mensajes ni acredita una apertura verificada. Las versiones 1.1.0 siguen siendo compatibles con abrir y responder. La prueba Web abre directamente la bandeja de entrada sin crear borradores. Sin SQL. Pendiente de prueba del usuario con Classic abierto y cerrado.


**Prueba Web actualizada (19/10/2026):** En Ajustes, «Probar Apertura en Outlook» abre la bandeja de entrada de Outlook Web en otra pestaña, sin generar borradores ni actividades. Puede solicitar inicio de sesión Microsoft. No necesita actualizar el componente Windows ni ejecutar SQL. Pendiente de confirmación del usuario.

# Prueba de identidad de correos en Outlook

Estas herramientas corresponden a la fase 0 del plan híbrido. No están conectadas a las tarjetas del CRM, no sustituyen el BAT ni registran protocolos de Windows. Permiten comprobar la conversión real entre EWS, Graph inmutable y MAPI antes de implementar el flujo de producción.

La cuenta inicial de pruebas es `gdiaz@dtsinstruments.com`. La primera ejecución selecciona una sola referencia reciente; no descarga cuerpos ni adjuntos, no mueve mensajes y no busca por asunto. Los informes contienen identificadores técnicos y se guardan en `frontend/scratch/outlook-phase0`, excluido de Git. No deben publicarse ni subirse junto al código.

## 1 Preparar la sesión

Abrir Outlook Classic con la cuenta que se va a comprobar. Conectar Microsoft 365 desde la aplicación. Los comandos de Node se ejecutan desde `backend`, usando las dependencias ya instaladas. No introducir tokens en la línea de comandos.

Inventario de Office, sin iniciar Outlook ni leer correos:

```powershell
powershell.exe -NoProfile -File scripts/outlook-phase0/Verify-OutlookClassic.ps1
```

## 2 Generar una referencia exacta

```powershell
node scripts/outlook-phase0/probe.cjs --account gdiaz@dtsinstruments.com --env-file .env
```

La herramienta lee la conexión del usuario mediante una transacción de solo lectura, comprueba su identidad en Microsoft y realiza las conversiones sobre el mismo mensaje. La salida muestra la ruta del informe, sin tokens ni cuerpo del correo.

Si la conexión tiene el token de acceso caducado pero dispone de renovación válida, se puede usar expresamente:

```powershell
node scripts/outlook-phase0/probe.cjs --account gdiaz@dtsinstruments.com --env-file .env --refresh-token
```

Esta opción utiliza el método de renovación existente de la aplicación y puede actualizar exclusivamente los datos OAuth de esa conexión. Si Microsoft exige consentimiento, será necesario reconectar desde la app. No crea ni modifica mensajes y no escribe en tablas de Business Central.

## 3 Verificar y abrir en Classic

Sustituir la ruta del ejemplo por la que haya devuelto el paso anterior:

```powershell
powershell.exe -NoProfile -File scripts/outlook-phase0/Verify-OutlookClassic.ps1 -ReportPath RUTA_DEL_INFORME
```

Sin interruptores de apertura solo verifica el correo. Selecciona un único almacén cuya cuenta SMTP coincida con el buzón, ejecuta `GetItemFromID` con EntryID y StoreID y compara el `internetMessageId` de MAPI con el de Graph antes de mostrar nada. Si no hay una coincidencia inequívoca, falla.

Para abrir el correo ya verificado en Classic:

```powershell
powershell.exe -NoProfile -File scripts/outlook-phase0/Verify-OutlookClassic.ps1 -ReportPath RUTA_DEL_INFORME -OpenExact
```

Para lanzar su enlace web validado:

```powershell
powershell.exe -NoProfile -File scripts/outlook-phase0/Verify-OutlookClassic.ps1 -ReportPath RUTA_DEL_INFORME -OpenWeb
```

Se pueden combinar los dos interruptores. El resultado web indica únicamente que se ha solicitado abrir el enlace; la comprobación visual requiere al usuario. El sistema operativo decide si el enlace se abre en el navegador o en una aplicación web instalada. Mostrar un mensaje en Outlook puede activar su comportamiento habitual de marcarlo como leído; las herramientas no realizan escrituras de mensajes mediante Graph.

## 4 Comprobar un cambio de carpeta

Confirmar visualmente el mismo mensaje y moverlo manualmente a otra carpeta o subcarpeta del mismo buzón. No enviarlo al archivo en línea, a otro buzón ni a un PST en esta prueba.

```powershell
node scripts/outlook-phase0/probe.cjs --account gdiaz@dtsinstruments.com --env-file .env --baseline RUTA_DEL_INFORME_INICIAL --refresh-token
```

La referencia inicial es obligatoria para este paso: no se selecciona un correo reciente diferente. El resultado debe mantener el identificador inmutable y el `internetMessageId`, y mostrar `folderChanged: true`. Si el cambio aún no se ha propagado a Graph, repetir después sin cambiar la referencia inicial. Abrir y verificar Classic y Web con el nuevo informe, no con el EntryID antiguo.

## 5 Comprobar asuntos repetidos y arranque de Classic

La opción `--duplicate-subjects` selecciona, entre las últimas 50 referencias, dos mensajes distintos que comparten asunto. Solo utiliza el asunto para preparar este caso de prueba; cada mensaje se resuelve por su propio identificador y se compara su identidad. Los asuntos no se imprimen ni se guardan en el informe. Si no existe una pareja apropiada, la comprobación queda pendiente.

```powershell
node scripts/outlook-phase0/probe.cjs --account gdiaz@dtsinstruments.com --env-file .env --baseline RUTA_DEL_INFORME_INICIAL --duplicate-subjects
```

Para la prueba de arranque, el usuario debe cerrar Classic primero. La herramienta solo lo iniciará cuando se solicite expresamente la apertura del mensaje con ambos interruptores:

```powershell
powershell.exe -NoProfile -File scripts/outlook-phase0/Verify-OutlookClassic.ps1 -ReportPath RUTA_DEL_INFORME_ACTUAL -OpenExact -AllowClassicLaunch
```

Se comprueba la cuenta y el almacén antes de mostrar el correo. El resultado distingue si Classic estaba abierto, si se ha solicitado su arranque y si se ha verificado y mostrado el mensaje. No se cierra Outlook automáticamente. El número de cuentas configuradas se puede registrar sin enumerar sus direcciones.

## 6 Límites y aceptación

No se da por aceptada la fase por pasar los tests simulados. Deben comprobarse la identidad real, la apertura inicial y posterior al movimiento, dos mensajes con el mismo asunto, varias cuentas y el comportamiento con Classic inicialmente cerrado. La variante de arranque en frío requiere validación real, además de disponer del interruptor que la habilita.

Los buzones compartidos, PST y archivo en línea no se resuelven eligiendo una cuenta por defecto ni buscando por asunto. Debe delimitarse su cobertura en una prueba específica.

El estado y la evidencia pública sin identificadores de mensajes se documentan en `docs/propuestas/2026-10-15-fase-0-apertura-outlook.md`.

# Fase 4: apertura exacta en Outlook Classic

## Estado

Implementación preparada, con SQL ejecutado por el usuario y tablas comprobadas en modo solo lectura el 15/10/2026; pendiente de confirmar despliegue, activación y aceptación completa. La apertura web en producción, incluido el movimiento de carpeta, ha sido confirmada por el usuario. El usuario ha decidido distribuirlo internamente sin firma Authenticode. El ZIP con instalador BAT está generado y preparado para incluirse en el despliegue del frontend; no se ha instalado ni desplegado.

## Funcionamiento

El CRM genera una solicitud de 90 segundos, vinculada al usuario, dispositivo y actividad autorizados. El protocolo `dts-outlook://v1/open` transporta únicamente un identificador y una capacidad aleatoria de un solo uso; nunca credenciales de Microsoft, asunto ni identificadores del mensaje.

El componente Windows se vincula al usuario mediante un código que debe confirmar en el CRM. Su clave privada queda cifrada con DPAPI para ese usuario de Windows. Las solicitudes y los resultados se firman con esa clave. El backend comprueba permisos, cuenta, dispositivo activo, caducidad e identidad del correo antes de entregar la referencia actual.

Classic selecciona el almacén por la cuenta SMTP y llama a `GetItemFromID` con el identificador actual y ese almacén. Verifica también el InternetMessageId antes de mostrar el mensaje. Si falla una comprobación, informa del problema y permite elegir Web; no busca por asunto ni abre otro mensaje como alternativa. El navegador solo confirma apertura cuando recibe el resultado autenticado del componente; la pérdida de foco no acredita éxito ni lectura.

## Tablas nuevas

SQL ejecutado y comprobado: [SQL de Classic](../../backend/prisma/proposals/2026-10-15-outlook-classic-dispositivos-solicitudes.sql), sin modificar tablas importadas de Business Central:

| Tabla | Uso |
| --- | --- |
| `crm_outlook_devices` | Clave pública, vinculación, caducidad del emparejamiento, versión y revocación de cada dispositivo. No almacena la clave privada. |
| `crm_outlook_requests` | Solicitudes temporales, identidad esperada, consumo atómico y resultado. Guarda hashes de las capacidades, no sus valores originales. |

Ambas tienen RLS y carecen de acceso directo desde el cliente. La conexión PostgreSQL del backend debe ser propietaria o disponer de permisos expresamente concedidos. No se requiere `prisma db push`. Con Classic desactivado no se consultan estas tablas. Las solicitudes antiguas se limpian al emitir otras nuevas, después de siete días.

## Activación ordenada

1. SQL completado: las dos tablas existen, tienen RLS y la conexión del backend dispone de permisos SELECT/INSERT/UPDATE/DELETE. Desplegar el código; Classic permanece desactivado hasta habilitarlo expresamente.
2. Generar el paquete con `./outlook-classic/Build.ps1`. La distribución interna sin certificado está aprobada; el ZIP incluye el ejecutable y los BAT. No se modifican políticas de seguridad de Windows.
3. Para el piloto, mantener `CRM_EMAIL_IDENTITY_ENABLED=true` y `CRM_EMAIL_IDENTITY_EMAILS=gdiaz@dtsinstruments.com`; activar `CRM_OUTLOOK_CLASSIC_ENABLED=true`. El origen permitido es `https://app.dtsinstruments.com`.
4. Extraer todo el ZIP y ejecutar `Instalar_Outlook_dTS.bat` con el usuario habitual de Windows, sin administrador. Abrir `/outlook-classic`, confirmar el código mostrado por el componente y seleccionar el dispositivo. La página permite consultar y revocar dispositivos propios.
5. Verificar apertura desde Emails y Timeline; comparar con Web, mover el correo dentro del mismo buzón y repetir. Probar Classic cerrado, rechazo de solicitud caducada, revocación y confirmación del resultado. Validar también un perfil con varias cuentas antes de ampliar cobertura.

El usuario ha ejecutado el SQL en Supabase. No se ha confirmado todavía el cambio de variables de producción ni la instalación del componente. Los BAT anteriores siguen disponibles para los flujos heredados de respuesta y búsqueda, pendientes de las fases 6 y 7; la nueva apertura exacta utiliza un protocolo diferente.

## Validación y límites

Han pasado 274 pruebas de backend, 11 de integración SQL aislada y 5 de regresión del piloto: 290 en total. Compilan backend, frontend y componente Windows. Se han verificado consumo único concurrente, permisos, caducidad, revocación, firmas y rechazo de resultados repetidos. Las comprobaciones de escritura se han realizado en PostgreSQL aislado.

El componente C# ha localizado y verificado el correo real de prueba en el almacén correcto de Classic, sin mostrarlo ni modificarlo. También se ha verificado DPAPI y la compatibilidad de firmas entre C# y backend. Quedan pendientes la vinculación real, el recorrido completo del protocolo con apertura y confirmación, y la validación de instalación del paquete interno sin firma. No se acredita todavía cobertura de PST, archivo en línea o buzones compartidos.

## Referencias

- [Outlook GetItemFromID](https://learn.microsoft.com/en-us/office/vba/api/outlook.namespace.getitemfromid).
- [Protección DPAPI](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=windowsdesktop-9.0).

## Contrato operativo y permisos

El permiso del piloto de identidad y el acceso CRM se verifican en cada solicitud. El equipo solo puede actuar para su usuario y el buzón Microsoft 365 verificado; el rol Admin o Dirección no habilita aperturas en buzones ajenos. La ruta de configuración comparte el contenedor de sesión del Add-in, pero la instalación Windows es independiente del manifiesto de Office.

| Ruta, bajo `/api/exchange-sync/classic` | Protección y función |
| --- | --- |
| `POST /pair/start` | Prueba de posesión de la clave privada, límites de intentos y emparejamiento de cinco minutos. |
| `POST /pair/approve` | JWT y permisos del usuario; confirma el código y asigna propietario una vez. |
| `POST /pair/:id/poll` | Secreto de emparejamiento; informa al componente del resultado. |
| `GET /devices`, `POST /devices/:id/revoke` | JWT; consulta y revocación de equipos propios. |
| `POST /requests` | JWT; verifica actividad, dispositivo e identidad y emite capacidad de 90 segundos. |
| `POST /requests/:id/claim` | Prueba firmada del dispositivo y capacidad; consumo atómico de un solo uso. |
| `POST /requests/:id/result` | Resultado firmado y nonce de confirmación; rechaza repetición. |
| `GET /requests/:id` | JWT; consulta del estado de la solicitud propia. |

No se entregan tokens Microsoft ni JWT del CRM al componente mediante la URI. Las claves privadas no se guardan en Supabase. El backend usa consultas SQL parametrizadas en estas dos tablas propias; no requiere cambiar el esquema Prisma ni ejecutar `db push`.

## Procedimiento de soporte y vuelta atrás

- No repetir una apertura sin comprobar si Classic ya mostró el correo cuando falta confirmación.
- Para bloquear un equipo, revocar su entrada en `/outlook-classic`. La clave local no otorga acceso al buzón por sí sola.
- Para suspender la apertura Classic del piloto, establecer `CRM_OUTLOOK_CLASSIC_ENABLED=false` y reiniciar o redesplegar el backend. Mantener la vía Web y las tablas; no borrarlas como paso de vuelta atrás.
- Para retirar un ordenador, desinstalar con el mismo usuario Windows y revocar su entrada en el CRM.
- Conservar el manejador heredado mientras se validan respuesta, búsqueda y limpieza en sus fases correspondientes; la vía nueva no degrada silenciosamente a búsqueda por asunto.

Manual para usuarios: [sección 7 del manual de instalación](../manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic).

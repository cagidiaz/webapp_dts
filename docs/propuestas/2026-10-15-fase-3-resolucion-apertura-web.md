# Resolución exacta de correos y apertura en Outlook Web

**Fecha:** 15 de octubre de 2026  
**Estado:** Implementación local y pruebas automáticas realizadas. Consulta real de Microsoft 365 comprobada. Aceptación completa con el complemento Local Dev pendiente.

## Comportamiento

Emails y Timeline utilizan una misma ruta autenticada: `POST /api/exchange-sync/emails/:activityId/resolve`. El navegador envía únicamente el identificador de la actividad y, cuando hay varias copias, la selección explícita del usuario. No aporta el buzón, el usuario que autoriza la operación ni un enlace de destino.

El backend comprueba el perfil activo, los permisos actuales de CRM y Contactos y la cartera comercial mediante la configuración de roles existente. Después verifica la cuenta conectada, el tenant y el buzón en Microsoft 365. Admin y Dirección conservan la consulta del conjunto del CRM, pero estos roles no dan acceso al buzón de otro usuario.

La consulta usa primero el identificador inmutable. Cuando solo existe un identificador original con formato conocido, se traduce explícitamente; no se prueban formatos al azar. Si la referencia no se encuentra y se conoce el `internetMessageId` dentro de un buzón ya verificado, se buscan coincidencias exactas. Si hay varias copias, se ofrecen carpeta y fecha para elegir; se vuelve a comprobar la selección en el servidor. Una página truncada nunca se trata como coincidencia única. Se muestran como máximo cinco copias.

Los registros antiguos sin referencia verificable muestran un aviso de revisión pendiente. No se sustituyen por una búsqueda de asunto, un correo nuevo ni la bandeja de entrada. Su recuperación corresponde a la fase 5. Una referencia histórica sin buzón solo puede recuperarla su creador; la pertenencia al mismo tenant no equivale a acceso delegado a otro buzón.

En cada clic se obtiene el enlace actual de Microsoft y se valida que sea HTTPS de Outlook. Se conserva el identificador original y solo se actualizan metadatos de identidad y el enlace de `crm_activities`. Una comprobación optimista impide abrir un resultado cuya referencia cambió durante la consulta. No se modifican cuerpos, asuntos, campos comerciales ni tablas importadas de Business Central.

## Ventanas, errores y rendimiento

La ventana se abre vacía durante el clic para que el navegador no bloquee una apertura asíncrona. Se elimina su acceso al `opener`; solo se navega al destino verificado por el backend y validado otra vez en el navegador. Si falla la resolución o hay varias copias, se cierra la ventana vacía y se informa dentro de la ficha. Si el navegador bloquea ventanas, se solicita habilitarlas antes de consultar Microsoft.

Hay mensajes separados para reconexión de Microsoft 365, permisos insuficientes, referencia no localizada, vínculo histórico pendiente y error temporal. Un 403 de permisos del CRM se presenta como permiso denegado. Se respeta `Retry-After` sin reintentos dentro de la misma petición.

Se permiten como máximo dos resoluciones simultáneas por usuario. Los clics concurrentes sobre la misma actividad y selección comparten la consulta en curso. Se vuelven a comprobar permisos en cada solicitud. No se cachean enlaces terminados para evitar abrir una dirección anterior al movimiento de un correo. Los nombres de carpeta se reutilizan únicamente dentro de la misma resolución. No se recorre el buzón completo ni se descargan cuerpos o adjuntos.

Los límites y tiempos de espera se mantienen en memoria por instancia. No son una cuota global ni persistente entre réplicas del backend. No se crea una tabla o servicio de caché para el piloto. Antes de ampliar a varias instancias, revisar la coordinación del límite de Microsoft.

## Activación y Classic

Se reutilizan `CRM_EMAIL_IDENTITY_ENABLED` y `CRM_EMAIL_IDENTITY_EMAILS`. La activación local sigue limitada a `gdiaz@dtsinstruments.com`. El estado de conexión autenticado comunica al frontend si la cuenta tiene el piloto habilitado. Las demás cuentas siguen con el flujo actual.

Se conserva la preferencia Classic/Web. Para la cuenta del piloto, elegir Classic para abrir un correo muestra una alternativa visible de apertura web; no invoca el BAT antiguo con búsquedas aproximadas ni cambia la preferencia silenciosamente. La nueva apertura exacta de Classic se incorporará en fase 4. Las acciones de responder y buscar conversación mantienen su flujo anterior hasta fase 6; no forman parte de esta validación de «Abrir correo».

No hay SQL nuevo, permisos adicionales de Microsoft ni cambios del manifiesto. Se conserva el instalador existente hasta validar su sustitución. Esta fase no se ha desplegado ni activado en producción.

## Validación y prueba de aceptación

La compilación de backend y frontend es correcta. Pasan 255 pruebas del backend y otras cinco pruebas HTTP del piloto con PostgreSQL aislado; también pasa el comprobador de ventanas del frontend. Las pruebas comprueban JWT y entrada HTTP, cartera, revocación, buzón ajeno incluso para Admin, tenant incorrecto, ID original desconocido, referencia movida, copias múltiples, selección manipulada, página truncada, discrepancia de `internetMessageId`, espera tras un 429 y conflicto de actualización. También verifican concurrencia, bloqueo de ventanas, aislamiento del `opener` y rechazo de destinos externos a Outlook. Las regresiones del piloto se ejecutan con PostgreSQL aislado.

La consulta real con la cuenta autorizada recupera el mismo correo que se usó en fase 0 y un enlace de `outlook.office365.com`. La búsqueda exacta por `internetMessageId` devuelve una coincidencia e incluye el mismo identificador inmutable. Esta comprobación no crea actividades ni envía mensajes.

El usuario confirmó que la importación probada previamente se hizo con el complemento habitual en producción. En la base compartida todavía no se encuentran actividades propias de su cuenta con la identidad del piloto guardada. Esa prueba de importación y hora no acredita aún el registro de identidad de Local Dev.

Para la aceptación:

1. Reiniciar `npm run dev:https` en `C:\proyectos\webapp_dts` y usar «dTS Instruments CRM (Local Dev)».
2. Registrar un correo real y comprobar cliente y contacto, con su nueva identidad guardada.
3. En Emails y Timeline, elegir «Abrir en Outlook Web (M365)» y confirmar el mismo correo.
4. Moverlo manualmente a otra carpeta del mismo buzón y repetir la apertura desde ambas vistas.
5. Confirmar que los errores no abren otro mensaje. La prueba real de varias copias y la revisión visual de avisos en ambos temas siguen pendientes de aceptación.

Documentación de referencia: [identificadores inmutables y su alcance dentro del buzón](https://learn.microsoft.com/en-us/graph/outlook-immutable-id), [consulta filtrada de mensajes en Graph](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0).

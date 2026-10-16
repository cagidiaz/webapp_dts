# Responder y responder a todos desde el CRM

## Estado y alcance

Implementación preparada el 16/10/2026, pendiente de desplegar y aceptar con correos reales. La apertura de mensajes y del complemento Web ya está validada por el usuario. Se conserva el diseño de las tarjetas y la preferencia Classic/Web.

No se recuperan automáticamente correos antiguos ni se borran registros. Antoni continuará registrando correos nuevos desde el 16/10/2026. Esta entrega prepara las acciones para uso general después de la comprobación del responsable.

## Menú compartido

`frontend/src/pages/crm/components/EmailActions.tsx` sustituye los dos menús duplicados de Emails y Timeline. Conserva iconos, tamaños, colores, modo claro/oscuro, búsqueda explícita y copia de datos. El botón principal respeta la preferencia; las opciones de abrir en Classic o Web son destinos explícitos. Responder y Responder a todos son acciones distintas y respetan la preferencia actual.

Los errores y las copias ambiguas usan el mismo aviso de la ficha, conservando el modo de respuesta seleccionado. Un error no degrada a buscar un mensaje por asunto ni a redactar un correo independiente con `Re:`.

## Outlook Web

`POST /api/exchange-sync/emails/:activityId/reply` exige JWT, un modo `reply` o `reply_all` y, si procede, una copia elegida por el usuario. No acepta destinatarios, buzones, URLs ni una acción de envío del navegador.

`EmailReplyService` reutiliza el resolvedor exacto, verifica actividad, cartera, cuenta y tenant, comprueba que el original no sea un borrador y que su InternetMessageId coincida. Vuelve a comprobar permisos, referencias y cuenta antes del POST que crea el borrador.

Según el modo llama a `createReply` o `createReplyAll` sobre el mensaje original. Microsoft conserva el hilo, los destinatarios y el contenido citado de la respuesta nativa; el CRM no construye los destinatarios a partir de la ficha de contacto. Se abre el enlace HTTPS oficial del borrador para que el usuario lo revise y envíe. No se invoca `/send`, `/reply` ni `/replyAll` de envío directo.

La ventana se preabre durante el clic y se aísla de la aplicación. Si el navegador la bloquea, no se crea el borrador. Se agrupan clics simultáneos por mensaje/modo y se reutiliza el resultado durante tres minutos por instancia del backend. Si un POST queda sin confirmación, no se reintenta automáticamente y se indica revisar Borradores. Este control en memoria no garantiza idempotencia entre réplicas ni después de reiniciar; una repetición manual en esos casos puede crear otro borrador, nunca un envío automático.

## Outlook Classic 1.1.0

La solicitud temporal guarda en servidor la acción `open`, `reply` o `reply_all`. El navegador no puede cambiarla durante el consumo. La URI mantiene únicamente solicitud y capacidad opaca, sin destinatarios, cuerpos ni credenciales.

Después de verificar buzón, almacén y mensaje exactos, el componente ejecuta `MailItem.Reply()` o `MailItem.ReplyAll()` y muestra la ventana para revisión. No llama a `Send`. El resultado firmado confirma que se mostró la ventana, no que el mensaje se envió o se leyó.

Se aceptan pruebas del componente 1.0.0 para seguir abriendo correos. Para emitir respuestas se exige que el equipo haya comunicado la versión 1.1.0 y que la funcionalidad esté habilitada. La actualización conserva la clave y la vinculación; basta instalar el nuevo ZIP con el mismo usuario y abrir un correo para registrar la versión. No requiere certificado de editor.

## SQL y activación

1. Ejecutar el [SQL de acción de respuesta](../../backend/prisma/proposals/2026-10-16-outlook-respuestas-verificadas.sql). Añade únicamente `action varchar(16) NOT NULL DEFAULT 'open'` con valores permitidos a `crm_outlook_requests`. No crea tablas ni toca datos importados de Business Central. Es aditivo y se ha probado dos veces consecutivas en la base aislada.
2. Desplegar backend y frontend. El valor por defecto de `CRM_EMAIL_REPLY_ENABLED` es `false`; la apertura actual continúa sin depender de la columna nueva mientras las respuestas estén desactivadas.
3. Activar `CRM_EMAIL_REPLY_ENABLED=true` para la comprobación del responsable, manteniendo la configuración de identidad vigente.
4. Descargar `/downloads/outlook-classic/OutlookClassic.zip`, extraerlo completo y ejecutar `Instalar_Outlook_dTS.bat` con el usuario Windows habitual. El paquete es 1.1.0; no se instala automáticamente.
5. Abrir un correo en Classic para actualizar la versión comunicada del equipo. Probar los dos modos de respuesta en Emails y Timeline, primero Classic y después Web. Revisar especialmente destinatarios y pertenencia al mismo hilo; no hace falta enviar para comprobar la preparación.
6. Después de la validación, mantener `CRM_EMAIL_IDENTITY_ENABLED=true` y usar `CRM_EMAIL_IDENTITY_EMAILS=*` para habilitar la identidad a todos los perfiles activos. Los permisos CRM y la pertenencia al buzón siguen siendo obligatorios; cada usuario conecta su propia cuenta y, para Classic, vincula su equipo. No se ha cambiado ninguna variable de producción en esta entrega.

Para suspender las respuestas, poner `CRM_EMAIL_REPLY_ENABLED=false` y redesplegar el backend. No borrar la columna ni revocar los dispositivos como paso de vuelta atrás; la apertura y Web continúan disponibles. Los borradores que el usuario ya haya creado permanecen en su buzón.

## Validación y pendientes

Pruebas automatizadas: JWT y DTO, separación entre modos, mensaje exacto, permisos y cambio de cuenta, borrador con enlace oficial, agrupación de clics, timeout sin reintento, consumo único y compatibilidad de versiones. La prueba de PostgreSQL utiliza una base aislada; las pruebas Graph usan respuestas controladas. El autodiagnóstico de C# comprueba el contrato criptográfico sin instalar, abrir correos ni crear respuestas reales.

Resultado de comprobaciones: 288 pruebas de backend, 12 de Classic con SQL real aislado y 5 de regresión HTTP/DB, 305 en total. También pasan las comprobaciones del menú, ventanas Web y protocolo, el autodiagnóstico C# y las compilaciones de backend y frontend.

Pendientes: aceptación real de Reply/ReplyAll en Classic y Web, SQL en Supabase y actualización del componente instalado. El código antiguo de respuesta queda sin uso en estos dos menús pero no se elimina aún de todos los instaladores: la búsqueda de conversación mantiene su flujo heredado hasta la fase de retirada.

Referencias: [crear respuesta con Graph](https://learn.microsoft.com/en-us/graph/api/message-createreply?view=graph-rest-1.0), [crear respuesta a todos](https://learn.microsoft.com/en-us/graph/api/message-createreplyall?view=graph-rest-1.0) y [MailItem.Reply](https://learn.microsoft.com/en-us/office/vba/api/outlook.mailitem.reply(method)).

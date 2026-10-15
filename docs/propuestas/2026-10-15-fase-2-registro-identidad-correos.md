# Registro de identidad estable de los correos nuevos

**Fecha:** 15 de octubre de 2026  
**Estado:** Implementado y comprobado automáticamente. Normalización real de la cuenta de prueba verificada sin registrar actividades ni enviar mensajes. Pendiente de aceptación dentro del complemento de Outlook Classic y Web.

## Alcance implementado

El usuario ha ejecutado el SQL de la fase 1. Una consulta posterior de Supabase confirma las siete columnas opcionales en `crm_activities`. Se incorporan al modelo Prisma y se genera el cliente sin aplicar cambios de esquema desde Prisma.

El registro desde el complemento conserva tipologías, clientes, contactos y asociación a ofertas. El backend transforma el identificador EWS de Office.js a un identificador inmutable mediante Microsoft Graph. Antes verifica el buzón conectado y su tenant. Guarda la identidad y el enlace que devuelve Microsoft; el navegador no puede acreditar por sí mismo el buzón, la referencia estable ni el estado de resolución. Los IDs conservan mayúsculas y minúsculas.

Un correo registrado puede quedar `pending`, `not_found`, `access_denied`, `reconnect_required` o `temporary_error`. La actividad comercial se conserva y la respuesta avisa de que la apertura está pendiente de verificar. Una referencia no disponible no se sustituye buscando por asunto, destinatario o fecha.

Las comprobaciones de duplicados se limitan al creador y a la cartera autorizada; el registro comprueba además cliente y contacto. Se permite conservar asociaciones comerciales diferentes del mismo mensaje. No se añade una restricción única global ni se promete deduplicación atómica de dos solicitudes simultáneas. Las actividades anteriores conservan su identificador original y su resolución se abordará en la fase 5.

## Autenticación y permisos del complemento

Las cinco rutas de consulta y registro requieren JWT del CRM. La identidad procede de la sesión autenticada. `userEmail` se contrasta con el perfil, pero no sustituye la autenticación. Se revisan usuario activo, acceso a CRM y permiso de Contactos según la configuración existente; una revocación se aplica en la siguiente petición. Los comerciales consultan su cartera y Admin/Dirección/Gerencia el conjunto del CRM. Estos roles no otorgan acceso a buzones de Microsoft de otros usuarios.

Si Outlook no comparte la sesión del navegador, el panel ofrece inicio de sesión con el servicio Supabase existente y permite cambiar de cuenta. Un 401 del complemento vuelve al acceso dentro del panel; no lo redirige fuera de Outlook. Los campos de contraseña no se guardan en la app ni se envían al backend del CRM. La sesión utiliza el almacenamiento Supabase existente.

Se valida que el contacto pertenezca al cliente elegido y que la oferta pertenezca al cliente y la cartera autorizados. Las ofertas siguen procediendo de BC. Registrar un correo no crea un seguimiento comercial antiguo ni cambia automáticamente su fase a partir de la categoría del correo. Se mantiene la vinculación con el seguimiento o registro comercial ya existente.

La vista de demostración en un navegador no registra correos ficticios. El guardado requiere abrir el complemento dentro de Outlook.

## Borradores y envíos desde el CRM

Para la cuenta habilitada, el alta del borrador solicita `Prefer: IdType="ImmutableId"`. Su actividad conserva la referencia estable aunque todavía no exista `internetMessageId`. Solo se considera resuelto cuando Microsoft confirma que ya no es borrador y proporciona esa referencia adicional.

El envío directo desde el CRM crea y registra primero un borrador exacto y después envía ese borrador una sola vez. Antes del envío se deja `send_unconfirmed`; si Microsoft acepta el envío pero la copia aún no se puede resolver, queda `sent_pending`. Una respuesta de red incierta pide comprobar Outlook antes de repetir el envío. No existe reenvío automático.

La sincronización revisa como máximo 25 referencias pendientes por ejecución, ordenadas por su última comprobación para rotar los lotes. Cada referencia se consulta una vez por ejecución; las sincronizaciones posteriores pueden volver a comprobarla. No se importa ni recorre todo el buzón y no se crea un proceso nuevo de consulta continua. El estado y la fecha permiten conservar la causa y repartir los intentos; no hay un máximo total de intentos entre ejecuciones.

La conciliación requiere el mismo tenant, buzón e identificador estable. No sobreescribe asunto ni cuerpo con otro correo reciente. Si se reconecta otra cuenta, no reasigna la actividad. Los borradores históricos sin identidad verificada se mantienen pendientes hasta su tratamiento específico. Se retiran las consultas generales de correo recientes que ya no tenían consumidores.

Este procedimiento sigue la secuencia oficial [borrador, envío y lectura mediante el mismo identificador inmutable](https://learn.microsoft.com/en-us/graph/outlook-immutable-id#immutable-id-with-sending-mail). Microsoft advierte de que la copia enviada puede tardar en estar disponible. El movimiento a un buzón de archivo, PST u otro buzón queda fuera de esta validación.

## Activación y compatibilidad

La configuración de ejemplo mantiene el flujo nuevo desactivado:

```dotenv
CRM_EMAIL_IDENTITY_ENABLED=false
CRM_EMAIL_IDENTITY_EMAILS=
```

Para la prueba local se habilita exclusivamente `gdiaz@dtsinstruments.com`. Las demás cuentas conservan su creación y envío actuales. Se retira para todas la asociación insegura de borradores por destinatario y fecha. La autenticación y el control de cartera del complemento se aplican a todas sus cuentas.

Tras sincronizar el trabajo a `C:\proyectos\webapp_dts`, es necesario reiniciar `npm run dev:https` para regenerar Prisma y cargar la configuración del backend. No se publica en producción ni se modifica el instalador local en esta fase. Se conservan calendario, tablas de BC y datos comerciales existentes.

## Comprobaciones

- Compilan backend y frontend. El frontend mantiene el aviso de tamaño de bundle; no se han instalado dependencias.
- Pasan 224 pruebas del backend; otras cinco pruebas HTTP del piloto se ejecutan y pasan por separado con PostgreSQL aislado. Incluyen autenticación real de las rutas del complemento mediante JWT de prueba, cartera y revocación de permisos.
- Se prueban normalización, cuenta incorrecta, token no disponible, errores 401/403/404/429, borrador sin referencia de Internet, IDs sensibles a mayúsculas y dos correos con el mismo destinatario y asunto. Se comprueba que un envío incierto no se repita automáticamente.
- La lectura real con la cuenta autorizada confirma el mismo identificador inmutable, `internetMessageId` y buzón del correo de la fase 0; la normalización devuelve `resolved`. No se han enviado mensajes ni creado actividades de prueba en Supabase.

## Aceptación pendiente y siguiente fase

Después del reinicio local, abrir un correo real en Outlook y registrar su actividad desde el complemento. Comprobar acceso al panel, asociación al cliente/contacto correcto y persistencia de los siete campos. Probar manualmente un borrador enviado solo cuando el usuario decida a quién enviar el mensaje; las pruebas automáticas de envío usan Graph simulado y no acreditan una entrega real.

El botón de apertura de Emails y Timeline todavía conserva el flujo anterior. La fase 3 conectará esas tarjetas con un único resolvedor que consulte el mensaje exacto y recupere su enlace web actual. La sustitución del BAT y la apertura de Classic corresponden a la fase 4. No se presenta esta fase como solución completa de la apertura profesional.

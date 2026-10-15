# Contrato de identidad y migración de correos del CRM

**Fecha:** 15 de octubre de 2026

**Estado:** Fase 1 aplicada por el usuario en Supabase y verificada mediante lectura el 15 de octubre de 2026. Los siete campos existen y admiten nulos.

La prueba principal de la fase 0 ha identificado y abierto el mismo correo de `gdiaz@dtsinstruments.com` antes y después de moverlo, en Classic y mediante el enlace web. Se ha probado también el arranque de Classic cerrado y la diferenciación de dos mensajes con el mismo asunto. El equipo tiene una cuenta configurada: la combinación de varias cuentas sigue pendiente de prueba real. La apertura web automática del componente local se validará de nuevo al integrar el lanzador; la confirmación del usuario corresponde al enlace directo.

Esta fase establece cómo guardar la identidad, quién puede resolverla y cómo introducir los campos sin romper la aplicación actual. No cambia todavía las tarjetas ni sus acciones.

## 1 Esquema real observado

La lectura de Supabase del 15 de octubre encontró 124 actividades `EMAIL`, una `EVENT` y otras actividades comerciales. `crm_activities` ya tiene `exchange_item_id`, `exchange_change_key`, `exchange_web_link`, `exchange_sync_status` y `exchange_last_synced_at`. Son campos compartidos con la integración de agenda y no se renombrarán ni reinterpretarán.

Se reutiliza `crm_activities`. No se crea otra tabla de correos ni se duplican clientes, contactos, ofertas, cuerpos o adjuntos. Las tablas importadas de Business Central quedan intactas.

## 2 Campos nuevos

| Campo | Tipo | Uso y origen |
| --- | --- | --- |
| `exchange_tenant_id` | `varchar(255)` opcional | Organización de Microsoft verificada por el servidor, no por un campo libre del complemento. |
| `exchange_mailbox_id` | `varchar(255)` opcional | Identificador estable del buzón verificado en Microsoft. Se compara con la cuenta conectada al usuario autenticado. |
| `exchange_immutable_id` | `text` opcional | Identificador inmutable del mensaje obtenido de Graph. Se conserva exactamente, incluidas mayúsculas. |
| `exchange_original_id_type` | `varchar(32)` opcional | `ewsId`, `restId`, `restImmutableEntryId`, `entryId` o `unknown`. El histórico sin procedencia fiable no se clasificará por su aspecto. |
| `exchange_internet_message_id` | `text` opcional | Referencia adicional para verificar el correo en Classic y recuperar candidatos. No es una clave única universal. |
| `exchange_resolution_status` | `varchar(32)` opcional | Estado específico de identificación del correo, independiente de la sincronización de agenda. |
| `exchange_resolved_at` | `timestamptz` opcional | Momento en que el servidor verificó la referencia. |

Los campos nacen vacíos. No se deduce automáticamente un buzón a partir del creador histórico: otra persona puede haber registrado una actividad o haber cambiado de cuenta. La identidad resuelta solo se guardará después de verificar el buzón y el mensaje.

Estados previstos: `pending`, `resolved`, `not_found`, `ambiguous`, `access_denied`, `reconnect_required` y `temporary_error`. Un borrador sin identificador de Internet permanece pendiente. Marcar una fila como `resolved` exige una identidad completa y fecha de resolución.

Los índices son no únicos porque un mismo correo puede conservar varias asociaciones comerciales. Para admitir identificadores largos utilizan una huella junto al tenant y al buzón. Toda consulta comprobará también el identificador completo: la huella no decide que dos mensajes sean iguales.

## 3 Contrato interno de identidad

`email-identity-contract.ts` define los estados, los tipos y un mapeo que solo devuelve los siete campos anteriores. Rechaza actividades que no sean `EMAIL`, referencias incompletas, formatos desconocidos y fechas inválidas. No puede copiar al seguimiento tokens, cuerpos, títulos ni datos comerciales de un objeto recibido.

Esta utilidad no demuestra por sí sola la identidad. La invocará el servicio únicamente después de recibir y verificar la respuesta de Microsoft, como se ha probado en la fase 0. No se aceptará una identidad ya resuelta enviada por el navegador.

La clave de identificación es tenant, buzón e identificador inmutable. `internetMessageId` ayuda a comprobar el resultado; si la recuperación devuelve varias copias, debe intervenir el usuario. Ni el asunto ni el destinatario sustituyen esa comprobación.

## 4 Autenticación y permisos

El primer alcance utiliza el buzón propio conectado del usuario. La comprobación requiere simultáneamente:

1. Sesión CRM válida y perfil activo.
2. Permiso de acceso a la vista y a la actividad dentro de la cartera correspondiente.
3. Cuenta Microsoft conectada a ese usuario y buzón verificado mediante Microsoft.
4. Coincidencia del tenant y el buzón registrados con los del mensaje.

`assertOwnEmailMailboxAccess` expresa la separación entre consultar una actividad comercial y acceder al buzón. El rol Admin o Dirección permite las consultas del CRM que ya le correspondan, pero no concede acceso a los correos de otro buzón. La delegación y los buzones compartidos se incorporarán después de validarse expresamente.

En la fase 2 se protegerán conjuntamente las rutas del complemento y su interfaz de inicio de sesión. Se reutilizará la autenticación Supabase del CRM, disponible en el proyecto, y el JWT que valida el backend. Cuando Office no comparta la sesión del navegador, el complemento mostrará el acceso del CRM y volverá a su pantalla sin perder la selección comercial. No se supondrá que Office comparte el `localStorage` de la web ni se usará el correo escrito en `userEmail` como credencial.

El cliente del complemento tendrá tratamiento propio de sesión caducada, sin redirecciones globales que expulsen el panel a `/login`. Las rutas `lookup`, registro y búsquedas de empresas, contactos y ofertas deberán comprobar sesión y ámbito. La activación de las guardas se hará con el acceso del complemento ya operativo, para evitar interrumpir el registro de correos.

La cuenta y el tenant procederán del contexto Microsoft comprobado por el servidor. No se confiará en una decodificación sin verificar de un token ni en IDs arbitrarios del navegador. La referencia `microsoft_user_id` actual se mantiene; desconectar OAuth no borrará el buzón histórico de las actividades.

## 5 Contrato de resolución previsto

La fase 3 añadirá una operación autenticada de resolución por actividad, propuesta como `POST /exchange-sync/emails/:activityId/resolve`. El navegador enviará la preferencia web o Classic, no el asunto ni la cuenta que deba suplantarse. Esta ruta todavía no se publica en la fase 1.

| Resultado | Comportamiento |
| --- | --- |
| Web disponible | Devuelve el enlace actual comprobado de Outlook y fecha de resolución. |
| Classic disponible | Solicitud temporal para el componente local que se desarrollará en fase 4; no se entrega un token Graph al navegador. |
| Referencia antigua no identificada | Solicita recuperación o revinculación; no prueba formatos al azar ni abre coincidencias por asunto. |
| Mensaje no localizado | Informa del fallo y conserva la actividad del CRM. |
| Varias copias candidatas | Permite elegir una referencia verificada dentro del buzón autorizado. |
| Sesión de Microsoft caducada | Solicita reconexión de Microsoft 365; no cierra la sesión CRM ni marca el correo como eliminado. |
| Sin acceso al buzón | Deniega la apertura sin otorgar permisos por el rol comercial. |
| Límite de peticiones o error temporal | Reintento acotado y respeto de `Retry-After`, sin sustituir el mensaje. |

El calendario mantiene sus operaciones y sus identificadores actuales.

## 6 Diseño del componente local

Se mantiene la propuesta de un componente Windows firmado y versionado, ejecutado en la sesión del usuario, con selección explícita de almacén. La fase 0 ha probado conversión a MAPI, comparación de identidad, arranque en frío y reconexión al objeto COM único de Outlook. La variante con varias cuentas continúa sin validación real.

El protocolo de producción no utilizará asunto ni direcciones del contacto para localizar el correo. La solicitud tendrá uso único, caducidad corta, usuario, buzón, acción y versión de protocolo. No incluirá tokens de Microsoft ni cuerpos. Un estado de «Windows aceptó el protocolo» no equivaldrá a correo abierto.

Antes de publicar el componente en fase 4 deben cerrarse y probarse la asociación autenticada con el usuario, la protección contra repetición y la devolución autenticada del resultado. Si se necesita persistencia entre instancias del servidor, las solicitudes de corta duración tendrán almacenamiento compartido con caducidad; un diccionario en memoria no garantizará uso único en producción. Ese almacenamiento y el mecanismo de firma se revisarán en esa fase, sin crear ahora una tabla que no utiliza todavía la aplicación.

## 7 SQL y orden de activación

La migración preparada está en `backend/prisma/proposals/2026-10-15-identidad-estable-correos-crm.sql`.

1. Ejecutar el archivo completo desde Supabase SQL Editor con el rol propietario de `crm_activities`.
2. Comprobar que devuelve los siete campos y que todos admiten nulos. Si detecta tipos incompatibles o no consigue el bloqueo en cinco segundos, se detiene y revierte su transacción.
3. Tras confirmar la ejecución, incorporar los campos opcionales al modelo Prisma, generar el cliente y comprobar la compilación.
4. Implementar el registro de identidad de la fase 2 detrás de una activación controlada. El histórico queda sin rellenar hasta la migración de referencias de la fase 5.

Tras la confirmación del usuario y la comprobación de las siete columnas en Supabase, la fase 2 incorpora estos campos opcionales a `schema.prisma`. Se ha generado el cliente Prisma y comprobado la compilación, sin ejecutar `db push` ni modificar otras tablas.

La migración no cambia permisos, RLS, políticas ni triggers existentes. Añade restricciones solo a los campos nuevos de identidad de correo e índices no únicos. Puede ejecutarse de nuevo y no contiene operaciones de borrado o relleno de actividades. Con el volumen observado, se ha escogido una transacción corta con tiempos máximos; no hay un proceso de importación de todo el buzón.

Para volver a la versión anterior de la app se conservan las columnas nuevas y su información: el código antiguo las ignora. No se requiere borrar datos para desactivar el flujo nuevo.

## 8 Validación realizada y siguiente paso

La migración se ha ejecutado dos veces en PostgreSQL local aislado en el puerto 55438. Las pruebas verifican datos anteriores, calendario, propietario, permisos, política RLS, referencias largas y varias asociaciones al mismo mensaje. También comprueban el rechazo de identidad de email en eventos, estados inventados y referencias incompletas marcadas como resueltas.

Las utilidades de identidad y de acceso al buzón superan 49 pruebas específicas. El usuario ha aplicado el SQL en la base compartida y la lectura posterior confirma los siete campos opcionales. La implementación y los límites de validación de la fase 2 se detallan en [Registro de correos nuevos](2026-10-15-fase-2-registro-identidad-correos.md).

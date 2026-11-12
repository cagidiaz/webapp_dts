# Propuesta simplificada: eventos vinculados a oportunidades

**Estado:** borrador revisado; SQL no ejecutado. Sustituye la propuesta anterior de tres tablas.

## Relación nueva

Añadir a `crm_activities` un campo `oferta_vinculada varchar(50) NULL`, con índice para consultar actividades por número de oferta. Cada actividad solo puede contener una oferta. NULL significa que no está vinculada. No se crea una tabla de relación ni se duplican eventos.

La oferta se identifica por `sales_quotes.document_no`. No se propone una clave externa hacia tablas de BC, para no bloquear importaciones que sustituyan registros; el backend validará existencia, empresa, contacto, oferta abierta y permisos en cada creación o cambio. Si una oferta desaparece posteriormente, su referencia deberá mostrarse como no disponible sin borrar automáticamente el evento. El nuevo campo no debe rellenarse automáticamente a partir de metadatos o títulos antiguos.

## Seguimiento y sugerencias

Se sustituye la planificación manual antigua: la próxima acción se calcula únicamente a partir de los eventos vinculados pendientes con fecha. Si no hay ninguno, queda vacía. Los eventos sin fecha se conservan en el historial pero no determinan la próxima acción. Se retirarán la interfaz y la funcionalidad de las actividades manuales antiguas, y se eliminarán sus registros una vez identificados de forma segura. No se eliminan eventos de contacto, correos, asociaciones históricas de correo, auditoría ni cambios de fase.

Se mantienen sugerencias basadas en la detección del número de oferta, sujetas a confirmación del comercial. No existirá acción de descartar ni tabla de descartes; mientras siga cumpliendo las reglas, la sugerencia puede volver a aparecer. No se vincula ninguna oferta automáticamente.

No se necesitan las tres tablas de la propuesta anterior. El SQL de esta propuesta solo añade el campo y su índice; no crea ninguna relación ni borra datos existentes. La limpieza del sistema anterior se planificará una vez precisado su alcance.

## Dependencias identificadas

- `crm_offer_followups.proxima_accion` y `fecha_proxima_accion`, así como los campos de seguimiento en `sales_quotes_crm`, alimentan vistas, historial y cortes. No se deben borrar de manera aislada sin adaptar sus consumidores y respetar los cortes históricos.
- `crm_offer_activities` mezcla interacciones, cambios de fase y auditoría. El código actual registra los cambios de fase con una nota que empieza por `Cambio de fase [` y permite que su tipo varíe; las actividades manuales también pueden ser de tipo `Nota`. Por tanto, filtrar solo por tipo no permite decidir qué borrar. Se conservarán expresamente la auditoría, los cambios de fase y cualquier registro dudoso hasta su revisión; se elaborará un inventario antes de preparar un borrado selectivo. `sales_quote_activities` conserva historial anterior y también requiere identificación individual antes de decidir qué datos antiguos corresponden a interacciones manuales.
- Se mantienen los correos, sus asociaciones históricas con ofertas, el filtro de correos por oferta y el complemento de Outlook. Los metadatos existentes, incluidos `crm_activities.attendees.quoteDocumentNo` y `quote_document_no`, no se borrarán de forma generalizada ni se sustituirán sin preservar su comportamiento para EMAIL.
- Se mantienen los cortes históricos sin modificar su contenido, incluida la planificación que hayan capturado. Los campos antiguos se dejarán de utilizar en la nueva planificación; cualquier retirada física exige revisar dependencias y no modificar tablas sincronizadas con BC.
- La detección por título se usará para sugerencias, no como vínculo confirmado. Debe omitirse para correos en el seguimiento de eventos y comprobar cartera, cliente, contacto y fase.

## Seguridad, concurrencia y despliegue

El campo se añade a una tabla ya existente: sus permisos y RLS no cambian. La autorización y las validaciones deben aplicarse en backend; el esquema por sí solo no impide escribir valores inválidos. La implantación debe revisar los accesos y políticas de la tabla existente y coordinar API, frontend y n8n. No se modifica ninguna tabla sincronizada desde Business Central ni el conector de Outlook hasta revisar sus consumidores.

El cambio de oferta, desvinculación, eliminación de actividad o finalización debe reflejarse en los cálculos de ambas ofertas sin duplicar el evento ni modificar sus datos de Outlook. Probar concurrencia, APP y BC, permisos y privacidad de convocatorias.

## Inventario y orden de trabajo

1. Ejecutar, si se desea, `backend/prisma/proposals/2026-11-12-inventario-seguimiento-antiguo.sql`: son consultas de lectura para contar y revisar actividades y planificación. El detalle puede contener información comercial privada. Las categorías son indicios, no una selección autorizada para borrado; incluso el patrón de cambio de fase podría haberse editado.
2. Revisar los resultados y las dependencias antes de definir una limpieza selectiva; conservar las entradas dudosas. Los cortes ya creados no se alteran.
3. Aplicar el campo y el índice propuestos y adaptar backend y formularios de eventos, manteniendo la relación y filtros existentes de correo. La selección y la validación de oferta y contacto corresponden al backend.
4. Sustituir los campos de planificación y las actividades manuales en la ficha de oportunidades y en la ficha de contacto. Adaptar también tabla, Kanban y exportaciones, alertas y nuevos cortes para que usen la próxima acción calculada. Mantener la auditoría y el registro de cambios de fase.
5. Probar creación, edición, desvinculación, concurrencia y permisos, ofertas APP y BC, correo y Outlook, privacidad y cortes. Solo después preparar la limpieza selectiva revisada; no tocar los datos sincronizados de BC.

**SQL propuesto:** `backend/prisma/proposals/2026-11-11-propuesta-vinculo-evento-oferta.sql`. Es solo una propuesta; no se ha ejecutado. Antes de producir un SQL de borrado se requiere un inventario de las actividades manuales y sus dependencias, respaldo verificable y revisión de los registros ambiguos. Los correos, sus asociaciones, la auditoría, los cambios de fase y los cortes históricos quedan fuera del borrado.

# Recuperación de estructura CRM y Outlook — 19/10/2026

Revisión del historial local desde el jueves 15/10/2026, hasta `badf722` (último commit local revisado). No se ha aplicado ninguna operación a Supabase.

## Orden de ejecución

1. Conservar una copia del estado actual y ejecutar **00-diagnostico-solo-lectura.sql**. No modifica nada.
2. Si existen las tablas base `profiles` y `crm_activities`, ejecutar completo **01-recuperar-outlook-desde-15-10.sql** como propietario (`postgres`). Restaura las siete columnas de identidad, sus restricciones e índices, las tablas de dispositivos/solicitudes Classic, RLS y el campo `action` de respuestas. Se puede repetir si el esquema superviviente coincide con las migraciones originales. En caso de error, toda la operación revierte; no continuar fragmentándola.
3. **02-solo-si-faltan-las-ocho-tablas-crm.sql** es opcional y anterior al alcance estricto de Outlook: usar SOLO si el diagnóstico muestra ausentes las ocho tablas de prospección, seguimiento y cortes. Si existe alguna, se detiene antes de escribir para no mezclar versiones. Crea la versión final de seguimiento, sin owner_id ni datos de contacto duplicados, con `document_no` y `contacto_id varchar NOT NULL` y sus relaciones. No ejecutar las antiguas recreaciones destructivas ni `full_schema.sql`, `supabase_init.sql` o cargas de pruebas.

Si hacen falta ambos scripts, ejecutar 02 y después 01. Si hay tablas parcialmente presentes, o una versión antigua del seguimiento, compartir el resultado del diagnóstico: no se ha supuesto su estado ni se han eliminado columnas o registros.

## Cambios comprobados en el historial

| Origen | Recuperación |
| --- | --- |
| SQL 15/10 identidad estable | Siete columnas de `crm_activities`, cuatro checks, dos índices. |
| SQL 15/10 Classic (publicado en commit 16/10) | `crm_outlook_devices`, `crm_outlook_requests`, índices y bloqueo de acceso directo del navegador. |
| SQL 16/10 respuestas | `crm_outlook_requests.action`, valores open/reply/reply_all. |
| SQL fechados 13–14/10, incorporados al proyecto en commit 15/10 | Ocho tablas CRM, relaciones y protección de cortes. Su pérdida depende del momento real de la restauración; archivo 02 condicionado a ausencia total. |
| Adjuntos 16/10 | Sin SQL: JSON `crm_activities.attendees.emailAttachments`. |
| Borrado exclusivo del CRM y contadores 16/10 | Sin SQL: correcciones del código. |

## Lo que este SQL no recupera

No puede reconstruir filas perdidas: prospectos, modificaciones APP del seguimiento, correos registrados, nombres de adjuntos, cortes, claves públicas/vinculaciones de equipos, perfiles, permisos de vistas o tokens. Requieren backup/PITR o exportación previa; no se inventan datos ni se repueblan automáticamente. Si se perdieron vinculaciones Classic y no se restauran sus filas, habrá que volver a vincular los equipos. Las solicitudes antiguas y efímeras no necesitan recrearse con datos ficticios.

Los flujos n8n y las variables de entorno de Dokploy no se restauran mediante SQL. No se reactiva ninguna automatización ni se toca ninguna tabla sincronizada desde BC. En Classic, las dos tablas se mantienen sin permisos directos para service_role conforme a la migración original: la conexión SQL del backend necesita los permisos del propietario o los de su rol específico. No se inventa un usuario SQL ni se amplían permisos a todo el sistema.

## Verificación realizada

Probado el 19/10/2026 exclusivamente en PostgreSQL local aislado: creación de las ocho tablas CRM con el esquema final, recuperación Outlook ejecutada dos veces, siete columnas de identidad, diez tablas con RLS, conservación de actividades/metadatos previos y de los datos BC de prueba. También se comprobó que el archivo 02 rechaza una segunda ejecución cuando existen tablas y conserva su estado. El servidor aislado se detuvo al terminar. No se ha accedido ni escrito en Supabase real.

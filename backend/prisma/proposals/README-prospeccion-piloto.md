# Primera entrega del piloto de Prospección

Estado: el usuario ha comunicado la creación de las tablas en Supabase. La base local y producción son compartidas. El seguimiento de ofertas se suministra desde n8n; esta revisión no aplica SQL a la base compartida.

1. Revisar `2026-10-13-prospeccion-piloto.sql` contra el esquema efectivo, copia de seguridad y usuario SQL de la API.
2. Mantener `CRM_PROSPECTS_PILOT_ENABLED` ausente o en `false` mientras el esquema no esté disponible. El endpoint de acceso devuelve desactivado sin consultar las tablas nuevas.
3. No usar `prisma db push`, reinicios o cargas de ejemplo sobre la conexión real. La generación del cliente Prisma no requiere aplicar el SQL.
4. Revisar el resultado concreto antes de ejecutar SQL en la base compartida. La propuesta no escribe en tablas BC ni altera el esquema de los eventos actuales.
5. Después de la revisión y de aplicar el SQL, habilitar deliberadamente el backend del piloto con `CRM_PROSPECTS_PILOT_ENABLED=true`. `CRM_PROSPECTS_PILOT_EMAIL=aciurans@dtsinstruments.com` identifica inicialmente al comercial a partir de su perfil autenticado.
6. Admin y Dirección consultan globalmente. Admin crea prospectos propios para probar el piloto y edita datos y fase de cualquier prospecto, sin cambiar propietario. Antoni también crea los suyos. El archivo, la restauración y la vinculación quedan para el propietario de cada prospecto.
7. Desactivar el interruptor para volver al funcionamiento anterior de la interfaz. Conservar los datos del piloto y su auditoría; no borrar tablas automáticamente.

Para las pruebas previas, Admin puede editar el seguimiento APP existente de la cartera piloto aunque Antoni todavía no tenga permiso de la vista. Admin sí necesita sus propios permisos CRM/Oportunidades. La cuenta configurada del piloto debe estar activa, con rol TESTER y código comercial. Los cambios administrativos conservan a Antoni como propietario y registran a Admin como autor.

## Seguimiento suministrado por n8n

Decisión del usuario del 14/10/2026: n8n importa todas las ofertas y suministra `crm_offer_followups` cada minuto. El backend no ejecuta barridos periódicos, preparación inicial ni altas de seguimiento, tampoco al guardar una oferta. Se han retirado el botón de preparación y sus endpoints de estado/inicialización. Las pantallas consultan los datos cuando se abren, filtran o actualizan; se ha retirado el refresco periódico añadido para esa preparación. Los cortes semanales y las comprobaciones de permisos conservan sus procesos independientes.

Contrato de datos para el flujo n8n:
- Relacionar la oferta por `document_no`, conservando el `id` del seguimiento cuando BC recrea su fila importada.
- En seguimiento guardar únicamente `contact_id`, con el UUID de `contacts.id`. No enviar `contacto_nombre`, `contacto_email` ni `contacto_telefono`: la API resuelve esos datos actuales desde `contacts` en una consulta agrupada. El alias `contacto_id` se conserva en la API para los formularios existentes; en la tabla física la columna se llama `contact_id`.
- Usar `source=APP` y el UUID del perfil propietario en las ofertas que se gestionan desde la app; durante el piloto, las de Antoni. La probabilidad efectiva se calcula según la fase.
- Usar `source=BC` en los demás registros. Estos pueden tener propietario vacío si no existe una cuenta comercial inequívoca. El backend mantiene el filtrado por cartera y permisos.
- Insertar los registros que faltan y actualizar las copias BC con una condición de escritura que compruebe `source=BC`. No basta con comprobar el origen en una lectura anterior: una edición concurrente puede cambiarlo.
- Conservar los campos, `id`, `source`, propietario, `version` e historial de los registros APP. No truncar/recrear esta tabla ni sobrescribir esos registros en cada ejecución. La app incrementa su versión al editar para detectar conflictos.

Si falta el seguimiento o no tiene fuente APP, el guardado y las altas de actividades del piloto se rechazan con un mensaje de espera/configuración de n8n; no crean una copia ni escriben por la ruta heredada. El SQL `2026-10-14-seguimiento-todas-ofertas.sql` sigue siendo compatible con este suministro; no crea tablas adicionales. El flujo real n8n no se ha inspeccionado ni ejecutado desde esta tarea.

El SQL `2026-10-14-contacto-seguimiento-por-id.sql` renombra la referencia existente a `contact_id` y elimina las tres columnas duplicadas únicamente en `crm_offer_followups`. Ejecutarlo antes de probar el código actualizado y adaptar el mapeo del nodo n8n a esas columnas. No altera `contacts` ni añade una clave foránea física que pueda bloquear la recreación de contactos importados de BC. Si un UUID no existe, los datos de contacto se muestran vacíos hasta corregir la asociación. Al cambiar el contacto desde la app se comprueba que pertenezca al cliente de la oferta. Los cortes publicados conservan los datos de contacto capturados en su payload histórico.

Las tablas usan RLS y revocan acceso directo a `anon` y `authenticated`. Antes de aplicar se debe comprobar que el rol PostgreSQL de la API tiene acceso apropiado. Los endpoints realizan la autorización por usuario y rol en el servidor.

En la base compartida se comprobó que `crm_offer_followups` pertenece a `supabase_admin`, mientras la API conecta como `postgres`. Los cambios de estructura requieren el rol propietario desde SQL Editor; el backend no aplica migraciones ni modifica tablas sincronizadas de BC.

Outlook de prospectos está preparado detrás de `CRM_PROSPECTS_OUTLOOK_ENABLED=true`, adicional al interruptor del piloto; dejar ambos desactivados hasta validar esquema, permisos Graph y pruebas reales de la cuenta de Antoni. No habilitarlo desde los tests. Las columnas `exchange_*` conservan identidad remota, estado, versión sincronizada, bloqueo y payload inicial. Los resultados de creación desconocidos requieren revisión; no se repite automáticamente un alta. El delta conserva el registro cuando el evento se retira y puede recuperar un ID remoto por la transacción original. Su ventana heredada es de -30/+90 días. No hay borrado automático ni nuevo evento al convertir/desvincular. Referencia: [crear eventos en Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0).

Esta entrega contiene creación, edición, fases, búsqueda, tabla/Kanban, archivo, restauración, auditoría, asociación reversible con clientes BC sin oferta y actividades locales en `crm_prospect_activities`. El esquema incorpora `linked_client_id` y `converted_at`, con una comprobación de coherencia. La asociación conserva identidad y fase; su corrección devuelve el prospecto a la cartera activa. El cliente consulta las actividades por la asociación actual, sin copiar filas. La vista incluye también el seguimiento de Ofertas y los Cortes documentados en CRM Pipeline. Queda pendiente validar el flujo real n8n y las integraciones externas antes de ampliar el piloto.

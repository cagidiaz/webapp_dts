# Separación de seguimiento BC/app: entrega preparada

Diseño inicial: 13/10/2026. Actualizado el 14/10/2026 para suministro de seguimiento desde n8n. La base local y producción son compartidas; el usuario ha comunicado la creación de las tablas del piloto.

## Fuente de los datos

`sales_quotes` sigue siendo una tabla de BC de solo lectura para la aplicación. Cliente, comercial asignado, fecha documental, importe y demás datos generales se actualizan desde BC. El piloto usa dos tablas propuestas: `crm_offer_followups` y `crm_offer_activities`. Se relacionan con la oferta por `document_no`, sin clave foránea a la fila importada ni borrado en cascada. Su propietario se conserva por UUID del perfil; la fuente queda marcada APP y no depende del usuario que la consulte.

El código del propietario piloto se consulta en su perfil configurado, sin fijarlo como una constante. Admin conserva la edición de su cartera piloto con sus propios permisos, sin depender de que Antoni tenga ya acceso a la vista.

La tabla `crm_offer_followups` conserva solo `contact_id` para referenciar `contacts.id`. Nombre, email y teléfono se leen desde `contacts`, sin columnas duplicadas en seguimiento. El SQL de ajuste conserva el UUID existente; la API mantiene `contacto_id` como alias para las pantallas actuales. La ficha, los filtros y Outlook consultan los valores actuales del contacto; los cortes congelan los valores del momento y conservan las fotografías ya publicadas.

## Suministro desde n8n y guardado

n8n importa todas las ofertas y suministra el seguimiento cada minuto. Se han retirado la sincronización periódica del backend, el botón de preparación y los endpoints de inicialización y estado. La aplicación no crea ni copia seguimiento al guardar: requiere un registro existente con fuente APP, propietario y versión válidos. Si aún no está disponible, devuelve un mensaje para esperar/revisar el flujo n8n.

El flujo n8n debe mantener la relación por número de oferta, insertar los registros que faltan y actualizar únicamente las copias de fuente BC. Debe preservar las filas APP completas, incluidos identidad, propietario, campos vacíos, versión y actividades vinculadas. No debe truncar esta tabla ni actualizar las filas APP en cada importación. La condición `source=BC` debe verificarse también en la operación de escritura para evitar una carrera con las ediciones locales. Durante el piloto n8n habilita como APP las ofertas de Antoni y mantiene las demás como BC. Las copias BC pueden carecer de propietario si aún no existe una cuenta comercial asociada.

La versión de cada registro acompaña los guardados desde el Kanban, la ficha del contacto y Ventas - Ofertas. Una edición desactualizada se rechaza; no se mezcla silenciosamente con la nueva. Los valores vacíos locales no recuperan datos de BC. Cada cambio conserva propietario, fuente y auditoría independiente. Los borrados de actividades del piloto se rechazan: el seguimiento se conserva y permite corregir notas o marcar realizado. La auditoría no es editable.

## Lecturas, filtros y métricas

La misma resolución se aplica en `/quotes`, `/quotes/crm`, detalle y ofertas del complemento Outlook. Para registros preparados se lee APP; para los demás, los campos de seguimiento importados se leen BC. Campos auxiliares que solo existían en el CRM anterior mantienen ese origen para los no participantes. Las consultas transforman los filtros de seguimiento antes de contar o paginar y utilizan el valor efectivo en métricas. La ordenación por campos de seguimiento se resuelve antes de paginar, a partir de los registros seleccionados; requiere medir rendimiento con el volumen real.

El importe procede siempre de BC: cambiarlo modifica el ponderado, pero no la fase ni probabilidad guardada por Antoni. El campo general `cerrado` del documento sigue procediendo de BC; las nuevas reglas de fases y cierres comerciales se implementarán en la siguiente entrega. La inicialización no migra por sí sola a las seis fases nuevas.

## Cambios de propietario, desaparición y Outlook

Cambiar el comercial de una oferta no modifica el propietario local. Las escrituras que no coincidan con el propietario y la cartera esperada requieren revisión explícita; no se cambia automáticamente la fuente. Si BC elimina una oferta, el seguimiento local permanece, aunque deja de aparecer en la cartera activa al no existir documento importado. Al reaparecer el mismo número, vuelve a asociarse y recupera el seguimiento. Falta una vista específica de históricos sin documento y validar reutilizaciones de número.

El complemento Outlook añade los correos a la actividad local de una oferta preparada sin marcarla automáticamente como ganada. El seguimiento local sigue siendo la autoridad aunque otras integraciones actualicen el CRM anterior. Se debe revisar el flujo completo de n8n y todos los procesos de limpieza antes de activar; sus definiciones no están disponibles en este repositorio y no se han probado contra la base real.

## Validación y próximos pasos

Pruebas con dobles de datos: recreación de ID BC, importes nuevos con seguimiento conservado, vacíos, fuentes por oferta, filtros antes de conteo/paginación, seguimiento pendiente de n8n sin altas automáticas, permisos, versión antigua, conflicto concurrente y cambio de propietario. La vista previa permite simular una actualización BC con datos de ejemplo; no accede a Supabase.

Antes del piloto: revisar el SQL, permisos del rol de la API, código real de Antoni y flujos n8n. Después, ejecutar una prueba controlada de sincronización real autorizada. A continuación se desarrollan las seis fases, campos obligatorios, porcentajes automáticos, cierres con motivo y transiciones con nota atómicas. La lista de motivos sigue pendiente del usuario.

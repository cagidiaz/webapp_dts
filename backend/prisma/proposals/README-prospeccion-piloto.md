# Oportunidades: configuración vigente para pruebas locales

## Acceso por rol y pruebas locales — 20/10/2026

Oportunidades ya no depende de un piloto, de un correo concreto ni de `CRM_PROSPECTS_PILOT_ENABLED`. El administrador asigna el acceso desde Gestión de Usuarios mediante los permisos **CRM** y **CRM: Oportunidades** del rol; ambos deben estar concedidos. El backend comprueba estos permisos también para Admin. Si falla la comprobación, la vista muestra un aviso y no abre un pipeline alternativo.

- **Admin:** consulta global, creación de prospectos propios, edición de datos y fases de cualquier prospecto y seguimiento APP de cualquier comercial. No cambia propietarios; archivo, restauración y vinculación de prospectos conservan sus restricciones de propietario.
- **Dirección:** consulta global y creación de cortes manuales; sin edición comercial.
- **Otros roles autorizados, incluido Tester:** prospectos propios y ofertas de su código comercial. Un código comercial ausente no concede acceso global.
- **Business Central:** tablas importadas de solo lectura. Las ofertas se crean en BC. n8n suministra `crm_offer_followups`; la app no prepara ni crea seguimientos automáticamente. Solo las filas `source=APP` admiten edición; las filas BC y las ofertas sin seguimiento permanecen consultables.
- **Automatizaciones:** los cortes programados requieren `CRM_CUTS_AUTOMATION_ENABLED=true`; el calendario de prospectos requiere `CRM_PROSPECTS_OUTLOOK_ENABLED=true`. Son opciones independientes, desactivadas por defecto para las pruebas locales. Los cortes manuales siguen disponibles para Admin y Dirección.

Para probar: reiniciar la aplicación desde `C:\proyectos\webapp_dts`, acceder como Admin y abrir CRM → Oportunidades. Revisar Prospección (crear y editar), Ofertas (filtros, Kanban y tabla) y Cortes. Los cambios manuales desde la app local utilizan la misma base compartida. No se ha desplegado en producción ni cambiado permisos en Supabase.

## Contrato de seguimiento suministrado por n8n

`crm_offer_followups.document_no` identifica la oferta importada de `sales_quotes`. El comercial se obtiene de `sales_quotes.salesperson_code`; no se duplica como propietario en seguimiento.

La columna física `contacto_id` es varchar, obligatoria, y utiliza `contacts.contact_no`. No es el UUID `contacts.id`. La app resuelve los datos del contacto desde esa tabla; no guarda copias de nombre, teléfono ni email en el seguimiento.

n8n inserta el seguimiento que falta. En las filas `source=APP` debe conservar valores de seguimiento, `id`, `version` e historial: no truncar ni sobrescribir cambios de la app. En las filas BC puede actualizar el seguimiento importado, comprobando el origen en la escritura para evitar conflictos concurrentes. La app incrementa `version` al guardar. No se ha modificado ni validado el flujo real de n8n en esta revisión.

Las ocho tablas CRM ya existen en la base revisada; no se necesita ejecutar SQL para este cambio de acceso. Los SQL antiguos de esta carpeta documentan decisiones anteriores y no deben ejecutarse como una migración nueva. No usar `prisma db push` ni alterar tablas sincronizadas de BC.

Antes de las pruebas se observó la tabla de seguimiento vacía. Sin filas suministradas por n8n se pueden consultar ofertas importadas, pero no editar su seguimiento. Las comprobaciones de esta revisión contra Supabase son de solo lectura.

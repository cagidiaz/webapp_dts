# 📊 Documentación de Vista: CRM — Pipeline y Oportunidades Comerciales

> **Ubicación en la aplicación:** `/crm/pipeline`  
> **Acceso en menú:** CRM → *Oportunidades*  
> **Componente Contenedor Frontend:** [`CrmOpportunities.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CrmOpportunities.tsx)  
> **Componentes Principales Frontend:**  
> - Pestaña Prospección: [`CrmProspects.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CrmProspects.tsx) y [`ProspectActivities.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/ProspectActivities.tsx)  
> - Pestaña Ofertas: [`CrmPipeline.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CrmPipeline.tsx)  
> - Pestaña Cortes: [`PipelineCuts.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/PipelineCuts.tsx) y [`CutAnalytics.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CutAnalytics.tsx)  
> **Controladores Backend (NestJS):**  
> - `backend/src/modules/prospects/prospects.controller.ts`  
> - `backend/src/modules/quotes/quotes.controller.ts`  
> - `backend/src/modules/quotes/pipeline-cuts.controller.ts`  
> **Servicios Backend (NestJS):**  
> - `backend/src/modules/prospects/prospects.service.ts`  
> - `backend/src/modules/quotes/quotes.service.ts`  
> - `backend/src/modules/quotes/offer-followup.service.ts`  
> - `backend/src/modules/quotes/pipeline-cuts.service.ts`  
> - `backend/src/modules/quotes/offer-close-reasons.ts`  
> **Tablas de Base de Datos:**  
> - *Prospección:* `crm_prospects`, `crm_prospect_activities`, `crm_prospect_events`  
> - *Seguimiento Ofertas:* `crm_offer_followups`, `crm_offer_activities`, `sales_quotes_crm`, `sales_quote_activities`, `sales_quotes` (BC, solo lectura)  
> - *Cortes Históricos:* `crm_pipeline_cuts`, `crm_pipeline_cut_rows`, `crm_pipeline_cut_events`  
> - *Entidades Relacionadas:* `customers` (BC), `contacts` (BC)  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La pantalla **Oportunidades** (`/crm/pipeline`) es el centro neurálgico de gestión comercial y seguimiento de ventas de dTS Instruments. Su función es cubrir de punta a punta todo el embudo comercial: desde la captación y cualificación de empresas potenciales antes de que existan en el ERP, pasando por el seguimiento riguroso de cotizaciones activas, hasta la captura inmutable de fotografías históricas semanales para análisis de tendencias ejecutivas.

Para conciliar la operativa comercial ágil con la integridad absoluta de datos corporativos, la vista adopta una **arquitectura tripartita modular** orquestada por `CrmOpportunities.tsx`:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        VISTA OPORTUNIDADES (/crm/pipeline)                            │
├────────────────────────────┬────────────────────────────┬──────────────────────────────┤
│  1. Pestaña Prospección   │     2. Pestaña Ofertas     │      3. Pestaña Cortes       │
│     (CrmProspects.tsx)     │     (CrmPipeline.tsx)      │     (PipelineCuts.tsx)       │
├────────────────────────────┼────────────────────────────┼──────────────────────────────┤
│ • Leads sin cliente en BC  │ • 6 Fases abiertas en fila │ • Fotos congeladas semanales │
│ • Fases 0 y 1 (Kanban/Tab) │ • Probabilidad automática  │ • Viernes 18:00h Madrid      │
│ • Vinculación reversible   │ • Nota y motivo obligatorios│ • 8 Informes analíticos      │
│ • Seguimiento local        │ • Ganadas/Perdidas fuera   │ • Comparativa entre cortes   │
│ • Auditoría de cambios     │ • Fuentes BC vs APP        │ • Exportación CSV segura     │
└────────────────────────────┴────────────────────────────┴──────────────────────────────┘
```

> [!NOTE]
## Acceso por rol y pruebas locales — 20/10/2026

Oportunidades ya no depende de un piloto, de un correo concreto ni de `CRM_PROSPECTS_PILOT_ENABLED`. El administrador asigna el acceso desde Gestión de Usuarios mediante los permisos **CRM** y **CRM: Oportunidades** del rol; ambos deben estar concedidos. El backend comprueba estos permisos también para Admin. Si falla la comprobación, la vista muestra un aviso y no abre un pipeline alternativo.

- **Admin:** consulta global, creación de prospectos propios, edición de datos y fases de cualquier prospecto y seguimiento APP de cualquier comercial. No cambia propietarios; archivo, restauración y vinculación de prospectos conservan sus restricciones de propietario.
- **Dirección:** consulta global y creación de cortes manuales; sin edición comercial.
- **Otros roles autorizados, incluido Tester:** prospectos propios y ofertas de su código comercial. Un código comercial ausente no concede acceso global.
- **Business Central:** tablas importadas de solo lectura. Las ofertas se crean en BC. n8n suministra `crm_offer_followups`; la app no prepara ni crea seguimientos automáticamente. Solo las filas `source=APP` admiten edición; las filas BC y las ofertas sin seguimiento permanecen consultables.
- **Automatizaciones:** los cortes programados requieren `CRM_CUTS_AUTOMATION_ENABLED=true`; el calendario de prospectos requiere `CRM_PROSPECTS_OUTLOOK_ENABLED=true`. Son opciones independientes, desactivadas por defecto para las pruebas locales. Los cortes manuales siguen disponibles para Admin y Dirección.

Para probar: reiniciar la aplicación desde `C:\proyectos\webapp_dts`, acceder como Admin y abrir CRM → Oportunidades. Revisar Prospección (crear y editar), Ofertas (filtros, Kanban y tabla) y Cortes. Los cambios manuales desde la app local utilizan la misma base compartida. No se ha desplegado en producción ni cambiado permisos en Supabase.



---

## 2. Pestaña 1: Prospección Comercial (`CrmProspects.tsx`)

### 2.1 Modelo de Datos y Entidad Local
Gestiona prospectos de forma autónoma sin insertar empresas ficticias en la tabla `contacts` o `customers` sincronizadas desde Business Central:
* **Entidad `crm_prospects`:** Identificador UUID estable, `company_name` (obligatorio, normalizado en mayúsculas y sin espacios redundantes para control estricto de unicidad por comercial), `contact_name` (persona de contacto), `contact_job_title` (cargo de la persona de contacto), `email`, `phone`, `notes` (comentarios / observaciones del prospecto), `phase` (0 o 1), `owner_id` (comercial asignado; configurable por `ADMIN`), `version` (control de concurrencia optimista) y fechas de auditoría.
* **Fases del Ciclo de Prospección:**
  * **Fase 0 (Sin aproximación comercial):** Empresas objetivo identificadas o contactos preliminares sin interacción profunda.
  * **Fase 1 (Prospectos interesados):** Cuentas con interlocución técnica/comercial iniciada y necesidad confirmada.
  * **Convertidos:** Prospectos formalmente asociados a un cliente de Business Central.
* **Archivado y Restauración:** Función para archivar prospectos descartados sin eliminarlos de la base de datos (`archived_at`), permitiendo su restauración posterior en su fase original con todo su historial.
* **Asignación de Comercial (Admin):** Los usuarios con rol `ADMIN` disponen de un selector para asignar el comercial (`owner_id`) que gestionará el prospecto desde el momento de su creación o durante su edición, mientras que los comerciales registran prospectos directamente bajo su propia cartera.

### 2.2 Vinculación Reversible con Business Central
* **Sugerencias y Búsqueda en Cartera:** La ficha propone coincidencias inteligentes por nombre, CIF, email o teléfono dentro de los clientes pertenecientes a la cartera del comercial.
* **Formalización sin Oferta Previa:** Permite vincular al prospecto una vez que la empresa se da de alta en Business Central, incluso antes de emitir la primera oferta.
* **Reversibilidad Garantizada:** Si la asociación fue errónea, el comercial puede **deshacer la vinculación**; el prospecto regresa a su fase original y los contadores se recalculan de inmediato, sin desincronizar tablas del ERP.

### 2.3 Actividades y Seguimiento Local (`ProspectActivities.tsx`)
* Registra interacciones comerciales: **Nota interna**, **Tarea**, **Llamada telefónica**, **Visita a cliente**, **Videollamada** y **Visita no programada**.
* Se almacenan en la tabla `crm_prospect_activities`, con soporte de fecha, hora, ubicación física, estado (*Pendiente* / *Realizado*) y conclusiones.
* **Consulta en la Ficha de Cliente:** Al convertirse un prospecto, la ficha compartida del cliente en la WebApp (`CrmContactDetail.tsx` / `CustomerDetailDrawer.tsx`) puede consultar este histórico de prospección sin haber duplicado ni reasignado filas.

---

## 3. Pestaña 2: Pipeline de Ofertas (`CrmPipeline.tsx`)

### 3.1 Seis Fases Secuenciales en Fila Única
El tablero Kanban organiza las ofertas comerciales abiertas en 6 columnas dispuestas en **una única fila continua con desplazamiento horizontal** (evitando distribuciones partidas):

| Fase | Probabilidad Derivada | Definición Comercial |
| :--- | :---: | :--- |
| **Preliminar** | **5%** | Oferta en elaboración inicial o alcance exploratorio |
| **Presentada** | **20%** | Oferta enviada formalmente al cliente para su estudio |
| **Evaluación** | **35%** | Evaluación técnica, comparativas o pruebas en curso |
| **Negociación** | **55%** | Negociación activa de condiciones económicas, plazos o entrega |
| **Aprobación** | **75%** | Pendiente de aprobación presupuestaria o firma por el cliente |
| **Aceptada** | **90%** | Conformidad verbal o pre-adjudicación (permanece viva en el embudo) |

### 3.2 Desacoplamiento de Ganadas y Perdidas
* Las ofertas con resultado **Ganada (100%)** o **Perdida (0%)** ya no ocupan columnas en el Kanban para no saturar la vista operativa del comercial.
* Se gestionan mediante selectores de estado, tablas analíticas y gráficos de causas de cierre.

### 3.3 Regla Estricta de Transición con Nota y Actividad Obligatorias
* Se elimina cualquier opción de «cambio de fase rápido sin nota».
* Al mover una oferta (arrastrándola o desde el drawer), el sistema exige:
  1. **Tipo de Interacción:** Nota, Llamada, Visita, Videollamada, etc.
  2. **Nota Comercial Explicativa:** Justificación detallada del avance o retroceso.
  3. **Fecha de Cierre Previsto:** Estimación temporal actualizada de resolución.
* La mutación se ejecuta como una **transacción atómica en el backend** que guarda la nueva fase, registra la actividad y actualiza la auditoría bajo control de versión.

### 3.4 Catálogo Aprobado de Motivos de Cierre
Al marcar una oferta como Ganada o Perdida, el comercial debe seleccionar obligatoriamente un motivo del catálogo oficial validado en el servidor:

* **Motivos de Oferta Ganada:**
  1. `Precio`
  2. `Servicio`
  3. `Producto`
  4. `Propuesta de valor`
  5. `Afinidad`
* **Motivos de Oferta Perdida:**
  1. `Precio`
  2. `Servicio`
  3. `Financiación / Condiciones de pago`
  4. `Relación cliente`
  5. `Producto`
  6. `Capacidad de producción`
  7. `Compromiso con otros`
  8. `Falta de financiación`
  9. `Documentación / Certificados`

### 3.5 Convivencia de Fuentes (`BC` vs `APP`)
* **Datos Documentales (BC):** Cliente, importes brutos, descuentos, fecha de emisión y estado contable proceden de Business Central (solo lectura).
* **Seguimiento Comercial (APP):** Las ofertas con seguimiento APP almacenan su seguimiento en tablas independientes (`crm_offer_followups` y `crm_offer_activities`), evitando que sincronizaciones automáticas de n8n sobrescriban fases, notas o probabilidades locales.

---

## 4. Pestaña 3: Cortes del Pipeline y Analítica Histórica (`PipelineCuts.tsx`)

### 4.1 Fotografías Temporales Inmutables
* **Corte Automático Semanal:** Ejecutado automáticamente cada **viernes a las 18:00 (hora civil de Madrid)**, capturando en una instantánea inmutable (`RepeatableRead`) todas las ofertas y prospectos en su estado exacto en ese momento.
* **Cortes Manuales Extraordinarios:** Reservados a Administradores y Dirección, requiriendo justificar de forma obligatoria el motivo de la captura.
* **Inmutabilidad y Revisiones:** Un corte publicado (`PUBLISHED`) jamás se altera. Si se produce una corrección operativa, se crea una nueva captura denominada *Revisión* enlazada al corte original mediante `supersedes_id`.

### 4.2 Ocho Informes Analíticos Congelados (`CutAnalytics.tsx`)
Al seleccionar un corte publicado, la pantalla despliega un panel de inteligencia de negocio con 8 informes que operan exclusivamente sobre los datos congelados:
1. **Resumen Ejecutivo:** Total nominal y valor ponderado global de la cartera en esa fecha.
2. **Matriz Mensual:** Cruce matricial de ofertas abiertas distribuidas por mes previsto de cierre y fase de madurez.
3. **Calidad del Dato:** Auditoría de oportunidades sin interlocutor asignado o sin fecha de cierre.
4. **Cierres Vencidos:** Ofertas cuya fecha de cierre prevista expiró respecto a la fecha de captura del corte.
5. **Próximas Acciones:** Compromisos y tareas comerciales pendientes de resolución.
6. **Motivos de Ganadas y Perdidas:** Desglose porcentual y nominal de las causas de adjudicación y descarte.
7. **Evolución de Prospección:** Recuento de empresas en Fase 0, Fase 1 y total de conversiones logradas.
8. **Comparativa Dinámica entre Dos Cortes:** Permite contrastar dos cortes temporales para auditar el movimiento neto: qué ofertas avanzaron de fase, cuáles aumentaron importe, qué oportunidades entraron nuevas y cuáles salieron de cartera.

---

## 5. Fórmulas de KPIs y Reglas de Negocio 📐

* **Base Imponible sin IVA:** Todos los importes (€) mostrados en la vista y en los cortes se calculan siempre sobre la base imponible neta sin impuestos.
* **Valor Ponderado de Cartera:**
  $$\text{Valor Ponderado} = \sum_{\text{ofertas abiertas}} \left( \text{Importe Base} \times \frac{\text{Probabilidad Derivada}}{100} \right)$$
* **Tasa de Cierre Comercial (%):**
  $$\text{Tasa de Cierre} = \frac{\text{Ofertas Ganadas}}{\text{Ofertas Ganadas} + \text{Ofertas Perdidas}} \times 100$$
* **Tratamiento de Importes Desconocidos:** Si una oferta de la aplicación aún no dispone de valoración documental en BC, el sistema la computa como importe desconocido (`—`), sin forzar un cero artificial que distorsione los promedios ni la tasa ponderada.

---

## 6. Control de Acceso (RBAC) y Seguridad por Cartera 👥

| Rol Corporativo | Permisos en Prospección | Permisos en Pipeline de Ofertas | Permisos en Cortes y Analítica |
| :--- | :--- | :--- | :--- |
| **`VENTAS` / `OPERACIONES`** | Crear, editar y gestionar prospectos de **su propia cartera**. Vincular/desvincular clientes propios. | Mover fases de sus ofertas con nota/motivo obligatorio. Ver solo su cartera. | Consultar y exportar fotografías congeladas correspondientes a su ámbito. |
| **`DIRECCION`** | Consulta global de todas las carteras y prospectos de la compañía. | Consulta global de todo el pipeline y métricas consolidadas (sin arrastre de ofertas ajenas). | Consulta y exportación de todos los cortes e informes. Crear cortes manuales con motivo. |
| **`ADMIN`** | Control total. Puede editar datos de prospectos ajenos preservando la autoría original. | Control total del pipeline, parámetros y tipologías. | Consulta global, generación de cortes manuales y reintento de capturas fallidas. |
| **`TESTER`** | Acceso mediante los permisos CRM/Oportunidades; prospectos propios. | Idéntico a rol comercial en su código comercial asignado. | Consulta de cortes según su ámbito autorizado. |

---

## 7. Endpoints API Clave del Backend 🔌

```
# Prospección
GET    /crm-prospects/access                   -> Verifica permisos y alcance del usuario
GET    /crm-prospects?status=&search=&page=    -> Listado paginado de prospectos
GET    /crm-prospects/:id                      -> Detalle con historial de auditoría
POST   /crm-prospects                          -> Alta de prospecto (unicidad por comercial)
PATCH  /crm-prospects/:id                      -> Edición de prospecto con control de versión
POST   /crm-prospects/:id/archive              -> Archivar prospecto
POST   /crm-prospects/:id/restore              -> Restaurar prospecto archivado
GET    /crm-prospects/:id/clients?search=      -> Búsqueda de clientes en cartera para vincular
POST   /crm-prospects/:id/link                 -> Vincular a cliente de Business Central
POST   /crm-prospects/:id/unlink               -> Deshacer vinculación de cliente

# Actividades de Prospección
GET    /crm-prospects/:id/activities           -> Listado de actividades locales del prospecto
POST   /crm-prospects/:id/activities           -> Registrar actividad local
PATCH  /crm-prospects/:id/activities/:actId    -> Completar / editar actividad

# Ofertas y Fases
GET    /quotes/crm                             -> Pipeline de ofertas con fuente resuelta (BC/APP)
GET    /quotes/crm/pilot/close-reasons         -> Catálogo oficial cerrado de motivos de cierre
PATCH  /quotes/:id/followup                    -> Transición de fase con nota, fecha y motivo

# Cortes y Analítica
GET    /crm-pipeline-cuts/access               -> Permisos de creación y consulta de cortes
GET    /crm-pipeline-cuts                      -> Histórico de ejecuciones y estado de cortes
POST   /crm-pipeline-cuts                      -> Creación de corte manual (requiere motivo)
GET    /crm-pipeline-cuts/:id                  -> Detalle de filas congeladas del corte
GET    /crm-pipeline-cuts/:id/reports          -> Los 8 informes analíticos congelados
GET    /crm-pipeline-cuts/:id/compare/:baseId  -> Informe comparativo diferencial entre 2 cortes
GET    /crm-pipeline-cuts/:id/export           -> Descarga CSV segura de la fotografía
```


### Finalización de oferta sin informar (20/10/2026)

En Oportunidades y en la ficha del contacto, la fecha de finalización se muestra vacía cuando el valor recibido es nulo o `0001-01-01` (incluido su formato con hora). Las fechas reales se conservan. Es una corrección de visualización: no modifica los registros importados desde Business Central.


### Embudo de seis columnas ajustado al ancho (20/10/2026)

Las seis fases abiertas se presentan en una sola fila de columnas iguales, sin separación entre columnas ni ancho mínimo que fuerce desplazamiento horizontal. El margen lateral interior se reduce a 4 px y las cabeceras pueden repartir su contenido en varias líneas. Se mantienen los tamaños de letra, los filtros, el arrastre, la vista tabla y los modos claro y oscuro. La altura y el desplazamiento vertical de cada columna se conservan.

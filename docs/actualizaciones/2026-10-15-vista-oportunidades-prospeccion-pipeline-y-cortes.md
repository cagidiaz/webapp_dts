# 🚀 Actualización: Vista Integral de Oportunidades (Prospección, Pipeline de Ofertas y Cortes Analíticos)

**Fecha:** 15 de octubre de 2026  
**Módulos Afectados:** CRM Oportunidades (`/crm/pipeline`), Ficha de Contactos/Clientes (`/crm/contacts`, `/crm/customers`), Modal de Novedades y Briefing, Módulo API de Ofertas y Prospección.  
**Roles Afectados:** `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `TESTER`.

---

## 1. Resumen de la Actualización

Esta versión despliega la renovación integral de la vista de **Oportunidades** (`/crm/pipeline`), transformándola en un centro neurálgico integral que abarca desde la captación preliminar de empresas (*leads*) antes de existir en el ERP, pasando por el seguimiento riguroso del embudo comercial en 6 fases abiertas continuas, hasta la captura de fotografías históricas inmutables (cortes semanales) con 8 paneles analíticos congelados.

La pantalla está orquestada por el componente [`CrmOpportunities.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CrmOpportunities.tsx) que presenta una navegación fluida por pestañas según los permisos y pilotos activos del usuario.

---

## 2. Novedades y Mejoras Implementadas

### 2.1. Arquitectura Tripartita de Oportunidades (`CrmOpportunities.tsx`)
La vista unifica tres pilares comerciales en una sola pantalla:
1. **Pestaña Prospección (`CrmProspects.tsx`):**
   * Gestión autónoma de empresas y leads sin crear registros ficticios en Business Central.
   * Flujo de madurez en dos fases: **Fase 0 (Sin aproximación comercial)** y **Fase 1 (Prospectos interesados)**.
   * Modos de visualización dual: Tablero Kanban interactivo con arrastre (*drag & drop*) y Vista de Tabla con filtros reactivos (`keepPreviousData`).
   * **Vinculación Inteligente y Reversible con Business Central:** Búsqueda en cartera propia de clientes y enlace formal; si se produce un error, la acción es **100% reversible** retornando el prospecto a su estado original con recálculo inmediato.
   * Ficha lateral (*Drawer*) con formulario completo, control de unicidad de razón social por comercial, funciones de **Archivar** y **Restaurar**, e historial de auditoría inmutable.
   * **Actividades Locales (`ProspectActivities.tsx`):** Notas internas, tareas, llamadas, visitas comerciales, videollamadas y visitas no programadas, consultables en la ficha del cliente tras su conversión.

2. **Pestaña Ofertas / Pipeline Renovado (`CrmPipeline.tsx`):**
   * **6 Fases Abiertas en Fila Única Horizontal:** Preliminar (5%), Presentada (20%), Evaluación (35%), Negociación (55%), Aprobación (75%) y Aceptada (90%). Se elimina la vista en filas partidas para máxima ergonomía visual.
   * **Desacoplamiento de Ganadas y Perdidas:** Las ofertas cerradas se gestionan fuera del tablero activo para mantener el foco en la cartera viva.
   * **Probabilidad Derivada en Servidor:** El porcentaje de éxito se calcula de forma automática y estricta según la fase, eliminando ediciones manuales subjetivas.
   * **Transición Estricta con Nota Obligatoria:** Toda modificación de fase exige registrar el tipo de interacción, la justificación comercial y la fecha de cierre prevista mediante transacción atómica en el backend.
   * **Catálogo Oficial de Motivos de Cierre:** Al marcar ofertas como Ganadas o Perdidas, se valida obligatoriamente contra el catálogo corporativo aprobado (Precio, Servicio, Producto, Financiación, etc.).
   * **Convivencia BC / APP:** Datos documentales de Business Central (solo lectura) combinados con seguimiento comercial local con control de versiones.

3. **Pestaña Cortes y Analítica Histórica (`PipelineCuts.tsx` / `CutAnalytics.tsx`):**
   * **Fotografías Temporales Semanales:** Ejecución programada automática cada **viernes a las 18:00 (hora civil de Madrid)**, capturando en snapshot inmutable (`RepeatableRead`) todas las ofertas y prospectos en base imponible neta sin IVA.
   * **Cortes Manuales Auditados:** Exclusivos para Dirección y Administración, requiriendo justificación obligatoria del motivo.
   * **Inmutabilidad y Revisiones:** Los cortes publicados no admiten modificaciones retrospectivas; cualquier corrección genera una revisión enlazada mediante `supersedes_id`.
   * **8 Paneles Analíticos Congelados:**
     1. *Resumen General:* Importe nominal y valor ponderado global.
     2. *Matriz Mensual:* Cruce de ofertas por mes previsto de cierre y fase.
     3. *Calidad de Datos:* Detección de ofertas sin interlocutor o sin fecha.
     4. *Cierres Vencidos:* Oportunidades con fecha prevista anterior al corte.
     5. *Próximas Acciones:* Compromisos y tareas comerciales pendientes.
     6. *Motivos de Ganadas y Perdidas:* Desglose cuantitativo de causas de éxito y descarte.
     7. *Evolución de Prospección:* Madurez de leads y ratio de conversión.
     8. *Comparativa Dinámica entre Cortes:* Auditoría de movimientos netos entre 2 fechas (altas, bajas, avances de fase y variaciones de importe).
   * **Exportación Segura:** Descarga en formato CSV UTF-8 con sanitización frente a inyecciones en hojas de cálculo.

---

### 2.2. Seguridad, Guardas RBAC y Modo Piloto
* **Protección de Rutas (`CrmPermissionGuard.tsx`):** Control de acceso por módulo y permisos en base de datos para `/crm/pipeline`, verificando privilegios granulares antes de montar los componentes.
* **Activación por Piloto:** Si las variables `CRM_PROSPECTS_PILOT_ENABLED` o `CRM_CUTS_AUTOMATION_ENABLED` están desactivadas para un comercial, la aplicación renderiza de forma transparente el Pipeline clásico de ofertas asegurando continuidad operativa al 100%.
* **Aislamiento por Cartera:** Los comerciales (`VENTAS`, `OPERACIONES`) solo visualizan y gestionan las oportunidades y prospectos asignados a su cartera comercial.

---

### 2.3. Integración con el Modal de Novedades y Briefing Diario
* El modal de novedades (`UpdatesModal.tsx`) y su almacén de estado (`updatesStore.ts`) integran ahora las actividades procedentes de prospección comercial (`PROSPECT`), distinguiéndolas visualmente y permitiendo su completado rápido sin perder la coherencia de conclusiones.

---

## 3. Guías Técnicas y Documentación Relacionada
* [Documentación Técnica de la Vista: CRM Pipeline y Oportunidades](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_pipeline.md)
* [Catálogo Central de Vistas de la WebApp](file:///c:/proyectos/webapp_dts/docs/vistas/README.md)
* [Manual de Usuario — Sección 3.1 Oportunidades](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md#31-oportunidades-prospección-pipeline-de-ofertas-y-cortes-históricos)

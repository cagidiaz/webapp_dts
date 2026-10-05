# Actualización: Modificación de Tipos de Eventos en CRM (Reunión Interna y Visita no programada)

**Fecha:** 5 de octubre de 2026  
**Módulos afectados:** CRM (`/crm/contacts`), Panel de Control Comercial (`SalesDashboard.tsx`), Sincronización con Microsoft Exchange / Outlook (`exchange-sync.service.ts`), Exportación de Informes de Actividad (`pdfActivityReport.ts` y `CrmActivityReportModal.tsx`).

---

## 1. Resumen de Cambios

1. **Reunión Interna** (reemplazo de *Reunión Presencial*):
   - Se actualiza la denominación oficial a **"Reunión Interna"** (`REUNION`).
   - En el modal de nueva actividad, se presenta como una opción temporalmente en blanco (*"Esta opción se configurará próximamente para coordinar reuniones internas del equipo"*), deshabilitando campos y previniendo el envío accidental hasta la fase de implementación de reuniones internas.
   - En la sincronización con Microsoft Outlook se retira el contacto de las convocatorias externas.

2. **Visita no programada** (reemplazo de *Evento / Otro*):
   - Se actualiza la denominación oficial a **"Visita no programada"** (`EVENT`).
   - Diseñada específicamente para visitas presenciales espontáneas o prospección ("puerta fría") donde no existe una cita previa acordada por correo electrónico con el contacto.
   - **Particularidad clave:** **No envía ningún correo electrónico ni invitación al contacto**.
   - Queda guardada íntegramente en la base de datos del CRM (historial, timeline, reportes) y sincronizada en el calendario de Outlook del comercial bajo la categoría corporativa `dTS CRM` con el prefijo `[dTS CRM - Visita No Programada]`.
   - Incorpora campo de ubicación con botón para autocompletar la dirección de la empresa cliente con un solo clic.

---

## 2. Archivos Modificados

- `backend/src/modules/exchange-sync/exchange-sync.service.ts`:
  - Lógica de `attendees` limitada exclusivamente a videollamadas (`VIDEOLLAMADA`).
  - Generación de prefijo descriptivo para Outlook: `[dTS CRM - Visita No Programada]` y `[dTS CRM - Reunión Interna]`.
  - Herencia de dirección física de la empresa para eventos tipo `EVENT` si no se especificó otra.
- `frontend/src/pages/crm/components/CrmContactDetail.tsx`:
  - Selector de actividades actualizado con las nuevas etiquetas.
  - Sección en blanco y desactivada para `REUNION`.
  - Banner informativo para `EVENT` indicando que no despacha correos a clientes.
  - Filtros de chips granulares en la pestaña de Eventos (`Visitas no prog.`, `Reuniones Internas`, `Visitas Cliente`).
  - Badges actualizados en la lista del timeline.
- `frontend/src/pages/crm/components/EditActivityModal.tsx`:
  - Actualización de `ACTIVITY_TYPES` para edición de eventos existentes.
- `frontend/src/pages/dashboard/components/SalesDashboard.tsx`:
  - Actualización de `typeLabel` y colores en la agenda semanal.
- `frontend/src/pages/crm/components/CrmActivityReportModal.tsx`:
  - Botones de selección de tipo y etiquetas de listado actualizadas.
- `frontend/src/utils/pdfActivityReport.ts`:
  - Diccionario `TYPE_CONFIG` actualizado para reflejar los nuevos nombres e iconos en exportaciones PDF y Excel.
- `docs/vistas/crm_contactos_mails.md`:
  - Sección 5 agregada con la tabla de tipologías y especificaciones de sincronización.
- `docs/manual-usuario.md`:
  - Sección 3.2 actualizada con la explicación operativa de la visita no programada y reunión interna.

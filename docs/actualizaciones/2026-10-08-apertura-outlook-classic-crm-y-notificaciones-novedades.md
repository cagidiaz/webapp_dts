# Actualización: Apertura Determinista de Outlook Classic en CRM y Filtro Enriquecido de Novedades de la App

**Fecha:** 8 de octubre de 2026  
**Módulos afectados:** CRM Contactos (`/crm/contacts/:id`), Ajustes Generales (`/settings`), Integración con Microsoft Exchange / Outlook (`exchangeSync.ts`), Notificaciones y Novedades (`updatesStore.ts`, `UpdatesModal.tsx`, `TopBar.tsx`).

---

## 1. Resumen de Cambios

### 1.1 Apertura Determinista en Outlook Classic en la Ficha de Contactos
* **Problema resuelto:** Al pulsar el botón *"Abrir en Outlook"* dentro de la pestaña de emails o en el timeline del contacto, la aplicación abría siempre una pestaña del navegador hacia Outlook Web (`outlook.office.com`), incluso si el usuario había seleccionado en Ajustes Generales el modo **Outlook Escritorio (Classic / App)**.
* **Causa:** La función `openExistingEmailInOutlook` evaluaba en primer lugar si el correo tenía `webLink` o `itemId` de Exchange, abriendo la URL web antes de comprobar la preferencia de cliente del usuario (`target === 'desktop'`).
* **Solución implementada:**
  * Evaluación prioritaria de `target === 'desktop'`. Si el usuario tiene configurado Outlook de Escritorio en Ajustes Generales, la WebApp **no abre ninguna pestaña en el navegador**.
  * Construye de forma segura la URI nativa `mailto:` con el destinatario y asunto formateado (`Re: [Asunto original]`) y la ejecuta mediante `triggerMailtoUri`.
  * En Windows esto invoca directamente la aplicación instalada de Microsoft Outlook Classic con el hilo preparado para contestar o revisar.
  * Si el usuario tiene configurado Outlook Web (`target === 'web'`), mantiene la apertura directa del mensaje en Microsoft 365 OWA vía `webLink` o deep link `ItemID`.
  * Sincronización reactiva en tiempo real al montar el componente `CrmContactDetail` y consulta instantánea de `getPreferredOutlookClient()`.

---

### 1.2 Corrección y Enriquecimiento del Sistema de Novedades de la App
* **Problema resuelto:** Los avisos y el listado de novedades de la aplicación se habían dejado de actualizar a partir del 26 de septiembre para varios roles corporativos.
* **Causas identificadas:**
  1. El filtro de roles en `updatesStore.ts` excluía etiquetas clave como `[SALES]`, `[CRM]` y `[ADMIN]` para el rol `DIRECCION`, y `[CRM]` para el rol `VENTAS`.
  2. En commits multi-etiqueta (ej. `[CRM] [SALES]`), la expresión regular solo procesaba el primer corchete.
  3. En desarrollo local (`import.meta.env.DEV`), `fetchUpdates` realizaba un `return` inmediato, dejando los datos en local congelados perpetuamente.
  4. Se había retirado la lógica de auto-apertura del modal ante nuevas versiones en `fetchUpdates`.
* **Solución implementada:**
  * Mapeo completo por rol: `DIRECCION` y `GERENCIA` ahora incluyen `SALES`, `CRM`, `VENTAS`, `ADMIN`, `FINANZAS`, `COMPRAS` y `OPERACIONES`. `VENTAS` incluye `CRM` y `SALES`. `OPERACIONES`, `PRODUCCION` y `TESTER` disponen de sus accesos correspondientes.
  * Soporte global multi-etiqueta con `matchAll(/\[([A-Z]+)\]/g)`.
  * Filtrado limpio de mensajes técnicos (`fix:`, `chore:`, `ci:`, `test:`, `docs:`, `merge`).
  * Restauración de la apertura automática del modal una vez por sesión ante nuevos despliegues de versión (`!hasSeenLatest`).
  * Gestión de caché inteligente en desarrollo local (30 minutos) que permite consultar GitHub sin saturar la cuota de la API.

---

## 2. Archivos Modificados

* `frontend/src/api/exchangeSync.ts`:
  * Prioridad absoluta a `target === 'desktop'` en `openExistingEmailInOutlook` ejecutando `triggerMailtoUri`.
* `frontend/src/pages/crm/components/CrmContactDetail.tsx`:
  * Sincronización de `outlookTarget` al montar con `getPreferredOutlookClient()`.
  * Invocación de `openExistingEmailInOutlook` y `openInOutlook` con `getPreferredOutlookClient()` en tiempo real.
* `frontend/src/store/updatesStore.ts`:
  * Filtrado exhaustivo por rol con etiquetas comerciales, CRM y administrativas.
  * Regex multi-etiqueta.
  * Caché de desarrollo y auto-apertura ante nuevas versiones.
* `docs/vistas/03_crm/crm_contactos_mails.md`:
  * Actualización de la sección 3.5 con la especificación de apertura en Outlook Classic vs Web.
* `docs/vistas/06_administracion_configuracion/ajustes_generales.md`:
  * Actualización del alcance global de la preferencia de Outlook de escritorio.
* `docs/manual-usuario.md`:
  * Actualización de las secciones 3.3 y 6.1.

# 🚀 Actualización: Identidad Estable de Correos (`ImmutableId`), Estados Transitorios de Envío y Seguridad RBAC en el Add-in de Outlook

**Fecha:** 15 de octubre de 2026  
**Módulos Afectados:** Complemento de Outlook (`/outlook-addin`), Ficha de Contactos y Pestaña de Emails (`/crm/contacts/:id`), Módulo API de Exchange Sync, Esquema de Actividades del CRM.  
**Roles Afectados:** `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `TESTER`.

---

## 1. Resumen de la Actualización

Esta versión introduce una modernización estructural en la integración con **Microsoft 365 y Outlook**, garantizando dos pilares fundamentales:
1. **Identidad Inmutable Estable (`ImmutableId`):** Los correos registrados o sincronizados dejan de depender de identificadores volátiles (como el `ewsId` de Office.js) o heurísticas aproximadas (asunto, remitente y fecha). Mediante Microsoft Graph API, cada mensaje se resuelve hacia un identificador inalterable que persiste incluso cuando el correo se traslada entre carpetas del buzón.
2. **Seguridad y Confidencialidad por Cartera Comercial en el Add-in:** Todas las rutas del complemento de Outlook (`/outlook-addin/*`) exigen ahora token de sesión JWT y restringen la búsqueda de clientes, contactos y ofertas al código de comercial asignado (`customerScope`), impidiendo el acceso a cuentas ajenas. Además, el panel gestiona la autenticación embebida mediante [`OutlookAddinSession.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/outlook-addin/OutlookAddinSession.tsx), evitando que una expiración de sesión expulse al usuario fuera del panel de Outlook.

---

## 2. Novedades y Mejoras Implementadas

### 2.1. Contrato de Identidad Estable de Correos (`crm_activities`)
Se incorpora en el modelo de datos de actividades del CRM un esquema formal de 7 campos para rastreo determinista en Microsoft 365:
* `exchange_tenant_id`: Identificador del inquilino verificado de Microsoft 365.
* `exchange_mailbox_id`: Identificador del buzón asociado al comercial.
* `exchange_immutable_id`: Identificador inmutable devuelto por Microsoft Graph.
* `exchange_item_id_type`: Tipología original de la clave (`ewsId` / `restImmutableEntryId`).
* `exchange_internet_message_id`: Encabezado RFC 822 (`InternetMessageId`).
* `exchange_resolution_status`: Estado determinista de la referencia (`resolved`, `pending`, `not_found`, `access_denied`, `temporary_error`).
* `exchange_resolved_at`: Timestamp de verificación.

### 2.2. Traducción Determinista mediante Graph API
* El nuevo servicio [`EmailIdentityService`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/email-identity.service.ts) transforma en servidor los identificadores volátiles devueltos por el Add-in mediante `POST /me/translateExchangeIds`.
* Se eliminan por completo las asociaciones aproximadas por coincidencia de asunto o fecha, impidiendo que hilos cruzados con el mismo remitente sobrescriban actividades distintas.

### 2.3. Ciclo de Borradores y Estados Transitorios de Envío Directo
* **Cabecera Inmutable:** La creación de borradores desde el CRM solicita explícitamente `Prefer: IdType="ImmutableId"`.
* **Estados Transitorios de Envío:**
  * `draft`: Borrador registrado localmente en espera de despacho en Outlook.
  * `send_unconfirmed`: Petición de envío cursada a Graph; la interfaz muestra el badge de advertencia `Envío sin confirmar: revisar Outlook` para prevenir reenvíos accidentales ante latencias de red.
  * `sent_pending`: Entrega aceptada por Microsoft 365 mientras se archiva en "Elementos enviados" y se obtiene la referencia inmutable definitiva (`Referencia de envío pendiente`).
  * `synced`: Identidad resuelta (`resolved`) y confirmada.
* **Sincronización Silenciosa por Lotes:** La ficha del contacto reconcilia en segundo plano lotes de hasta 25 referencias pendientes rotadas por `exchange_last_synced_at`, evitando barridos masivos de buzón.

### 2.4. Seguridad Integral y Cartera Comercial en el Add-in (`OutlookAddinAccessService`)
* **Autenticación Obligatoria:** Todas las operaciones del Add-in están protegidas con el guardián de autenticación JWT `@UseGuards(JwtAuthGuard)`.
* **Aislamiento por Cartera (`customerScope`):** Los roles comerciales (`VENTAS`, `OPERACIONES`) solo pueden buscar, ver y asociar clientes, personas de contacto y ofertas comerciales que coincidan con su `salesperson_code`.
* **Validación de Integridad:** Se valida en backend que el contacto pertenezca a la empresa elegida y que la cotización pertenezca tanto al cliente como a la cartera autorizada.

### 2.5. Gestión Embebida de Sesión en Outlook (`OutlookAddinSession.tsx`)
* Ante respuestas 401 en `/outlook-addin/*`, el cliente API emite un evento personalizado `dts:outlook-session-expired`.
* El contenedor [`OutlookAddinSession.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/outlook-addin/OutlookAddinSession.tsx) captura la expiración y despliega un formulario de inicio de sesión con branding corporativo dTS dentro del propio panel lateral, evitando redirigir a `/login` en la ventana principal del navegador.
* **Bloqueo de Registro en Demostración:** Si el Add-in se abre en un navegador convencional sin el contexto de Office.js, el sistema bloquea el registro real de correos para evitar crear registros ficticios en la base de datos de producción.

---

## 3. Verificación de Compilación y Calidad

* **Frontend (`tsc -b && vite build`):** 0 errores, 0 advertencias.
* **Backend (`nest build`):** 0 errores de compilación TypeScript.
* **Pruebas Automatizadas:** Suites completas de pruebas unitarias y de integración para identidad de correos, contratos de datos y control de acceso RBAC.
* **Documentación Actualizada:**
  * [`docs/vistas/03_crm/crm_contactos_mails.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md)
  * [`docs/vistas/03_crm/complemento_outlook_crm.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/complemento_outlook_crm.md)
  * [`docs/vistas/README.md`](file:///c:/proyectos/webapp_dts/docs/vistas/README.md)
  * [`docs/manual-usuario.md`](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md)
  * [`docs/guia-integracion-outlook-exchange.md`](file:///c:/proyectos/webapp_dts/docs/guia-integracion-outlook-exchange.md)

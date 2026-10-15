# 🚀 Actualización: Resolución Dinámica para Apertura en Outlook Web y Priorización Horaria de Exchange

**Fecha:** 15 de octubre de 2026  
**Módulos Afectados:** Ficha de Contactos y Pestaña de Emails (`/crm/contacts/:id`), Timeline de Actividades, Módulo API de Exchange Sync, Apertura Web de Outlook.  
**Roles Afectados:** `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `TESTER`.

---

## 1. Resumen de la Actualización

Esta versión despliega la **Fase 3 del plan de apertura híbrida de correos**, permitiendo abrir cualquier correo archivado en el CRM directamente en su ubicación real de **Microsoft Outlook Web (M365)** mediante un resolvedor dinámico y determinista en backend. El sistema localiza el mensaje exacto incluso si el comercial lo ha movido a subcarpetas personales o archivadores dentro de su buzón.

Adicionalmente, se consolida la **priorización estricta de la hora de Exchange** en la presentación y ordenación cronológica de actividades tipo `EMAIL`, garantizando que la hora visible corresponda con el momento exacto en que Microsoft 365 despachó o recibió el mensaje.

---

## 2. Novedades y Mejoras Implementadas

### 2.1. Resolvedor Dinámico de Apertura Web (`POST /api/exchange-sync/emails/:activityId/resolve`)
* **Endpoint Seguro Autenticado:** Implementado en [`EmailOpenController`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/email-open.controller.ts) y [`EmailOpenService`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/email-open.service.ts). El cliente envía únicamente el ID de la actividad; el servidor verifica token JWT, permisos RBAC de CRM/Contactos y cartera comercial (`customerScope`).
* **Blindaje de Buzón Personal:** Se verifica que el buzón de Microsoft 365 pertenezca inequívocamente al usuario autenticado (se prohíbe la apertura de buzones ajenos incluso para roles con visión global como `ADMIN` o `DIRECCION`).
* **Búsqueda por Identidad Inmutable (`ImmutableId`):** Consulta a Microsoft Graph mediante el identificador estable inmutable. Si el correo fue movido de carpeta, se recupera su nuevo enlace web (`webLink`) en tiempo real.
* **Fallback por Cabecera RFC 822 (`InternetMessageId`):** Si el ID inmutable no está disponible, el sistema localiza el correo por su identificador de Internet dentro del buzón verificado.
* **Gestión de Copias Múltiples:** Si existen varias copias del mensaje en el buzón (máximo 5), el backend devuelve las ubicaciones (carpeta y fecha) para que el comercial seleccione explícitamente cuál desea abrir mediante un modal emergente.
* **Control de Concurrencia:** Máximo 2 resoluciones simultáneas por usuario con reutilización automática de consultas idénticas en vuelo (*coalesce*).

### 2.2. Aislamiento y Prevención de Bloqueo de Ventanas (`resolvedEmailWindow.ts`)
* **Pre-apertura Síncrona Segura:** La utilidad [`openResolvingEmailWindow`](file:///c:/proyectos/webapp_dts/frontend/src/utils/resolvedEmailWindow.ts) abre una pestaña en blanco en el evento de clic del usuario para impedir que Chrome o Edge la bloqueen como popup indeseado mientras Graph resuelve la URL.
* **Aislamiento de Contexto:** Se neutraliza de inmediato el acceso al objeto origen mediante `window.opener = null`.
* **Validación de Destino y Cierre Limpio:** Solo se permite navegar a dominios oficiales HTTPS de Outlook (`outlook.office.com`, `outlook.office365.com`). Si la resolución falla o requiere selección de copias, la ventana temporal se cierra de forma automática y transparente, mostrando el aviso correspondiente en la ficha del CRM.

### 2.3. Priorización Estricta de la Hora Real de Exchange en `CrmContactDetail.tsx`
* Se refinó la condición de cómputo de hora en [`CrmContactDetail.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CrmContactDetail.tsx#L1032):
  ```typescript
  if (upperType === 'EMAIL' || (!computedTime && act.created_at)) {
    const timeSource = (upperType === 'EMAIL' && (act.attendees?.sentDate || act.attendees?.receivedDateTime)) || act.created_at;
    ...
  }
  ```
* Para cualquier actividad de tipo `EMAIL`, se extrae prioritariamente la hora de `attendees.sentDate` (enviados) o `attendees.receivedDateTime` (recibidos), sobrescribiendo cualquier residuo previo en `time_scheduled`. Esto garantiza que los correos intercambiados en un mismo día se ordenen con precisión de segundos y muestren su hora real de llegada o salida.

---

## 3. Verificación de Calidad y Pruebas

* **Frontend (`tsc -b && vite build`):** 0 errores, 0 advertencias.
* **Backend (`nest build`):** 0 errores de compilación TypeScript.
* **Pruebas Automatizadas (`npm test`):** 255 pruebas superadas exitosamente en el backend (incluyendo suites completas de `email-open.service.spec.ts` y `email-open.http.spec.ts` con validación de tokens JWT, control de cartera comercial, rechazo de buzones ajenos y concurrencia).
* **Documentación Actualizada:**
  * [`docs/vistas/03_crm/crm_contactos_mails.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md)
  * [`docs/manual-usuario.md`](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md)
  * [`docs/guia-integracion-outlook-exchange.md`](file:///c:/proyectos/webapp_dts/docs/guia-integracion-outlook-exchange.md)

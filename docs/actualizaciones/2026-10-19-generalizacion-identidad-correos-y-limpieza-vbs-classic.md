# 🚀 Actualización: Generalización de Identidad Estable de Correos, Transición Definitiva de Outlook Classic y Limpieza de VBS

**Fecha:** 19 de octubre de 2026  
**Módulos Afectados:** CRM Contactos (`/crm/contacts/:id`), Ajustes Generales (`/settings`), Módulo API de Exchange Sync y Outlook Classic, Complemento de Outlook (`/outlook-addin`).  
**Roles Afectados:** `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `TESTER`.

---

## 1. Resumen de la Actualización

Esta versión consolida la arquitectura definitiva de integración con **Microsoft Outlook y Exchange**, completando dos hitos clave:
1. **Generalización de la Identidad Inmutable:** Se retira la restricción por lista blanca de correos (`CRM_EMAIL_IDENTITY_EMAILS`), activando de forma homogénea para todos los usuarios comerciales el contrato de datos inmutable (`ImmutableId`), resolución determinista y control de acceso RBAC.
2. **Retirada de Scripts VBS/BAT Antiguos de Outlook Classic:** Se eliminan de forma permanente los instaladores y manejadores por lotes (`.bat`, `.vbs`, `.reg`) en favor del nuevo protocolo nativo dTS con verificación criptográfica, desacoplando completamente el navegador de ejecuciones inseguras en Windows y simplificando la vista de Ajustes Generales.
3. **Paquete de Recuperación de Estructura SQL:** Se documenta e incorpora el conjunto ordenado de scripts de diagnóstico y recuperación en `backend/prisma/proposals/recuperacion-2026-10-19/` para auditoría y restauración segura de Supabase.

---

## 2. Novedades y Mejoras Implementadas

### 2.1. Identidad Estable Universal
* El servicio `EmailIdentityService` procesa de forma universal la traducción y validación de `ImmutableId` para todos los usuarios con sesión de Microsoft 365, eliminando la configuración de settings condicionales.
* Comprobación rigurosa de pertenencia de buzón personal en `OutlookGeneralAccessService`, garantizando que ningún usuario acceda a buzones ajenos independientemente de su rol.

### 2.2. Limpieza de Instaladores y Flujo Nativo
* Supresión de archivos obsoletos en `frontend/public/downloads/outlook-handler/` (`Desinstalar_Outlook_dTS.bat`, `Instalar_Outlook_dTS.bat`, `configurar_outlook_dts.reg`, `outlook_handler.vbs`).
* Limpieza en `SettingsPage.tsx`: se retiran los banners de descarga de configuradores por lotes y se unifica la selección de cliente preferido (Web vs Classic).
* Depuración de utilidades heredadas en `frontend/src/utils/outlookInstaller.ts`.

### 2.3. Documentación y Manuales Actualizados
* Guías técnicas actualizadas reflejando la arquitectura actual en:
  * [`docs/vistas/03_crm/crm_contactos_mails.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md)
  * [`docs/vistas/03_crm/complemento_outlook_crm.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/complemento_outlook_crm.md)
  * [`docs/vistas/06_administracion_configuracion/ajustes_generales.md`](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/ajustes_generales.md)
  * [`docs/manual-usuario.md`](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md)
  * [`docs/guia-integracion-outlook-exchange.md`](file:///c:/proyectos/webapp_dts/docs/guia-integracion-outlook-exchange.md)
  * [`docs/manual-instalacion-addin-outlook.md`](file:///c:/proyectos/webapp_dts/docs/manual-instalacion-addin-outlook.md)

---

## 3. Verificación de Compilación y Calidad

* **Frontend (`tsc -b && vite build`):** 0 errores, 0 advertencias.
* **Backend (`nest build`):** 0 errores de compilación TypeScript.
* **Pruebas Automatizadas Jest (`npm test`):** Todas las suites superadas con éxito.

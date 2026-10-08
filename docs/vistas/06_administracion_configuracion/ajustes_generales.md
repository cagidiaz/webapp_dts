# ⚙️ Vista: Ajustes Generales y Conexión Outlook (SettingsPage)

## 1. Propósito y Descripción General
La vista de **Ajustes Generales** es el panel de configuración personal y del sistema donde los usuarios configuran su integración con **Microsoft 365 / Exchange** y eligen su preferencia de apertura para correos electrónicos en **Outlook** (Cliente de Escritorio Clásico vs. Outlook Web).

Esta configuración determina cómo la aplicación interactúa con el correo electrónico en todas las demás secciones del CRM (Ficha de Contacto, Timeline de Actividades, Bandeja de Mails y Lista General de Contactos).

---

## 2. Ficheros y Rutas del Código
* **Componente Frontend:** [`frontend/src/pages/settings/SettingsPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/settings/SettingsPage.tsx)
* **Módulo de Integración API:** [`frontend/src/api/exchangeSync.ts`](file:///c:/proyectos/webapp_dts/frontend/src/api/exchangeSync.ts)
* **Backend NestJS (Módulo Exchange):** [`backend/src/modules/exchange-sync/`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/)
* **Ruta en la App:** `/settings`
* **Permiso RBAC en BD:** `/settings`

---

## 3. Características y Funcionalidades Principales

### 3.1. Selección de Cliente de Outlook Predeterminado
El usuario puede escoger entre dos modalidades de trabajo mediante selectores visuales:
1. **Outlook Classic / Escritorio (Recomendado para Windows):**
   * Abre directamente la aplicación local instalada de Microsoft Outlook en Windows.
   * Utiliza el protocolo seguro de sistema operativo `mailto:` mediante un enlace invisible inyectado en el DOM (`triggerMailtoUri`) para evitar abortos de navegación en React.
   * Rellena automáticamente los destinatarios (`to`), copia (`cc`), asunto (`subject`) y cuerpo (`body`).
   * **Alcance Universal en la WebApp:** Aplica tanto a la redacción de nuevos correos como al botón *"Abrir en Outlook"* de correos existentes en la pestaña de emails y en el timeline del CRM, garantizando que el usuario de Classic nunca vea pestañas innecesarias del navegador abiertas hacia Outlook Web.
2. **Outlook Online / Web (Navegador):**
   * Si la cuenta de Microsoft 365 está vinculada por OAuth, genera un borrador en segundo plano en la nube mediante **Microsoft Graph API** (`/me/messages`) y abre la ventana web directamente en el mensaje creado (`webLink`).
   * Si la cuenta no está vinculada o el borrador remoto falla, utiliza un enlace profundo canónico optimizado:  
     `https://outlook.office.com/mail/deeplink/compose?to=...&cc=...&subject=...&body=...`
   * Para evitar que el bloqueador de ventanas emergentes de Chrome/Edge impida abrir la pestaña tras una llamada asíncrona, el sistema pre-abre una pestaña en blanco en el evento de clic del usuario (`window.open('about:blank')`) y redirige su ubicación al finalizar la API.
   * Para correos existentes, abre la vista de lectura directa en la nube mediante `webLink` o `ItemID`.

> **Persistencia Local:** La elección se guarda de inmediato en `localStorage` bajo la clave `dts_outlook_preferred_client` y muestra una notificación visual de guardado instantáneo sin recargar la página. Todas las vistas del CRM consultan en tiempo real este ajuste.

### 3.2. Botón de Verificación y Prueba de Conexión
* Permite verificar la configuración en tiempo real haciendo clic en **"Probar apertura de correo en Outlook"**.
* Abre un correo borrador de prueba con el cliente seleccionado para validar que el sistema operativo o el navegador responden adecuadamente.

### 3.3. Vinculación OAuth con Microsoft 365 (Microsoft Graph)
* **Flujo de Conexión:**
  1. El usuario pulsa **"Conectar con Microsoft 365"**.
  2. El frontend consulta `GET /exchange-sync/connect-url` con la URL de retorno (`/settings`).
  3. El usuario es redirigido a la pantalla oficial de login y consentimiento de Microsoft Azure AD / Entra ID.
  4. Tras autorizar, Microsoft devuelve un código temporal en la URL (`/settings?code=...`).
  5. El componente captura el código y ejecuta `POST /exchange-sync/callback`, intercambiándolo por tokens de acceso y refresco cifrados en la base de datos.
* **Permisos Solicitados (Scopes de Microsoft Graph):**
  * `offline_access` (Tokens de refresco continuos)
  * `Mail.ReadWrite` (Creación de borradores y lectura de correos)
  * `Mail.Send` (Envío de correos desde la cuenta del usuario)
  * `Calendars.ReadWrite` (Sincronización de eventos de agenda del CRM)
  * `User.Read` (Nombre, correo corporativo y foto de perfil)

### 3.4. Estado de la Cuenta y Sincronización Manual
* **Estado en Tiempo Real:** Muestra si el buzón está conectado, el correo corporativo vinculado y la fecha/hora de la última sincronización automática.
* **Sincronización Inmediata:** Botón **"Sincronizar ahora"** que activa el job de sincronización de correos entrantes/salientes y reuniones en segundo plano.
* **Desconexión Segura:** Botón para revocar los tokens y desvincular la cuenta corporativa de forma instantánea.

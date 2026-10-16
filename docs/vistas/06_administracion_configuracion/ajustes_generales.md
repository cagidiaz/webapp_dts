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
1. **Outlook Classic / Escritorio:**
   * La preferencia se conserva, pero la apertura exacta del piloto se instala y vincula desde `/outlook-classic` con el ZIP `OutlookClassic.zip`. El paquete contiene BAT y componente Windows sin firma Authenticode; se ejecuta con el usuario habitual, sin administrador.
   * El nuevo protocolo `dts-outlook` recibe una solicitud temporal y verifica el mensaje en el almacén del buzón antes de mostrarlo. La interfaz espera una confirmación autenticada del componente; descargar el ZIP o perder el foco no prueba instalación ni apertura.
   * El configurador de un clic de `/settings` y el protocolo `dts-mail` siguen siendo el flujo heredado para usuarios fuera del piloto y acciones todavía no sustituidas. No equivalen al nuevo instalador y no garantizan localizar correos después de moverlos.
   * Para la redacción de correos nuevos se conserva el flujo existente. El nuevo componente de fase 4 ejecuta únicamente apertura de mensajes.
2. **Outlook Online / Web (Navegador):**
   * Si la cuenta de Microsoft 365 está vinculada por OAuth, genera un borrador en segundo plano en la nube mediante **Microsoft Graph API** (`/me/messages`) y abre la ventana web directamente en el mensaje creado (`webLink`).
   * Si la cuenta no está vinculada o el borrador remoto falla, utiliza un enlace profundo canónico optimizado:  
     `https://outlook.office.com/mail/deeplink/compose?to=...&cc=...&subject=...&body=...`
   * Para evitar que el bloqueador de ventanas emergentes de Chrome/Edge impida abrir la pestaña tras una llamada asíncrona, el sistema pre-abre una pestaña en blanco en el evento de clic del usuario (`window.open('about:blank')`) y redirige su ubicación al finalizar la API.
   * Para los correos del piloto, la apertura resuelve la identidad en backend y obtiene el `webLink` actual; las copias ambiguas requieren selección del usuario.

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

## Equipos vinculados y activación del piloto (15/10/2026)

La página `/outlook-classic` conserva sesión CRM mediante `OutlookAddinSession`. Permite descargar el paquete cuando existe, introducir el código mostrado por el componente Windows y revocar equipos propios. Los permisos se verifican en backend y no dan acceso a buzones ajenos para Admin o Dirección. La selección del dispositivo se recuerda en el navegador; la clave privada permanece cifrada en el equipo.

La activación requiere `CRM_OUTLOOK_CLASSIC_ENABLED=true`, además del piloto de identidad habilitado para la cuenta y los permisos actuales de acceso CRM. El piloto de pruebas se mantiene limitado a `gdiaz@dtsinstruments.com`; habilitar Classic no amplía por sí solo esa lista.

Las dos tablas de Classic ya están creadas y comprobadas en Supabase. El paquete está generado en la carpeta local; su despliegue y la prueba completa instalada siguen pendientes de confirmación. El botón de prueba de borrador en Ajustes verifica el flujo de composición y no acredita apertura exacta ni vinculación del nuevo componente.

La distribución interna carece de certificado de editor. Windows puede mostrar avisos o aplicar sus políticas. No se cambian antivirus, certificados ni políticas de seguridad. Las firmas de solicitudes y el cifrado DPAPI siguen activos.

Véanse [instalación y solución de incidencias](../../manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic) y [activación técnica](../../propuestas/2026-10-15-fase-4-apertura-exacta-classic.md).

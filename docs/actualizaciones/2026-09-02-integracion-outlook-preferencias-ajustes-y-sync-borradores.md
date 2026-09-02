# 🚀 Actualización: Integración de Outlook, Pantalla de Ajustes y Sincronización Automática de Borradores

**Fecha:** 2 de septiembre de 2026  
**Módulos Afectados:** CRM Comercial, Ajustes Generales, Integración Exchange / Microsoft Graph  
**Versión:** v5.8  

---

## 1. ⚙️ Nueva Pantalla de Ajustes y Preferencias (`/settings`)
* **Ubicación y Acceso Universal**:
  * Acceso desde el menú lateral en `Configuración > Ajustes Generales`.
  * Habilitado para todos los roles comerciales y operativos (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`).
* **Selector de Cliente de Outlook Predeterminado**:
  * Elección entre **💻 Outlook de Escritorio (App Windows / Mac)** y **🌐 Outlook Web (Microsoft 365 en navegador)**.
  * Memorización persistente en el navegador local (`localStorage`).
  * Botón de prueba rápida para validar la apertura en Outlook.
* **Gestión de Microsoft Graph (OAuth 2.0)**:
  * Diagnóstico del estado de la conexión con el buzón corporativo de Microsoft 365.
  * Visualización del correo conectado, servicios activos y fecha de última sincronización.
  * Botones para conectar, forzar sincronización manual o desconectar la cuenta.

---

## 2. 📧 Flujo de Borradores y Apertura en Outlook
* **Apertura Directa en la Bandeja de Borradores**:
  * Al pulsar *"Abrir y Preparar en Outlook"*, se abre directamente la **Bandeja de Borradores de Outlook Web** (`https://outlook.office.com/mail/drafts`).
* **Reutilización Inteligente de Pestaña**:
  * Configuración de identificador de pestaña dedicado (`dts_outlook_web`) para evitar duplicación de pestañas al interactuar repetidamente con Outlook.
* **Apertura de Correos Enviados**:
  * Al pulsar *"Abrir en Outlook"* sobre un correo enviado, abre directamente el mensaje exacto en Outlook Web mediante su enlace canónico (`webLink`) o la carpeta de Elementos Enviados (`sentitems`).

---

## 3. ⚡ Sincronización Automática e Inteligente de Borradores
* **Auto-sincronización Silenciosa al Entrar al Contacto**:
  * Al entrar a la ficha de un contacto comercial o abrir las pestañas *Emails* / *Timeline*, si existen correos con estado `📝 Borrador en Outlook`, el sistema lanza una sincronización en segundo plano con Microsoft Graph.
  * Si el comercial envió el correo desde Outlook, se actualiza automáticamente el texto final modificado, el nuevo identificador y el estado a `✓ Sincronizado`.
* **Eliminación de Ingesta Masiva No Deseada**:
  * La sincronización se restringe exclusivamente a los borradores generados por la app, garantizando que no se capturen correos eliminados, spam o cadenas externas.

---

## 4. 🧹 Limpieza Visual del CRM
* El banner superior de Microsoft Exchange ahora se oculta automáticamente cuando la cuenta ya está conectada, mostrando un aviso informativo únicamente si la cuenta está sin conectar.

---

*dTS Instruments — Registro de Actualizaciones del Sistema.*

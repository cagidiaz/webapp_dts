# 🚀 Actualización: Apertura Nativa en Outlook Classic (`dts-mail://`), Asistente en Ajustes y Menú de Acciones Secundarias

**Fecha:** 9 de octubre de 2026  
**Módulos Afectados:** CRM Contactos (`/crm/contacts/:id`), Ajustes Generales (`/settings`), Módulo API de Exchange Sync, Matriz de Clientes CRM.  
**Roles Afectados:** Todos (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`).

---

## 1. Resumen de la Actualización

Esta versión introduce una integración de nivel nativo con la aplicación de escritorio **Microsoft Outlook Classic (`OUTLOOK.EXE`)** para superar las restricciones de seguridad del navegador web y abrir correos archivados directamente en modo lectura real (con sus adjuntos, cabeceras y botones de responder nativos), sin abrir ventanas de nuevo correo ni pestañas innecesarias.

La solución se complementa con un **menú desplegable de acciones secundarias** en cada correo del CRM, un **asistente de descarga en 1 clic** en Ajustes Generales y un **mecanismo de fallback inteligente**.

---

## 2. Novedades y Mejoras Implementadas

### 2.1. Protocolo Nativo de Windows (`dts-mail://` v2.1)
* **Apertura Real en Modo Lectura en Primer Plano:** Mediante el protocolo `dts-mail://` y la interfaz COM MAPI de Office, el sistema localiza en milisegundos el correo en la Bandeja de Entrada o en Elementos Enviados y ejecuta `item.Display` trayendo la ventana de Outlook al frente.
* **Blindaje contra Elementos no-Mail (v2.1):** Acceso seguro y aislado a propiedades de cada elemento ignorando convocatorias de calendario (`MeetingItem`) o avisos del sistema (`ReportItem`) para eliminar excepciones `800A01B6`.
* **Búsqueda Global de Respaldo:** Si el correo fue movido a archivadores personales o PSTs, el script ejecuta automáticamente una búsqueda global instantánea en todas las carpetas (`olSearchScopeAllFolders = 1`).
* **Instalador Transparente Libre de Falsos Positivos:** El archivo `.bat` escribe el manejador VBS en texto plano limpio UTF-8, eliminando scripts PowerShell en Base64 para garantizar 0 alertas de Windows Defender o SmartScreen.
* **Instalación sin Permisos de Administrador:** El manejador se registra en `HKEY_CURRENT_USER\Software\Classes\dts-mail`, permitiendo que cualquier comercial active el servicio en su ordenador en 5 segundos.

### 2.2. Asistente en Ajustes Generales (`/settings`)
* **Descarga en 1 Clic:** Al seleccionar *"Outlook de Escritorio (Classic)"*, se muestra un banner interactivo con el botón *"Descargar Configurador (1 Clic)"*, que genera el archivo autocontenido `Instalar_Outlook_dTS.bat`.
* **Guía Visual en 2 Pasos:** Explicación ilustrada de cómo ejecutar el archivo y marcar *"Permitir siempre"* en el navegador.
* **Opción de Desinstalación:** Enlace directo para descargar `Desinstalar_Outlook_dTS.bat` y restaurar el equipo a su estado original en cualquier momento.

### 2.3. Menú de Acciones Secundarias en Correos del CRM
Junto al botón principal de Outlook en la pestaña de Emails y en el Timeline de Actividades, se incorpora un selector desplegable (`...`) con 5 opciones avanzadas:
1. 💻 **Abrir en Outlook Classic:** Fuerza la apertura en la aplicación de escritorio.
2. 🌐 **Abrir en Outlook Web (M365):** Abre en una pestaña del navegador con Microsoft 365.
3. ↩️ **Responder en Outlook:** Abre la ventana citando el correo y destinatarios listos para redactar.
4. 🔍 **Buscar conversación completa:** Activa la búsqueda en Outlook de todo el hilo de mensajes del contacto.
5. 📋 **Copiar datos de búsqueda:** Copia la sintaxis `de:<email> asunto:"<asunto>"` al portapapeles con feedback visual *"¡Copiado!"*.

### 2.4. Detección y Fallback Inteligente
* Si un comercial pulsa el botón de escritorio en un equipo nuevo donde aún no ha ejecutado el archivo de configuración, la WebApp detecta si la llamada no fue atendida y despliega un diálogo asistido:
  * *"Abrir en Outlook Web ahora"* (solución instantánea).
  * *"Descargar Configurador de Windows (1 Clic)"*.

### 2.5. Corrección Preventiva de Sintaxis de Estilo Tailwind CSS v4
* Se normalizaron todas las clases de gradientes arbitrarios (`bg-gradient-to-r` ➔ `bg-linear-to-r`, `bg-gradient-to-br` ➔ `bg-linear-to-br`) y colores hexadecimales (`[#00B0B9]` ➔ `dts-secondary`) en `SettingsPage.tsx`, `CrmContactDetail.tsx`, `CustomerRelationshipMatrix.tsx`, `SalesDashboard.tsx` y `ExchangeStatusBanner.tsx`, garantizando 0 advertencias de linter y compatibilidad total con Vite 8.

### 2.6. Robustez y Compatibilidad CRLF en Windows cmd.exe
* Se forzó la conversión estricta de saltos de línea a Windows CRLF (`\r\n`) en la generación dinámica de blobs de descarga en el navegador (`outlookInstaller.ts`) y en los archivos `.bat` estáticos, eliminando errores de lectura de buffers en `cmd.exe`.
* Se añadió directiva `*.bat text eol=crlf` en `.gitattributes` para blindar los scripts en el control de versiones.

---

## 3. Verificación y Calidad
* **Compilación Frontend (`tsc -b && vite build`):** 0 errores, 0 advertencias.
* **Compilación Backend (`nest build`):** 0 errores.
* **Manuales de Usuario y Vistas:** Actualizados en [`docs/manual-usuario.md`](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md) (v6.5), [`docs/vistas/03_crm/crm_contactos_mails.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md) y [`docs/vistas/06_administracion_configuracion/ajustes_generales.md`](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/ajustes_generales.md).

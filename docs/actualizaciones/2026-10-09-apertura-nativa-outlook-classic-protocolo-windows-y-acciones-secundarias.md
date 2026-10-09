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

### 2.1. Protocolo Nativo de Windows (`dts-mail://`)
* **Apertura Real en Modo Lectura:** Mediante el protocolo `dts-mail://` y la interfaz COM de Office, el sistema le ordena a `OUTLOOK.EXE` mostrar la ventana original del correo archivado.
* **Búsqueda de Respaldo Automática:** Si el correo no se encuentra por su ID (ej. si fue archivado en un `.pst` o movido), el script ejecuta automáticamente una búsqueda en Outlook por remitente y asunto sin mostrar errores.
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

---

## 3. Verificación y Calidad
* **Compilación Frontend (`tsc -b && vite build`):** 0 errores, 0 advertencias.
* **Compilación Backend (`nest build`):** 0 errores.
* **Manuales de Usuario y Vistas:** Actualizados en [`docs/manual-usuario.md`](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md), [`docs/vistas/03_crm/crm_contactos_mails.md`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md) y [`docs/vistas/06_administracion_configuracion/ajustes_generales.md`](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/ajustes_generales.md).

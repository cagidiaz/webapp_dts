# 📄 Análisis Técnico y Propuesta de Decisión: Apertura de Correos en Microsoft Outlook (Classic vs. Web) en el CRM

**Destinatario:** Dirección General / Dirección Técnica y Comercial  
**Fecha:** 8 de octubre de 2026  
**Autor:** Equipo de Desarrollo dTS Instruments WebApp  
**Módulos Afectados:** CRM (`/crm/contacts/:id` — Pestaña Emails y Timeline), Ajustes Generales (`/settings`), Integración con Microsoft 365 / Exchange.

---

## 1. Contexto y Planteamiento del Problema

En la ficha de contacto del CRM, los usuarios disponen de un registro completo de correos electrónicos intercambiados con clientes y proveedores. Cada tarjeta de correo incluye un botón para interactuar con dicho mensaje mediante Microsoft Outlook.

La aplicación permite configurar en **Ajustes Generales** el cliente de preferencia del usuario:
1. **Outlook Online / Web (Microsoft 365 en navegador)**
2. **Outlook de Escritorio / Classic (Aplicación nativa `OUTLOOK.EXE` en Windows)**

### El Problema Detectado:
* **En Outlook Web:** La apertura funciona al 100% de forma nativa abriendo el correo guardado exacto mediante el enlace profundo en la nube proporcionado por Microsoft Graph (`webLink` / `ItemID`).
* **En Outlook Classic:** Al pulsar el botón, en lugar de abrir el correo ya archivado en modo lectura, **se abre una ventana de composición de un correo nuevo** (con el destinatario y asunto `Re: ...` precargados).

---

## 2. Diagnóstico Técnico: Limitación Arquitectónica de Windows

### ¿Por qué ocurre esto?
* Los navegadores web modernos (Chrome, Edge) operan bajo estrictas políticas de seguridad (**Sandbox** del sistema operativo) que les impiden ejecutar comandos arbitrarios de escritorio como `outlook.exe /select "id_mensaje"`.
* El único protocolo público y seguro que el sistema operativo Windows tiene registrado para comunicarse con las aplicaciones de correo de escritorio desde una página web es el protocolo **`mailto:`**.
* Por estándar mundial de Internet y diseño de Windows, el protocolo `mailto:` está concebido **exclusivamente para componer/redactar correos nuevos**.
* Antiguamente existían enlaces propietarios tipo `outlook:Inbox/...`, pero Microsoft **los retiró y bloqueó de forma permanente en todas las versiones modernas de Office por motivos de seguridad crítica** (vulnerabilidades de ejecución remota de código en Windows).
* Del mismo modo, Microsoft **no dispone de ningún protocolo de enlace web para realizar búsquedas automáticas dentro de la aplicación de escritorio `OUTLOOK.EXE`**.

---

## 3. Alternativas Técnicas para Decisión de Dirección

Para resolver esta necesidad y ofrecer la mejor experiencia posible al equipo comercial, se plantean **5 alternativas viables**:

---

### 🔹 Opción 1: Descarga y Apertura Automática del Correo Original (`.eml`)
* **Cómo funciona:**
  1. Al hacer clic en el botón, el backend solicita a Microsoft Graph el mensaje real en formato MIME nativo mediante el endpoint oficial `/me/messages/{id}/$value`.
  2. El navegador descarga el archivo de correo `.eml` correspondiente.
  3. Al abrirlo (o configurando el navegador para abrir automáticamente los archivos `.eml`), **Windows invoca inmediatamente a Microsoft Outlook Classic en modo lectura**.
* **Ventajas:**
  * Abre **literalmente la ventana oficial de Outlook Classic** con el correo guardado exacto, sus cabeceras reales, adjuntos originales y los botones nativos de Responder/Reenviar de Outlook.
* **Impacto en Almacenamiento y Costes en Disco:**
  * **Coste en Servidor / Base de Datos: 0,00 €.** El backend de dTS actúa como un puente de retransmisión (*stream* en tiempo real); no almacena ni un solo byte de correos en Supabase ni en el servidor VPS.
  * **En el PC del usuario:** Se descarga un archivo `.eml` en la carpeta *Descargas* del equipo (normalmente entre 20 KB y 2 MB según adjuntos). Con el tiempo puede acumular varios archivos descargados si el usuario no limpia periódicamente su carpeta de descargas.
* **Historial de Conversación (Hilo de Correos):**
  * **Instantánea estática:** El archivo `.eml` es una "foto fija" del correo en el momento en que se generó. Permite leer el texto y los correos citados previos que ya vinieran en el cuerpo del mensaje, pero **no está vinculado al buzón vivo**: si el cliente envió respuestas posteriores, estas no aparecerán en esa ventana, ni permite usar el botón de Outlook *"Buscar relacionados en la conversación"*.
* **Inconvenientes:**
  * Genera descargas repetidas de archivos en la carpeta de descargas local.

---

### 🔹 Opción 2: Búsqueda Semiautomática con Portapapeles (Muy Ágil)
* **Cómo funciona:**
  1. El comercial pulsa un botón del tipo *"Localizar en Outlook"*.
  2. La WebApp **copia de inmediato al portapapeles** la cadena exacta de búsqueda:
     `de:contacto@empresa.com asunto:"Presupuesto caudalímetro"`
  3. Muestra una notificación visual discreta (*"Criterio de búsqueda copiado al portapapeles"*) y abre la ventana de Outlook.
  4. El comercial solo tiene que hacer clic en la barra de búsqueda superior de Outlook y pulsar **`Ctrl + V`** (Pegar) e Intro.
* **Impacto en Almacenamiento:** **0 bytes** en servidor y en local.
* **Historial de Conversación:** Muestra de inmediato **todo el hilo de correos y mensajes asociados** con ese contacto en el buzón local de Outlook Classic.
* **Inconvenientes:** Requiere la acción manual de pegar (`Ctrl + V`) en la barra de búsqueda de Outlook.

---

### 🔹 Opción 3: Búsqueda Directa en la Nube de Microsoft 365
* **Cómo funciona:**
  * Microsoft sí soporta enlaces web de búsqueda directa en su plataforma en la nube:  
    `https://outlook.office.com/mail/search?q=from:contacto@empresa.com subject:"Asunto"`
  * Al hacer clic, abre una pestaña en el navegador con la búsqueda ya ejecutada, filtrando al instante todos los correos relevantes.
* **Ventajas:**
  * Totalmente automático en 1 solo clic.
  * Muestra todo el hilo vivo y conversaciones históricas sin requerir pasos intermedios.
  * **0 bytes** descargados en el equipo local.
* **Inconvenientes:**
  * Se visualiza en el navegador web (Outlook Web) en lugar de en la ventana de Outlook Classic de escritorio.

---

### 🔹 Opción 4: Acción Dual Diferenciada y Explícita en la Interfaz
* **Cómo funciona:**
  * En cada tarjeta de correo se diferencian claramente las dos acciones comerciales posibles:
    1. **"Ver Original en M365 (Web)"**: Abre el correo original exacto guardado en la nube con sus adjuntos e historial completo mediante su deep link oficial.
    2. **"Responder en Outlook Classic"**: Abre la ventana de redacción de Outlook de escritorio con el remitente y asunto cargados (`Re: Asunto`) para continuar la conversación con el cliente.
  * Se acompaña con la lectura completa ya disponible en la WebApp (botón *"Ver más / Mostrar menos"* que expande las líneas del correo en la propia ficha).
* **Ventajas:**
  * Claridad total para el comercial: cada botón hace exactamente lo que promete sin confusiones de ventanas.
  * Sin descargas de archivos temporales ni trucos complejos.
  * Respeta las limitaciones oficiales de Microsoft y de Windows.

---

### 🔹 Opción 5: Protocolo Personalizado de Windows (`dts-mail://` mediante archivo `.reg`)
* **Cómo funciona:**
  1. Se genera un archivo de configuración del Registro de Windows (`configurar_outlook_dts.reg`) de pocas líneas que se distribuye a los comerciales.
  2. El comercial o el departamento de TI ejecuta este archivo una sola vez en cada ordenador (tarda 5 segundos).
  3. Esto registra en Windows un protocolo de enlace personalizado (ej. `dts-mail://open?id=AAMkAG...` o por búsqueda `dts-mail://search?from=...&subject=...`).
  4. Al hacer clic en el botón de la WebApp, el navegador llama a `dts-mail://`, Windows invoca un pequeño script local (`dts-outlook-launcher.vbs` o script PowerShell transparente) y este se comunica directamente con la interfaz COM nativa de Outlook de escritorio (`Outlook.Application`).
  5. **Windows abre de inmediato la ventana oficial de Outlook Classic en modo lectura con el correo archivado real**.

* **Impacto en Almacenamiento y Costes en Disco:**
  * **Coste en Servidor / Base de Datos: 0,00 €.** La WebApp solo envía el enlace URI con el identificador del mensaje.
  * **Coste en el PC del usuario: 0 bytes de descargas.** No descarga ningún archivo `.eml` ni ensucia la carpeta de descargas del equipo. Utiliza el correo que ya está almacenado y sincronizado en el buzón local de Outlook (`.ost`).
  * El script local ocupa menos de **2 KB** en total.

* **Historial de Conversación (Hilo de Correos):**
  * **Integración total con el buzón vivo:** Al abrirse el correo nativamente dentro de Outlook Classic:
    1. Se puede pulsar el botón nativo de Outlook: **"Buscar relacionados ➔ Mensajes de esta conversación"** para ver todos los correos anteriores y posteriores.
    2. Si el usuario tiene activa la vista *"Mostrar como conversaciones"* en Outlook, verá el hilo agrupado con todas las ramas de respuesta.
    3. Todas las respuestas o reenvíos que haga el comercial quedan guardados automáticamente en su carpeta *Elementos enviados* de Outlook y Microsoft 365.

* **Detalle Técnico del Archivo `.reg` (Instalación Única):**
  ```reg
  Windows Registry Editor Version 5.00

  [HKEY_CURRENT_USER\Software\Classes\dts-mail]
  @="URL:dTS Instruments Mail Protocol"
  "URL Protocol"=""

  [HKEY_CURRENT_USER\Software\Classes\dts-mail\shell]

  [HKEY_CURRENT_USER\Software\Classes\dts-mail\shell\open]

  [HKEY_CURRENT_USER\Software\Classes\dts-mail\shell\open\command]
  @="wscript.exe \"C:\\dTS\\scripts\\open_outlook.vbs\" \"%1\""
  ```
  *(El script VBScript/PowerShell se ejecuta de forma transparente en menos de 100 ms y ordena a Outlook mostrar el correo).*

* **Ventajas:**
  * **Experiencia 100% nativa:** 1 solo clic en la WebApp abre directamente el correo en Outlook Classic de escritorio.
  * **Cero descargas en disco.**
  * Acceso completo al historial y herramientas de Outlook.
* **Inconvenientes / Requisito:**
  * Requiere una instalación única de 5 segundos en los ordenadores donde se use (ejecutar el instalador/archivo `.reg` una sola vez por puesto de trabajo).
  * La primera vez que se pulsa el botón, el navegador pregunta por seguridad: *"¿Abrir dTS Mail Protocol?"* (marcando la casilla *"Permitir siempre"*, no vuelve a pedir confirmación nunca más).

---

## 4. Matriz Comparativa de Decisión

| Criterio | Opción 1: Archivo `.eml` | Opción 2: Portapapeles | Opción 3: Búsqueda M365 | Opción 4: Botones Duales | Opción 5: Protocolo `.reg` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Abre en Outlook Classic (Escritorio)** | ✅ Sí (Lectura real) | ⚠️ Sí (requiere pegar) | ❌ No (Abre en Web) | ✅ Sí (modo respuesta) | ✅ **Sí (Lectura nativa)** |
| **Apertura en 1 solo clic directo** | ⚠️ Clic + abrir archivo | ⚠️ Clic + Ctrl+V | ✅ Sí (1 clic) | ✅ Sí (1 clic) | ✅ **Sí (1 solo clic)** |
| **Descarga archivos en el equipo** | ⚠️ Sí (`.eml` en Descargas) | ❌ No (0 bytes) | ❌ No (0 bytes) | ❌ No (0 bytes) | ❌ **No (0 bytes)** |
| **Coste de almacenamiento en servidor** | **0,00 €** | **0,00 €** | **0,00 €** | **0,00 €** | **0,00 €** |
| **Acceso al hilo de la conversación** | ❌ Solo el correo estático | ✅ Sí (Búsqueda global) | ✅ Sí (Búsqueda OWA) | ✅ Sí (vía Web) | ✅ **Sí (Hilo vivo en Outlook)** |
| **Requiere configuración previa en PC** | ❌ No | ❌ No | ❌ No | ❌ No | ⚠️ **Sí (archivo `.reg` una vez)** |
| **Robustez técnica y mantenimiento** | Media (MIME API) | Alta (Clipboard) | Alta (URL canónica) | **Máxima (Estándar)** | **Alta (Protocolo SO)** |
| **Claridad para el usuario comercial** | Alta | Media | Alta | **Óptima** | **Excelente** |

---

## 5. Preguntas Clave para Dirección

Antes de decidir qué camino implementar, el equipo de desarrollo resume las 3 preguntas clave:

1. **¿Es aceptable que los comerciales ejecuten una vez un archivo de configuración (`.reg`) en sus PCs para tener la experiencia nativa perfecta?**
   * Si la respuesta es **SÍ**: La **Opción 5 (Protocolo `.reg`)** es la solución definitiva: abre Outlook Classic en 1 solo clic, sin descargas, sin coste de servidor y con historial completo.
2. **Si NO se desea tocar la configuración de los PCs de los comerciales:**
   * La opción más robusta y sin complicaciones técnicas es la **Opción 4 (Botón Dual)**: *"Ver en M365"* (para lectura y adjuntos) y *"Responder en Outlook"* (para redactar en la app de escritorio).
   * Si resulta indispensable abrir el correo de escritorio aunque no se configure el PC, la alternativa sería la **Opción 1 (`.eml`)**, asumiendo la descarga de archivos temporales en local.

---

## 6. Recomendación del Equipo de Desarrollo

* **Recomendación Técnica Principal:** **Opción 5 (Protocolo `.reg`)**. Proporciona exactamente la experiencia que los comerciales esperan de una aplicación de primer nivel (clic en la web ➔ se abre Outlook de escritorio con el correo real), sin penalizar el almacenamiento ni requerir compras de licencias adicionales.
* **Plan de Contingencia / Inmediato:** **Opción 4 (Botones Duales)** como alternativa 100% estándar web y cero mantenimiento técnico.

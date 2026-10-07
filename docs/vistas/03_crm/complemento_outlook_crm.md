# 📬 Vista y Complemento: Add-in de Microsoft Outlook para CRM (OutlookAddinPage)

## 1. Propósito y Descripción General
El **Complemento de Outlook para dTS CRM** es una aplicación integrada dentro del panel lateral de Microsoft Outlook (compatible con Outlook Desktop, Outlook para Mac y Outlook Web).

Su función principal es permitir que los comerciales y gestores de cuentas registren correos electrónicos recibidos o enviados directamente en el CRM sin salir de Outlook, asociándolos automáticamente con:
1. El **Contacto** de la empresa.
2. La **Empresa / Cliente** en Business Central.
3. Una **Oferta Comercial viva (Quote)** existente en el CRM.
4. Una **Categoría comercial tipificada** (Petición de oferta, seguimiento, dudas técnicas, pedido confirmado, etc.).

---

## 2. Ficheros y Rutas del Código
* **Componente Frontend:** [`frontend/src/pages/outlook-addin/OutlookAddinPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/outlook-addin/OutlookAddinPage.tsx)
* **API Client Frontend:** [`frontend/src/api/outlookAddin.ts`](file:///c:/proyectos/webapp_dts/frontend/src/api/outlookAddin.ts)
* **Controlador NestJS:** [`backend/src/modules/exchange-sync/outlook-addin.controller.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/outlook-addin.controller.ts)
* **Servicio NestJS:** [`backend/src/modules/exchange-sync/outlook-addin.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/outlook-addin.service.ts)
* **Ruta de Carga del Panel:** `/outlook-addin`
* **Manifiesto XML de Office:** Fichero de configuración que registra el botón "Exportar a dTS CRM" en la cinta de opciones de Outlook.

---

## 3. Arquitectura y Ciclo de Vida del Add-in

### 3.1. Detección Dual de Entorno (Office.js vs Modo Standalone)
Para garantizar máxima robustez y facilidad de prueba:
* El componente detecta si se está ejecutando dentro del iframe de Microsoft Office (`window.Office?.context?.mailbox` o query string `_host_info`).
* **Dentro de Outlook:** Carga la librería oficial `https://appsforoffice.microsoft.com/lib/1/hosted/office.js` y extrae los datos del elemento seleccionado en tiempo real (`item.subject`, `item.from`, `item.to`, `item.itemId`, `item.body.getAsync`).
* **Fuera de Outlook (Navegador normal):** Activa automáticamente un entorno de prueba simulado (*mock*) con datos de prueba realistas para permitir su depuración y diseño visual sin necesidad de abrir Outlook.

### 3.2. Proceso de Búsqueda y Coincidencia Automática (Lookup)
Al abrir el correo en el panel, el frontend llama a `POST /outlook-addin/lookup`:
1. **Búsqueda por Correo Exacto:** Consulta si el remitente existe en `crm_contacts`. Si existe, recupera su ficha, empresa asociada y ofertas comerciales vivas.
2. **Búsqueda por Dominio de Correo:** Si el correo exacto no existe (ej. nuevo contacto de un cliente existente), analiza el dominio del remitente (ej. `@cliente.com`) y localiza empresas registradas con ese dominio web.
3. **Búsqueda Manual Asistida:** Si no hay coincidencia automática, el comercial dispone de un buscador en tiempo real para buscar cualquier empresa del catálogo, seleccionar contactos existentes o crear la vinculación al vuelo.

---

## 4. Tipologías y Categorización de Correos
El add-in clasifica el correo en las siguientes categorías comerciales oficiales:

| Código | Etiqueta | Icono / Propósito |
| :--- | :--- | :--- |
| `PETICION_OFERTA` | Petición de Oferta | Solicitud de cotización de cliente. |
| `SEGUIMIENTO_OFERTA` | Seguimiento de Oferta | Preguntas sobre estado de negociación o plazos. |
| `ENVIO_OFERTA` | Envío de Oferta | Envío formal de cotización económica. |
| `DUDA_CONSULTA` | Duda o Consulta | Cuestiones técnicas sobre instrumentación. |
| `REUNION_CONFERENCIA` | Reunión / Llamada | Acuerdos sobre demostraciones o llamadas. |
| `PEDIDO_CONFIRMADO` | Pedido Confirmado | Confirmación formal de adjudicación o compra. |
| `OTRO` | Otro Asunto | Comunicaciones generales. |

---

## 5. Limpieza Inteligente de Texto (`cleanBody`)
Los correos corporativos suelen incluir largos hilos citados ("De: ... Enviado el: ...") y firmas extensas con avisos legales y de privacidad.
* El add-in incluye la opción **"Limpiar firmas e hilos anteriores automáticamente"** (activada por defecto).
* El backend NestJS procesa el contenido mediante expresiones regulares inteligentes para extraer únicamente el mensaje actual, eliminando disclaimers de RGPD y firmas duplicadas, manteniendo el historial del CRM limpio y legible.

---

## 6. Persistencia y Apertura Posterior desde la WebApp
Al pulsar **"Registrar en dTS CRM"**:
1. Se inserta una actividad de tipo `EMAIL` en `crm_activities` y `sales_quote_activities`.
2. Se guarda el `exchange_item_id` y el enlace web directo de Microsoft `exchange_web_link`.
3. Esto permite que posteriormente, desde la vista web del CRM (Ficha del Contacto, Timeline o Pestaña de Mails), cualquier usuario pueda pulsar el icono de Outlook y abrir este correo original directamente en su Outlook (Web o Clásico) usando su identificador único.

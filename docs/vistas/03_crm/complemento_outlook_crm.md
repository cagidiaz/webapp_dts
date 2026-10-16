# 📬 Vista y Complemento: Add-in de Microsoft Outlook para CRM (OutlookAddinPage)

## 1. Propósito y Descripción General
El **Complemento de Outlook para dTS CRM** es una aplicación integrada dentro del panel lateral de Microsoft Outlook (compatible con Outlook Desktop, Outlook para Mac y Outlook Web).

Su función principal es permitir que los comerciales y gestores de cuentas registren correos electrónicos recibidos o enviados directamente en el CRM sin salir de Outlook, asociándolos automáticamente con:
1. El **Contacto** de la empresa.
2. La **Empresa / Cliente** en Business Central (limitado a su cartera comercial).
3. Una **Oferta Comercial viva (Quote)** existente en el CRM.
4. Una **Categoría comercial tipificada** (Petición de oferta, seguimiento, dudas técnicas, pedido confirmado, etc.).
5. Su **Identidad Inmutable Estable (`ImmutableId`)** en Microsoft Graph para garantizar aperturas futuras fiables y deterministas.

---

## 2. Ficheros y Rutas del Código
* **Componente Contenedor de Sesión:** [`frontend/src/pages/outlook-addin/OutlookAddinSession.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/outlook-addin/OutlookAddinSession.tsx)
* **Componente Principal Frontend:** [`frontend/src/pages/outlook-addin/OutlookAddinPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/outlook-addin/OutlookAddinPage.tsx)
* **API Client Frontend:** [`frontend/src/api/outlookAddin.ts`](file:///c:/proyectos/webapp_dts/frontend/src/api/outlookAddin.ts)
* **Controlador NestJS:** [`backend/src/modules/exchange-sync/outlook-addin.controller.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/outlook-addin.controller.ts)
* **Servicio NestJS:** [`backend/src/modules/exchange-sync/outlook-addin.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/outlook-addin.service.ts)
* **Control de Acceso y Cartera RBAC:** [`backend/src/modules/exchange-sync/outlook-addin-access.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/outlook-addin-access.service.ts)
* **Servicio de Identidad Estable Graph:** [`backend/src/modules/exchange-sync/email-identity.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/email-identity.service.ts)
* **Ruta de Carga del Panel:** `/outlook-addin`
* **Manifiesto XML de Office:** Fichero de configuración que registra el botón "Exportar a dTS CRM" en la cinta de opciones de Outlook.

---

## 3. Arquitectura y Ciclo de Vida del Add-in

### 3.1. Detección Dual de Entorno (Office.js vs Modo Standalone)
Para garantizar máxima robustez y facilidad de prueba:
* El componente detecta si se está ejecutando dentro del iframe de Microsoft Office (`window.Office?.context?.mailbox` o query string `_host_info`).
* **Dentro de Outlook:** El arranque HTML carga la librería oficial `https://appsforoffice.microsoft.com/lib/1/hosted/office.js` antes del acceso CRM; tras autenticarse, el contenido extrae los datos del elemento seleccionado en tiempo real (`item.subject`, `item.from`, `item.to`, `item.itemId`, `item.body.getAsync`).
* **Fuera de Outlook (Navegador normal):** Activa automáticamente un entorno de prueba simulado (*mock*) con datos de prueba realistas para permitir su depuración y diseño visual. **El modo vista previa bloquea el registro real** de correos para evitar crear registros ficticios en la base de datos de producción.

### 3.2. Autenticación Integrada y Aislamiento de Sesión (`OutlookAddinSession.tsx`)
* **Protección JWT por Endpoint:** Todas las rutas del controlador (`lookup`, `log`, `companies`, `contacts`, `quotes`) exigen autenticación con token JWT del CRM validado mediante `@UseGuards(JwtAuthGuard)`.
* **Manejo de Expiración en Iframe:** Si la sesión expira o no se comparten cookies entre Outlook y el navegador, el interceptor de `apiClient.ts` emite el evento `dts:outlook-session-expired`. El panel presenta un formulario de login embebido con branding corporativo sin expulsar ni redirigir al comercial fuera de Outlook (`window.location.href = '/login'`).

### 3.3. Control de Acceso y Ámbito de Cartera Comercial (RBAC)
* **Validación de Cartera (`customerScope`):**
  * Los comerciales con roles `VENTAS` u `OPERACIONES` solo pueden buscar clientes, seleccionar contactos y asociar ofertas que pertenezcan estrictamente a su código de comercial asignado (`salesperson_code`).
  * Los roles `ADMIN` y `DIRECCION` mantienen visión consolidada global del CRM, pero no obtienen acceso a buzones de correo de otros usuarios.
* **Integridad Cruzada:** Se valida que el contacto pertenezca a la empresa seleccionada y que la oferta comercial pertenezca al cliente y a la cartera autorizada antes de persistir cualquier actividad.

### 3.4. Proceso de Búsqueda y Coincidencia Automática (Lookup)
Al abrir el correo en el panel, el frontend llama a `POST /outlook-addin/lookup`:
1. **Búsqueda por Correo Exacto:** Consulta si el remitente existe en `contacts` dentro de la cartera del usuario. Si existe, recupera su ficha, empresa asociada y ofertas comerciales vivas.
2. **Búsqueda por Dominio de Correo:** Si el correo exacto no existe (ej. nuevo contacto de un cliente existente), analiza el dominio del remitente (ej. `@cliente.com`) y localiza empresas registradas con ese dominio dentro de su cartera autorizada.
3. **Búsqueda Manual Asistida:** Si no hay coincidencia automática, el comercial dispone de un buscador en tiempo real limitado a su cartera para seleccionar empresas, contactos existentes u ofertas.

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

## 6. Persistencia e Identidad Estable (`ImmutableId`)
Al pulsar **"Registrar en dTS CRM"**:
1. Se inserta una actividad de tipo `EMAIL` en `crm_activities` y opcionalmente en el seguimiento comercial de ofertas.
2. **Transformación a Identidad Inmutable:** El backend toma el `exchangeItemId` (en formato `ewsId` devuelto por Office.js) y, mediante Microsoft Graph API (`/me/translateExchangeIds`), lo traduce a un `ImmutableId` binario estable que no cambia aunque el correo se mueva de carpeta en el buzón.
3. **Contrato de 7 Campos de Identidad:**
   * `exchange_tenant_id`: Tenant verificado de Microsoft 365.
   * `exchange_mailbox_id`: Identificador del buzón del comercial.
   * `exchange_immutable_id`: Identificador estable inmutable de Graph.
   * `exchange_item_id_type`: Tipo de ID recibido (`ewsId` / `restImmutableEntryId`).
   * `exchange_internet_message_id`: Cabecera estándar RFC 822 (`InternetMessageId`).
   * `exchange_resolution_status`: Estado determinista (`resolved`, `pending`, `not_found`, `access_denied`, `temporary_error`).
   * `exchange_resolved_at`: Timestamp de verificación de identidad.
4. **Control de Duplicados en Cartera:** La comprobación de duplicados evalúa `exchange_immutable_id` junto con el creador, cliente y contacto, evitando falsos duplicados cruzados entre diferentes comerciales o asociaciones comerciales independientes del mismo correo.
5. **Convivencia con Piloto de Ofertas:** Si la oferta pertenece al seguimiento local de ofertas, el correo se vincula como actividad local en `crm_offer_activities` sin alterar automáticamente la fase de la cotización ni su estado de cierre.

## 7. Relación con el componente Windows de apertura (15/10/2026)

El Add-in de Office registra el correo en el CRM; el componente Windows abre desde el CRM un mensaje ya registrado en Outlook Classic. Son instalaciones y permisos distintos: el ZIP de Classic no instala el Add-in, no cambia su manifiesto de Microsoft 365 y no necesita un certificado de firma de código.

La apertura exacta requiere una referencia verificada del propio buzón Microsoft 365, permisos CRM actuales y un equipo vinculado. Admin y Dirección pueden consultar actividades autorizadas, pero no abrir con su cuenta un mensaje del buzón privado de otro comercial. Los registros antiguos sin referencia verificable pueden necesitar recuperación o revinculación; no se resuelven automáticamente por asunto.

Las tablas `crm_outlook_devices` y `crm_outlook_requests` son exclusivas del componente Classic, no del registro del Add-in. Ya se ha comprobado su creación en Supabase; falta aceptar el circuito completo instalado. El modo vista previa del Add-in continúa bloqueando el registro real.

Véase [manual conjunto de instalación y vinculación](../../manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic).

## 8. Arranque de Outlook Web independiente de la sesión CRM (16/10/2026)

Se ha identificado una dependencia incorrecta: la carga dinámica de Office.js estaba dentro del contenido protegido por `OutlookAddinSession`. En un panel sin sesión CRM, el formulario de acceso impedía montar ese contenido y no se iniciaba la comunicación con Office. La corrección se ha desplegado y el usuario confirma que el complemento ya abre correctamente en Outlook Web el 16/10/2026.

`frontend/index.html` carga ahora `frontend/public/outlook-bootstrap.js` antes del módulo React. El arranque solo actúa en las rutas `/outlook-crm` y `/outlook-addin`; en host Office solicita inmediatamente `Office.onReady()` y guarda una promesa compartida. `main.tsx` espera esa preparación antes de renderizar la aplicación. No necesita sesión CRM, tokens ni consultas a base de datos. La autenticación continúa siendo obligatoria para registrar correos.

El arranque conserva y restaura `history.replaceState` y `history.pushState`, que Office.js puede alterar, para mantener React Router. Las páginas normales y `/outlook-classic` no cargan Office.js. La vista previa abierta directamente fuera de Office sigue siendo simulada; un fallo de inicialización dentro del host no se convierte en datos simulados. Los errores de descarga o espera muestran una indicación y permiten reintentar, con espera máxima de 15 segundos.

La página estática heredada `/outlook-addin/index.html` solicita también `Office.onReady()` inmediatamente después del script de Office, antes de las demás dependencias. No se cambia el manifiesto ni los identificadores de los complementos; este ajuste no requiere reinstalar el componente Classic ni ejecutar SQL.

Verificación: prueba de arranque con host simulado sin sesión CRM, restauración de History API, aislamiento de vista previa y rutas normales, errores de descarga y timeout. Backend y frontend deben compilar antes de entregar. El usuario ha confirmado la apertura real del panel Web después del despliegue.

Referencias oficiales: [inicialización de Office](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/initialize-add-in) y [integración con frameworks e History API](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/connect-to-javascript-frameworks).

## 10. Captura de nombres de adjuntos (16/10/2026)

**Estado:** implementado y comprobado automáticamente; pendiente de prueba real tras desplegar. Ambos paneles cargan `/email-attachment-metadata.js`. El helper obtiene metadatos de `item.attachments` en lectura o `getAttachmentsAsync` en redacción cuando está disponible (espera máxima de 3 segundos). Un fallo no impide registrar el correo: se guarda estado unavailable. Si cambia el mensaje seleccionado se cancela el registro y se pide volver a abrir el panel, para no mezclar cuerpo, asociación y adjuntos de dos correos.

El panel React envía `emailAttachments` opcional a `POST /outlook-addin/log-email`. El panel estático usa también esa ruta autorizada y con control de duplicados cuando el correo tiene ID y usuario de buzón; los elementos sin guardar mantienen `POST /crm-activities`, compatible con redacción. Esta ruta sin ID conserva su comportamiento anterior y no ofrece deduplicación por identidad ni conciliación del envío. Los correos guardados repetidos no sustituyen la fotografía ya registrada. No se enriquece el histórico automáticamente.

El backend normaliza mediante `email-attachments.ts`: versión 1, estados complete/partial/pending/unavailable, origen office/graph/crm, fecha de captura servidor, lista acotada y total conocido o null. Solo persiste nombre y tamaño válido; descarta cualquier campo adicional (tokens, URLs, bytes, IDs). Admite clientes anteriores que omitan el bloque. La validación de DTO rechaza un bloque de tipo array.

Los borradores nuevos de `createDraftFromCrm` incorporan un marcador pending. Una vez enviados, el proceso de conciliación que ya existe resuelve la identidad exacta y pide a Graph únicamente `name,size,isInline`, con hasta cuatro páginas y 100 nombres persistidos. Las páginas siguientes deben mantener host, mensaje y proyección; nunca se solicita `/value` ni contenido binario. Si falla esta consulta, la identidad puede confirmarse igualmente y la captura queda unavailable. La transición y el cambio de la clave JSON se confirman en una transacción. Las ediciones de categoría/oferta combinan solo las claves afectadas y no sobrescriben el bloque.

No hay nuevo planificador, recuperación de históricos, SQL, tablas ni cambios en manifiestos o permisos Microsoft. No hay llamadas Graph al pintar tarjetas. La distribución Classic 1.1.0 ya instalada sigue siendo válida.

**Despliegue:** publicar backend compatible antes que frontend; volver a abrir el panel del complemento para cargar el script nuevo. Comprobar correo nuevo con PDF/Excel en Classic y Web, enviado/recibido, firma incrustada, nombres repetidos, expansión y conservación al editar. Ver el [plan y registro de ejecución](../../propuestas/2026-10-16-plan-nombres-adjuntos-correos-crm.md).

### Referencias operativas de esta entrega

La comprobación visual y la aceptación con correos reales siguen pendientes; las pruebas automáticas no las sustituyen. [Guía técnica de adjuntos y diagnóstico](../../guia-integracion-outlook-exchange.md#7-nombres-de-adjuntos-en-el-crm) y [procedimiento de despliegue y aceptación](../../manual-instalacion-addin-outlook.md#10-nombres-de-adjuntos-actualización-del-registro). La corrección de arranque Web y las respuestas de la entrega anterior ya fueron confirmadas por el usuario en producción.

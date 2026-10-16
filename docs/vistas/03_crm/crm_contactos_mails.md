# Vista: Contactos CRM y Pestaña de Emails (`CrmContactDetail.tsx`)

## Prospectos locales: primera entrega del piloto (13/10/2026)

`CrmPage.tsx` utiliza `CrmContactsView.tsx` como contenedor. Con el piloto desactivado conserva el listado `CrmContacts` actual. Cuando `GET /crm-prospects/access` habilita al usuario, permite alternar Contactos BC y Prospectos. La pestaña Prospectos reutiliza el mismo panel, datos, permisos y ficha lateral de Oportunidades, inicialmente en modo tabla.

Los prospectos se almacenan en una entidad local propuesta, sin insertar contactos ni clientes ficticios en las tablas importadas. Admin también edita sus datos y fase. Dirección consulta. El propietario conserva el control de archivo y restauración.

La ficha muestra el historial de cambios y permite al propietario confirmar o deshacer una asociación con un cliente de su cartera en BC, incluso sin oferta. Los convertidos se conservan en la tabla y en el recuento histórico. El panel `ProspectActivities.tsx` permite crear/editar actividades locales, completarlas con conclusiones y reabrirlas, con filtros por tipo/estado y campos actuales. Propietario y Admin editan, Dirección consulta; los archivados son de consulta. Las actividades permanecen en `crm_prospect_activities` y se muestran en el cliente mediante su asociación actual, sin copiarlas. La agenda/briefing general ya incluye las actividades programadas; La conexión Outlook está preparada y desactivada; los correos siguen pendientes. No se ha aplicado el SQL ni habilitado el piloto.

## 1. Descripción General
La vista de detalle de contacto en el CRM (`/crm/contacts/:id`) centraliza la información comercial, perfil del interlocutor, histórico de interacciones, cartera de ofertas vinculadas y el registro cronológico de correos electrónicos sincronizados con Microsoft Outlook y Exchange.

---

## 2. Tipologías Oficiales de Correos Electrónicos

Para unificar la trazabilidad del proceso comercial y sincronizar el Add-in de Outlook con el CRM, el sistema define **5 tipologías exclusivas**:

| Clave Técnica | Etiqueta Oficial | Icono Lucide | Color Distintivo | Significado Comercial |
| :--- | :--- | :--- | :--- | :--- |
| `PETICION_OFERTA` | **Petición oferta** | `FileQuestion` | Azul (`#2563eb`) | Solicitud inicial de cotización recibida de un cliente. |
| `OFERTA_PROVEEDOR` | **Oferta proveedor** | `Truck` | Ámbar (`#d97706`) | Presupuesto o precio de coste recibido de un fabricante/proveedor para preparar la oferta de venta. |
| `REVISION_OFERTA` | **Revisión oferta** | `FileEdit` | Púrpura (`#7c3aed`) | Ajustes técnicos, cambios de alcance o actualizaciones de precios en la oferta. |
| `NEGOCIACION` | **Negociación** | `Briefcase` | Cerceta (`#0d9488`) | Intercambio sobre condiciones de pago, plazos de entrega o descuentos comerciales. |
| `CIERRE_ACEPTACION` | **Cierre/Aceptación** | `CheckCircle2` | Esmeralda (`#059669`) | Aceptación formal de la oferta, adjudicación o confirmación de pedido. |

> **Comportamiento Automático de Cierre:**  
> Al registrar o modificar un correo con la tipología `CIERRE_ACEPTACION` vinculándolo a una oferta (`quoteDocumentNo`), el sistema actualiza automáticamente el estado de la oferta comercial en el CRM a **`ganada`** (100% de probabilidad de éxito), siempre que no pertenezca al piloto de ofertas con gestión manual de motivo de cierre.

---

## 3. Pestaña de Emails (`activeTab === 'emails'`)

### 3.1 Barra de Filtrado Unificada en una Misma Línea
La parte superior de la pestaña integra en una sola fila compacta y responsive:
1. **Píldoras Interactivas de Tipología**:
   - Botón `Todas (N)` para restablecer el filtro.
   - Píldoras individuales para cada una de las 5 tipologías con su icono y contador dinámico reactivo en tiempo real.
2. **Separador sutil vertical** (`h-5 w-px`).
3. **Selector Compacto de Ofertas**:
   - Ubicado a continuación de las píldoras, muestra `Todas las ofertas (Total)` o `Oferta OF-XXXX (N correos)`.
   - Permite filtrar simultáneamente por cotización comercial concreta sin romper la línea visual.
4. **Acciones de Cabecera**: Botones de `Sincronizar` y `Redactar Correo en Outlook`.

### 3.2 Visualización Ergonómica de Correos y Ordenación Cronológica Exacta
- **Ordenación Cronológica Precisa y Priorización Horaria de Exchange**:
  - Los correos en la pestaña de Emails y en el Timeline se ordenan de forma descendente considerando la **fecha y hora exacta de llegada o envío** (`sortTimestamp`).
  - **Regla Estricta para `EMAIL`**: Para correos electrónicos, la hora computada (`computedTime`) evalúa **con máxima prioridad** la marca temporal real de Microsoft 365 (`attendees.sentDate` o `attendees.receivedDateTime`) antes que cualquier valor manual de `time_scheduled`, garantizando que la hora visible y la ordenación reflejen fielmente el momento en que se despachó o recibió el mensaje.
  - Cada tarjeta de correo y entrada del Timeline incluye el indicador de fecha y hora completa (`13 oct. 2026 🕒 14:35`) con icono de reloj `Clock` en azul dTS (`text-dts-secondary`).
- **Recorte Automático Inteligente**: Para evitar saturar la vista, cada correo muestra por defecto exclusivamente sus primeras **5 líneas** de contenido con botón `Ver más (+N líneas)`.
- **Formato Monoespaciado y Legible**: El cuerpo del correo se renderiza en bloque estilizado con tipografía monoespaciada para respetar sangrías, tablas de texto y cotizaciones.

### 3.3 Badge Interactivo de Tipología con Selector Rápido
En cada tarjeta de correo (tanto en la pestaña de Emails como en el Timeline):
- Se muestra un badge redondeado con la tipología actual, su icono y flecha indicadora (`🚚 Oferta proveedor ▾`).
- **Cambio en 1 Clic**: El badge funciona como un `<select>` interactivo transparente superpuesto que permite reasignar la tipología en tiempo real sin abrir modales.
- **Consistencia en Base de Datos y Título**: Al cambiar la tipología, la mutación actualiza el campo `attendees.categoryTag` y reescribe de forma limpia el prefijo del título `[Dirección · Tipología] Asunto`.

### 3.4 Vinculación y Badge de Oferta Comercial vs Tipología
- **Diferenciación Visual Estricta**:
  - El badge de tipología (`[ 🚚 Oferta proveedor ▾ ]`) define la naturaleza del email.
  - El badge de oferta (`[ 📄 Oferta: OFT-2026-XXXX (Importe €) ]`) representa el documento de Business Central vinculado.
- **Detección Blindada de Ofertas en Backend**:
  - El método de backend `enrichActivitiesWithQuoteInfo` descarta los prefijos entre corchetes (`^\[.*?\]\s*`) y exige dígitos numéricos obligatorios en el código de oferta (`/(?:OFT|COT|OFERTA|OF)[-_ ]?([0-9][A-Z0-9\-\/]*)/i`), evitando falsos positivos con la palabra "Oferta" de la tipología.

### 3.5 Acciones de Productividad con Microsoft Outlook (Online vs Classic)
- **Apertura de Correos Existentes y Resolución Exacta (`email-open.service.ts`)**:
  - Cada tarjeta de correo (tanto en la pestaña de Emails como en el Timeline) dispone del botón *"Abrir en Outlook"*.
  - **Respeto Estricto de la Preferencia del Usuario (`getPreferredOutlookClient`)**:
    - **Outlook Classic / Escritorio (`target === 'desktop'`)**: Para las cuentas del piloto de identidad, `outlookClassic.ts` solicita una apertura a `POST /api/exchange-sync/classic/requests`, vinculada a la actividad y al equipo del usuario. El protocolo `dts-outlook://v1/open` transporta una capacidad temporal, sin asunto ni credenciales Microsoft. El componente obtiene del backend la referencia MAPI actual, selecciona el almacén del buzón y verifica el InternetMessageId antes de mostrar el mensaje. La interfaz confirma el resultado autenticado; si no llega, informa de apertura sin confirmar y ofrece Web explícitamente. Las cuentas fuera del piloto conservan el flujo heredado `dts-mail`; la respuesta y la búsqueda también siguen pendientes de sustitución.
    - **Outlook Online / Web (`target === 'web'`) — Resolución Dinámica Segura (`POST /api/exchange-sync/emails/:activityId/resolve`)**:
      * Al pulsar abrir, la WebApp pre-abre síncronamente una pestaña en blanco para evitar el bloqueo de ventanas emergentes (Popup Blocker) y aísla el contexto mediante `window.opener = null` ([`resolvedEmailWindow.ts`](file:///c:/proyectos/webapp_dts/frontend/src/utils/resolvedEmailWindow.ts)).
      * El backend NestJS ([`EmailOpenService`](file:///c:/proyectos/webapp_dts/backend/src/modules/exchange-sync/email-open.service.ts)) verifica la autenticación JWT, rol y cartera comercial (`customerScope`), comprobando que el buzón de Microsoft 365 pertenezca al usuario autenticado (se bloquea la apertura de buzones ajenos incluso para roles Admin o Dirección).
      * **Búsqueda por Identidad Inmutable:** Si el correo se ha movido entre carpetas del buzón, Microsoft Graph lo localiza de forma determinista mediante su `exchange_immutable_id` o `exchange_internet_message_id`.
      * **Gestión de Copias Múltiples:** Si existen varias copias en el buzón (máximo 5), se cierra la ventana temporal y se despliega un selector modal para que el usuario elija la copia por carpeta y fecha.
      * **Validación de Destino:** Se valida en backend y frontend que la URL sea un destino oficial HTTPS de Outlook (`outlook.office.com` o `outlook.office365.com`). Si la resolución falla, la ventana temporal se cierra limpiamente y se muestra una notificación explicativa en la ficha.
- **Ciclo de Vida de Borradores y Envío Directo**:
  - `draft`: El correo es un borrador registrado localmente en espera de edición o envío desde Outlook.
  - `send_unconfirmed`: Se ha solicitado el envío a Microsoft Graph pero la confirmación de entrega está en curso. La interfaz muestra el badge ámbar: `Envío sin confirmar: revisar Outlook` para prevenir reenvíos accidentales.
  - `sent_pending`: Microsoft 365 ha aceptado el envío pero la copia archivada en "Elementos enviados" aún está generándose o resolviendo su identificador inmutable. La interfaz muestra el badge ámbar: `Referencia de envío pendiente`.
  - `synced`: Correo completamente enviado y sincronizado con referencia inmutable resuelta (`resolved`).
- **Redacción de Nuevos Correos ("Abrir y Preparar en Outlook")**:
  - Selector dual de cliente (*Outlook de Escritorio* vs. *Outlook Online*).
  - Soporte multi-destinatario ("Para", "+ Añadir CC"), plantillas corporativas tokenizadas (*Presentación*, *Seguimiento*, *Reunión*) y prevención de popup blocker mediante pre-apertura de pestaña `about:blank`.
- **Sincronización Bidireccional e Identidad Estable (`ImmutableId`)**:
  - Auto-sincronización silenciosa en segundo plano al montar la ficha de contacto si existen actividades en estado `draft`, `sent_pending` o `send_unconfirmed`.
  - El backend consulta las referencias pendientes en lotes de hasta 25 elementos rotados por `exchange_last_synced_at`, evitando barridos masivos de buzón.
  - Conciliación determinista: requiere coincidencia exacta de tenant, buzón y `ImmutableId`, eliminando heurísticas inseguras por coincidencia aproximada de asunto o fecha.
- **Acceso desde el Listado de Contactos**: Al pulsar sobre el email de cualquier contacto en la tabla general de contactos (`/crm/contacts`), la WebApp respeta la preferencia del usuario y abre la ventana de redacción en su cliente preferido (Online o Classic).

### 3.6 Homogeneidad Total de Diseño y Colores con el Timeline
- Ambas vistas comparten la misma paleta y arquitectura de componentes:
  - Fondo blanco en modo claro y zinc translúcido en modo oscuro (`bg-white dark:bg-zinc-900/40 border-gray-200/60 dark:border-white/5`).
  - Estado realizado (`done` / `hasConclusions`) con fondo y borde verde esmeralda (`bg-emerald-500/8 dark:bg-emerald-950/20 border-emerald-500/25 dark:border-emerald-500/30`).
  - Pendiente de conclusiones (`needsConclusions`) resaltado en ámbar (`bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-400`).
  - Menú contextual desplegable `MoreVertical` para opciones avanzadas de Outlook (Classic, Web, Responder, Buscar conversación, Copiar sintaxis).

---

## 4. Integración con el Add-in de Outlook (`OutlookAddinPage.tsx`)
- **Autenticación Obligatoria:** Las llamadas API requieren JWT del CRM; el contenedor [`OutlookAddinSession.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/outlook-addin/OutlookAddinSession.tsx) gestiona la sesión sin redirigir fuera de Outlook.
- **Aislamiento por Cartera Comercial (RBAC):** Búsqueda de clientes y selección de contactos/ofertas restringida a los clientes asignados al comercial autenticado.
- **Identidad Estable (`ImmutableId`):** Conversión de IDs volátiles EWS devueltos por Office.js a `ImmutableId` mediante Microsoft Graph (`/me/translateExchangeIds`), persistiendo los 7 campos de identidad en `crm_activities`.
- **Limpieza de Firmas y RGPD:** Depuración automática mediante expresiones regulares inteligentes para conservar únicamente el cuerpo útil del mensaje.

---

## 5. Tipologías de Eventos y Actividades Comerciales

En la pestaña de **Eventos** y en el botón **"Nueva Actividad"** de la ficha de contacto, el CRM clasifica las interacciones comerciales mediante tipologías oficiales:

| Clave Técnica | Etiqueta en Interfaz | Envío Convocatoria al Contacto | Sincronización Outlook | Descripción y Uso |
| :--- | :--- | :---: | :---: | :--- |
| `TASK` | **Tarea** | ❌ No | ✅ Sí (Calendario) | Recordatorio o tarea interna asignada con fecha y hora. |
| `NOTE` | **Nota Interna** | ❌ No | ❌ No | Apunte rápido comercial o comentario interno sin fecha fija. |
| `REUNION` | **Reunión Interna** | ❌ No | *En configuración* | Reunión entre miembros del equipo dTS. *(Opción en blanco/preparación temporal)*. |
| `VISITA` | **Visita a Cliente** | ❌ No | ✅ Sí (Calendario) | Visita presencial agendada a las instalaciones del cliente, con captura de dirección. |
| `VIDEOLLAMADA` | **Videollamada** | ✅ Sí (Invitación Teams) | ✅ Sí (Calendario) | Reunión remota con enlace de Microsoft Teams y convocatoria al contacto. |
| `CALL` | **Llamada Telefónica** | ❌ No | ✅ Sí (Calendario) | Registro de contacto telefónico realizado o programado. |
| `EVENT` | **Visita no programada** | ❌ **No envía correo** | ✅ Sí (Calendario) | **Visita espontánea/presencial sin cita previa.** Queda registrada en la app y en el Outlook del comercial bajo la categoría corporativa `dTS CRM`, sin enviar ningún correo al cliente. |

### 5.1 Particularidades de la "Visita no programada" (`EVENT`)
- **Sin envíos accidentales a clientes:** A diferencia de una videollamada Teams, Microsoft Graph **no añade al contacto como asistente (`attendees`)**. De este modo, Microsoft 365 nunca despacha notificaciones ni correos al cliente.
- **Registro en Outlook:** Se genera como evento personal en el calendario del comercial con el prefijo `[dTS CRM - Visita No Programada]`, categoría azul dTS, fecha, hora, ubicación y notas.
- **Captura de Ubicación:** Dispone de selector de ubicación con el botón directo *"Usar dirección de la empresa"* para rellenar automáticamente la sede del contacto.

### 5.2 Estado de la "Reunión Interna" (`REUNION`)
- Sustituye a la antigua nomenclatura de "Reunión Presencial".
- Al seleccionarla en el modal de nueva actividad, se presenta en blanco con un aviso de que dicha funcionalidad se configurará en una fase posterior para coordinar agendas internas del equipo.

### 5.3 Barra de Filtros Unificada (Mismo Diseño que la Pestaña de Emails)
- **Consistencia Visual Absoluta:** La barra de filtros por tipología de la pestaña de Eventos replica de forma exacta la experiencia y diseño de la pestaña de Emails con contadores dinámicos y separador para el estado (*Todos*, *Pendientes*, *Realizados*).

### 5.4 Estados de Finalización y Colores de Fondo en la WebApp
1. **Completado / Realizado (`isCompleted === true` o con conclusiones registradas):** Fondo verde esmeralda sutil (`bg-emerald-500/8 dark:bg-emerald-950/20`), badge `✓ Realizado` y sincronización `Outlook (Completado)`.
2. **Vencido pendiente de conclusiones (`isPastDate && !conclusions`):** Fondo ámbar (`bg-amber-500/8 dark:bg-amber-500/12`), badge `Vencido · Pendiente` y acceso rápido para agregar conclusiones.
3. **Pendiente / Programado a futuro:** Fondo estándar limpio (`bg-white dark:bg-zinc-900/40`) y badge `Outlook` en azul corporativo dTS.
4. **Checkbox de Realización Universal:** Alterna de forma ágil entre pendiente y realizado.
5. **Modal Rápido de Cierre y Conclusiones:** Solicita registrar conclusiones alcanzadas y las sincroniza en el cuerpo de la cita en Outlook.

### 5.5 Sincronización de Color y Estado en Microsoft Outlook
- **Categorías Maestras de Microsoft 365 (`outlook/masterCategories`):**
  - **Pendiente / Activo:** Categoría `"dTS CRM"` con preset **`preset7` (Azul corporativo dTS `#003E51`)**.
  - **Completado / Realizado:** Categoría `"dTS CRM - Completado"` con preset **`preset4` (Verde esmeralda)**.
- **Cambio Automático de Color:** Al completar la actividad en la app, Microsoft Graph actualiza la categoría y tiñe el bloque en verde; al desmarcarla, retorna al azul corporativo.

### 5.6 Sincronización Automática de Eventos con Microsoft Outlook
- Sincronización transparente bidireccional en segundo plano.
- Retirada de enlaces directos inestables de calendario; visualización garantizada en el calendario personal de Outlook.
- Protección backend contra concurrencia (`inFlightSyncs`) y deduplicación estricta de citas.

### 5.7 Sincronización Bidireccional de Fecha y Hora (Cambios en Outlook -> WebApp)
- Actualización reactiva por foco y visibilidad (`window.onfocus` / `document.visibilitychange`).
- Polling silencioso en segundo plano (cada 25s) y extracción exacta de hora bajo zona horaria `Europe/Madrid`.

### 5.8 Ergonomía Visual Ultra-Compacta y Sanitización
- Encabezado adaptable con visualización permanente de fecha, hora, ubicación y acciones rápidas.
- Sanitización de texto para suprimir guiones bajos acumulados (`____`) y firmas reiteradas.

### 5.9 Apertura Nativa en Outlook Classic (`dts-mail://` v2.3), Menú Secundario y Fallback Inteligente
- Protocolo `dts-mail://` v2.3 para apertura directa en ventana nativa en modo lectura en primer plano.
- Menú de 5 acciones secundarias (`Abrir Classic`, `Abrir Web`, `Responder`, `Buscar conversación`, `Copiar datos de búsqueda`).
- Detección asistida con modal de fallback para descargar el configurador `.bat` o abrir en versión web de forma instantánea.

## Apertura exacta de Classic: configuración y diagnóstico (15/10/2026)

| Componente | Responsabilidad |
| --- | --- |
| `frontend/src/pages/outlook-addin/OutlookClassicPage.tsx` | Sesión CRM, descarga, confirmación de código y revocación de equipos propios en `/outlook-classic`. |
| `frontend/src/api/outlookClassic.ts` | Selección de dispositivo, un lanzamiento por clic y consulta del resultado. |
| `backend/src/modules/exchange-sync/outlook-classic.controller.ts` | Rutas `/api/exchange-sync/classic`; JWT en operaciones del navegador, secretos o prueba firmada en las del componente. |
| `backend/src/modules/exchange-sync/outlook-classic.service.ts` | Permisos actuales, pertenencia del buzón, vinculación, caducidad y consumo único. |
| `outlook-classic/OutlookClassic.cs` | Clave privada cifrada por usuario Windows y apertura COM del mensaje exacto. |

Las tablas independientes `crm_outlook_devices` y `crm_outlook_requests` ya están creadas en Supabase y se han comprobado en modo solo lectura con RLS y permisos de la conexión backend. No se modifica ninguna tabla importada de BC. Una vinculación dura como máximo cinco minutos; cada apertura caduca a los 90 segundos. El backend conserva solicitudes recientes y limpia las caducadas con más de siete días al emitir otras nuevas.

La distribución interna sin firma Authenticode está aprobada. El ZIP se genera con `outlook-classic/Build.ps1` y contiene `Instalar_Outlook_dTS.bat`, `Vincular_Outlook_dTS.bat`, `Desinstalar_Outlook_dTS.bat` y el ejecutable. Descargarlo no acredita instalación. La falta de certificado no elimina la firma criptográfica de las solicitudes del equipo ni DPAPI.

Estado a 15/10/2026: Web aceptado en producción tras mover el mensaje; SQL de Classic aplicado y comprobado. Pendientes de confirmación: despliegue del código nuevo, activación de Classic, instalación, vinculación y recorrido completo con resultado autenticado. La localización real del correo sin mostrarlo ya está verificada. No se amplía todavía cobertura a PST, archivo en línea o buzones compartidos.

Véanse [manual de instalación, sección 7](../../manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic) y [procedimiento técnico de fase 4](../../propuestas/2026-10-15-fase-4-apertura-exacta-classic.md).

### Validación de apertura comunicada el 16/10/2026

El usuario confirma equipo vinculado y apertura correcta de correos enviados y recibidos, también después de mover el mensaje entre carpetas del mismo buzón. Este resultado actualiza el estado pendiente indicado en la entrega inicial del 15/10. No acredita todavía arranque con Classic cerrado, revocación o perfiles con varias cuentas. La siguiente fase revisa referencias antiguas y acciones compartidas; se mantiene el manejador heredado hasta completar su sustitución.

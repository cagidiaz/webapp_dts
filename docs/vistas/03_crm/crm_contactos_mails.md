# Vista: Contactos CRM y Pestaña de Emails (`CrmContactDetail.tsx`)

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
> Al registrar o modificar un correo con la tipología `CIERRE_ACEPTACION` vinculándolo a una oferta (`quoteDocumentNo`), el sistema actualiza automáticamente el estado de la oferta comercial en el CRM a **`ganada`** (100% de probabilidad de éxito).

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

### 3.2 Visualización Ergonómica de Correos (Límite de 5 Líneas)
- **Recorte Automático Inteligente**: Para evitar que correos extensos o hilos kilométricos saturen la vista y demanden desplazamientos interminables, cada correo muestra por defecto exclusivamente sus primeras **5 líneas** de contenido.
- **Expansor Interactivo "Ver más / Mostrar menos"**:
  - Al pie del mensaje aparece un botón sutil `Ver más (+N líneas)` que indica cuántas líneas adicionales contiene el cuerpo.
  - Al pulsar, expande el contenido íntegro y conmuta a `Mostrar menos` sin recargar la página.
- **Formato Monoespaciado y Legible**: El cuerpo del correo se renderiza en bloque estilizado con tipografía monoespaciada para respetar sangrías, tablas de texto y cotizaciones.

### 3.3 Badge Interactivo de Tipología con Selector Rápido
En cada tarjeta de correo (tanto en la pestaña de Emails como en el Timeline):
- Se muestra un badge redondeado con la tipología actual, su icono y flecha indicadora (`🚚 Oferta proveedor ▾`).
- **Cambio en 1 Clic**: El badge funciona como un `<select>` interactivo transparente superpuesto que permite reasignar la tipología en tiempo real sin abrir modales.
- **Consistencia en Base de Datos y Título**: Al cambiar la tipología, la mutación actualiza el campo `attendees.categoryTag` y reescribe de forma limpia el prefijo del título `[Dirección · Tipología] Asunto`.
- **Compatibilidad con Modo Oscuro**: Configurado con `scheme-light dark:scheme-dark` y opciones nativas con fondo corporativo `dark:bg-[#00222C]` y tipografía clara para máxima legibilidad en temas oscuros.

### 3.4 Vinculación y Badge de Oferta Comercial vs Tipología
- **Diferenciación Visual Estricta**:
  - El badge de tipología (`[ 🚚 Oferta proveedor ▾ ]`) define la naturaleza del email.
  - El badge de oferta (`[ 📄 Oferta: OFT-2026-XXXX (Importe €) ]`) representa el documento de Business Central vinculado.
- **Detección Blindada de Ofertas en Backend**:
  - El método de backend `enrichActivitiesWithQuoteInfo` descarta los prefijos entre corchetes (`^\[.*?\]\s*`) y exige dígitos numéricos obligatorios en el código de oferta (`/(?:OFT|COT|OFERTA|OF)[-_ ]?([0-9][A-Z0-9\-\/]*)/i`).
  - Esto evita falsos positivos donde la palabra "Oferta" de la tipología "Oferta proveedor" pudiera duplicarse como si fuera un número de documento comercial.

### 3.5 Acciones de Productividad con Microsoft Outlook (Online vs Classic)
- **Apertura de Correos Existentes**:
  - Cada tarjeta de correo (en la pestaña de Emails y en el Timeline) dispone del botón *"Abrir en Outlook"*.
  - **Detección Directa (`webLink` y `exchangeItemId`)**: Si el correo fue sincronizado mediante Microsoft Graph o importado desde el Add-in oficial, el sistema utiliza su `webLink` directo o construye la URL canónica de Microsoft 365 (`https://outlook.office.com/mail/deeplink?ItemID=...&exvsurl=1`), permitiendo abrir el mensaje exacto en la sesión de Outlook del comercial.
  - **Borradores**: Si el estado es `draft`, redirige a la carpeta de borradores de Outlook.
- **Redacción de Nuevos Correos ("Abrir y Preparar en Outlook")**:
  - Botón superior para generar un nuevo correo con selector dual de cliente (*Outlook de Escritorio* vs. *Outlook Online*).
  - **Soporte Multi-destinatario**: Admite múltiples correos en el campo principal "Para" (separados por coma, punto y coma o espacio) y un campo opcional desplegable "+ Añadir CC (Copia)".
  - **Plantillas Corporativas**: Carga plantillas tokenizadas (*Presentación*, *Seguimiento*, *Reunión*) que autocompletan el destinatario, asunto y cuerpo.
  - **Prevención de Popup Blocker en Outlook Online**: La WebApp pre-abre la pestaña (`about:blank`) de forma síncrona en el evento `click` del usuario, evitando que Chrome o Edge bloqueen la ventana emergente mientras Microsoft Graph genera el borrador en segundo plano. Al terminar, la pestaña navega directamente al borrador generado.
  - **Outlook Classic (Escritorio)**: Construye la URI nativa `mailto:destinatarios?cc=...&subject=...&body=...` y la dispara de forma no intrusiva para abrir Outlook Classic en Windows con todos los campos pre-cargados en un mensaje nuevo listo para revisar y enviar.
- **Sincronización Bidireccional**: Botón para actualizar estados de borradores que hayan sido completados o enviados desde Outlook.
- **Acceso desde el Listado de Contactos**: Al pulsar sobre el email de cualquier contacto en la tabla general de contactos (`/crm/contacts`), la WebApp respeta la preferencia del usuario y abre la ventana de redacción en su cliente preferido (Online o Classic).

---

## 4. Integración con el Add-in de Outlook (`OutlookAddinPage.tsx` y `outlook-addin.service.ts`)

### 4.1 Selección de Tipología en el Add-in
- Distribución equilibrada en 2 columnas de las 5 tipologías con sus iconos y colores correspondientes.
- La tipología seleccionada se envía en el payload como `categoryTag` y se persiste en `attendees: { categoryTag, quoteDocumentNo }`.

### 4.2 Detección, Búsqueda y Selección Manual de Contacto
- **Empresas y Contactos No Registrados**: Cuando entra o se envía un correo a un interlocutor no registrado en Supabase, el comercial puede buscar la empresa cliente (`customers`).
- **Selector Dinámico de Contactos**: Lista los contactos de Business Central para esa cuenta (`Nombre`, `Cargo/Rol`, `Email`) con buscador rápido.

### 4.3 Limpieza y Acortado de Contenido
- **Depuración de Firmas y Cláusulas Legales**: Eliminación automática de cláusulas RGPD/LOPD, avisos de confidencialidad y firmas pesadas.

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
- **Consistencia Visual Absoluta:** La barra de filtros por tipología de la pestaña de Eventos replica de forma exacta la experiencia y diseño de la pestaña de Emails:
  - Botón principal de **"Todos (N)"** con fondo azul corporativo (`bg-dts-primary text-white border-dts-primary shadow-xs`) cuando está activo.
  - Píldoras con bordes suaves (`rounded-lg border`), icono Lucide corporativo con su color semántico, etiqueta descriptiva y badge redondeado (`rounded-full font-mono`) con el contador dinámico en tiempo real (`count`).
  - Al seleccionarse un chip, este adopta su fondo semántico activo con texto blanco y badge traslúcido (`bg-white/25 text-white`).
  - Separador vertical sutil y selector de estado: `Todos` | `Pendientes (Clock)` | `Realizados (Check)`.

### 5.4 Estados de Finalización y Colores de Fondo en la WebApp
Para identificar al instante la situación operativa de cada cita o tarea, las tarjetas de la pestaña de Eventos y del Timeline aplican estilos semánticos dinámicos:
1. **Completado / Realizado (`isCompleted === true` o con conclusiones registradas):**
   - Fondo verde esmeralda sutil (`bg-emerald-500/8 dark:bg-emerald-950/20 border-emerald-500/25 dark:border-emerald-500/30`).
   - Badge distintivo `✓ Realizado` y título atenuado.
   - Badge de sincronización `Outlook (Completado)`.
2. **Vencido pendiente de conclusiones (`isPastDate && !conclusions`):**
   - Fondo ámbar de advertencia sutil (`bg-amber-500/8 dark:bg-amber-500/12 border-amber-300/70 dark:border-amber-500/30`).
   - Badge `Vencido · Pendiente` y acceso directo con 1 clic: `Añadir conclusiones para cerrar la actividad`.
3. **Pendiente / Programado a futuro:**
   - Fondo estándar limpio (`bg-white dark:bg-zinc-900/40 border-gray-200/70 dark:border-white/5`).
   - Badge `Outlook` en azul corporativo dTS.
4. **Checkbox de Realización Universal:**
   - Disponible en todas las actividades comerciales que no sean notas internas (visitas, videollamadas, llamadas, tareas y eventos espontáneos), permitiendo al comercial marcar o desmarcar la actividad en 1 solo clic.
5. **Modal Rápido de Cierre y Conclusiones:**
   - Al marcar una actividad pendiente, el sistema abre automáticamente un modal ligero y centrado que solicita registrar las conclusiones o acuerdos alcanzados.
   - Cuenta con botón principal *"Guardar y Completar"* (actualiza la actividad e inserta las conclusiones en el evento de Outlook) y opción rápida *"Completar sin conclusiones"*. Al reactivar una actividad completada, el checkbox conmuta directamente a pendiente.

### 5.5 Sincronización de Color y Estado en Microsoft Outlook
- **Categorías Maestras de Microsoft 365 (`outlook/masterCategories`):**
  - **Pendiente / Activo:** Categoría `"dTS CRM"` con preset de color **`preset7` (Azul corporativo dTS `#003E51`)**.
  - **Completado / Realizado:** Categoría `"dTS CRM - Completado"` con preset de color **`preset4` (Verde esmeralda / Green)**.
- **Cambio Automático de Color en el Calendario:**
  - Al marcar una actividad como realizada dentro de la app (o guardar conclusiones), Microsoft Graph actualiza el evento en el calendario de Outlook asignándole la categoría `"dTS CRM - Completado"`. Outlook tiñe automáticamente el bloque del evento en **verde**.
  - Si el usuario desmarca la actividad para reactivarla, Microsoft Graph reasigna la categoría `"dTS CRM"` y el evento vuelve a su color **azul corporativo**.
- **Identificación en el Asunto:**
  - Los eventos completados adoptan el prefijo `[✓ dTS CRM - Realizado: TipoActividad] Asunto (Cliente)`.

### 5.6 Apertura Canónica de Eventos en Outlook y Prevención de Duplicados
- **Deep Links Canónicos (`/calendar/item/<id>`):**
  - Al abrir un evento en Outlook Web, el sistema utiliza el identificador único del elemento (`exchange_item_id`) para generar la URL canónica directa: `https://outlook.office.com/calendar/item/<itemId>`.
  - Esta URL abre el evento directamente en modo visualización / lectura sobre la cuadrícula del calendario del usuario, evitando el compositor de eventos (`path=/calendar/item`) que en Outlook Web (OWA) provocaba dobles renderizados y la creación no intencionada de borradores o copias duplicadas.
- **Pestaña Unificada Nombrada (`OUTLOOK_WEB_TAB_NAME = 'dts_outlook_web'`):**
  - Se reutiliza la misma pestaña en el navegador para todas las aperturas de Outlook (tanto correos como eventos), previniendo que múltiples instancias compitan por la caché de sesión y desincronicen el calendario.
- **Protección Backend Contra Concurrencia (`inFlightSyncs`) y Deduplicación:**
  - `ExchangeSyncService` implementa un semáforo en memoria (`inFlightSyncs`) por actividad que bloquea llamadas simultáneas a `createCalendarEvent`.
  - Se verifica de nuevo en base de datos si la actividad ya posee `exchange_item_id` antes de crear en Microsoft Graph.
  - Se limpian de forma iterativa prefijos tipo `[dTS CRM...]` y sufijos de cliente repetidos para impedir acumulación de textos redundantes en el asunto de la cita.
  - Se protege la integridad de los datos evitando la eliminación destructiva de actividades locales si una consulta temporal a Graph devuelve 404 durante la replicación inicial de Exchange.

### 5.7 Sincronización Bidireccional de Fecha y Hora (Cambios en Outlook -> WebApp)
- **Actualización Prioritaria de Eventos Existentes:**
  - Cuando se procesa el delta de Microsoft Graph (`syncOutlookToCrm`), el sistema localiza en primer lugar si el evento ya existe en el CRM por su `exchange_item_id`.
  - No se exige la presencia de asistentes de correo (`attendees`) para eventos ya vinculados, permitiendo que citas individuales, visitas, tareas y reuniones sin convocatoria externa actualicen su fecha y hora en el CRM inmediatamente.
- **Extracción Exacta de Zona Horaria (Europe/Madrid):**
  - La fecha (`due_date`) y la hora (`time_scheduled`) se extraen de forma determinista descomponiendo directamente la cadena ISO `YYYY-MM-DDTHH:mm:ss` devuelta por Microsoft Graph bajo el encabezado `Prefer: outlook.timezone="Europe/Madrid"`, eliminando desfasajes provocados por diferencias horarias en servidores UTC.
- **Sincronización Reactiva y Automática en Tiempo Real:**
  - **Detección Inmediata por Foco y Visibilidad (`window.onfocus` / `document.visibilitychange`):** Al modificar o reprogramar un evento en Outlook (web o escritorio) y regresar a la WebApp (haciendo clic o cambiando de ventana), el navegador dispara de inmediato la sincronización con Microsoft Graph con un throttle inteligente de 5 segundos, reflejando la nueva hora en pantalla en milisegundos sin requerir interacción manual.
  - **Polling Silencioso en Segundo Plano (cada 25s):** Mientras la ventana permanezca visible (ideal para configuraciones multipantalla), un intervalo silencioso actualiza en segundo plano cualquier cambio originado en Outlook.
  - **Refresco Automático por Pestañas:** Al alternar entre las pestañas de **Eventos** y **Timeline**, el sistema asegura que la información de fechas y horas se mantenga 100% al día.
  - **Aviso Llamativo de Conclusiones Pendientes:** En eventos vencidos o marcados como realizados sin conclusiones registradas, la tarjeta se resalta en tono ámbar vibrante (`border-2 border-amber-400 bg-amber-500/10`) con el badge `FALTAN CONCLUSIONES` y un botón prominente `AGREGAR CONCLUSIONES` que abre directamente el modal ágil de cierre y conclusiones.

### 5.8 Ergonomía Visual Ultra-Compacta, Proporciones Tipográficas y Sanitización
- **Encabezado y Línea Divisoria Integrados con `flex-wrap`:**
  - El encabezado de la tarjeta agrupa en una fila adaptativa el checkbox de estado, badge de tipología, título, badges de sincronización/conclusiones, fecha/hora y acciones rápidas (`ExternalLink`, `Edit2`, `Trash2`).
  - La línea divisoria horizontal inferior (`border-b border-gray-200 dark:border-zinc-700/70`) separa nítidamente el encabezado del contenido.
- **Tipografía Optimizada y Legible:**
  - Título del evento a 13.5px (`text-[13.5px] font-semibold`), badges a 9.5px, fecha/hora/ubicación a 11px, y cuerpo de descripción a 12.5px (`text-[12.5px] leading-snug`), logrando un equilibrio visual impecable entre compacidad y comodidad de lectura.
- **Badge Interactivo de Conclusiones:**
  - El badge `VENCIDO · FALTAN CONCLUSIONES` se presenta sin negrita (`font-normal text-[9px]`) y actúa como un disparador directo (`cursor-pointer`) que abre el modal de registro de conclusiones al hacer clic sobre él.
  - Al pie del detalle se proporciona un enlace discreto `+ Registrar conclusiones` en lugar de barras desproporcionadas.
- **Sanitización y Supresión de Boilerplate de Outlook (`cleanActivityDescription` / `cleanOutlookBody`):**
  - Se eliminan tanto en frontend como en backend las líneas de separación con guiones bajos (`________________________________`), bloques de encabezado repetidos (`Actividad de CRM dTS Instruments...`) y saltos vacíos múltiples que Microsoft Graph introducía al sincronizar citas hacia la base de datos.
  - El detalle muestra exclusivamente el contenido real y útil del evento, logrando una presentación ordenada, limpia y profesional.

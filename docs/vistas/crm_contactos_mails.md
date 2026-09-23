# Vista: Contactos CRM y Pestaña de Emails (`CrmContactDetail.tsx`)

## 1. Descripción General
La vista de detalle de contacto en el CRM (`/crm/contacts/:id`) centraliza la información comercial, perfil del interlocutor, histórico de interacciones, cartera de ofertas vinculadas y el registro cronológico de correos electrónicos sincronizados con Microsoft Outlook y Exchange.

---

## 2. Pestaña de Emails (`activeTab === 'emails'`)

### 2.1 Visualización Ergonómica de Correos (Límite de 5 Líneas)
- **Recorte Automático Inteligente**: Para evitar que correos extensos o hilos kilométricos saturen la vista y demanden desplazamientos interminables, cada correo muestra por defecto exclusivamente sus primeras **5 líneas** de contenido.
- **Expansor Interactivo "Ver más / Mostrar menos"**:
  - Al pie del mensaje aparece un botón sutil `Ver más (+N líneas)` que indica cuántas líneas adicionales contiene el cuerpo.
  - Al pulsar, expande el contenido íntegro y conmuta a `Mostrar menos` sin recargar la página.
- **Formato Monoespaciado y Legible**: El cuerpo del correo se renderiza en bloque estilizado con tipografía monoespaciada para respetar sangrías, tablas de texto y cotizaciones.

### 2.2 Vinculación y Badge Interactivo de Oferta Comercial
- **Identificación de Oferta Asignada**: Si el correo fue vinculado a una cotización (desde el Add-in de Outlook o desde la WebApp), la cabecera de la tarjeta del email presenta un distintivo corporativo azul:
  ```
  📄 Oferta: OFT-2026-XXXX (Importe €)
  ```
- **Apertura Inmediata del Drawer de la Oferta**: Al hacer clic sobre el badge de la oferta, se abre de inmediato el **Drawer lateral** con todos los datos comerciales de la cotización (estado, probabilidad, importe, próximas acciones y actividades históricas) sin abandonar la ficha del contacto.

### 2.3 Filtro de Correos por Oferta Comercial
- **Selector Desplegable en la Cabecera**:
  - `Todas las ofertas y correos (Total)`
  - `Solo vinculados a alguna oferta`
  - `Sin oferta vinculada (Generales)`
  - Grupos de ofertas específicas: lista cada oferta comercial asignada con su código, el conteo exacto de correos vinculados (`N correos`) y su importe económico en euros.
- **Filtrado Reactivo Instantáneo**: Al cambiar de opción, el listado se filtra en milisegundos con mensajes explicativos si no hay correos que cumplan el criterio seleccionado.

### 2.4 Acciones de Productividad con Microsoft Outlook
- **Abrir en Outlook**: Cada tarjeta cuenta con un acceso directo para abrir el mensaje específico en Outlook (Web o aplicación de escritorio según la preferencia configurada).
- **Redactar Correo en Outlook**: Botón superior para generar un nuevo correo con plantillas tokenizadas (*Presentación*, *Seguimiento*, *Reunión*) que precarga el destinatario, asunto y cuerpo en el cliente de Outlook del usuario.
- **Sincronización Bidireccional**: Botón para actualizar estados de borradores enviados o cambios producidos en el buzón.

---

## 3. Integración con el Add-in de Outlook (`OutlookAddinPage.tsx` y `outlook-addin.service.ts`)

### 3.1 Detección, Búsqueda y Selección Manual de Contacto
- **Empresas y Contactos No Registrados**: Cuando entra o se envía un correo a un interlocutor no registrado en Supabase, el comercial puede buscar la empresa cliente (`customers`).
- **Selector Dinámico de Contactos**:
  - Al seleccionar la empresa (o detectarse por dominio), el Add-in consulta y lista automáticamente todos los contactos registrados en Business Central para esa cuenta.
  - El desplegable muestra `Nombre`, `Cargo/Rol` y `Email`.
  - Incluye filtro de texto rápido para empresas con múltiples contactos.
  - Preselección automática si el remitente coincide con el nombre de algún contacto.
  - Opción por defecto de archivar a nivel general de empresa si no se asigna persona específica.

### 3.2 Limpieza y Acortado de Contenido
- **Depuración de Firmas y Cláusulas Legales**:
  - El Add-in aplica filtros mediante expresiones regulares para eliminar avisos legales de protección de datos (RGPD / LOPD), cláusulas de confidencialidad en español e inglés, delimitadores de firma (`--`, `___`) y cadenas de citas previas redundantes (`De: ... Enviado el: ...`).
- **Normalización de Espacios**: Limita saltos de línea repetidos a un máximo de 2 y recorta cadenas superiores a 4.000 caracteres para optimizar almacenamiento en CRM.

### 3.3 Almacenamiento Estructurado de la Oferta Vinculada
- Al asociar una cotización en el Add-in (`quoteDocumentNo`), el sistema persiste el número de oferta en el campo JSONB `attendees` (`{ quoteDocumentNo }`) de la tabla `crm_activities`, además de crear la correspondiente actividad en `sales_quote_activities`.
- Esto permite la correlación cruzada tanto para auditorías comerciales como para los filtros de la WebApp.

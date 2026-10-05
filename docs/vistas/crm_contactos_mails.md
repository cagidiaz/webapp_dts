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

### 3.5 Acciones de Productividad con Microsoft Outlook
- **Abrir en Outlook**: Cada tarjeta cuenta con un acceso directo para abrir el mensaje específico en Outlook (Web o aplicación de escritorio según la preferencia configurada).
- **Editar Correo (`EditActivityModal.tsx`)**: Botón con icono de lápiz para editar el asunto, cuerpo, notas o tipología en una botonera en cuadrícula.
- **Redactar Correo en Outlook**: Botón superior para generar un nuevo correo con plantillas tokenizadas (*Presentación*, *Seguimiento*, *Reunión*) que precarga el destinatario, asunto y cuerpo en el cliente de Outlook del usuario.
- **Sincronización Bidireccional**: Botón para actualizar estados de borradores enviados o cambios producidos en el buzón.

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

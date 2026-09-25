# Manual de Usuario — WebApp dTS Instruments

> Guía operativa y técnica del sistema **dTS Instruments WebApp**. Este documento describe el funcionamiento de cada módulo, la interpretación de KPIs, el flujo de datos sincronizado con Microsoft Dynamics 365 Business Central y las herramientas de productividad comercial.

---

## 📑 Índice de Módulos
1. [Panel de Control (Dashboard Principal)](#1-panel-de-control-dashboard-principal)
2. [Módulo de Ventas y Gestión Comercial](#2-módulo-de-ventas-y-gestión-comercial)
   - [2.1 Cartera de Clientes & Inteligencia Geográfica](#21-cartera-de-clientes--inteligencia-geográfica)
   - [2.2 Presupuestos y Seguimiento de Objetivos (Ventas vs Ppto)](#22-presupuestos-y-seguimiento-de-objetivos-ventas-vs-ppto)
   - [2.3 Presupuesto por Product Manager (PM)](#23-presupuesto-por-product-manager-pm)
   - [2.4 Pedidos de Venta (Cartera y Pendientes)](#24-pedidos-de-venta-cartera-y-pendientes)
   - [2.5 Catálogo de Productos y Stock](#25-catálogo-de-productos-y-stock)
   - [2.6 Histórico de Facturación (Documentos y Líneas)](#26-histórico-de-facturación-documentos-y-líneas)
   - [2.7 Movimientos de Valor (Auditoría de value_entries)](#27-movimientos-de-valor-auditoría-de-value_entries)
3. [Módulo de CRM y Productividad Comercial](#3-módulo-de-crm-y-productividad-comercial)
   - [3.1 CRM de Ofertas y Pipeline Comercial](#31-crm-de-ofertas-y-pipeline-comercial)
   - [3.2 Contactos, Cuentas y Timeline de Actividades](#32-contactos-cuentas-y-timeline-de-actividades)
   - [3.3 Pestaña de Emails y Envío Directo por Exchange](#33-pestaña-de-emails-y-envío-directo-por-exchange)
   - [3.4 Complemento de Outlook (Add-in dTS CRM)](#34-complemento-de-outlook-add-in-dts-crm)
4. [Módulo de Compras](#4-módulo-de-compras)
   - [4.1 Directorio de Proveedores](#41-directorio-de-proveedores)
   - [4.2 Pedidos de Compra](#42-pedidos-de-compra)
5. [Módulo de Finanzas y Análisis Económico](#5-módulo-de-finanzas-y-análisis-económico)
   - [5.1 Análisis de Balances y Cuentas de Resultados](#51-análisis-de-balances-y-cuentas-de-resultados)
   - [5.2 4 Puntos Clave y 20 Ratios Financieros](#52-4-puntos-clave-y-20-ratios-financieros)
   - [5.3 Gráficos de Ratios y Simulador Financiero](#53-gráficos-de-ratios-y-simulador-financiero)
6. [Configuración, Seguridad y Control de Acceso (RBAC)](#6-configuración-seguridad-y-control-de-acceso-rbac)
   - [6.1 Ajustes Generales y Preferencias de Outlook](#61-ajustes-generales-y-preferencias-de-outlook)
   - [6.2 Generador de Presupuestos de Ventas (Plantillas Excel)](#62-generador-de-presupuestos-de-ventas-plantillas-excel)
   - [6.3 Gestión de Usuarios y Roles](#63-gestión-de-usuarios-y-roles)
   - [6.4 Inmutabilidad y Seguridad de Datos](#64-inmutabilidad-y-seguridad-de-datos)

---

## 1. Panel de Control (Dashboard Principal)
El **Panel de Control** (`/dashboard`) es el centro de mando visual para la monitorización ejecutiva y comercial en tiempo real.

* **Tarjetas KPI Superiores**:
  * **Ventas YTD vs Ppto YTD**: Compara la facturación neta real acumulada desde el 1 de enero hasta la fecha actual con el presupuesto acumulado proporcional exacto (*día a día*).
  * **Clientes Nuevos**: Panel de captación con desglose de facturación generada por clientes captados en el año (`FACT`), total de nuevas altas registradas (`TOTAL`) y clientes nuevos sin venta inicial (`S/VTA`).
  * **Cartera de Pedidos y Pendientes**: Muestra el total valorado de pedidos de venta abiertos (`CARTE`) y la mercancía despachada pendiente de emitir factura (`PEND`).
  * **Objetivo Anual (Velocímetro)**: Medidor circular interactivo que refleja el porcentaje de consecución del presupuesto total de facturación anual.
* **Gráficos de Tendencia**:
  * **Evolución Mensual (Real vs Presupuesto vs LY)**: Gráfico de barras combinadas con la facturación real mensual (azul corporativo `#003E51`), el objetivo fijado (cian `#00B0B9`) y una línea punteada de referencia con las ventas del año anterior (*Last Year*), permitiendo analizar estacionalidad y desvíos.
* **Adaptación por Rol**:
  * Los roles `ADMIN` y `DIRECCION` acceden a la visión consolidada corporativa.
  * Los roles `VENTAS` y `OPERACIONES` cargan de forma predeterminada el panel comercial filtrado por su ámbito de asignación.

---

## 2. Módulo de Ventas y Gestión Comercial

### 2.1 Cartera de Clientes & Inteligencia Geográfica
Ubicado en `/sales/customers`, ofrece un directorio analítico de clientes con facturación multianual (2023–2026 YTD), plazos de pago y geolocalización cartográfica.

* **Mapa Interactivo de Inteligencia Geográfica (Península Ibérica, Canarias y Portugal)**:
  * Proyección cartográfica dual D3 con recuadro específico e inset dedicado para Canarias.
  * **Filtrado Geográfico Bidireccional**: Al hacer clic en cualquier provincia o distrito, el territorio se resalta con relleno cian (`#00B0B9`) y contorno blanco de `1.3px`, atenuando las demás zonas y filtrando simultáneamente el ranking lateral y la tabla de clientes.
  * **Conmutación Instantánea (0 ms)**: Permite saltar de una provincia a otra de manera inmediata sin tiempos de espera.
  * **Pin Vectorial 3D Verde Esmeralda**: Al pasar el ratón sobre cualquier cliente del ranking o del mapa, proyecta su posición geográfica exacta con un halo de radar concéntrico.
* **Días Reales de Cobro (Cálculo Híbrido Contractual + Mora)**:
  * Combina los términos contractuales de Business Central (`payment_terms_code`, ej. *Contado*, *30d*, *60d*) con el cálculo proporcional de retraso por saldo vencido impagado (`balance_due_lcy > 0`).
  * Muestra el plazo al corriente (ej. `30d`) o con badge de advertencia si existe demora (ej. `78d (+18d mora)`).
* **Mercado Internacional / Exportación**:
  * Identificación automática de clientes con sede fuera de España y Portugal con su respectiva bandera nacional y código de país.
  * Botón interactivo en cabecera del mapa (`🌍 Ver Internacionales`) para filtrar simultáneamente en servidor (`territory=INTL`) y visualizar de forma dedicada los clientes extranjeros en el ranking lateral y la tabla.
* **Tabla de Alto Rendimiento y Filtros Avanzados**:
  * Scroll continuo y memoización de filas con buffer de 40 clientes.
  * Columnas secundarias (*Territorio*, *Mercado*, *Mod. Negocio*) configurables en el popover selector y optimizadas para evitar scroll horizontal.
  * Filtros por Tipo de Cliente (A–F), Términos de Pago, Vendedor, Portes y Mercado (con desplegable acotado a 5 elementos visibles).
  * Exclusión de clientes comodín de sistema (`9999999`).
  * Exportación completa a Excel (`.xlsx`) con desglose de días pactados, demora y totales.

---

### 2.2 Presupuestos y Seguimiento de Objetivos (Ventas vs Ppto)
Ubicado en `/sales/budgets`, es la pantalla neurálgica de seguimiento del grado de cumplimiento comercial frente al plan anual de dTS Instruments.

* **Bandeja Superior de KPIs**:
  * **Facturación (Items)**: Facturación neta devengada exclusivamente en líneas de catálogo (`Item`), aislando costes accesorios y anticipos para una comparación estrictamente homogénea frente al presupuesto anual.
  * **Objetivo Presupuestado**: Cuota comercial acumulada en el periodo seleccionado.
  * **Desviación Nominal (€) y Cumplimiento (%)**: Brecha absoluta y porcentual con código de color dinámico (verde para superávit, rojo para déficit) y micro-indicadores visuales.
  * **Cartera de Pedidos (Neta)** y **Pendiente de Facturar (Neto)**: Pedidos abiertos y albaranes entregados sin facturar, netos de la deducción cliente por cliente de prepagos vivos aplicados.
* **Modal de Transparencia Contable (`InfoPopover`)**:
  * Al pulsar el icono `ℹ️` en Facturación, se despliega una ventana informativa con el desglose completo del periodo: *Venta Neta de Producto*, *Portes y Transportes (Cuenta 624)*, *Otras Cuentas Contables*, *Prepagos Vivos (PFV)* y *Total Facturación Documental*.
* **Selector de Pestañas Principales**:
  * **`[ 🏢 Por Clientes ]`**: Vista analítica clásica desagregada cliente a cliente con scroll infinito reactivo, badges para clientes nuevos (`NUEVO`), detección de saldo en prepagos vivos (`Prepago: X €`), tratamiento de meta agregada para clientes nuevos (`99999999`) y fila de totales fijos.
  * **`[ 👥 Por Comercial ]`** (o **`[ 👤 Mi Rendimiento ]`** para usuarios con rol comercial): Tabla de control y productividad comercial con 3 sub-pestañas especializadas:
    1. *Rendimiento y Cumplimiento*: FV Producto, AAV Producto, Facturación Neta Items, Facturación Año Anterior (LYTD), Presupuesto, Desviación y Barra de Progreso de Cumplimiento.
    2. *Desglose Contable y Prepagos*: Facturas (FV), Prepagos (PFV), Abonos (AAV), Total Documental, Portes (624), Otras Cuentas y Prepagos Vivos.
    3. *Cartera y Previsión*: Facturación actual, Cartera Neta, Pendiente Facturar, Prepagos Deducidos, Clientes Nuevos captados y Previsión Total a Cierre de Ejercicio.
* **Control de Acceso (RBAC)**: Los comerciales conectados sólo visualizan sus propios datos personales en la pestaña *Mi Rendimiento*, mientras que Dirección y Administradores disponen de la visión global del equipo y el sumatorio consolidado.
* **Exportación a Excel Contextual**: Genera el archivo Excel adaptado a la pestaña activa (desglose de clientes o reporte de 18 columnas de comerciales).
* **Rendimiento Ultrarrápido y Reactividad**: Incorpora caché en memoria para resolución de familias/artículos, optimización de consultas B-tree por rangos de fecha e indicadores de carga no destructivos (`Loader2`) en las tarjetas KPI.

---

### 2.3 Presupuesto por Product Manager (PM)
Ubicado en `/sales/product-budgets`, enfocado al análisis presupuestario por línea de producto, marca y responsable técnico (Product Manager).

* **Unificación Total de Orígenes de Datos**:
  * Utiliza **las mismas tablas documentales** que Ventas vs Presupuestos (`sales_documents` y `sales_document_lines`), garantizando que la cifra de Facturación (Items) y los KPIs coincidan al céntimo en ambas vistas (ej. 1.524.189,01 € en 2026).
* **Desglose Jerárquico por Cliente ➔ Producto (SKU)**:
  * Cada cliente se puede expandir mediante una flecha interactiva para auditar qué referencias concretas de catálogo ha comprado, su facturación por artículo, su presupuesto asignado y su desviación.
  * Se visualiza junto a cada cliente su saldo vivo en anticipos (`Prepago: X €`) y su condición de cliente nuevo si corresponde.
* **Detección Automática de Rol PM**:
  * Si el usuario conectado es Product Manager, el sistema fija automáticamente su código PM y restringe el ámbito a su catálogo de productos asignado.
* **Gráfico de Evolución Mensual Unificado**:
  * Refleja la suma de líneas de producto mes a mes, coincidiendo exactamente la suma de las 12 barras con la tarjeta de facturación y el pie de tabla.
* **Optimización de Filtros y Líneas**: Búsqueda acelerada por subconsultas restringidas a referencias activas del PM y respuesta instantánea al alternar meses.

---

### 2.4 Pedidos de Venta (Cartera y Pendientes)
Ubicado en `/sales/orders`, centraliza los pedidos abiertos sincronizados desde Dynamics 365 Business Central.

* **Cartera Abierta**: Pedidos confirmados en fase de preparación o suministro.
* **Valoración Neta Real**: Cálculo del importe efectivo mediante `(line_amount / quantity)` excluyendo líneas a coste cero.
* **Desglose de Cuentas G/L**: Separación transparente entre artículos físicos y líneas de servicios o cuentas contables.

---

### 2.5 Catálogo de Productos y Stock
Ubicado en `/sales/products`, proporciona la consulta técnica y disponibilidad de inventario de dTS Instruments.

* **Disponibilidad en Almacén**: Stock físico actual, cantidades reservadas en pedidos abiertos y stock disponible neto.
* **Precios y Tarifas**: Precios base unitarios, costes estándar y familias de producto.

---

### 2.6 Histórico de Facturación (Documentos y Líneas)
Ubicado en `/sales/invoices`, consolida todas las facturas y abonos emitidos por la empresa.

* **Desglose Expandible de Líneas**: Consulta detallada de artículos, servicios, precios netos, descuentos y margen por línea (`line_no`).
* **KPIs Superiores de Facturación**: Facturación neta total, margen real medio ponderado (%), número de documentos emitidos y volumen total de descuentos concedidos.
* **Exportación Avanzada**: Descarga en Excel incluyendo la cabecera del documento y todas sus líneas desglosadas.

---

### 2.7 Movimientos de Valor (Auditoría de value_entries)
Ubicado en `/sales/value-entries`, vista de auditoría transaccional directa restringida a los roles `ADMIN` y `DIRECCION`.

* **Trazabilidad Completa**: Número de movimiento, fecha contable, tipo de documento (Factura o Abono), código de producto, cliente, cantidad, importes de venta y costes reales asociados.
* **Búsqueda Reactiva y Ordenación**: Filtros dinámicos en todas las columnas y exportación a Excel.

---

## 3. Módulo de CRM y Productividad Comercial

### 3.1 CRM de Ofertas y Pipeline Comercial
Ubicado en `/sales/quotes` (y `/crm/pipeline`), gestiona el ciclo de vida de las cotizaciones y oportunidades de venta.

* **Vista Tablero Kanban Interactivo**:
  * Columnas por estado: *Borrador*, *Enviada*, *En Negociación*, *Ganada* o *Perdida*.
  * Arrastrar y soltar (Drag & Drop) para avanzar el estado comercial de las ofertas.
* **Vista Tabla Compacta**: Listado tabular con filtros por ejercicio, comercial, tipo de oferta (*Proyecto*, *Comercial Nuevo*, *Comercial Existente*) y probabilidad de éxito.
* **Indicadores Clave del Pipeline**:
  * **Pipeline Activo**: Sumatorio nominal de cotizaciones abiertas.
  * **Previsión Ponderada**: Estimación probabilística calculada como `∑(Importe × Probabilidad / 100)`.
  * **Tasa de Cierre**: Porcentaje de éxito de ofertas ganadas sobre el total de resueltas.
  * **Seguimiento Vencido**: Oportunidades cuya fecha de próxima acción está vencida.
* **Drawer Lateral de Oferta**: Edición rápida de próxima acción, fecha límite, notas del comercial y sincronización bidireccional automática con la agenda de tareas.

---

### 3.2 Contactos, Cuentas y Timeline de Actividades
Ubicado en `/crm/contacts` y `/crm/customers`.

* **Directorio de Interlocutores**: Registro de personas de contacto por empresa (nombre, cargo, teléfono, email, notas y ubicación).
* **Localización Física del Contacto y Centros de Trabajo**:
  * Registro de dirección específica del interlocutor (`address`, `address2`, `city`, `post_code`, `county`, `territory_code`).
  * Tarjeta de centro de trabajo en la pestaña *Información* con enlace directo a Google Maps y modal de edición rápida.
  * Búsqueda global y en tabla filtrable por localidad, provincia o código de territorio.
* **Timeline Histórico de Actividades**: Registro cronológico de reuniones, llamadas, notas comerciales y correos electrónicos vinculados al cliente.
* **Gestión de Eventos y Reuniones Presenciales**:
  * Autocompletado jerárquico prioritario: si el contacto dispone de centro de trabajo propio registrado, se utiliza su dirección; de lo contrario, se aplica la sede social de la empresa matriz.
  * Botones de restauración rápida para alternar entre la sede del contacto y la de la empresa con un solo clic.
* **Sincronización Bidireccional de Calendario con Microsoft Outlook**:
  * Categorización visual automática con la etiqueta corporativa **`dTS CRM`** (Azul dTS).
  * Detección activa de eliminaciones: si una reunión o tarea es eliminada directamente en el calendario de Outlook, el CRM la detecta y purga de inmediato en la base de datos local.
  * Botón directo de **"Sincronizar"** en la pestaña de Eventos y actualización en segundo plano al cambiar de pestaña.

---

### 3.3 Pestaña de Emails, Preparación de Correos y Apertura en Outlook
Integrada en la ficha del contacto/cliente en el CRM (`/crm/contacts/:id?tab=emails`). Para especificaciones técnicas detalladas, consultar [Documentación de Vista: Contactos CRM y Pestaña de Emails](file:///c:/proyectos/webapp_dts/docs/vistas/crm_contactos_mails.md).

* **Visualización Optimizada de Correos (Límite de 5 Líneas)**:
  * Cada correo muestra por defecto exclusivamente sus primeras **5 líneas** para garantizar una navegación ágil y compacta sin saturar la pantalla.
  * Botón interactivo **"Ver más (+N líneas)"** / **"Mostrar menos"** que expande y colapsa el texto íntegro en tiempo real.
* **Badge Interactivo de Oferta Comercial**:
  * Si el correo fue asociado a una cotización comercial, se muestra un distintivo azul con su código e importe (ej. `📄 Oferta: OFT-2026-0014 (4.500 €)`).
  * Al hacer clic sobre el badge, se abre de inmediato el **Drawer lateral** de la oferta con todos sus detalles sin abandonar la ficha del contacto.
* **Filtro de Correos por Oferta**:
  * Desplegable en la cabecera que permite filtrar: *Todas las ofertas y correos*, *Solo con oferta vinculada*, *Sin oferta (Generales)* o por una *Oferta Específica* con indicación de su número de correos acumulados.
* **Preparación Directa en Outlook (Sin Envío Automático)**:
  * El comercial redacta el correo o carga una plantilla corporativa en la WebApp y, al pulsar **"Abrir y Preparar en Outlook"**, el sistema genera el nuevo correo en Outlook con todos los datos precargados (destinatario, asunto y cuerpo).
  * Permite al comercial revisar el texto, adjuntar archivos o catálogos PDF y pulsar **"Enviar"** directamente desde Outlook.
* **Memorización de Preferencia (Escritorio vs Web)**:
  * El usuario selecciona su cliente preferido (**Outlook de Escritorio** o **Outlook Web Microsoft 365**) y la WebApp **recuerda su elección de forma permanente en el navegador (`localStorage`)**, no teniendo que volver a seleccionarlo en usos posteriores.
* **Botón Directo "Abrir en Outlook"**:
  * En cada tarjeta de email de la pestaña *Emails*, en los eventos de correo del *Timeline* y en el botón de email de la cabecera del contacto, se incluye la acción **"Abrir en Outlook"** para acceder inmediatamente al mensaje o hilo en Outlook con un clic.
* **Utilidad "Copiar Texto"**: Botón rápido para copiar el asunto y cuerpo al portapapeles con un clic para pegarlo en hilos existentes.
* **Trazabilidad Automática en el CRM**: Registra la actividad en el Timeline del contacto como interacción de correo electrónico.
* **Plantillas Comerciales**: Modelos precargados (*Presentación dTS*, *Seguimiento de Oferta*, *Reunión técnica*) con tokenización dinámica del cliente y comercial.

---

### 3.4 Complemento de Outlook (Add-in dTS CRM)
Extensión oficial integrada en la cinta de opciones de Microsoft Outlook (Web, Escritorio Windows y Mac). Para instrucciones completas de instalación ver [Guía de Instalación y Despliegue del Add-in de Outlook](file:///c:/proyectos/webapp_dts/docs/manual-instalacion-addin-outlook.md).

* **Botón Ribbon "Registrar en dTS CRM"**: Acceso en caliente desde la barra superior de Outlook mientras se lee o redacta cualquier correo en Windows, Mac o Web.
* **Carga Inmediata y Skeleton Loading**: Apertura instantánea con animación estructurada corporativa dTS, desacoplando la lectura pesada del cuerpo del correo para iniciar la consulta al CRM en milisegundos.
* **Presentación Limpia y Ergonómica**: Visualización directa de las direcciones de correo en los campos **De:** y **Para:**, eliminando etiquetas superfluas y aprovechando todo el ancho del panel.
* **Detección Contextual Inteligente**: Reconocimiento automático del contacto y empresa (evalúa el remitente en recibidos o el destinatario en enviados).
* **Asociación y Selección Manual de Contactos por Empresa**:
  * Cuando el remitente no está registrado previamente, el comercial puede buscar la empresa cliente (`customers`).
  * Al seleccionar o detectar una empresa, se despliega un **selector dinámico de contactos** con todos los interlocutores de dicha cuenta registrados en Business Central (`Nombre`, `Cargo/Rol`, `Email`), incluyendo un buscador rápido por texto.
  * Sugerencia automática del contacto si el nombre del interlocutor coincide con alguno de los contactos de la empresa.
  * Opción flexible de asignación manual de contacto o archivo a nivel general de empresa.
* **Vinculación a Ofertas Dinámica y Opcional**:
  * Al asociar una empresa, se cargan de inmediato sus ofertas comerciales abiertas para vincular el correo a la cotización correspondiente.
  * El número de oferta se persiste de forma estructurada en `attendees: { quoteDocumentNo }` para su explotación en el CRM.
* **Etiquetado Comercial por Tipología**: Clasificación en un clic (`📄 Cierre / Aceptación`, `⚙️ Especificación Técnica`, `💬 Negociación`, `⚠️ Incidencia / Postventa`, `✉️ General`).
* **Limpieza y Acortado Inteligente de RGPD y Firmas**:
  * Filtro automático robusto de cláusulas legales de privacidad (RGPD / LOPD en español e inglés), cadenas repetitivas de reenvíos (`De: ... Enviado el: ...`), firmas pesadas y normalización de saltos de línea continuos.
* **Prevención Activa de Duplicados**: Detección por identificador único de Microsoft Graph (`✓ Ya registrado en dTS CRM`).
* **Resumen de Destino Previo al Guardado**: Tarjeta de confirmación visual que muestra la empresa cliente y el contacto vinculado antes de pulsar guardar.

---

## 4. Módulo de Compras

### 4.1 Directorio de Proveedores
Ubicado en `/purchases/vendors` (Acceso para roles `ADMIN`, `DIRECCION` y `OPERACIONES`). Para documentación técnica y operativa exhaustiva, consultar [Documentación de Vista: Cartera de Proveedores](file:///c:/proyectos/webapp_dts/docs/vistas/compras_proveedores.md).

* **Directorio Maestro de Proveedores**: Listado sincronizado en tiempo real desde Business Central con filtros por búsqueda de texto, ejercicio anual y estado de bloqueo.
* **Mapa Geoespacial Interactivo D3 Mundial (`WorldGeoVendorsMap`)**:
  * Cartografía global vectorial TopoJSON de alta fidelidad con proyección D3 Mercator.
  * Inferencia inteligente de países de origen mediante códigos ISO, prefijos VAT y sedes de fabricantes.
  * Selector de métrica en mapa (Volumen de compras € vs Deuda viva €).
  * Presets de zoom regional rápido (Mundo, Europa, España, América, Asia).
  * Panel lateral con Top 5 de países y filtrado interactivo bidireccional sobre la tabla con un clic.
* **KPIs Financieros de Compras**: Cartera total de proveedores, volumen de compras devengadas (`value_entries`), saldo vivo de deuda pendiente y alertas de saldo vencido.
* **Drawer Lateral de Detalle del Proveedor (`VendorDetailDrawer`)**: Consulta rápida con condiciones comerciales y de pago pactadas (días de crédito, forma de pago, moneda), datos fiscales, pedidos abiertos de compra y facturación histórica.
* **Exportación a Excel**: Descarga estructurada con filtros aplicados y formato de importes.

### 4.2 Pedidos de Compra
Ubicado en `/purchases/orders`.

* **Cartera de Compras**: Consulta integral de pedidos de aprovisionamiento emitidos a fabricantes y proveedores.
* **Seguimiento de Recepción**: Control de líneas de pedido, cantidades pendientes de recibir, fechas prometidas de entrega y albaranes de recepción asociados.
* **Exportación a Excel**: Descarga de pedidos de compra para control de aprovisionamiento y logística.

---

## 5. Módulo de Finanzas y Análisis Económico

*(Acceso exclusivo para roles de Dirección y Administración).*

### 5.1 Análisis de Balances y Cuentas de Resultados
Ubicado en `/finance/balances`.

* Estructura financiera patrimonial (Activo Corriente, No Corriente, Pasivo y Patrimonio Neto) y Cuenta de Pérdidas y Ganancias multianual.

### 5.2 4 Puntos Clave y 20 Ratios Financieros
Ubicado en `/finance/key-points` y `/finance/ratios-table`.

* **4 Puntos Clave**: Liquidez, Solvencia, Rentabilidad y Endeudamiento.
* **20 Ratios Financieros**: Cuadro de mando económico con ratios de liquidez inmediata, rotación de activos, período medio de cobro/pago, margen EBITDA y ROE/ROA.

### 5.3 Gráficos de Ratios y Simulador Financiero
Ubicado en `/finance/ratios-charts` y `/finance/simulations`.

* Proyecciones dinámicas y simulaciones de escenarios económicos para la toma de decisiones estratégicas.

---

## 6. Configuración, Ajustes y Control de Acceso (RBAC)

### 6.1 Ajustes Generales y Preferencias de Outlook (`/settings`)
*(Disponible para todos los roles: `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`)*

* **Integración con Microsoft 365 (Microsoft Graph)**:
  * Vinculación segura OAuth 2.0 con el buzón corporativo de dTS Instruments.
  * Diagnóstico del estado de la conexión, visualización del correo vinculado y estado de sincronización.
  * **Detección de Sesión Expirada**: Aviso específico si el token requiere consentimiento interactivo (`AADSTS65001 / consent_required`) con botón de un clic para **"Reconectar con Microsoft 365"**.
  * Botones para forzar sincronización manual de borradores y eventos o desconectar la cuenta.
* **Cliente de Outlook Predeterminado**:
  * Selector dual entre **Outlook de Escritorio (App Windows/Mac)** y **Outlook Web (Microsoft 365)**.
  * Memorización persistente en el navegador local (`localStorage`).
  * Botón de prueba inmediata para validar la apertura de Outlook.

### 6.2 Generador de Presupuestos de Ventas (Plantillas Excel) (`/settings/budget-generator`)
*(Acceso configurable dinámicamente mediante la matriz de permisos de rol `role_modules` desde Gestión de Usuarios)*

* **Propósito**: Automatiza la confección de plantillas de trabajo en Excel para la elaboración del presupuesto de ventas del ejercicio siguiente (ej. 2027 a partir del año en curso 2026).
* **Parámetros Configurables**:
  * **Comercial / Vendedor**: Permite descargar la plantilla global consolidada o segmentada para un comercial específico.
  * **% Incremento en Precio de Venta**: Aplica un incremento porcentual configurable sobre los precios medios netos de catálogo.
  * **Protección Opcional**: Por defecto genera la hoja desbloqueada para permitir a los comerciales insertar libremente nuevas filas para presupuestar nuevos clientes o productos.
* **Estructura del Libro Excel (21 Columnas)**:
  * **Identificación del Cliente y Zona**: Código de vendedor, código de cliente, nombre de cliente y **Comunidad Autónoma** (columna D, resuelta automáticamente por código postal o provincia, con soporte para países internacionales).
  * **Jerarquía de Producto**: Product Manager, Familia, Desc. Familia, Subfamilia, Desc. Subfamilia, **Nº producto** (columna J, situado inmediatamente a la izquierda de la descripción) y Descripción.
  * **Histórico y Cartera**: Unidades facturadas a día de hoy y unidades en cartera viva.
  * **Columnas Editables (Entrada Comercial)**: `UdPrevision 31/12/{Año}` (columna N) y `UdObjetivo {Año Siguiente}` (columna O), resaltadas con fondo amarillo suave y desbloqueadas para su introducción manual.
  * **Precios y Valoraciones**: Precio de venta actual, precio siguiente proyectado con el % configurado, total facturado a día de hoy y € en cartera.
  * **Fórmulas Vivas Automáticas**: Columna T (`€ Previsión {Año} = N * P`) y Columna U (`€ Objetivo {Año Siguiente} = O * Q`) protegidas contra borrado accidental.
* **Exclusión de Cuentas Contables**: Filtra automáticamente cuentas `G/L Account` (`624%`, `438%`, `700%`, etc.), incluyendo únicamente referencias comerciales de producto (`Item`).

### 6.3 Gestión de Usuarios y Roles (`/users`)
*(Acceso exclusivo para rol `ADMIN`)*

* Control de acceso basado en roles: `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`.
* Matriz de permisos modulares dinámicos (`role_modules`) gestionada mediante Supabase y configurable visualmente desde la pestaña "Permisos de Roles".
* Asignación granular de módulos y vistas a cada rol (incluyendo el Generador de Presupuestos).

### 6.4 Inmutabilidad y Seguridad de Datos
* Los datos de negocio procedentes de Dynamics 365 Business Central son de **estricta solo lectura**.
* Únicamente se permite la persistencia de datos en metadatos propios del CRM (ofertas locales, actividades, tareas y configuraciones de usuario) y tablas de control de acceso RBAC.

---

*Manual de dTS Instruments v6.2 — Actualizado a 25 de septiembre de 2026.*


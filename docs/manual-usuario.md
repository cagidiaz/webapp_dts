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
   - [2.8 Ofertas Comerciales (Seguimiento, KPIs y Totales)](#28-ofertas-comerciales-seguimiento-kpis-y-totales)
3. [Módulo de CRM y Productividad Comercial](#3-módulo-de-crm-y-productividad-comercial)
   - [3.1 Oportunidades: Prospección, Pipeline de Ofertas y Cortes Históricos](#31-oportunidades-prospección-pipeline-de-ofertas-y-cortes-históricos)
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
* **Modal de Transparencia Contable e Información (`InfoPopover`)**:
  * Al pulsar el icono `ℹ️` en **Facturación**, se despliega una ventana informativa con el desglose completo del periodo: *Venta Neta de Producto*, *Portes y Transportes (Cuenta 624)*, *Otras Cuentas Contables*, *Prepagos Vivos (PFV)* y *Total Facturación Documental*.
  * Al pulsar el icono `ℹ️` en **Cartera Pedidos**, se despliega el desglose que distingue los pedidos de producto (*Items*), las líneas de cuentas contables del resto de clientes (*Cuentas G/L Diferentes a SEIKO*) y los pedidos en cartera de **SEIKO FLOWCONTROL GMBH (CL100427)**, totalizando de manera explícita la suma neta viva.
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

### 2.8 Ofertas Comerciales (Seguimiento, KPIs y Totales)
Ubicado en `/sales/quotes`. Para documentación técnica exhaustiva, consultar [Documentación de Vista: Ofertas Comerciales](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ofertas_comerciales.md).

* **Bandeja de KPIs de Rendimiento Superior**:
  * **Cartera de Ofertas**: Total emitido acumulado con modal informativo (`ℹ️`) que desglosa propuestas ganadas, perdidas y volumen vivo en negociación.
  * **Distribución de Ofertas (Mini Donut)**: Gráfico circular tipo anillo interactivo con el recuento total central de ofertas y leyenda lateral compacta con los importes (€) y porcentajes de ofertas ganadas (verde), perdidas (rojo) y vivas abiertas (ámbar).
  * **Valor Ponderado (IA)**: Estimación probabilística de cierre comercial (*Forecast*) calculada exclusivamente sobre las ofertas abiertas en proceso: $\sum_{\text{abiertas}} (\text{Importe} \times \text{Probabilidad} / 100)$.
  * **Previsión Cierre 60 Días**: Volumen e importe acumulado de ofertas vivas con fecha de cierre previsto en los próximos 60 días, con desglose emergente a 30 días y de 31 a 60 días, además de su valor ponderado previsto.
* **Gráficos Analíticos Dinámicos**:
  * **Evolución por Comercial**: Volumen cotizado mensual por vendedor en K€ con línea superpuesta de tasa de éxito.
  * **Panel Comparativo de Motivos de Cierre (Ganadas vs Perdidas)**: Gráficos de barras horizontales lado a lado que cuantifican el ranking de motivos de aprobación (en verde esmeralda `#10B981`) frente a los de descarte o pérdida (en rojo `#F43F5E`) con recuento y volumen en K€.
  * **Interacción Avanzada y Ergonomía Visual**: Elevación dinámica con contorno luminoso al pasar el cursor (*hover*) sin recuadros sombreados molestos, renderizado inteligente de motivos extensos en doble línea en el eje vertical y normalización automática de causas de cierre (ej. "Falta de financiación").
  * **Nomenclatura Estandarizada**: Contadores en cabecera y gráficos expresados con precisión en número de ofertas (ej. `364 ofertas`).
* **Filtros Avanzados y Cierre Previsto**:
  * Filtros por comercial, estado, probabilidad de éxito y año fiscal.
  * Selector inteligente de cierre previsto: modos *Todos*, *Sin fecha*, *Vencidas* y selección mensual interactiva (`Ctrl + Clic` o `Shift + Clic`).
* **Tabla de Ofertas con Semáforo Visual**: Insignias inteligentes para cierres vencidos (rojo pulsante), urgentes (ámbar) o programados.
* **Fila de Totales Fija (*Sticky Footer*)**:
  * Anclada permanentemente en la parte inferior de la tabla (`sticky bottom-0 z-20`) con el fondo azul corporativo (`#003E51`) y borde cian (`#00B0B9`).
  * Muestra el sumatorio exacto del importe total cotizado, la probabilidad media de éxito, el valor ponderado global previsto (*Forecast*) y la tasa media de éxito para todas las ofertas que cumplen los filtros activos.
* **Drawer Lateral y Exportación**: Edición ágil de la fecha de cierre previsto sin recargar y exportación completa a Excel (`.xlsx`).

---

## 3. Módulo de CRM y Productividad Comercial

### 3.1 Oportunidades: Prospección, Pipeline de Ofertas y Cortes Históricos
Ubicado en `/crm/pipeline`. Para especificaciones técnicas y modelos de datos, consultar [Documentación de Vista: CRM Pipeline y Oportunidades](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_pipeline.md).

Esta pantalla centraliza el ciclo de vida comercial completo mediante una arquitectura modular en **3 pestañas** especializadas:

#### A. Pestaña de Prospección Comercial (`CrmProspects`)
Diseñada para que el equipo comercial registre, califique y madure cuentas potenciales antes de que existan formalmente como clientes en Microsoft Dynamics 365 Business Central, evitando la creación de registros prematuros o ficticios en el ERP.

* **Fases del Ciclo de Prospección**:
  * **Fase 0 (Sin aproximación comercial)**: Empresas identificadas o leads iniciales pendientes de contacto exploratorio.
  * **Fase 1 (Prospectos interesados)**: Interlocución activa con interés comercial o técnico confirmado.
  * **Convertidos**: Prospectos formalizados y enlazados a una ficha real de cliente de Business Central.
* **Bandeja de KPIs Superiores**:
  * Contadores en tiempo real de empresas activas en *Fase 0*, *Fase 1* y acumulado histórico de *Convertidos*.
* **Vistas Interactivas**:
  * **Tablero Kanban**: Columnas dedicadas para Fase 0 y Fase 1 con arrastre directo (*Drag & Drop*) para avanzar o retroceder la madurez del prospecto.
  * **Vista Tabla**: Listado denso con buscador reactivo (`keepPreviousData`), selector de estado (*Activos*, *Archivados*, *Convertidos*, *Todos*) y paginación rápida.
* **Ficha Lateral del Prospecto (`Drawer`)**:
  * Formulario de datos básicos: Empresa (obligatoria y con control de duplicados por comercial), Interlocutor, Email y Teléfono.
  * Historial de auditoría inmutable de cambios (quién modificó, qué valor y fecha exacta).
  * Función de **Archivar** y **Restaurar** prospectos sin pérdida de fase previa ni borrado físico.
* **Vinculación Inteligente y Reversible con Business Central**:
  * Buscador integrado en la cartera del comercial que propone coincidencias por empresa, teléfono o email.
  * Al confirmar la vinculación, el prospecto pasa a "Convertido" y sus datos de seguimiento quedan disponibles en la ficha del cliente en la WebApp.
  * **Reversibilidad total**: Si se requiere deshacer la asociación, el comercial puede pulsar *«Deshacer vinculación»*; el prospecto retorna a su fase original y los recuentos se corrigen de forma inmediata.
* **Seguimiento Comercial Local**:
  * Registro de actividades locales (*Nota interna*, *Tarea*, *Llamada*, *Visita a cliente*, *Videollamada* y *Visita no programada*) asociadas a la entidad local, visibles en la ficha del cliente tras la conversión.

---

#### B. Pestaña de Ofertas y Pipeline Renovado (`CrmPipeline`)
Gestiona las propuestas y cotizaciones vigentes garantizando rigor procedimental y consistencia con Business Central:

* **Seis Fases Abiertas en Fila Única Horizontal**:
  A diferencia del modelo clásico de cinco columnas, el tablero organiza las ofertas vivas en 6 fases secuenciales en una única fila continua con desplazamiento horizontal ergonómico:
  1. **Preliminar (5%)**: Cotización en preparación preliminar o fase embrionaria.
  2. **Presentada (20%)**: Propuesta entregada formalmente al cliente para su estudio.
  3. **Evaluación (35%)**: Análisis técnico y comparativo activo por parte del cliente.
  4. **Negociación (55%)**: Ajustes de precios, plazos o condiciones comerciales.
  5. **Aprobación (75%)**: Aprobación presupuestaria interna en el cliente pendiente de firma.
  6. **Aceptada (90%)**: Conformidad verbal o pre-adjudicación (la oferta permanece viva en el embudo).
* **Gestión de Ganadas y Perdidas fuera del Kanban**:
  Las ofertas cerradas (*Ganada 100%* y *Perdida 0%*) se desacoplan de las columnas del Kanban para mantener el foco en la cartera viva, presentándose en tablas dedicadas y métricas analíticas.
* **Derivación Automática de Probabilidad**:
  El porcentaje de éxito no se edita a mano; el servidor lo calcula de forma estricta según la fase para evitar desviaciones subjetivas en el valor ponderado.
* **Transiciones con Nota Comercial Obligatoria**:
  * No se permite cambiar de fase arrastrando sin justificación comercial.
  * Cada avance exige registrar la interacción realizada, la nota explicativa y la fecha estimada de cierre.
* **Catálogo Aprobado de Motivos de Cierre**:
  Al marcar una oferta como Ganada o Perdida, es mandatorio seleccionar la causa dentro del catálogo oficial:
  * *Ganadas*: **Precio**, **Servicio**, **Producto**, **Propuesta de valor**, **Afinidad**.
  * *Perdidas*: **Precio**, **Servicio**, **Financiación / Condiciones de pago**, **Relación cliente**, **Producto**, **Capacidad de producción**, **Compromiso con otros**, **Falta de financiación**, **Documentación / Certificados**.
* **Separación de Fuentes (`BC` vs `APP`)**:
  Los importes y clientes se sincronizan de forma continua desde Business Central (solo lectura), mientras que el seguimiento avanzado (fases, motivos, notas y auditoría) se almacena en tablas locales de la WebApp con control de versiones para evitar conflictos de concurrencia.

---

#### C. Pestaña de Cortes del Pipeline y Analítica Histórica (`PipelineCuts` & `CutAnalytics`)
Permite capturar y analizar fotografías inmutables de la cartera comercial a lo largo del tiempo:

* **Fotografías Temporales (Cortes)**:
  * **Corte Automático Semanal**: Programado cada **viernes a las 18:00 (hora civil de Madrid)**, capturando todas las ofertas y prospectos con sus importes netos sin IVA.
  * **Cortes Manuales**: Exclusivos para Administradores y Dirección, requiriendo justificar obligatoriamente el motivo del corte.
  * **Inmutabilidad y Revisiones**: Un corte publicado jamás se altera ni se recalcula retrospectivamente. Si se detecta una corrección, se genera una *Revisión* enlazada a la captura original.
* **8 Informes Analíticos Congelados (`CutAnalytics`)**:
  1. **Resumen General**: Importe nominal y valor ponderado total de la fotografía.
  2. **Matriz Mensual**: Distribución cruzada de ofertas abiertas entre mes de cierre previsto y fase.
  3. **Calidad de Datos**: Identificación de oportunidades sin fecha prevista o sin interlocutor.
  4. **Cierres Vencidos**: Cotizaciones cuya fecha prevista es anterior a la fecha de captura del corte.
  5. **Próximas Acciones**: Actividades y tareas pendientes de resolución.
  6. **Motivos de Ganadas y Perdidas**: Desglose cuantitativo de causas de éxito y descarte.
  7. **Evolución de Prospección**: Estado de madurez de leads y tasa de conversión acumulada.
  8. **Comparativa Dinámica entre Dos Cortes**: Análisis diferencial que detalla altas nuevas, bajas de cartera, avances/retrocesos de fase y variaciones de importe económico.
* **Exportación Segura a CSV**: Descarga individual de cada informe y del corte íntegro en formato UTF-8 con protección frente a inyección de fórmulas de hoja de cálculo.

---

#### D. Matriz de Permisos y Control de Acceso por Cartera
* **Comerciales (`VENTAS`, `OPERACIONES`)**: Visualizan y gestionan exclusivamente las ofertas y prospectos de su propia cartera.
* **Dirección (`DIRECCION`)**: Dispone de consulta global consolidada de todo el equipo comercial, cortes analíticos e informes, sin capacidad de editar ofertas ajenas.
* **Administración (`ADMIN`)**: Acceso global, generación de cortes manuales y edición administrativa de prospectos conservando el comercial propietario.

---

### 3.2 Contactos, Cuentas y Timeline de Actividades
Ubicado en `/crm/contacts` y `/crm/customers`.

* **Directorio de Interlocutores**: Registro de personas de contacto por empresa (nombre, cargo, teléfono, email, notas y ubicación).
* **Localización Física del Contacto y Centros de Trabajo**:
  * Registro de dirección específica del interlocutor (`address`, `address2`, `city`, `post_code`, `county`, `territory_code`).
  * Tarjeta de centro de trabajo en la pestaña *Información* con enlace directo a Google Maps y modal de edición rápida.
  * Búsqueda global y en tabla filtrable por localidad, provincia o código de territorio.
* **Timeline Histórico de Actividades y Ordenación Cronológica Exacta**: 
  * Registro cronológico descendente de reuniones, llamadas, notas comerciales y correos electrónicos vinculados al cliente.
  * **Ordenación por Fecha y Hora**: Todos los registros, en especial los correos de entrada y salida, se ordenan considerando la **hora exacta de envío o recepción** (`sortTimestamp` con desempate por segundos), garantizando que los correos del mismo día aparezcan en perfecto orden cronológico.
  * **Visualización de Hora**: Cada actividad en el Timeline y en el mini-timeline de la pestaña *Información* refleja su fecha y hora precisa (`13 oct. 🕒 14:35`) con el icono de reloj corporativo.
* **Gestión de Eventos, Visitas y Actividades Comerciales**:
  * **Visita no programada (`EVENT`)**: Diseñada para visitas presenciales espontáneas ("puerta fría" o visitas no planificadas). **No envía invitaciones ni correos electrónicos al contacto**, registrándose exclusivamente en la base de datos de la aplicación y en el calendario de Outlook del comercial bajo la categoría corporativa `dTS CRM` con el prefijo `[dTS CRM - Visita No Programada]`.
  * **Visita a Cliente (`VISITA`)**: Registro de visitas comerciales agendadas, con soporte de ubicación física y cálculo de ruta.
  * **Reunión Interna (`REUNION`)**: Sustituye a la anterior reunión presencial; reservada para coordinación interna de equipos dTS *(opción temporalmente en blanco para configuración en siguiente fase)*.
  * **Autocompletado de Ubicación de Empresa**: En visitas a clientes y visitas no programadas, botón directo para autocompletar la dirección con la sede social de la empresa o el centro de trabajo del contacto con un clic.
  * **Barra de Filtrado Unificada con Contadores Reactivos**: Diseño visual compartido con la pestaña de Emails, incorporando contadores dinámicos en tiempo real para cada tipología (*Todos*, *Tareas*, *Notas*, *Visitas Cliente*, *Visitas no prog.*, *Videollamadas*, *Llamadas*, *Reuniones Internas*) y filtro de estado (*Todos*, *Pendientes*, *Realizados*).
* **Ciclo de Vida de Eventos, Conclusiones y Categorización por Color en Outlook**:
  * **Checkbox de Finalización Rápida**: Disponible en todas las actividades comerciales para alternar entre pendiente y realizado con un clic.
  * **Modal Ágil de Registro de Conclusiones**: Al marcar una actividad o hacer clic en el badge `VENCIDO · FALTAN CONCLUSIONES`, el sistema solicita registrar los acuerdos o conclusiones alcanzadas, guardándolas en el CRM y anexándolas limpiamente al cuerpo de la cita en Outlook.
  * **Cambio Dinámico de Color en el Calendario de Outlook**:
    * Eventos pendientes: clasificados bajo la categoría **`dTS CRM`** (**Azul corporativo `#003E51`**).
    * Eventos completados o con conclusiones: reclasificados automáticamente por Microsoft Graph bajo la categoría **`dTS CRM - Completado`** (**Verde esmeralda `#059669`**), tiñendo el bloque del calendario de Outlook de color verde en tiempo real.
    * Si el comercial desmarca la actividad, vuelve de forma automática a color azul.
  * **Sincronización Directa de Calendario**: Los eventos se sincronizan de forma transparente en segundo plano con el calendario de Outlook sin requerir aperturas manuales externas, garantizando que no se generen duplicados ni fallos de carga.
* **Sincronización Bidireccional Automática en Tiempo Real**:
  * **Refresco Reactivo por Foco (`onfocus` / `visibilitychange`)**: Si el comercial modifica la hora o fecha de una cita en Outlook y vuelve a la WebApp, el cambio se refleja en milisegundos sin requerir recargar la página.
  * **Polling Silencioso (cada 25s)** y sincronización garantizada al cambiar de pestaña.
  * **Sanitización Automática de Texto**: El sistema purga en backend y frontend cualquier línea de guiones bajos (`____________________`), encabezados repetidos o saltos de línea acumulados devueltos por el preview de Outlook.
* **Diseño Ergonómico y Legibilidad Optimizada de Tarjetas**:
  * Encabezado adaptable con visualización permanente de la fecha, hora, ubicación y acciones rápidas (`Editar`, `Eliminar`).
  * Línea divisoria horizontal limpia que separa el encabezado del contenido.
  * Tipografía equilibrada y descansada: títulos a 13.5px, badges a 9.5px, fecha/hora a 11px y descripción a 12.5px con interlineado ceñido (`leading-snug`).

---

### 3.3 Pestaña de Emails, Filtrado por Tipologías y Apertura en Outlook
Integrada en la ficha del contacto/cliente en el CRM (`/crm/contacts/:id?tab=emails`). Para especificaciones técnicas detalladas, consultar [Documentación de Vista: Contactos CRM y Pestaña de Emails](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md).

* **Barra Unificada de Filtrado por Tipología y Oferta**:
  * Ubicada en una misma fila horizontal compacta para máxima ergonomía visual.
  * **Píldoras de Tipología**: Botones reactivos para filtrar en tiempo real por `Todas (N)` o individualmente por `Petición oferta`, `Oferta proveedor`, `Revisión oferta`, `Negociación` y `Cierre/Aceptación` con sus respectivos contadores dinámicos.
  * **Selector Compacto de Ofertas**: Desplegable adyacente para filtrar simultáneamente por *Todas las ofertas*, *Con oferta vinculada*, *Sin oferta vinculada* o una *Oferta Específica* con indicación de su número de correos acumulados.
* **Badge Interactivo de Tipología con Selector Rápido**:
  * En cada tarjeta de correo (tanto en *Emails* como en el *Timeline*), el badge de tipología (`🚚 Oferta proveedor ▾`, `📋 Petición oferta ▾`, etc.) funciona como un selector directo en 1 clic para corregir rápidamente la tipología si el comercial se equivocó al clasificarlo.
  * Diseñado con soporte nativo de alto contraste para **Modo Claro** y **Modo Oscuro** corporativo.
  * Alternativamente, se puede editar mediante el modal completo de actividad (icono de lápiz).
* **Visualización Optimizada de Correos (Límite de 5 Líneas) y Ordenación Precisa**:
  * **Ordenación Cronológica por Hora y Priorización de Exchange**: La lista de correos se ordena de forma descendente estricta según su momento exacto de llegada o envío (`sortTimestamp`). Para correos electrónicos, la hora visible evalúa prioritariamente la marca temporal real de Microsoft 365 (`attendees.sentDate` o `attendees.receivedDateTime`), garantizando máxima fidelidad con el buzón.
  * **Indicador de Fecha y Hora**: Cada correo muestra su fecha en formato corporativo y la hora exacta de recepción o envío (`13 oct. 2026 🕒 14:35`) con el icono de reloj `Clock` en azul dTS (`text-dts-secondary`).
  * Cada correo muestra por defecto exclusivamente sus primeras **5 líneas** para garantizar una navegación ágil y compacta sin saturar la pantalla.
  * Botón interactivo **"Ver más (+N líneas)"** / **"Mostrar menos"** que expande y colapsa el texto íntegro en tiempo real.
* **Diseño y Colores Unificados con el Timeline**:
  * Las tarjetas de la pestaña *Emails* y las entradas de correo en el *Timeline* utilizan exactamente la misma paleta y arquitectura visual: fondo blanco/zinc translúcido (`bg-white dark:bg-zinc-900/40`), borde suave con hover en azul turquesa dTS (`hover:border-dts-secondary/35`), fondos de estado consistentes (verde esmeralda para tramitados/conclusiones y ámbar para pendientes de conclusiones) y botones homogéneos de Outlook (`OutlookIcon`), edición y borrado.
* **Badge Interactivo de Oferta Comercial (Distinción Estricta)**:
  * Si el correo fue asociado a una cotización de Business Central, se muestra un distintivo azul independiente con su código e importe (ej. `📄 Oferta: OF-2024-001 (4.500 €)`), claramente diferenciado del badge de tipología.
  * Al hacer clic sobre el badge de la oferta, se abre de inmediato el **Drawer lateral** de la oferta con todos sus detalles sin abandonar la ficha del contacto.
* **Preparación Directa en Outlook y Ciclo de Estados de Envío**:
  * El comercial redacta el correo o carga una plantilla corporativa en la WebApp y, al pulsar **"Abrir y Preparar en Outlook"**, el sistema genera el nuevo correo en Outlook con todos los datos precargados (destinatario, asunto y cuerpo).
  * **Ciclo de Estados y Badges Informativos**:
    * `draft` (Borrador): Guardado localmente esperando revisión o despacho en Outlook.
    * `send_unconfirmed` (Envío sin confirmar): El sistema ha disparado el envío vía Microsoft Graph pero la respuesta está en proceso. Muestra el badge ámbar: `Envío sin confirmar: revisar Outlook` para prevenir duplicación accidental de envíos.
    * `sent_pending` (Referencia de envío pendiente): Correo entregado exitosamente por Microsoft 365, en proceso de archivar su copia en "Elementos enviados" y obtener el identificador estable inmutable. Muestra el badge ámbar: `Referencia de envío pendiente`.
    * `synced` (Sincronizado): Identidad inmutable confirmada y resuelta (`resolved`).
  * **Auto-sincronización Inteligente**: Al acceder a la ficha del contacto, si hay correos en estado transitorio (`draft`, `sent_pending`, `send_unconfirmed`), la aplicación sincroniza en segundo plano mediante lotes rotativos de hasta 25 referencias para verificar si ya fueron despachados.
* **Botón Directo "Abrir en Outlook" y Resolución Dinámica Web**:
  * En cada tarjeta de email de la pestaña *Emails*, en los eventos de correo del *Timeline* y en la cabecera del contacto, se incluye la acción **"Abrir en Outlook"** acompañada de un menú desplegable contextual (`...`):
  * **Comportamiento Determinista por Preferencia**:
    * **Outlook Classic / Escritorio**: Para las cuentas habilitadas en el piloto, utiliza el componente Windows vinculado al usuario para localizar y verificar el mensaje exacto, incluso después de moverlo dentro del mismo buzón. Requiere instalar el ZIP y completar la vinculación. El resto de usuarios conserva temporalmente el flujo anterior; responder y buscar conversación siguen usando sus acciones existentes.
    * **Outlook Web (M365) — Resolución Dinámica Segura**: Abre el mensaje exacto mediante el resolvedor backend del CRM (`POST /api/exchange-sync/emails/:activityId/resolve`), pre-abriendo una ventana sin riesgo de bloqueo por navegador (popup blocker) y con aislamiento de contexto (`window.opener = null`). Si el correo fue movido a otra carpeta, Microsoft Graph lo localiza de forma determinista mediante su `ImmutableId`; y si existen varias copias en el buzón, despliega un selector de carpeta/fecha para abrir la deseada.
  * **Menú Desplegable de Acciones Secundarias (`...`)**:
    1. **Abrir en Outlook Classic**: Fuerza la apertura en la aplicación de escritorio.
    2. **Abrir en Outlook Web (M365)**: Abre el correo en Microsoft 365 en el navegador mediante el resolvedor seguro.
    3. **Responder** y **Responder a todos**: Preparan una respuesta nativa al mensaje exacto, según el cliente predeterminado. Revisa los destinatarios y el contenido antes de enviarla. Requiere activar la nueva entrega; no envía automáticamente.
    4. **Buscar conversación completa**: Activa la búsqueda en Outlook para ver todo el hilo y respuestas del contacto.
    5. **Copiar datos de búsqueda**: Copia la sintaxis limpia `de:<email> asunto:"<asunto_limpio>"` para pegarla manualmente en Outlook.
  * **Si Classic no puede abrirlo**: El CRM informa del estado y ofrece elegir Outlook Web. Una apertura sin confirmar no significa que el correo se haya borrado; comprueba Outlook antes de repetir. La aplicación no sustituye automáticamente la apertura exacta por una búsqueda por asunto.

---

### 3.4 Complemento de Outlook (Add-in dTS CRM)
Extensión oficial integrada en la cinta de opciones de Microsoft Outlook (Web, Escritorio Windows y Mac). Para instrucciones completas de instalación ver [Guía de Instalación y Despliegue del Add-in de Outlook](file:///c:/proyectos/webapp_dts/docs/manual-instalacion-addin-outlook.md).

* **Autenticación Integrada y Sesión Segura en Panel (`OutlookAddinSession`)**:
  * Todas las operaciones del panel están protegidas por autenticación JWT del CRM. Si la sesión no está iniciada o caduca, el panel muestra un formulario de login corporativo embebido, impidiendo que el iframe de Outlook sea expulsado o redirigido a páginas externas.
* **Aislamiento y Seguridad por Cartera Comercial (RBAC)**:
  * Los comerciales (`VENTAS`, `OPERACIONES`) solo pueden buscar clientes, seleccionar contactos y asociar ofertas pertenecientes a su propia cartera asignada (`customerScope`), blindando la confidencialidad entre áreas de venta.
* **Persistencia con Identidad Inmutable Estable (`ImmutableId`)**:
  * Al registrar un correo, el backend traduce el identificador volátil de Office.js (`ewsId`) a un `ImmutableId` binario permanente en Microsoft Graph, almacenando el tenant, buzón y estado de resolución determinista (`resolved`), lo que garantiza que el correo pueda reabrirse fielmente en el futuro aunque sea movido de carpeta en Outlook.
* **Bloqueo en Modo Demostración**: Si el complemento se abre fuera de Outlook (navegador estándar), se activa el modo de prueba visual pero se bloquea el guardado real para proteger los datos de producción.
* **Botón Ribbon "Registrar en dTS CRM"**: Acceso en caliente desde la barra superior de Outlook mientras se lee o redacta cualquier correo en Windows, Mac o Web.
* **Carga Inmediata y Skeleton Loading**: Apertura instantánea con animación estructurada corporativa dTS, desacoplando la lectura pesada del cuerpo del correo para iniciar la consulta al CRM en milisegundos.
* **Presentación Limpia y Ergonómica**: Visualización directa de las direcciones de correo en los campos **De:** y **Para:**, eliminando etiquetas superfluas y aprovechando todo el ancho del panel.
* **Detección Contextual Inteligente**: Reconocimiento automático del contacto y empresa (evalúa el remitente en recibidos o el destinatario en enviados).
* **Asociación y Selección Manual de Contactos por Empresa**:
  * Cuando el remitente no está registrado previamente, el comercial puede buscar la empresa cliente (`customers`) de su cartera.
  * Selector dinámico con todos los contactos de dicha cuenta registrados en Business Central (`Nombre`, `Cargo/Rol`, `Email`), incluyendo buscador por texto y sugerencias inteligentes.
* **Vinculación a Ofertas Dinámica y Opcional**:
  * Al asociar una empresa, se cargan de inmediato sus ofertas comerciales abiertas para vincular el correo a la cotización correspondiente.
  * Si la oferta forma parte del seguimiento comercial local, el correo se registra como actividad sin alterar de forma automática su fase de cierre.
* **Etiquetado Comercial en 5 Tipologías Oficiales**: Clasificación en un clic (`📋 Petición oferta`, `📦 Oferta proveedor`, `📝 Revisión oferta`, `💬 Negociación`, `📄 Cierre/Aceptación`).
* **Limpieza y Acortado Inteligente de RGPD y Firmas**:
  * Filtro automático robusto de cláusulas legales de privacidad (RGPD / LOPD), cadenas repetitivas de reenvíos, firmas pesadas y saltos de línea acumulados.
* **Prevención Activa de Duplicados en Cartera**: Detección determinista por `ImmutableId` cruzado con el comercial, empresa y contacto (`✓ Ya registrado en dTS CRM`).
* **Resumen de Destino Previo al Guardado**: Tarjeta de confirmación visual que muestra la empresa cliente y el contacto vinculado antes de pulsar guardar.

---

### 3.5 Abrir correos con el nuevo componente de Outlook Classic

**Disponible solo para cuentas habilitadas por el administrador.** La vía web ya está validada en producción. El componente de Classic está preparado y sus tablas creadas; falta confirmar el despliegue, la instalación y la prueba completa antes de darlo por operativo para el equipo.

1. Conecta tu cuenta corporativa en **Ajustes** y comprueba que es el mismo buzón configurado en Outlook Classic para Windows.
2. Sigue la [instalación de Classic](manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic): extrae el ZIP, ejecuta el BAT y confirma el código mostrado en la página del CRM que se abrirá.
3. Vuelve a la ventana del componente y pulsa **«Ya he confirmado en el CRM»** para completar la vinculación.
4. En la ficha del contacto, pestaña **Emails** o **Timeline**, pulsa **Abrir en Outlook Classic**. Si el CRM presenta varias copias, elige la que corresponda. Si muestra un botón adicional para abrir Classic, púlsalo; el navegador puede pedir autorización para abrir la aplicación.
5. Comprueba que se muestra el correo correcto. Si no puede abrirse o no llega la confirmación, puedes elegir **Abrir en Outlook Web**.

En `/outlook-classic` puedes consultar y revocar tus equipos. Para volver a vincular un equipo, ejecuta `Vincular_Outlook_dTS.bat`. Para retirarlo, utiliza `Desinstalar_Outlook_dTS.bat` y revoca su acceso en el CRM. Cada usuario Windows debe instalar y vincular su propia cuenta.

Esta entrega abre mensajes; no modifica el envío, la respuesta ni la búsqueda de conversaciones. Nuevo Outlook, Mac, PST, archivo en línea y buzones compartidos no quedan cubiertos por la aceptación del componente Classic. Consultar una actividad del CRM no otorga acceso al buzón privado de otro usuario.

---

## 4. Módulo de Compras

### 4.1 Directorio de Proveedores
Ubicado en `/purchases/vendors` (Acceso para roles `ADMIN`, `DIRECCION` y `OPERACIONES`). Para documentación técnica y operativa exhaustiva, consultar [Documentación de Vista: Cartera de Proveedores](file:///c:/proyectos/webapp_dts/docs/vistas/04_compras/compras_proveedores.md).

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
  * **Instalación de Classic para el piloto**: En `/outlook-classic`, descarga el ZIP, extráelo completo y ejecuta `Instalar_Outlook_dTS.bat` sin administrador. El configurador antiguo de Ajustes sigue disponible para flujos heredados y no sustituye este paquete. La distribución interna no exige certificado; Windows puede mostrar un aviso de editor desconocido.
  * **Memorización persistente en el navegador local (`localStorage`)**: El ajuste se recuerda de forma global para toda la WebApp y aplica tanto a la redacción como a la apertura de correos existentes en la ficha de contactos y el timeline del CRM.
  * Botón de prueba inmediata para validar la apertura de Outlook.

### 6.2 Generador de Presupuestos de Ventas (Plantillas Excel) (`/settings/budget-generator`)
*(Acceso configurable dinámicamente mediante la matriz de permisos de rol `role_modules` desde Gestión de Usuarios)*

* **Propósito**: Automatiza la confección de plantillas de trabajo en Excel para la elaboración del presupuesto de ventas del ejercicio siguiente (ej. 2027 a partir del año en curso 2026), integrando la comparativa completa del ejercicio cerrado anterior (ej. 2025).
* **Parámetros Configurables**:
  * **Comercial / Vendedor**: Permite descargar la plantilla global consolidada o segmentada para un comercial específico.
  * **% Incremento en Precio de Venta**: Aplica un incremento porcentual configurable sobre los precios medios netos de catálogo.
  * **Protección Opcional**: Por defecto genera la hoja desbloqueada para permitir a los comerciales insertar libremente nuevas filas para presupuestar nuevos clientes o productos.
* **Estructura del Libro Excel (23 Columnas)**:
  * **Identificación del Cliente y Zona**: Código de vendedor, código de cliente, nombre de cliente y **Comunidad Autónoma** (columna D, resuelta automáticamente por código postal o provincia, con soporte para países internacionales).
  * **Jerarquía de Producto**: Product Manager, Familia, Desc. Familia, Subfamilia, Desc. Subfamilia, **Nº producto** (columna J, situado inmediatamente a la izquierda de la descripción) y Descripción.
  * **Bloque de Unidades Físicas**:
    * **`UdFacturadas {Año Anterior}`** (columna L, ej. 2025): Unidades cerradas del año previo con fondo gris claro (`#F3F4F6`) y cabecera pizarra (`#475569`) para distinguirla nítidamente del año en curso.
    * **`udFacturadas {Año} hasta hoy`** (columna M, ej. 2026: `udFacturadas 2026 hasta hoy`): Unidades netas reales del año en curso.
    * **`UdCartera`** (columna N): Unidades vivas pendientes en pedidos de cartera abierta.
  * **Columnas Editables (Entrada Comercial)**:
    * **`UdPrevision 31/12/{Año}`** (columna O): Estimación en blanco con fondo amarillo suave para previsión de cierre.
    * **`UdObjetivo {Año Siguiente}`** (columna P): Meta en unidades con fondo amarillo suave para fijar el objetivo del siguiente año.
  * **Precios Unitarios**: Precio de venta actual (columna Q) y precio proyectado con el % configurado (columna R, solo lectura).
  * **Bloque de Importes Monetarios (€)**:
    * **`Facturacion {Año Anterior}`** (columna S, ej. 2025): Importe neto cerrado del año anterior con fondo gris claro (`#F3F4F6`) y cabecera pizarra (`#475569`) para distinguirlo de los datos corrientes.
    * **`total linea fact. {Año} hasta hoy`** (columna T, ej. 2026: `total linea fact. 2026 hasta hoy`): Importe acumulado facturado en el año en curso.
    * **`€ Cartera`** (columna U): Importe valorado de la cartera viva.
  * **Fórmulas Vivas Automáticas**:
    * Columna V (`€ Previsión {Año} = O * Q`): Proyección de cierre en euros protegida contra borrado accidental.
    * Columna W (`€ Objetivo {Año Siguiente} = P * R`): Meta calculada en euros protegida contra borrado accidental.
* **Exclusión de Cuentas Contables y Regla Permanente de Seiko**:
  * Filtra automáticamente cuentas `G/L Account` (`624%`, `438%`, `700%`, etc.), incluyendo únicamente referencias comerciales de catálogo (`Item`).
  * **Excepción Permanente de Negocio:** Para **SEIKO FLOWCONTROL GMBH (`CL100427`)**, las líneas facturadas bajo la cuenta contable `7050004` (*Comisiones Seiko*) son autorizadas de forma permanente y se unifican bajo el producto `SEICOMIS`. De esta manera, el comercial dispone en una única fila de la facturación histórica completa (ej. 2025) y del ejercicio en curso (ej. 2026) sin dispersión.

### 6.3 Gestión de Usuarios y Roles (`/users`)
*(Acceso exclusivo para rol `ADMIN`)*

* Control de acceso basado en roles: `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`.
* Matriz de permisos modulares dinámicos (`role_modules`) gestionada mediante Supabase y configurable visualmente desde la pestaña "Permisos de Roles".
* Asignación granular de módulos y vistas a cada rol (incluyendo el Generador de Presupuestos).

### 6.4 Inmutabilidad y Seguridad de Datos
* Los datos de negocio procedentes de Dynamics 365 Business Central son de **estricta solo lectura**.
* Únicamente se permite la persistencia de datos en metadatos propios del CRM (ofertas locales, actividades, tareas y configuraciones de usuario) y tablas de control de acceso RBAC.

---

*Manual de dTS Instruments v6.5 — Actualizado a 9 de octubre de 2026.*


## Cambio de cliente Outlook y recuperación de correos antiguos

Para pasar de Classic a Web, entra en **Ajustes → Cliente de Outlook predeterminado** y selecciona **Outlook Web**. La apertura principal de correos usará esa preferencia; las opciones explícitas del menú permiten elegir otro destino. Mantén conectada tu cuenta Microsoft 365 y utiliza el mismo buzón en Web. No tienes que registrar otra vez tus correos ni desinstalar Classic.

La preferencia se guarda en ese navegador: debes elegirla de nuevo si cambias de equipo o navegador. Puedes volver a Classic si su componente permanece instalado, vinculado y autorizado.

Decisión del 16/10/2026: no habrá recuperación automática de correos antiguos. Antoni continuará registrando los nuevos desde esta fecha. Los registros anteriores y sus asociaciones se conservan; no se borran ni se ocultan. Conectar Microsoft 365 o vincular un equipo no inicia una migración histórica.

## Responder y responder a todos: nueva entrega preparada

Después de activar esta entrega, el menú de cada correo en Emails y Timeline ofrecerá dos acciones distintas: **Responder** y **Responder a todos**. Ambas usan tu preferencia de Ajustes. Outlook determina los destinatarios a partir del mensaje original y abre la respuesta para que la revises; no debes asumir que Responder a todos envía a las mismas personas que Responder.

En Web se crea y abre un borrador dentro del hilo. Si el navegador bloquea la ventana, permite ventanas emergentes y repite. Si se informa de un borrador sin confirmar, revisa primero **Borradores** en Outlook: no se reintenta automáticamente. En Classic se requiere actualizar el componente a 1.1.0 y abrir un correo para que el CRM reconozca la versión.

La funcionalidad está preparada para desplegar y comprobar, todavía sin aceptación real. No exige volver a importar correos ni recuperar el histórico. [Instalación y comprobaciones](manual-instalacion-addin-outlook.md#9-actualización-para-responder-y-responder-a-todos).

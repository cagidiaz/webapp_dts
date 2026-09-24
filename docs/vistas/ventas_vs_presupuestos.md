# 📊 Documentación de Vista: Ventas vs Presupuestos

> **Ubicación en la aplicación:** `/sales/budgets`  
> **Componente Frontend:** [`SalesBudgetPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/SalesBudgetPage.tsx)  
> **Servicio Backend:** [`sales.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/sales/sales.service.ts) (`getSalesBudgetPerformance`, `getSalesBudgetEvolution`, `getSalesBudgetPerformanceExport`)  
> **Última actualización:** Septiembre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Ventas vs Presupuestos** es la herramienta central de control y seguimiento comercial de dTS Instruments. Su objetivo es proporcionar a la Dirección General, Dirección Comercial y al equipo de ventas una comparativa en tiempo real entre la **facturación real obtenida** y los **objetivos de venta presupuestados** para un ejercicio determinado.

### Principales Utilidades:
- **Medición del Cumplimiento Comercial:** Saber en todo momento qué porcentaje del presupuesto anual o mensual se ha alcanzado.
- **Detección Temprana de Desviaciones:** Identificar qué clientes o líneas de negocio presentan desviaciones negativas para actuar comercialmente antes del cierre del ejercicio.
- **Homogeneidad Presupuestaria:** Garantizar que las cifras comparadas son homogéneas (se contrasta venta real neta de catálogo contra presupuesto de ventas, aislando importes no comerciales como portes o ajustes contables).
- **Visión Global y Segmentada:** Permite analizar desde la cifra global de la empresa hasta el detalle individual por comercial, familia de producto o cliente.

---

## 2. Estructura y Layout de la Vista 🖥️

La pantalla se distribuye en tres niveles principales:
1. **Bandeja Superior de KPIs (6 Tarjetas):** Métricas consolidadas del periodo y filtros seleccionados.
2. **Cuerpo Central Dividido en Dos Columnas:**
   - **Columna Izquierda (20%):** Barra lateral de filtros multidimensionales (`BudgetFiltersSidebar`).
   - **Columna Derecha (80%):** Tabla de rendimiento por cliente con scroll infinito y totales fijos.
3. **Bloque Inferior:** Gráfico de evolución mensual acumulada (`BudgetEvolutionChart`).

---

## 3. Panel de Filtros Laterales (`BudgetFiltersSidebar`) 🔍

Ubicado a la izquierda para permitir una segmentación rápida y reactiva:

| Filtro | Tipo de Control | Descripción y Funcionamiento | Utilidad de Negocio |
| :--- | :--- | :--- | :--- |
| **Ejercicio** | Selector desplegable | Años fiscales disponibles (2024, 2025, 2026). Cambia el año base de análisis. | Permite auditar años cerrados o analizar el ejercicio en curso. |
| **Meses** | Botonera interactiva (1 al 12) | Permite seleccionar meses individuales o rangos acumulados (por defecto carga YTD, desde enero hasta el mes en curso). | Comparar periodos equivalentes (ej. primer trimestre Q1, semestre o YTD). |
| **Vendedor** | Selector con búsqueda (`SearchableSelect`) | Filtra las ventas y presupuestos asignados al código de vendedor (ej. `ACI`, `JKU`, `JMO`, `JPG`). Cuenta con botón individual "Limpiar" y opción en el desplegable. | **Control de Acceso (RBAC):** Si el usuario conectado es un comercial, este filtro queda fijado a su propio código y no puede ver a otros comerciales. Los administradores y dirección pueden seleccionar cualquier vendedor o ver "Todos". |
| **Familia** | Selector con búsqueda (`SearchableSelect`) | Filtra por código de familia de producto de Business Central (ej. `EQUIPOS`, `CONSUMIBLES`, `SERVICIOS`). Dispone de botón individual "Limpiar" en cabecera. | Analizar el cumplimiento por grandes líneas de producto. |
| **Subfamilias** | Selector múltiple con búsqueda (`MultiSearchableSelect`) | Permite seleccionar una, varias o todas las subfamilias a la vez. Dispone de buscador interno, acciones de "Marcar todas" / "Desmarcar todas", contador visual y botón de "Limpiar (N)". Se sincroniza automáticamente con la familia seleccionada. | Bajar al detalle de varias subcategorías técnicas de interés simultáneamente sin restricciones mono-selección. |
| **Buscador de Cliente** | Input con debounce (400ms) | Búsqueda por nombre comercial o código de cliente de Business Central. | Localizar rápidamente la ficha de un cliente concreto sin desmontar el foco (`keepPreviousData`). |
| **Limpiar Filtros** | Botones contextuales y globales | • **Botón Global `X`:** En la cabecera del panel para restablecer todos los filtros a sus valores iniciales.<br>• **Botones "Limpiar" individuales:** Cada filtro activo (Vendedor, Familia, Subfamilias) incluye un botón de texto claro en su cabecera.<br>• **Píldoras `X` de alto contraste:** Con fondo coloreado (`rose-100`) y separación de texto en cada casilla para evitar solapamientos visuales. | Proporcionar máxima comodidad y visibilidad para resetear filtros parciales o totales. |

---

## 4. Indicadores Clave de Rendimiento (KPI Cards) 📈

En la parte superior se presentan 6 tarjetas resumen. Cada una cuenta con una ventana modal de información (botón `ℹ️`) que detalla su origen técnico y desglose.

### 4.1. Facturación (Items)
* **Definición:** Cifra de ventas reales netas correspondiente exclusivamente a artículos de catálogo comercial (`Type = Item`), descontando devoluciones y abonos de producto. Su título explicita `(Items)` para distinguirse de la facturación documental global.
* **Fórmula Matemática:**
  $$\text{Facturación Producto} = \sum (\text{Líneas FV Producto}) - \sum (\text{Líneas AAV Producto})$$
* **Origen de Datos:** Tabla `sales_document_lines` cruzada con `sales_documents` (filtrando por año, meses seleccionados, vendedor y tipo `Item`).
* **¿Por qué lo hacemos de esta manera? (Justificación Metodológica y Homogeneidad):**
  > [!IMPORTANT]
  > El presupuesto comercial de dTS se elabora en base a la venta de productos e instrumental. Si incluyéramos en esta cifra los portes cobrados al cliente (cuenta 624) o facturas de prepago (que son anticipos de tesorería y no ventas de material devengadas), estaríamos falseando la consecución del objetivo. Por ello, el KPI principal muestra **únicamente producto**.
  > 
  > **Homogeneidad con Presupuesto x Product Manager:** Esta misma fuente documental (`sales_documents` + `sales_document_lines`) y fórmula de cálculo se utiliza de forma idéntica en la vista de [**Presupuesto x Product Manager**](file:///c:/proyectos/webapp_dts/docs/vistas/presupuestos_x_product_manager.md), asegurando que los totales de facturación de producto, cartera y prepagos coincidan al céntimo (0,00 € de discrepancia) en ambas pantallas.

#### Desglose Informativo en la Ventana Modal (`InfoPopover`):
Para máxima transparencia, al pulsar `ℹ️` en Facturación se muestra un desglose con todas las magnitudes contables y documentales del periodo:
1. ℹ️ **Venta Neta de Producto (Item):** Importe de producto que computa contra el objetivo presupuestado.
2. ℹ️ **Portes y Transportes (Cuenta 624):** Total facturado a clientes en concepto de transporte y gastos de envío.
3. ℹ️ **Otras Cuentas Contables (GL):** Otras líneas contables facturadas distintas de portes (servicios especiales, embalajes, etc.).
4. ℹ️ **Prepagos Vivos Pendientes de Facturar (PFV):** Saldo real vivo de anticipos cobrados a clientes cuya mercancía o servicio aún no se ha terminado de entregar ni facturar formalmente con una factura ordinaria `FV`. Se calcula cliente a cliente mediante asignación FIFO cruzando con las líneas de compensación (cuenta `438%`) en facturas definitivas. Los prepagos que ya han sido compensados se excluyen para evitar duplicidades contables.
5. ℹ️ **Total Facturación Documental:** Cifra total neta de cabeceras de facturación en Business Central.
   * *Nota de diseño:* Se muestra con icono informativo `ℹ️` y **sin separador ni signo `=`**, ya que no representa una suma aritmética directa (las cabeceras de facturas ordinarias FV ya compensan internamente líneas de prepago, por lo que sumarlo causaría duplicidades).

---

### 4.2. Objetivo Presupuestado
* **Definición:** Meta de venta acumulada asignada para el periodo, vendedor o familias seleccionadas.
* **Fórmula Matemática:**
  $$\text{Objetivo} = \sum (\text{Importe Presupuestado en } \texttt{sales\_budget\_entries})$$
* **Origen de Datos:** Tabla `sales_budget_entries` sincronizada desde Business Central.

---

### 4.3. Desviación Nominal (€)
* **Definición:** Diferencia absoluta en euros entre la facturación real neta y el objetivo presupuestado.
* **Fórmula Matemática:**
  $$\text{Desviación Nominal} = \text{Facturación Neta Producto} - \text{Objetivo Presupuestado}$$
* **Comportamiento Visual:**
  - Si es $\ge 0$: Color **verde** (`text-emerald-500`), prefijo `+` (superávit sobre el objetivo).
  - Si es $< 0$: Color **rojo** (`text-red-500`) (déficit sobre el objetivo).

---

### 4.4. Cumplimiento Porcentual (%)
* **Definición:** Porcentaje de ejecución de la meta presupuestaria.
* **Fórmula Matemática:**
  $$\text{Cumplimiento} = \left( \frac{\text{Facturación Neta Producto}}{\text{Objetivo Presupuestado}} \right) \times 100$$
* **Utilidad:** Permite comparar el desempeño comercial entre zonas o comerciales con objetivos de diferente tamaño en valor absoluto.

---

### 4.5. Cartera de Pedidos (Vivos)
* **Definición:** Importe total de pedidos de venta confirmados por los clientes que están actualmente abiertos y pendientes de servir (`outstanding_amount`).
* **Fórmula Matemática:**
  $$\text{Cartera Neta} = \sum (\text{Líneas de Pedido Pendientes}) - \text{Prepagos Vivos Asignados}$$
* **Desglose de Cuentas Contables:** Muestra entre paréntesis la porción correspondiente a líneas de cuenta contable (G/L Accounts), asegurando consistencia visual.

---

### 4.6. Pendiente de Facturar (Albaranes Enviados)
* **Definición:** Mercancía ya expedida físicamente de almacén mediante albarán de entrega, pero cuya factura definitiva aún no se ha emitido en Business Central.
* **Fórmula Matemática:**
  $$\text{Pendiente Facturar} = \sum (\text{Qty. Shipped Not Invoiced} \times \text{Precio Efectivo}) - \text{Prepagos Facturados Aplicados}$$
* **Utilidad:** Representa ventas ya materializadas en la práctica que entrarán a facturación en los próximos días de forma inminente.

---

## 5. Vista de Tablas: Pestañas Principales 📑

En la sección central derecha se dispone de un selector de pestañas que permite alternar entre dos niveles de detalle:
1. **`[ 🏢 Por Clientes ]`**: Vista analítica clásica desagregada cliente a cliente con scroll infinito.
2. **`[ 👥 Por Comercial ]`** (o **`[ 👤 Mi Rendimiento ]`** para usuarios con rol comercial): Vista de rendimiento y control del equipo comercial.

---

## 6. Tabla de Rendimiento por Comercial (`SalespersonPerformanceTable`) 👥

Diseñada para evaluar la productividad comercial, la captación de cuentas y la coherencia contable por vendedor. Dispone de **3 sub-pestañas de análisis rápido**:

### 6.1. Sub-pestaña `[ 📊 Rendimiento y Cumplimiento ]`:
Enfocada en el producto y la consecución del presupuesto asignado:
* **Comercial:** Código y nombre completo del vendedor (ej. `AV - ALEIX VINYES`). Dispone de botón de filtro rápido `🔍` que permite saltar a la pestaña *Por Clientes* filtrando automáticamente las cuentas de ese comercial.
* **FV Producto (Facturación Solo Producto):** Total bruto facturado en líneas de artículo (`Type = 'item'`) en facturas ordinarias `FV`. Permite auditar el volumen íntegro de producto vendido antes de devoluciones.
* **AAV Producto (Abonos Solo Producto):** Total abonado por devoluciones o notas de crédito en líneas de artículo.
* **Fact. Neta Items:** Facturación neta de material de catálogo ($\text{FV Producto} - \text{AAV Producto}$). Esta es la magnitud homogénea que computa contra el presupuesto anual.
* **Fact. {year-1} (LYTD):** Facturación de producto obtenida en el mismo periodo del año anterior por este vendedor.
* **Objetivo (€):** Presupuesto de ventas asignado al comercial para el periodo seleccionado.
* **Desviación (€):** Diferencia nominal ($\text{Fact. Neta} - \text{Objetivo}$) con color verde/rojo y prefijo de signo.
* **% Cumplimiento:** Porcentaje alcanzado con micro-barra de progreso visual de colores (verde para $\ge 100\%$, ámbar para $80-99\%$ y rojo para $<80\%$).

### 6.2. Sub-pestaña `[ 📑 Desglose Contable y Prepagos ]`:
Proporciona auditoría completa entre la facturación documental de Business Central y los conceptos contables especiales:
* **Facturas (FV):** Importe de cabeceras de facturas de venta ordinarias emitidas.
* **Prepagos (PFV):** Importe de facturas de anticipo emitidas a clientes del comercial.
* **Abonos (AAV):** Importe de notas de crédito y devoluciones documentales.
* **Total Doc.:** Facturación documental neta ($\text{FV} + \text{PFV} - \text{AAV}$).
* **Portes (624):** Cuentas contables de transporte repercutidas a clientes asignados a este comercial.
* **Otras Ctas:** Demás líneas de cuentas contables facturadas (distintas de 438 y 624).
* **Prepagos Vivos:** Saldo vivo de anticipos cobrados a clientes del comercial cuya entrega de mercancía o factura final ordinaria aún está pendiente de emitir.

### 6.3. Sub-pestaña `[ 📦 Cartera y Previsión ]`:
Visión prospectiva de pedidos y estimación de cierre del ejercicio:
* **Fact. Items:** Facturación de producto ya devengada y facturada.
* **Cartera Neta:** Pedidos de venta confirmados y abiertos pendientes de servir, netos de prepagos aplicados.
* **Pend. Facturar:** Albaranes ya enviados físicamente al cliente pendientes de emisión de factura definitiva, netos de prepagos aplicados.
* **Prepagos Deducidos:** Total de prepagos vivos absorbidos en pedidos y albaranes de clientes de este vendedor.
* **Clientes Nuevos:** Badge distintivo con la cantidad de clientes nuevos dados de alta en el ejercicio asignados al comercial y el volumen (€) facturado por ellos.
* **Previsión Total:** Estimación total de ventas a cierre ($\text{Fact. Items} + \text{Cartera Neta} + \text{Pend. Facturar}$).

### 6.4. Control de Acceso (RBAC) en la Tabla de Comerciales:
* **Comerciales (`isSalesperson = true` / usuario con `profile.code`):**
  - La pestaña se titula automáticamente **`[ 👤 Mi Rendimiento ]`**.
  - El comercial **sólo ve su propia fila de métricas**. Se aísla por completo la visualización de los datos del resto del equipo.
* **Dirección General, Dirección Comercial y Administradores:**
  - Visualizan el listado completo de todos los comerciales en activo.
  - Cuentan con la **Fila de TOTAL EQUIPO COMERCIAL** consolidada al pie de la tabla en cualquiera de las 3 sub-pestañas.

---

## 7. Tabla de Rendimiento por Cliente 📋

Accesible mediante la pestaña **`[ 🏢 Por Clientes ]`**. Permite analizar el comportamiento cliente a cliente.

### 7.1. Columnas de la Tabla:
1. **Cliente:** Nombre comercial del cliente y su código oficial de Business Central (`customerCode`). Dispone de etiquetas visuales distintivas y aviso de prepago vivo si aplica.
2. **Facturación Año en Curso (`Fact. {year}`):** Importe neto facturado al cliente en el periodo seleccionado (exclusivo de artículos de producto comercial).
3. **Cartera Pedidos (`Cartera {year}`):** Importe de pedidos vivos abiertos y pendientes de servir para ese cliente (neto de prepagos).
   - **Sub-indicador de Entregas Pendientes:** Si el cliente tiene mercancía entregada por albarán pendiente de facturar, se muestra debajo una etiqueta en cian: **`+{importe} € pend. fact.`**.
   - **Garantía de Cuadre:** Los clientes con pedidos vivos o albaranes pendientes pero sin facturación ni presupuesto en el periodo se integran automáticamente en la tabla para que el sumatorio de la tabla coincida exactamente con los KPIs superiores.
4. **Facturación Año Anterior (`Fact. {year-1}`):** Ventas netas acumuladas en el mismo periodo del año precedente, permitiendo comparar el crecimiento interanual.
5. **Objetivo:** Meta presupuestaria fijada específicamente para ese cliente.
6. **Desviación:** Desviación en euros y porcentaje de cumplimiento respecto a su objetivo particular.

---

### 7.2. Casos Especiales y Reglas de Negocio en la Tabla de Clientes:

#### A) Clientes Nuevos (`isNew: true`):
- Se marcan con un badge animado verde **"NUEVO"**.
- Son clientes dados de alta en el ejercicio actual que no tenían compras registradas anteriormente.

#### B) Meta Agrupada / Cliente Fantasma Comodín (`99999999` / `CLIENTE NUEVO`):
- **¿Qué es?** En la planificación comercial de Business Central, la dirección establece un presupuesto global para la captación de nuevas cuentas asignado a un cliente ficticio llamado `CLIENTE NUEVO` (código `99999999` o `9999999`).
- **Problema que resuelve:** Cuando un cliente nuevo real compra, su facturación se computa bajo su CIF real, pero el presupuesto estaba en la fila comodín.
- **Tratamiento en la Aplicación:**
  - Se resalta visualmente con un borde índigo y el badge **"Meta Agrupada"**.
  - **Exclusión de la Suma de Facturación:** Para evitar duplicidades contables, la celda de facturación de esta fila se marca como informativa `(Agrupado)` y su valor **no se suma al pie de totales filtrados**. De este modo, los totales coinciden exactamente con los KPIs y con la realidad contable de la empresa.

#### C) Prepagos Vivos por Cliente (`Prepago: X €`):
- Si el cliente dispone de anticipos o facturas prepago (`PFV`) que **aún no han sido terminadas de facturar / compensar** en una factura ordinaria `FV`, se muestra una etiqueta destacada en cian junto al nombre del cliente: **`Prepago: {importe}`**.
- Permite al comercial identificar de un vistazo qué clientes tienen saldo vivo anticipado listo para aplicar a nuevos envíos de material.

---

### 7.3. Características Técnicas de la Tabla:
- **Scroll Infinito Reactivo (`useInfiniteQuery` + `IntersectionObserver`):** Carga los clientes en bloques de 50 en 50 de forma suave sin congelar la interfaz.
- **Persistencia de Foco en Búsqueda:** La configuración de React Query `placeholderData: keepPreviousData` garantiza que el input de búsqueda nunca pierda el foco ni el cursor mientras el usuario escribe.
- **Fila Fija de Totales Filtrados:** Un pie de tabla siempre visible (con sombra superior y sticky) que muestra los totales consolidados calculados directamente por el backend para todos los clientes que cumplen los filtros activos.

---

## 8. Gráfico de Evolución Mensual (`BudgetEvolutionChart`) 📊

Ubicado al final de la página:
- **Barras:** Facturación real neta mes a mes.
- **Línea de Tendencia / Presupuesto:** Objetivo mensual presupuestado para contrastar visualmente qué meses estuvieron por encima o por debajo de la meta.
- **Resaltado de Meses Seleccionados:** Sincronizado interactivamente con los botones de meses de la barra lateral.

---

## 9. Exportación a Excel Inteligente (`ExportButton`) 📥

Al pulsar el botón **Exportar**:
* **Si la pestaña activa es `[ 🏢 Por Clientes ]`:**
  - Genera un libro multi-pestaña `ventas_presupuesto_{year}.xlsx` con arquitectura de doble hoja para cuadrar el presupuesto sin duplicar importes:
    1. **Hoja 1: `Ventas vs Presupuesto`**:
       - Clientes habituales del periodo.
       - Fila agrupada `99999999 - CLIENTES NUEVOS (Meta Agrupada - Detalle en Hoja 2)` que contiene el **presupuesto oficial de captación**, la suma total de facturación lograda por las nuevas altas y la desviación neta.
       - Fila final de **TOTALES**: Coincide al 100% tanto con la suma de las filas de la hoja como con las tarjetas de KPI del panel (sin duplicidades contables).
    2. **Hoja 2: `Detalle Clientes Nuevos`**:
       - Listado individual y exhaustivo de todos los clientes nuevos dados de alta en el ejercicio con su código, nombre, facturación del año y facturación del año anterior.
       - Fila de sumatorio `TOTAL CLIENTES NUEVOS`, cuya cifra es idéntica a la fila agrupada de la Hoja 1.
* **Si la pestaña activa es `[ 👥 Por Comercial ]`:**
  - Genera `rendimiento_comerciales_{year}.xlsx`.
  - Exporta las 18 columnas exhaustivas del equipo comercial (FV Producto, AAV Producto, Facturación Neta Items, Histórico, Presupuesto, Desviaciones, Facturación Documental, Portes 624, Otras Cuentas GL, Prepagos Vivos, Cartera Neta, Pendiente Facturar, Nuevos Clientes y Previsión Cierre).
  - Incluye la fila de sumatorio de **TOTAL EQUIPO COMERCIAL**.

---

## 10. Optimización de Rendimiento y Reactividad ⚡

Para garantizar una respuesta inmediata al interactuar con filtros pesados (familias con miles de artículos o conmutación rápida de meses):
1. **Caché en Memoria de Artículos (`resolveItemNos`):**
   - Al filtrar por familia o subfamilia, el árbol de artículos resultantes se memoriza en una caché interna del servidor con TTL de 10 minutos. Los cambios posteriores de mes o filtros temporales resuelven los artículos en **0 ms**.
2. **Caché de Calendario (`getDatesForMonths`):**
   - Las fechas de calendario para el cómputo de días del ejercicio se almacenan en memoria (TTL de 30 min), evitando consultas repetitivas a la tabla `calendar`.
3. **Optimización de Índices por Rango de Fechas (`getMonthRanges` y `buildDateFilter`):**
   - En lugar de enviar a PostgreSQL un array de más de 200 fechas individuales (`budget_date: { in: dates }`), el backend consolida automáticamente los meses seleccionados en rangos continuos `gte/lte` o intervalos `OR` discretos. Esto permite a PostgreSQL utilizar de forma óptima el índice B-tree (`idx_budget_date`), reduciendo la ejecución de presupuestos de ~650 ms a menos de 80 ms (8x más rápido).
4. **Feedback Visual No Destructivo en KPIs:**
   - Durante la obtención de datos en segundo plano (`isFetching`), las tarjetas de KPI muestran un indicador visual sutil (`Loader2`) y una ligera atenuación sin destruir el contenido ni alterar el layout, preservando el foco y garantizando máxima fluidez de usuario.


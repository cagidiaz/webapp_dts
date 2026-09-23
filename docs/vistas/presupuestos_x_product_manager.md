# 📦 Documentación de Vista: Presupuesto x Product Manager

> **Ubicación en la aplicación:** `/sales/product-budgets`  
> **Componente Frontend:** [`ProductBudgetPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/ProductBudgetPage.tsx)  
> **Servicio Backend:** [`sales.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/sales/sales.service.ts) (`getProductBudgetPerformance`, `getProductBudgetEvolution`, `getProductBudgetExport`)  
> **Última actualización:** Septiembre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Presupuesto x Product Manager** está diseñada específicamente para los responsables de producto (*Product Managers - PM*) y la Dirección Técnica/Comercial de dTS Instruments.

A diferencia de la vista comercial tradicional (centrada en el vendedor), esta vista profundiza en la **rentabilidad y cumplimiento de objetivos por referencia de catálogo y cliente**:
- Permite a cada Product Manager monitorizar el rendimiento de las líneas de producto bajo su gestión.
- Desglosa la venta a **doble nivel jerárquico**: primero muestra los clientes y, al desplegar cada uno, revela exactamente **qué productos o referencias concretas compró**, su facturación real y su presupuesto asignado.
- Facilita el análisis granular de demanda para planificar compras, aprovisionamiento de stock y promociones técnicas.

---

## 2. Estructura y Layout de la Vista 🖥️

La pantalla se distribuye en:
1. **Bandeja Superior de KPIs (6 Tarjetas):** Métricas consolidadas de facturación, objetivos de producto y carteras.
2. **Cuerpo Central Dividido en Dos Columnas:**
   - **Columna Izquierda (20%):** Barra lateral de filtros multidimensionales (`BudgetFiltersSidebar`), con selectores dedicados para Product Manager y código de artículo/SKU.
   - **Columna Derecha (80%):** Tabla jerárquica desplegable (Cliente ➔ Productos) con scroll infinito y pie de totales fijo.
3. **Bloque Inferior:** Gráfico de evolución temporal mensual (`BudgetEvolutionChart`).

---

## 3. Panel de Filtros Laterales (`BudgetFiltersSidebar`) 🔍

| Filtro | Tipo de Control | Descripción y Funcionamiento | Utilidad de Negocio |
| :--- | :--- | :--- | :--- |
| **Ejercicio** | Selector desplegable | Años fiscales disponibles (2024, 2025, 2026). Cambia el año de comparación. | Análisis de ejercicios anteriores o seguimiento del año actual. |
| **Product Manager (PM)** | Botonera de códigos PM | Selector de código de Product Manager (ej. `ACI`, `JMO`, `JKU`, `JPG`). <br>• **Detección Automática:** Si el usuario que inicia sesión está identificado en el sistema como Product Manager, la vista fija automáticamente su código PM y oculta/bloquea el selector. <br>• Para Dirección o Administradores, permite alternar libremente entre cualquier PM o ver el catálogo global. | Control de acceso específico para que cada Product Manager se enfoque en su cartera de productos. |
| **Meses** | Botonera interactiva (1 al 12) | Permite seleccionar meses específicos o acumulados (por defecto YTD hasta el mes en curso). | Evaluar estacionalidades y cumplimiento en periodos cerrados. |
| **Vendedor** | Selector con búsqueda (`SearchableSelect`) | Filtra qué comercial ha generado las ventas de los productos del PM seleccionado. | Permite al PM analizar qué comerciales están vendiendo mejor sus productos o en qué zonas se requiere apoyo técnico. |
| **Familia y Subfamilia** | Selectores en cascada | Categorías oficiales de Business Central asociadas a los artículos. | Segmentar por tipología técnica o gamas de producto. |
| **Código Producto (SKU)** | Input de texto con debounce | Permite buscar o filtrar por un código de artículo específico o referencia de fabricante. | Analizar un equipo o consumible concreto en todos los clientes que lo han adquirido. |
| **Buscador de Cliente** | Input con debounce (400ms) | Búsqueda rápida por nombre o código de cliente sin perder el foco de escritura. | Localizar un cliente concreto dentro del catálogo del PM. |
| **Limpiar Filtros** | Botón `X` | Restablece todos los filtros aplicados a su estado por defecto. | Retornar rápidamente a la visión global. |

---

## 4. Indicadores Clave de Rendimiento (KPI Cards) 📈

Al igual que en la vista comercial, los KPIs superiores proporcionan una visión instantánea y rigurosa del rendimiento:

### 4.1. Facturación (Items)
* **Definición:** Facturación neta real acumulada correspondiente exclusivamente a líneas de producto (`Item`) gestionadas por el Product Manager o filtros aplicados. Se explicita `(Items)` en el título de la tarjeta para distinguirla de la facturación documental global y asegurar homogeneidad absoluta con la vista de Ventas vs Presupuestos.
* **Fórmula Matemática:**
  $$\text{Facturación Neta Producto} = \sum_{\text{Facturas}} \text{line\_amount} - \sum_{\text{Abonos}} \text{line\_amount} \quad (\text{donde } \texttt{type} = \text{'Item'})$$
* **Origen de Datos:** Tablas documentales `sales_documents` y `sales_document_lines` (Líneas de Facturas y Abonos de Venta).
* **¿Por qué lo hacemos de esta manera? (Homogeneidad y Consistencia Total):**
  > [!IMPORTANT]
  > Para que no existan discrepancias entre la vista de **Ventas vs Presupuestos** y la de **Presupuesto x Product Manager**, ambas pantallas consumen **las mismas tablas documentales** (`sales_documents` y `sales_document_lines`). Al computar línea a línea las líneas de tipo `Item`, los totales globales coinciden al céntimo (ej. 1.524.189,01 € en 2026), evitando los desvíos originados por el prorrateo de descuentos de pie de factura que realiza Business Central en `value_entries`. Además, el desglose jerárquico (Cliente ➔ Producto) y el gráfico mensual suman exactamente la misma magnitud.

#### Desglose Informativo en la Ventana Modal (`InfoPopover`):
Al pulsar el icono `ℹ️`, se abre el modal con las 5 magnitudes informativas:
1. ℹ️ **Venta Neta de Producto (Item):** Cifra central de producto que se compara con el presupuesto.
2. ℹ️ **Portes y Transportes (Cuenta 624):** Portes facturados en el periodo.
3. ℹ️ **Otras Cuentas Contables (GL):** Otras cuentas contables aplicadas en documentos de venta.
4. ℹ️ **Prepagos Vivos Pendientes de Facturar (PFV):** Saldo real vivo de anticipos cobrados que aún no han sido liquidados o facturados mediante una factura definitiva `FV`. Se calcula por cliente mediante FIFO frente a las compensaciones registradas en cuenta 438, evitando incluir prepagos que ya han sido consumidos y formalizados en ventas reales.
5. ℹ️ **Total Facturación Documental:** Cifra neta documental registrada en cabeceras.
   * *Presentación limpia:* Mostrada con icono `ℹ️` y **sin signo `=` ni línea divisoria**, indicando claramente que no se trata de una suma aritmética directa sino de métricas informativas independientes.

---

### 4.2. Objetivo Presupuestado
* **Definición:** Suma de los objetivos de venta fijados para los productos y clientes correspondientes al PM en el periodo seleccionado.
* **Fórmula Matemática:**
  $$\text{Objetivo} = \sum (\text{Líneas de Presupuesto en } \texttt{sales\_budget\_entries})$$

---

### 4.3. Desviación (€) y Cumplimiento (%)
* **Desviación Nominal:**
  $$\text{Desviación} = \text{Facturación Producto} - \text{Objetivo}$$
  *(En verde con `+` si supera el objetivo, en rojo si está por debajo).*
* **Cumplimiento Porcentual:**
  $$\text{Cumplimiento} = \left( \frac{\text{Facturación Producto}}{\text{Objetivo}} \right) \times 100$$

---

### 4.4. Cartera de Pedidos y Pendiente de Facturar
* **Cartera Pedidos:** Pedidos abiertos de los productos en cartera pendientes de entregar.
* **Pendiente Facturar:** Albaranes entregados pendientes de emitir factura neta de prepagos.

---

## 5. Tabla Jerárquica Desplegable (Cliente ➔ Productos) 📋

La tabla de esta vista posee una arquitectura en dos niveles de información:

```
▼ [Cliente] LABORATORIOS FARMACEUTICOS S.A.
   ├─ [SKU-001] Reactivo Analítico A    | Fact: 12.500 € | Obj: 10.000 € | Desv: +2.500 € (+25.0%)
   └─ [SKU-002] Equipo Espectrómetro B  | Fact: 45.000 € | Obj: 50.000 € | Desv: -5.000 € (-10.0%)
```

### 5.1. Nivel 1: Fila del Cliente (Cabecera Agrupadora)
- **Chevron interactivo:** Flecha a la izquierda (`ChevronRight`) que rota a $90^\circ$ al expandir.
- **Nombre y Código del Cliente:** Permite identificar la cuenta.
- **Totales del Cliente:** Sumatorio de la facturación, año anterior, objetivo y desviación de **todos los productos comprados por ese cliente** que coincidan con los filtros activos.
- **Etiquetas de Estado:**
  - `NUEVO`: Cliente de nueva captación en el ejercicio.
  - `Meta Agrupada`: Cliente ficticio `99999999` para objetivos no individualizados (excluido de la suma de facturación para evitar duplicidades).
  - `Prepago: {importe}`: Si el cliente posee facturas de anticipo pendientes de facturar definitivamente (saldo vivo), se muestra un distintivo en cian con el importe vivo.

### 5.2. Nivel 2: Filas de Producto (Desplegadas al hacer clic)
- Con sangría visual y fondo diferenciado (`bg-gray-50/50`).
- Muestra el **Nombre del Producto** y su **Código SKU / Item No**.
- Datos específicos de ese producto con ese cliente:
  - Facturación en el año en curso.
  - Facturación en el año anterior ($N-1$).
  - Objetivo presupuestado individual para ese producto.
  - Desviación nominal y porcentual alcanzada en ese producto.

---

### 5.3. Pie de Tabla Fijo (Totales Consolidados)
- Mantiene siempre a la vista los totales absolutos de todos los clientes y productos que cumplen los filtros, sincronizados con los KPIs superiores.

---

## 6. Gráfico de Evolución Temporal (`BudgetEvolutionChart`) 📊

Muestra la evolución mensual:
- Facturación real de los productos del Product Manager frente a la curva de previsión/objetivo fijada para cada mes.

---

## 7. Exportación a Excel (`ExportButton`) 📥

Al exportar los datos de esta vista se genera el libro multi-pestaña `presupuesto_producto_{year}.xlsx`:
* **Hoja 1: `Presupuesto x Producto`**:
  - Clientes habituales aplanados (*flattened*) con cada uno de sus productos comprados.
  - Fila final agregada `99999999 - CLIENTES NUEVOS (Meta Agrupada - Detalle en Hoja 2)` con el **presupuesto de captación**, las ventas acumuladas de nuevos clientes y la desviación.
  - Fila de **TOTALES**: Coincide al 100% con los KPIs del panel sin duplicar la facturación de clientes nuevos.
* **Hoja 2: `Detalle Clientes Nuevos`**:
  - Desglose exhaustivo de los clientes nuevos y sus productos adquiridos, permitiendo analizar qué referencias específicas de catálogo están impulsando la captación.
  - Fila de sumatorio `TOTAL CLIENTES NUEVOS`, cuya cifra coincide exactamente con la fila agrupada de la Hoja 1.

---

## 8. Homogeneidad Total con Ventas vs Presupuestos 🔄

| Dimensión de Análisis | [Ventas vs Presupuestos](file:///c:/proyectos/webapp_dts/docs/vistas/ventas_vs_presupuestos.md) (`/sales/budgets`) | [Presupuesto x Product Manager](file:///c:/proyectos/webapp_dts/docs/vistas/presupuestos_x_product_manager.md) (`/sales/product-budgets`) |
| :--- | :--- | :--- |
| **Concepto Central** | **Cliente y Vendedor** (Comercial) | **Producto y Cliente** (Técnico / SKU) |
| **Tablas Fuente** | `sales_documents` + `sales_document_lines` | `sales_documents` + `sales_document_lines` |
| **Criterio de Producto** | $\sum \text{line\_amount}$ donde $\texttt{type} = \text{'Item'}$ | $\sum \text{line\_amount}$ donde $\texttt{type} = \text{'Item'}$ |
| **Facturación Items (2026)** | **1.524.189,01 €** | **1.524.189,01 €** |
| **Facturación Total Doc. (2026)** | **1.568.572,78 €** | **1.568.572,78 €** |
| **Cartera de Pedidos (2026)** | **312.902,45 €** | **312.902,45 €** |
| **Pendiente de Facturar (2026)** | **24.963,78 €** | **24.963,78 €** |
| **Prepagos Vivos (2026)** | **27.228,92 €** | **27.228,92 €** |
| **Suma 12 Meses Gráfico** | **1.524.189,01 €** | **1.524.189,01 €** |
| **Diferencia entre Vistas** | **0,00 €** | **0,00 €** |


# Actualización: Columna Cartera de Pedidos por Cliente, Selector Múltiple de Subfamilias y Mejoras UX en Limpieza de Filtros

**Fecha:** 24 de Septiembre de 2026  
**Módulos:** 
- Ventas / Ventas vs Presupuestos (`/sales/budgets`)
- Ventas / Presupuesto x Product Manager (`/sales/product-budgets`)
- Componentes UI Compartidos (`SearchableSelect`, `MultiSearchableSelect`, `BudgetFiltersSidebar`)
- Servicio de Ventas Backend (`sales.service.ts`)

---

## 1. Resumen de Cambios

En esta entrega se han implementado mejoras fundamentales solicitadas por el equipo comercial y de producto:

1. **Nueva Columna de Cartera de Pedidos en la Tabla de Clientes (`SalesBudgetPage`):**
   - Se ha añadido la columna **Cartera Pedidos (`Cartera {year}`)** posicionada inmediatamente después de la columna de facturación del año (`Fact. {year}`).
   - **Formato visual en dos alturas:**
     - Línea principal: Importe neto de pedidos vivos abiertos pendientes de servir (`outstanding_amount`), con deducción FIFO cliente a cliente de prepagos no liquidados.
     - Sub-indicador en color cian: Si el cliente dispone de albaranes de mercancía ya expedida pero pendiente de facturar formalmente (`qty_shipped_not_invoiced`), se muestra la etiqueta **`+{importe} € pend. fact.`**.
   - **Garantía de Cuadre Total:** Se ha implementado en backend la inclusión de aquellos clientes que cuentan con pedidos abiertos o albaranes pendientes pero que aún no disponían de facturas ni presupuesto en el periodo analizado (evitando discrepancias donde la suma de filas difería de los KPIs o la fila de totales).

2. **Selector Múltiple de Subfamilias (`MultiSearchableSelect`):**
   - En las vistas de **Ventas vs Presupuestos** y **Presupuesto x Product Manager**, el filtro de subfamilias ha evolucionado de un selector simple a un desplegable de selección múltiple.
   - Permite filtrar por una, varias o todas las subfamilias simultáneamente, manteniendo la sincronización jerárquica con la familia seleccionada.
   - Incluye buscador rápido con debounce, botones para *Marcar todas* y *Desmarcar todas*, contador numérico de elementos seleccionados y persistencia reactiva.
   - En el backend (`sales.service.ts`), `resolveItemNos` procesa arrays de subfamilias o strings delimitados por comas para consultar de forma atómica en Prisma (`{ in: cleanSubfamilies }`).

3. **Mejoras UX en la Limpieza de Filtros:**
   - **Botón "Limpiar" en cabecera de cada filtro:** En `BudgetFiltersSidebar`, cada filtro con valor activo (Vendedor, Familia, Subfamilias y Código Producto) muestra en su cabecera un botón de texto "Limpiar" / "Limpiar (N)" en color rose/rojo con hover subrayado, permitiendo retirar cualquier filtro de un solo clic sin necesidad de desplegar el selector.
   - **Píldoras `X` de alto contraste en selectores:** Sustitución de los iconos grises por píldoras circulares con fondo contrastado (`bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800`), separador vertical respecto al chevron y padding interior ampliado (`pr-16`) para evitar que el texto largo de los nombres se solape con el botón de borrado.
   - **Opción "Quitar filtro" en desplegable:** En `SearchableSelect`, el menú incluye al inicio una opción explícita para desmarcar el filtro actual.
   - **Borrado rápido en SKU:** El campo de búsqueda de código de producto incorpora su propio botón `X` de vaciado instantáneo.

---

## 2. Archivos Modificados

### Backend (NestJS + Prisma)
* [`backend/src/modules/sales/sales.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/sales/sales.service.ts):
  - Normalización de subfamilias múltiples en `resolveItemNos`.
  - Integración de clientes con cartera de pedidos viva y albaranes enviados sin facturación ni presupuesto en `getSalesBudgetPerformance`.
  - Soporte de subfamilias múltiples en evolución y presupuesto por Product Manager.

### Frontend (React + TypeScript)
* [`frontend/src/api/salesBudget.ts`](file:///c:/proyectos/webapp_dts/frontend/src/api/salesBudget.ts) y [`frontend/src/api/salesProductBudget.ts`](file:///c:/proyectos/webapp_dts/frontend/src/api/salesProductBudget.ts):
  - Aceptan `subfamilyCode?: string | string[]` y serialización automática a query params.
* [`frontend/src/components/ui/MultiSearchableSelect.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/components/ui/MultiSearchableSelect.tsx) *(Nuevo)*:
  - Componente de selección múltiple con buscador, píldora de borrado contrastada y atajos rápidos.
* [`frontend/src/components/ui/SearchableSelect.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/components/ui/SearchableSelect.tsx):
  - Padding ampliado a `pr-16`, píldora circular contrastada de borrado y opción "Quitar filtro" en el desplegable.
* [`frontend/src/components/ui/index.ts`](file:///c:/proyectos/webapp_dts/frontend/src/components/ui/index.ts):
  - Exportación de `MultiSearchableSelect`.
* [`frontend/src/pages/sales/components/BudgetFiltersSidebar.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/components/BudgetFiltersSidebar.tsx):
  - Integración de `MultiSearchableSelect` para subfamilias.
  - Botones individuales "Limpiar" en las cabeceras de cada filtro y borrado rápido en SKU.
* [`frontend/src/pages/sales/SalesBudgetPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/SalesBudgetPage.tsx):
  - Columna Cartera Pedidos en la tabla de clientes con sub-indicador `+X € pend. fact.`.
  - Integración del estado `subfamilyFilter: string[]`.
* [`frontend/src/pages/sales/ProductBudgetPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/ProductBudgetPage.tsx):
  - Integración del estado `subfamilyFilter: string[]` en filtros, KPIs, gráficos y exportaciones.

### Documentación
* [`docs/vistas/ventas_vs_presupuestos.md`](file:///c:/proyectos/webapp_dts/docs/vistas/ventas_vs_presupuestos.md)
* [`docs/vistas/presupuestos_x_product_manager.md`](file:///c:/proyectos/webapp_dts/docs/vistas/presupuestos_x_product_manager.md)
* [`docs/actualizaciones/2026-09-24-columna-cartera-pedidos-selector-multiple-subfamilias-y-ux-limpieza-filtros.md`](file:///c:/proyectos/webapp_dts/docs/actualizaciones/2026-09-24-columna-cartera-pedidos-selector-multiple-subfamilias-y-ux-limpieza-filtros.md)

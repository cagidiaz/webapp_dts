# Definiciones de KPIs — dTS Instruments

## KPIs Financieros (Dashboard Contable)

### EBITDA
**Earnings Before Interest, Taxes, Depreciation, and Amortization**
- **Fórmula:** Ingresos operativos - Gastos operativos (excluyendo depreciación, amortización, intereses e impuestos)
- **Fuente:** Business Central (tabla de movimientos contables)
- **Color en gráficos:** `#003E51` (Primario — datos reales)

### Liquidez (Ratio de Liquidez Corriente)
- **Fórmula:** Activo corriente / Pasivo corriente
- **Fuente:** Business Central (balance general)
- **Interpretación:** >1 = saludable / <1 = riesgo de insolvencia

### Margen Bruto (%)
- **Fórmula:** (Ingresos - Coste de ventas) / Ingresos × 100
- **Fuente:** Business Central (cuenta de pérdidas y ganancias)

---

## KPIs de Ventas, Presupuestos y Operaciones

### Facturación (Items) — Venta Neta de Producto
- **Definición:** Valor neto devengado exclusivamente en líneas de producto/artículo (`Type = Item`), deduciendo devoluciones y abonos de producto. Aísla portes y líneas contables para compararse homogéneamente con el presupuesto.
- **Fórmula:** $\sum (\text{Líneas FV Producto}) - \sum (\text{Líneas AAV Producto})$
- **Fuente:** `sales_documents` + `sales_document_lines` (tanto en Ventas vs Presupuestos como en Product Manager)
- **Color en gráficos:** `#003E51` (Primario — datos reales)

### Facturación Documental Total
- **Definición:** Cifra de negocio documental total de cabeceras de facturación en Business Central, incluyendo portes y cuentas contables.
- **Fórmula:** Facturas Ordinarias (FV) + Prepagos Facturados (PFV) - Abonos (AAV)
- **Fuente:** `sales_documents` (cabeceras netas de IVA)

### Prepagos Vivos (PFV)
- **Definición:** Saldo de anticipos cobrados que aún no han sido compensados ni liquidados mediante entrega y factura ordinaria definitiva `FV`.
- **Cálculo:** Asignación FIFO cliente a cliente frente a compensaciones de cuenta `438%` en facturas ordinarias.

### Cartera de Pedidos Neta (Order Backlog)
- **Definición:** Valor total de pedidos de venta abiertos y pendientes de servir (`outstanding_quantity`), neto de prepagos vivos aplicados del propio cliente.
- **Fórmula:** $\sum (\text{outstanding\_quantity} \times \text{Precio Efectivo}) - \text{Prepagos Vivos Asignados}$
- **Precio Efectivo:** $\text{line\_amount} / \text{quantity}$ (absorbe descuentos comerciales de línea y cabecera; excluye líneas a 0).
- **Fuente:** `sales_orders`

### Pendiente de Facturar Neto (Shipped Not Invoiced)
- **Definición:** Valor de albaranes de venta entregados físicamente al cliente pero pendientes de emitir factura ordinaria definitiva, netos de prepagos aplicados.
- **Fórmula:** $\sum (\text{qty\_shipped\_not\_invoiced} \times \text{Precio Efectivo}) - \text{Prepagos Facturados Asignados}$
- **Fuente:** `sales_orders`

### Total Pedidos (Unique Orders)
- **Definición:** Conteo de documentos de venta abiertos ignorando la cantidad de líneas internas.
- **Fórmula:** `Count(Distinct document_number)` en `sales_orders`

---

## Convenciones Visuales y Corporativas

| Tipo de dato | Color | Estilo | Significado |
| :--- | :--- | :--- | :--- |
| **Real (BC)** | `#003E51` | Línea o barra sólida azul | Datos reales consolidados (Facturación, Clientes) |
| **Previsión / Objetivo** | `#00B0B9` | Línea o barra sólida cian | Objetivos presupuestados, tendencias y botones activos |
| **Año Anterior (LYTD)** | `#9CA3AF` | Línea gris punteada | Referencia histórica del ejercicio previo |


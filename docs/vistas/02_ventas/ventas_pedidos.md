# 📦 Documentación de Vista: Ventas — Pedidos de Venta

> **Ubicación en la aplicación:** `/sales/orders`  
> **Acceso en menú:** Ventas → *Pedidos de Venta*  
> **Componente Frontend:** [`SalesOrdersPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/SalesOrdersPage.tsx)  
> **Servicio Backend:** `backend/src/modules/sales-orders/sales-orders.service.ts` (`getAll`, `getKPIs`, `getAgedPrepayments`)  
> **Controlador Backend:** `backend/src/modules/sales-orders/sales-orders.controller.ts`  
> **Tablas de Base de Datos:** `sales_order_lines`, `customers`, `sales_invoices`, `sales_invoice_lines`  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Pedidos de Venta** permite al departamento de Operaciones, Ventas y Finanzas controlar la cartera de pedidos viva (backlog), el flujo de expediciones y la gestión de anticipos de clientes. Sus objetivos principales son:

* **Control de la Cartera Abierta (Backlog)**: Conocer el importe monetario neto de mercancía comprometida pendiente de entregar y facturar.
* **Seguimiento de Envíos Pendientes de Facturar**: Rastrear entregas físicas ya realizadas (`qty_shipped_not_invoiced`) que deben documentarse con factura de venta de inmediato.
* **Liquidación y Deducción Exacta de Prepagos (PFV)**: Compensar de forma inteligente los anticipos facturados a clientes (`438%`) contra sus propios pedidos vivos, evitando sobrestimar la cartera de cobros pendientes.
* **Detección de Prepagos Envejecidos**: Identificar anticipos cobrados hace más de 30/60 días que aún no han derivado en entregas, previniendo disputas y desvíos contables.

---

## 2. Estructura de la Vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Bandeja de KPIs Superiores (4 Tarjetas Métricas con Desglose)                   │
│  [ Total Pedidos ] [ Cartera Neta (€) ] [ Enviado No Facturado ] [ Prepagos ]   │
│  * Con desgloses interactivos: Cuentas G/L y deducción de anticipos              │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros (Búsqueda con debounce, Tipo de Línea, Ordenación, Exportar)   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Pedidos Agrupados por Cabecera (Scroll infinito con useInfiniteQuery)   │
│  - Cabecera: Documento, Fecha, Cliente, Cant. Total, Pendiente, Importe Total    │
│  - Expansor desplegable (+): Detalle línea a línea (Producto/Cuenta, UM, Precios)│
├──────────────────────────────────────────────────────────────────────────────────┤
│  Modal de Prepagos Envejecidos (Aged Prepayments Analysis)                       │
│  - Lista de anticipos vivos por cliente ordenados por antigüedad                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Indicadores Clave (KPIs) y Reglas de Negocio Estrictas 📊

Esta vista implementa de forma rigurosa las directrices financieras corporativas de dTS:

| KPI | Métrica / Regla | Origen y Fórmula de Negocio |
| :--- | :--- | :--- |
| **Total Pedidos** | Entero (ej. `245`) | Conteo de cabeceras de pedidos abiertos con cantidades pendientes. |
| **Cartera de Pedidos (Neta)** | Importe en euros (€) | $\sum (\text{outstanding\_quantity} \times \frac{\text{line\_amount}}{\text{quantity}}) - \text{Prepagos Imputados}$. |
| **Enviado Pendiente de Facturar** | Importe en euros (€) | $\sum (\text{qty\_shipped\_not\_invoiced} \times \frac{\text{line\_amount}}{\text{quantity}}) - \text{Prepagos Imputados}$. |
| **Prepagos Compensados** | Importe en euros (€) | Suma de anticipos de clientes aplicados a los pedidos vivos. |

### 3.1 Reglas Críticas de Cálculo
1. **Precio Efectivo (Neto):** No utiliza `unit_price` bruto. Siempre calcula $(\text{line\_amount} / \text{quantity})$ para respetar descuentos acordados.
2. **Exclusión de Ceros:** Se excluyen de las valoraciones líneas cuya cantidad o precio efectivo sea igual a cero.
3. **Imputación Cliente a Cliente de Prepagos:** Los prepagos vivos de un cliente **solo** se deducen de los pedidos de ese mismo cliente; nunca compensan pedidos de terceros.
4. **Orden de Imputación:** El prepago vivo compensa primero la mercancía enviada pendiente de facturar (`qty_shipped_not_invoiced`). Si queda remanente, compensa la cartera abierta (`outstanding_quantity`).
5. **Cuentas Contables (G/L):** El desglose de líneas de cuenta contable nunca puede exceder el valor neto total resultante del KPI ($\min(\text{cuentas}, \text{totalNeto})$).

---

## 4. Agrupación y Vista Detallada de Líneas 📑

* **Agrupación en Cabeceras**: Para evitar duplicidad visual, las líneas con el mismo `document_number` se colapsan en una sola fila resumen.
* **Líneas Expandibles**: Al pulsar en el icono `ChevronRight`, se despliega una sub-tabla con todas las líneas que componen el pedido:
  - Código y Descripción del producto o cuenta.
  - Cantidad pedida vs Cantidad pendiente vs Cantidad enviada.
  - Importe neto de la línea y fecha prevista de expedición.
* **Exportación Excel Completa**: Genera un archivo `.xlsx` desglosado con todas las líneas filtradas.

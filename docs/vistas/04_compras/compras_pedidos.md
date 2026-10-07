# 🛍️ Documentación de Vista: Compras — Pedidos de Compra

> **Ubicación en la aplicación:** `/purchases/orders`  
> **Acceso en menú:** Compras → *Pedidos de Compra*  
> **Componente Frontend:** [`PurchaseOrdersPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/purchases/PurchaseOrdersPage.tsx)  
> **Servicio Backend:** `backend/src/modules/purchase-orders/purchase-orders.service.ts` (`getAll`, `getKPIs`)  
> **Controlador Backend:** `backend/src/modules/purchase-orders/purchase-orders.controller.ts`  
> **Tablas de Base de Datos:** `purchase_order_lines`, `vendors`  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Pedidos de Compra** es el panel de control de aprovisionamiento internacional y nacional para el departamento de Compras, Almacén y Operaciones. Sus funciones críticas son:

* **Seguimiento de la Entrada de Mercancía**: Monitorizar pedidos emitidos a fabricantes que están pendientes de recepción física en las instalaciones de dTS.
* **Control de Compromisos de Pago con Proveedores**: Valorar el importe total de compras comprometidas pendientes de recibir para la planificación de tesorería y pagos.
* **Detección de Retrasos en Envíos**: Rastrear fechas previstas de recepción frente a la fecha actual para gestionar incidencias con los fabricantes.
* **Control de Mercancía Recibida no Facturada**: Identificar entregas ya recibidas en almacén que están pendientes de recibir la factura del proveedor para conciliar albaranes.

---

## 2. Estructura de la Vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Bandeja de KPIs Superiores (4 Tarjetas Métricas)                                │
│  [ Total Pedidos ] [ Importe Comprometido ] [ Uds. Pendientes ] [ Recibido s/Fact]│
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros y Búsqueda:                                                    │
│  - Input con debounce (Nº pedido, proveedor, artículo)                           │
│  - Selector de Tipo de Compra y Proveedor                                        │
│  - Botón de Exportación Excel (.xlsx)                                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Pedidos de Compra Agrupados por Cabecera (Scroll infinito)             │
│  - Cabecera: Documento, Fecha, Proveedor, Cantidad Total, Importe Total          │
│  - Expansor desplegable (+): Detalle línea a línea (Referencia, UM, Recibido)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Indicadores Clave de Rendimiento (KPIs) 📈

| KPI | Métrica | Cálculo / Origen | Utilidad de Negocio |
| :--- | :--- | :--- | :--- |
| **Total Pedidos** | Cantidad entera (ej. `128`) | Conteo de cabeceras de pedidos de compra abiertas. | Carga de trabajo y pedidos en tránsito. |
| **Importe Comprometido** | Importe en euros (€) | $\sum (\text{outstanding\_quantity} \times \text{direct\_unit\_cost})$. | Volumen de gasto pendiente de entrar en almacén. |
| **Unidades Pendientes** | Unidades enteras (ej. `3.420 uds`) | $\sum \text{outstanding\_quantity}$. | Volumen físico de unidades pendientes de recepcionar. |
| **Recibido Pendiente Factura**| Importe en euros (€) | $\sum (\text{qty\_r_invoiced} \times \text{direct\_unit\_cost})$. | Mercancía en stock cuyo coste no ha sido liquidado en factura. |

---

## 4. Desglose y Agrupación en Cabeceras 📑

* **Agrupación Inteligente**: Las líneas con el mismo número de documento se agrupan en una única fila representativa de la orden de compra.
* **Detalle Expandible**: Al pulsar en el expansor `+`, se muestra la descomposición de líneas de la orden:
  - Referencia y descripción del producto del fabricante.
  - Cantidad pedida, recibida y pendiente de entrega.
  - Coste unitario pactado e importe total de la línea.

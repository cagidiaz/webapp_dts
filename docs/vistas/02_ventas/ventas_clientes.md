# 👥 Documentación de Vista: Ventas — Cartera de Clientes

> **Ubicación en la aplicación:** `/sales/customers`  
> **Acceso en menú:** Ventas → *Clientes*  
> **Componente Frontend:** [`CustomersPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/CustomersPage.tsx)  
> **Componente Mapa:** [`IberianGeoSalesMap.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/components/IberianGeoSalesMap.tsx)  
> **Componente Drawer:** [`CustomerDetailDrawer.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/components/CustomerDetailDrawer.tsx)  
> **Servicio Backend:** `backend/src/modules/customers/customers.service.ts` (`getAll`, `getById`, `getKPIs`, `getSalespersons`, `getFilterOptions`)  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Cartera de Clientes** es la herramienta central para el equipo de ventas, dirección y finanzas de dTS Instruments para la monitorización de cuentas comerciales, su concentración geográfica y el análisis de crédito. Permite:

* **Visión Geoespacial del Negocio en la Península Ibérica**: Mapa interactivo D3 / TopoJSON que representa las ventas acumuladas o la deuda viva por comunidades autónomas de España y regiones de Portugal.
* **Seguimiento Multianual de Ventas**: Análisis comparativo de facturación histórica por cliente en columnas anuales configurables (2023, 2024, 2025, 2026) y margen comercial medio.
* **Vigilancia del Riesgo de Crédito y DSO (Días de Cobro)**: Control del saldo vivo (`balance`), saldo vencido (`balance_due`) y los días reales medios de pago calculados a partir de las facturas cobradas.
* **Filtrado Avanzado Segmentado**: Filtrado por Comercial/Delegado, Comunidad Autónoma, Tipo de Cliente (A–F), Modelo de Negocio, Mercado y Estado de Bloqueo.
* **Inspección Profunda mediante Drawer Lateral**: Acceso con un clic a la ficha completa del cliente, sus contactos oficiales, histórico de facturas, pedidos abiertos y ofertas vigentes.

---

## 2. Estructura y Componentes de la Vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Bandeja de KPIs Superiores (4 Tarjetas Métricas)                                │
│  [ Cartera Clientes ] [ Facturación Total ] [ Deuda Pendiente ] [ Nuevos Año ]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Mapa Geoespacial Ibérico (IberianGeoSalesMap)                                   │
│  - Proyección D3 TopoJSON España y Portugal (Península, Baleares, Canarias)      │
│  - Selector de Métrica: Facturación (€) vs Saldo Pendiente (€)                   │
│  - Ranking lateral Top Comunidades + Filtro interactivo al hacer clic en zona    │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros Dinámicos (Buscador con debounce, Comercial, Tipo, Columnas)   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Clientes con Scroll Infinito (useInfiniteQuery + keepPreviousData)    │
│  - Columnas configurables: Ventas 2023-2026, Margen %, Forma de Pago, DSO...     │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Drawer Lateral de Detalle (CustomerDetailDrawer sincronizado por URL ?clientId) │
│  - Ficha BC, NIF, contactos, ofertas, pedidos abiertos y cálculo de días de cobro│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Indicadores Clave de Rendimiento (KPIs) 📈

| KPI | Métrica | Cálculo / Origen | Utilidad de Negocio |
| :--- | :--- | :--- | :--- |
| **Cartera de Clientes** | Cantidad entera (ej. `1.842`) | `COUNT(customers)` que cumplen los filtros aplicados. | Tamaño de la base de clientes del segmento activo. |
| **Facturación Acumulada** | Importe en euros (€) | Suma de las ventas históricas de los clientes visibles. | Volumen total facturado en la selección. |
| **Saldo Pendiente (Riesgo)** | Importe en euros (€) | `SUM(balance)` de los clientes seleccionados en Business Central. | Total de crédito comercial vivo otorgado a clientes. |
| **Nuevas Altas del Año** | Cantidad entera (ej. `64`) | Clientes con fecha de creación en el ejercicio actual. | Tasa de captación comercial y crecimiento de cartera. |

---

## 4. Mapa Geoespacial Ibérico (`IberianGeoSalesMap.tsx`) 🗺️

* **Tecnología**: Generado con **D3.js** y proyecciones geográficas basadas en geometrías TopoJSON de España y Portugal.
* **Escala de Color**: Gradiente corporativo dTS desde cian suave (`#E0F7FA`) hasta el azul oscuro de marca (`#003E51`).
* **Interacción Bidireccional**: Al hacer clic en cualquier comunidad (ej. Cataluña, Madrid, Andalucía, Portugal Norte), la tabla inferior filtra automáticamente mostrando solo los clientes radicados en esa demarcación.

---

## 5. Drawer de Detalle del Cliente (`CustomerDetailDrawer.tsx`) 🗂️

Al hacer clic en cualquier fila de la tabla:
1. **Sincronización por URL**: Abre el panel lateral y actualiza la URL (`?clientId=CLI-XXXX`), permitiendo compartir el enlace directo entre comerciales o recargar sin perder la selección.
2. **Cálculo Real de DSO (Days Sales Outstanding)**: Evalúa las facturas de venta canceladas frente a sus fechas de vencimiento y cobro efectivo para calcular los días medios reales que tarda el cliente en pagar.
3. **Acceso a Contactos y Acciones Rápidas**: Visualiza teléfonos, correos y enlaces directos a CRM.
4. **Resumen de Pedidos y Ofertas**: Bloque desplegable con pedidos abiertos pendientes de servir y cotizaciones en curso.

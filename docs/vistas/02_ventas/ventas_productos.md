# 🏷️ Documentación de Vista: Ventas — Catálogo de Productos y Stock

> **Ubicación en la aplicación:** `/sales/products`  
> **Acceso en menú:** Ventas → *Productos*  
> **Componente Frontend:** [`ProductsPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/ProductsPage.tsx)  
> **Servicio Backend:** `backend/src/modules/products/products.service.ts` (`getAll`, `getFamilies`, `getVendors`, `getInventoryDashboard`)  
> **Controlador Backend:** `backend/src/modules/products/products.controller.ts`  
> **Tablas de Base de Datos:** `products`, `product_categories`, `vendors`  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Catálogo de Productos** es el maestro de referencias de dTS Instruments. Sincronizado desde Microsoft Dynamics 365 Business Central, sirve como herramienta operativa para los Product Managers, equipo comercial y compras para:

* **Control del Inventario Físico:** Conocer las existencias disponibles en almacén (`inventory_qty`), su coste de adquisición y la valoración total de inventario.
* **Análisis de Rentabilidad y Precios:** Consultar precios de venta recomendados (PVP), costes estándar y el margen comercial porcentual teórico por referencia.
* **Segmentación por Fabricante y Familia:** Filtrar referencias por subfamilias tecnológicas y proveedores principales (marcas representadas internacionalmente).
* **Gestión de Ciclo de Vida del Producto:** Identificar artículos descatalogados o bloqueados comercialmente para evitar ofertas erróneas.
* **Evolución Histórica de Stock:** Gráfica interactiva de valoración temporal del inventario.

---

## 2. Estructura de la Vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Bandeja de KPIs Superiores (4 Tarjetas Métricas)                                │
│  [ Total Referencias ] [ Stock Físico (Uds) ] [ P.V.P. Medio ] [ Valoración € ] │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Gráfico de Evolución del Inventario (BarChart mensual con Recharts)            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros y Búsqueda:                                                    │
│  - Input con debounce (busca por código y descripción)                           │
│  - Selector de Subfamilia + Selector de Proveedor                                │
│  - Filtros rápidos: [ Solo con Stock ] [ Ocultar Bloqueados ]                    │
│  - Botón de Exportación Excel (.xlsx)                                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Catálogo con Scroll Infinito (useInfiniteQuery + keepPreviousData)    │
│  [ Código ] [ Descripción ] [ Subfamilia ] [ Stock ] [ PVP ] [ Coste ] [ Margen %│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Indicadores Clave de Rendimiento (KPIs) 📈

| KPI | Métrica | Cálculo / Origen | Utilidad de Negocio |
| :--- | :--- | :--- | :--- |
| **Total Referencias** | Cantidad entera (ej. `8.450`) | `COUNT(products)` según filtros activos. | Amplitud del catálogo activo. |
| **Stock Físico Total** | Unidades enteras (ej. `14.280 uds`) | `SUM(inventory_qty)` de las referencias filtradas. | Volumen de unidades disponibles en almacén. |
| **P.V.P. Medio** | Importe en euros (€) | Media ponderada de `unit_price`. | Nivel medio de precio de catálogo. |
| **Valoración Inventario** | Importe en euros (€) | $\sum (\text{inventory\_qty} \times \text{unit\_cost})$. | Capital circulante inmovilizado en existencias de almacén. |

---

## 4. Campos y Columnas de la Tabla 📋

* **Código de Artículo (`item_no`)**: Identificador único en Business Central.
* **Descripción**: Nombre técnico comercial del producto.
* **Subfamilia**: Clasificación de categoría tecnológica (con popover explicativo).
* **Stock (`inventory_qty`)**: Cantidad física disponible. Resaltado en verde si hay existencias, gris si es cero, o rojo si hay rotura/negativo.
* **P.V.P. (`unit_price`)**: Precio de venta al público en euros.
* **Coste Unitario (`unit_cost`)**: Coste estándar de aprovisionamiento.
* **Margen (%) (`profit_margin_pct`)**: $\frac{\text{PVP} - \text{Coste}}{\text{PVP}} \times 100$.
* **Proveedor (`vendor_no`)**: Fabricante o distribuidor homologado.
* **Estado**: Indicador visual de producto activo o bloqueado.

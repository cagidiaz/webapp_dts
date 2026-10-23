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

**Ampliación preparada de la ficha compartida (13/10/2026):** `CustomerDetailDrawer` incorpora seguimiento de prospectos vinculados mediante `ClientProspectActivities`, solo para usuarios habilitados del piloto. Consulta las actividades locales por la asociación actual, con ámbito de cartera validado en API. Al desvincular, desaparecen del cliente y permanecen en el prospecto; no modifica BC. Con el piloto apagado, no se consulta la nueva tabla. La agenda global está preparada; Outlook está preparado y desactivado y el SQL no se ha aplicado.

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
* **Interacción Bidireccional**: Al seleccionar una provincia española o un distrito portugués, se coordinan el selector Territorio, la lista lateral del mapa y la tabla inferior. Se utilizan identificadores estables y etiquetas españolas para las provincias, sin depender del texto importado desde BC.

### Corrección de filtros geográficos - 23/10/2026

La selección se conserva en un único estado (`territoryFilter`). El mapa obtiene su zona activa de ese valor: al pulsar Vizcaya selecciona `ES-48`; al elegir Vizcaya en Territorio se activa la misma zona del mapa. Volver a pulsar la provincia, quitar su etiqueta o restablecer filtros desmarca ambos controles. No se combinan dos estados de zona independientes.

El nombre es una etiqueta de presentación: Vizcaya/Bizkaia, Gerona/Girona, Lérida/Lleida, Guipúzcoa/Gipuzkoa, La Coruña/A Coruña y Orense/Ourense se resuelven por identidad. Las provincias se presentan en español, sin renombrar los valores almacenados en Business Central. También se armonizan los identificadores de distritos portugueses que en la cartografía utilizaban espacios, guiones o caracteres acentuados inconsistentes.

Los filtros comunes de búsqueda, comercial, tipo de cliente, mercado, modelo de negocio, condiciones de pago y portes se construyen una sola vez para tabla, mapa y exportación. La consulta del mapa conserva el contexto geográfico completo y la selección limita sus marcadores y ranking; la tabla, sus KPIs y el Excel reciben el identificador de esa selección. Los territorios de texto que no sean una provincia/distrito conocido conservan su filtro anterior.

`CustomersService` clasifica por país, código postal y, como alternativa, provincia/ciudad y sus alias, con el mismo criterio que el mapa. La selección se aplica a la cartera autenticada y a los demás filtros antes de paginar y calcular los totales. Un código postal extranjero que comienza por 48 no se considera Vizcaya. No se normalizan datos de origen ni se crean funciones, extensiones o cambios SQL.

El mapa carga todas las páginas de la cartera, sin detenerse en los primeros 600 clientes. El ranking conserva Top 5/10/15/25/50; **Todos** elimina el límite del ranking dentro de la selección. Los marcadores conservan su límite visual para rendimiento. Durante una nueva consulta se indica carga, sin presentar la tabla anterior como si correspondiera a la nueva zona.

**Validación:** 19 pruebas de clasificación, alias, filtros combinados, paginación, totales y permisos; comprobación de las 70 geometrías y carga de 2.005 clientes de prueba; lectura de datos reales en transacción de solo lectura el 23/10/2026. Para la cartera global de comprobación, el mapa, la consulta `ES-48` y la consulta Vizcaya coinciden en los mismos 31 clientes. Esa cifra depende del usuario, los filtros y el momento; no sustituye la prueba visual posterior al despliegue.

Archivos: `geoCoordinates.ts`, `CustomersPage.tsx`, `IberianGeoSalesMap.tsx`, `customers.ts`, `customer-geography.ts` y su catálogo. La prueba de regresión contrasta los catálogos de frontend/backend para evitar diferencias de identidad. Mantener nombres y alias coordinados al ampliar el catálogo.

---

## 5. Drawer de Detalle del Cliente (`CustomerDetailDrawer.tsx`) 🗂️

Al hacer clic en cualquier fila de la tabla:
1. **Sincronización por URL**: Abre el panel lateral y actualiza la URL (`?clientId=CLI-XXXX`), permitiendo compartir el enlace directo entre comerciales o recargar sin perder la selección.
2. **Cálculo Real de DSO (Days Sales Outstanding)**: Evalúa las facturas de venta canceladas frente a sus fechas de vencimiento y cobro efectivo para calcular los días medios reales que tarda el cliente en pagar.
3. **Acceso a Contactos y Acciones Rápidas**: Visualiza teléfonos, correos y enlaces directos a CRM.
4. **Resumen de Pedidos y Ofertas**: Bloque desplegable con pedidos abiertos pendientes de servir y cotizaciones en curso.

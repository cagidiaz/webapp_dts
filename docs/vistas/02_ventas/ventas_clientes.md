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

* **Visión Geoespacial del Negocio en la Península Ibérica**: Mapa interactivo D3 / TopoJSON que representa las ventas acumuladas o la deuda viva por provincias de España y distritos de Portugal.
* **Seguimiento Multianual de Ventas**: Análisis comparativo de facturación histórica por cliente en columnas anuales configurables (2023, 2024, 2025, 2026) y margen comercial medio.
* **Vigilancia del Riesgo de Crédito y DSO (Días de Cobro)**: Control del saldo vivo (`balance`), saldo vencido (`balance_due`) y los días reales medios de pago calculados a partir de las facturas cobradas.
* **Filtrado Avanzado Segmentado**: Búsqueda por código, nombre o ciudad y filtros por vendedor, territorio, tipo de cliente (A–F), modelo de negocio, mercado, condiciones de pago y portes.
* **Inspección Profunda mediante Drawer Lateral**: Acceso con un clic a la ficha completa del cliente, sus contactos oficiales, histórico de facturas, pedidos abiertos y ofertas vigentes.

---

## 2. Estructura y Componentes de la Vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Mapa Geoespacial Ibérico (IberianGeoSalesMap)                                   │
│  - Proyección D3 TopoJSON España y Portugal (Península, Baleares, Canarias)      │
│  - Selector de Métrica: Facturación (€) vs Saldo Pendiente (€)                   │
│  - Ranking lateral de clientes + filtro interactivo al hacer clic en zona       │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros Dinámicos (Buscador con debounce, Comercial, Tipo, Columnas)   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Clientes con Scroll Infinito (useInfiniteQuery + keepPreviousData)    │
│  - Columnas configurables: Ventas 2023-2026, Margen %, Forma de Pago, DSO...     │
│  - Pie fijo: clientes filtrados, ventas por año y total acumulado               │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Drawer Lateral de Detalle (CustomerDetailDrawer sincronizado por URL ?clientId) │
│  - Ficha BC, NIF, contactos, ofertas, pedidos abiertos y cálculo de días de cobro│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Resumen de la cartera

La vista comienza directamente con el mapa. Se elimina la fila superior de cuatro tarjetas para reducir información repetida y dar más espacio a los clientes. El mapa mantiene sus indicadores y selectores de ventas/deuda; el pie de la tabla muestra el número de clientes filtrados, las ventas anuales y el total acumulado. Las etiquetas «Nuevo» de cada cliente permanecen disponibles.

---

## 4. Mapa Geoespacial Ibérico (`IberianGeoSalesMap.tsx`) 🗺️

* **Tecnología**: Generado con **D3.js** y proyecciones geográficas basadas en geometrías TopoJSON de España y Portugal.
* **Escala de Color**: Gradiente corporativo dTS desde cian suave (`#E0F7FA`) hasta el azul oscuro de marca (`#003E51`).
* **Interacción Bidireccional**: Al seleccionar una provincia española o un distrito portugués, se coordinan el selector Territorio, la lista lateral del mapa y la tabla inferior. Se utilizan identificadores estables y etiquetas españolas para las provincias, sin depender del texto importado desde BC.

### Corrección de filtros geográficos - 23/10/2026

La selección se conserva en un único estado (`territoryFilter`). El mapa obtiene su zona activa de ese valor: al pulsar Vizcaya selecciona `ES-48`; al elegir Vizcaya en Territorio se activa la misma zona del mapa. Volver a pulsar la provincia, quitar su etiqueta o restablecer filtros desmarca ambos controles. No se combinan dos estados de zona independientes.

El nombre es una etiqueta de presentación: Vizcaya/Bizkaia, Gerona/Girona, Lérida/Lleida, Guipúzcoa/Gipuzkoa, La Coruña/A Coruña y Orense/Ourense se resuelven por identidad. Las provincias se presentan en español, sin renombrar los valores almacenados en Business Central. También se armonizan los identificadores de distritos portugueses que en la cartografía utilizaban espacios, guiones o caracteres acentuados inconsistentes.

Los filtros comunes de búsqueda, comercial, tipo de cliente, mercado, modelo de negocio, condiciones de pago y portes se construyen una sola vez para tabla, mapa y exportación. La consulta del mapa conserva el contexto geográfico completo y la selección limita sus marcadores y ranking; la tabla, sus totales y el Excel reciben el identificador de esa selección. Los territorios de texto que no sean una provincia/distrito conocido conservan su filtro anterior.

`CustomersService` clasifica por país, código postal y, como alternativa, provincia/ciudad y sus alias, con el mismo criterio que el mapa. La selección se aplica a la cartera autenticada y a los demás filtros antes de paginar y calcular los totales. Un código postal extranjero que comienza por 48 no se considera Vizcaya. No se normalizan datos de origen ni se crean funciones, extensiones o cambios SQL.

El mapa carga todas las páginas de la cartera, sin detenerse en los primeros 600 clientes. El ranking conserva Top 5/10/15/25/50; **Todos** elimina el límite del ranking dentro de la selección. Los marcadores conservan su límite visual para rendimiento. Durante una nueva consulta se indica carga, sin presentar la tabla anterior como si correspondiera a la nueva zona.

**Validación:** 19 pruebas de clasificación, alias, filtros combinados, paginación, totales y permisos; comprobación de las 70 geometrías y carga de 2.005 clientes de prueba; lectura de datos reales en transacción de solo lectura el 23/10/2026. Para la cartera global de comprobación, el mapa, la consulta `ES-48` y la consulta Vizcaya coinciden en los mismos 31 clientes. Esa cifra depende del usuario, los filtros y el momento; no sustituye la prueba visual posterior al despliegue.

Archivos: `customerTableTotals.ts`, `geoCoordinates.ts`, `CustomersPage.tsx`, `IberianGeoSalesMap.tsx`, `customers.ts`, `customer-geography.ts` y su catálogo. La prueba de regresión contrasta los catálogos de frontend/backend para evitar diferencias de identidad. Mantener nombres y alias coordinados al ampliar el catálogo.

---

### Fila de totales de la tabla

El pie fijo muestra el número de clientes filtrados, las ventas de 2023, 2024, 2025, 2026 (YTD) y el total acumulado. Utiliza la cartera completa ya cargada para el mapa, respetando todos los filtros y la zona seleccionada, sin limitarse a las páginas visibles ni añadir consultas. Se adapta a las columnas visibles y a los modos claro y oscuro. No suma porcentajes de margen, días de cobro ni campos descriptivos. Mientras se carga la cartera indica «Calculando…»; un fallo de carga no se presenta como un total cero.

Se conservan importes negativos y se excluyen clientes comodín cuyo código comienza por `999999`. El Top del ranking y el límite visual de 100 marcadores no recortan los totales. Ocultar columnas solo oculta sus celdas del pie. La exportación mantiene los registros filtrados, sin añadir esta fila visual al Excel. El acumulado corresponde a 2023–2026, no a toda la vida del cliente.

**Validación del pie y simplificación:** regresión automatizada de totales completos y por zona, importes negativos, valores alternativos y cartera vacía; compilación frontend correcta. Pendiente de comprobación visual del pie fijo, columnas ocultas, modo oscuro y eliminación de tarjetas tras recargar. No se acredita despliegue en producción. Procedimiento de usuario y criterios de aceptación en [la actualización de esta entrega](../../actualizaciones/2026-10-23-ventas-clientes-filtros-totales.md).

## 5. Drawer de Detalle del Cliente (`CustomerDetailDrawer.tsx`) 🗂️

Al hacer clic en cualquier fila de la tabla:
1. **Sincronización por URL**: Abre el panel lateral y actualiza la URL (`?clientId=CLI-XXXX`), permitiendo compartir el enlace directo entre comerciales o recargar sin perder la selección.
2. **Cálculo Real de DSO (Days Sales Outstanding)**: Evalúa las facturas de venta canceladas frente a sus fechas de vencimiento y cobro efectivo para calcular los días medios reales que tarda el cliente en pagar.
3. **Acceso a Contactos y Acciones Rápidas**: Visualiza teléfonos, correos y enlaces directos a CRM.
4. **Resumen de Pedidos y Ofertas**: Bloque desplegable con pedidos abiertos pendientes de servir y cotizaciones en curso.

### Contactos compactos en la ficha del cliente - 26/10/2026

Cada persona de contacto ocupa una sola fila en la ficha compartida. El nombre y el cargo se recortan si no caben; el detalle completo puede consultarse pasando el cursor o abriendo la ficha. Al pulsar el nombre se navega a `/crm/contacts?contactId=…` y se abre ese contacto directamente. Los iconos de correo, teléfono, móvil y LinkedIn conservan sus acciones independientes, incluida la edición de LinkedIn. Se mantienen los estilos claro/oscuro y los permisos existentes de la vista Contactos. El cambio se aplica en CRM, Ventas y demás accesos a `CustomerDetailDrawer`; no modifica datos de Business Central. Pendiente de aceptación visual en la app.

### Segmentos y potencialidad anual - 26/10/2026

La ficha compartida incorpora una tabla con Segmento, Potencialidad €/año y Facturación pendiente. Selector con búsqueda entre doce opciones; las familias con hijos no se seleccionan directamente. Admite varios segmentos por cliente sin duplicados, edición de importes, eliminación confirmada y total conocido. Un importe vacío significa pendiente y es distinto de cero. Admin edita globalmente y el comercial solo su cliente; el backend comprueba permisos y cartera. Las escrituras van a la nueva tabla independiente `crm_customer_segments`, sin modificar BC. Se requiere ejecutar el SQL antes de probar persistencia. Véase [instalación, estructura y validación](../../actualizaciones/2026-10-26-segmentos-potencialidad-clientes.md).

**Relación de segmentos confirmada (26/10/2026):** `crm_customer_segments.client_id` (`varchar(50)`) referencia `customers.client_id`, código estable de BC. La app y el backend utilizan este código. Si se instaló la primera versión UUID, usar el SQL de migración descrito en la documentación de la entrega, sin borrar datos.

# Actualización de Plataforma: Histórico de Ventas y Mejoras de Referencia Comercial

Fecha: 28 de Mayo de 2026  
Módulo: Ventas / Auditoría  
Autor: Antigravity AI Coding Assistant  

---

## Resumen de Cambios

### 1. Gráficas de Evolución Comercial
* **Línea de Ventas del Año Anterior**:
  - Incorporada una línea fina de trazo punteado (`strokeDasharray="5 5"`, `strokeWidth={1.5}`) en color de énfasis ámbar (`#F59E0B`) sobre el gráfico de evolución mensual.
  - Ofrece una referencia limpia de la estacionalidad del año anterior conectando los 12 meses.
  - Actualizado el componente principal a `ComposedChart` de Recharts en **SalesBudgetPage.tsx** y **ProductBudgetPage.tsx** para permitir sobreimprimir líneas y barras sin interferencias.
* **Renombrado de Series**:
  - Modificada la serie de `"Ventas Reales"` a **`"Ventas Año en Curso"`** para dar mayor claridad contextual en la comparativa de períodos.
  - Reajustada la ordenación de la leyenda en `RenderCustomLegend` para priorizar la serie del año corriente en primer lugar a la izquierda.

### 2. Nuevo Módulo: Histórico de Ventas (`value_entries`)
* **Acceso y Seguridad**:
  - Vista restringida exclusivamente para los roles de **ADMIN** y **DIRECCION**.
  - Protegida en frontend mediante `<RoleGuard>` y en la API del backend NestJS comprobando los roles del perfil de usuario en base de datos.
  - Modificado el renderizador de la barra lateral (`Sidebar.tsx`) para filtrar dinámicamente las rutas de submenú según rol de usuario.
* **Características de la Tabla**:
  - Integración fluida con `value_entries` en PostgreSQL mediante Prisma, parseando correctamente los campos de tipo `BigInt` (Nº de movimiento) y `Decimal` a números amigables para JSON.
  - Buscador reactivo por código/descripción de cliente, documento, producto o vendedor.
  - **Filtro por Tipo de Documento**: Selector sin ruido visual (sin icono de lupa y alineación limpia) para segmentar por Facturas (`Sales Invoice`) o Abonos (`Sales Credit Memo`).
  - Ordenación dinámica e interactiva en la totalidad de las columnas (número de movimiento, fecha de registro, documento, producto, cliente, cantidad, importe de venta, coste total).
  - Paginación ágil y fluida con Infinite Scroll (`useInfiniteQuery` + `IntersectionObserver`) y altura optimizada al 100% de la pantalla para máxima visualización de transacciones.
  - Botón de exportación xlsx directa respetando filtros activos.

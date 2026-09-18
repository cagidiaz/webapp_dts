# Actualización: Optimización de Filtros en Presupuestos, Exportación a XLSX y Permisos de Rol Producción

**Fecha:** 18 de Septiembre de 2026  
**Módulos:** 
- Ventas / Presupuestos (`/sales/sales-budget`) y Presupuestos x Product Manager (`/sales/product-budget`)
- Control de Acceso y Roles (RBAC: `PRODUCCION`)
- Utilidad de Exportación Excel (`exportToXlsx`)

---

## 1. Resumen de Cambios

En esta actualización se han resuelto incidencias clave de usabilidad, integridad de datos en exportaciones y permisos de acceso:

1. **Corrección del Filtrado de Familia y Subfamilia en Presupuestos:**
   - Se unificó la resolución de referencias de producto (`item_no`) en el backend para que tanto la facturación real como los presupuestos y pedidos abiertos respeten rigurosamente los artículos pertenecientes a las familias y subfamilias seleccionadas.
   - En la vista de **Ventas vs Presupuestos**, el cálculo de facturación por línea garantiza que únicamente se computen las líneas coincidentes con los productos filtrados, evitando imputar el total íntegro de la factura si contiene artículos de múltiples familias.
   - En la vista de **Presupuesto x Product Manager**, se corrigió el filtrado de pedidos pendientes y de facturación (`value_entries`), asegurando que familias sin productos devuelvan cero resultados en lugar de mezclar artículos de otras categorías.

2. **Eliminación de Duplicidad de Código (Componentes Compartidos):**
   - Creación de `BudgetFiltersSidebar.tsx`: componente común que centraliza la barra lateral de filtros (ejercicio, selección múltiple de meses, sincronización automática bidireccional familia-subfamilia, selector de vendedor y de Product Manager).
   - Creación de `budgetShared.tsx`: constantes de meses, tarjetas KPI con desglose contable, leyendas y el gráfico de evolución temporal mensual (`BudgetEvolutionChart`).

3. **Solución del Fallo en la Exportación a XLSX al Filtrar:**
   - Detección y resolución de la excepción `TypeError: Cannot read properties of undefined (reading 'toFixed')` provocada al evaluar columnas opcionales o sin historial previo (como `facturacionAnioAnterior` o en la fila de "CLIENTE NUEVO" `99999999`).
   - Se blindó `exportToXlsx.ts` para verificar `null` o `undefined` antes de disparar formateadores numéricos, añadiendo además gestión segura con `try/catch`.
   - Se mapeó correctamente `facturacionAnioAnterior` tanto en las filas aplanadas de productos como en la fila de totales calculados.

4. **Soporte de Navegación y Vistas para el Rol de Producción (`PRODUCCION`):**
   - Inclusión del rol `PRODUCCION` en `App.tsx` y `Sidebar.tsx` para permitirle acceso a las secciones autorizadas dinámicamente según la tabla de permisos `role_modules`.
   - Asignación por defecto del panel comercial (`SalesDashboard`) en el inicio del Dashboard.
   - Adaptación de filtros comerciales automáticos en CRM y Ofertas para acotar a su propio código asignado.

---

## 2. Archivos Modificados

### Backend (NestJS + Prisma)
* `backend/src/modules/sales/sales.service.ts`:
  - Implementación del helper privado `resolveItemNos`.
  - Refactorización de `getSalesBudgetPerformance`, `getSalesBudgetEvolution`, `getProductBudgetPerformance` y `getProductBudgetEvolution`.
  - Inclusión explícita de `facturacionAnioAnterior: 0` en el placeholder de cliente nuevo `99999999`.
* `backend/src/modules/quotes/quotes.service.ts`:
  - Consideración del rol `PRODUCCION` en la restricción comercial de ofertas.

### Frontend (React + TypeScript)
* `frontend/src/utils/exportToXlsx.ts`:
  - Blindaje ante valores nulos/indefinidos y control de excepciones en formateadores.
* `frontend/src/pages/sales/components/BudgetFiltersSidebar.tsx` *(Nuevo)*:
  - Sidebar interactivo reutilizable para vistas presupuestarias.
* `frontend/src/pages/sales/components/budgetShared.tsx` *(Nuevo)*:
  - Componentes y utilidades compartidas (`KPICard`, `BudgetEvolutionChart`, etc.).
* `frontend/src/pages/sales/SalesBudgetPage.tsx`:
  - Reutilización de componentes compartidos y robustez en la exportación Excel.
* `frontend/src/pages/sales/ProductBudgetPage.tsx`:
  - Reutilización de componentes compartidos, mapeo de año anterior en filas aplanadas y corrección de totales.
* `frontend/src/App.tsx` y `frontend/src/components/shared/Sidebar.tsx`:
  - Autorización de rutas y menú para rol `PRODUCCION`.
* `frontend/src/pages/crm/components/CrmCustomers.tsx`, `CrmPipeline.tsx` y `frontend/src/pages/dashboard/index.tsx`:
  - Adaptación de rol `PRODUCCION` en CRM y redirección al dashboard comercial.

---

## 3. Validación y Pruebas Realizadas
- Compilación de TypeScript en backend (`npx tsc --noEmit`) sin errores.
- Compilación de TypeScript en frontend (`npx tsc --noEmit`) sin errores.
- Verificación de la descarga de archivo `.xlsx` con y sin filtros de familia.

# Actualización: Desglose de Cartera de Pedidos (SEIKO, Cuentas G/L e Items) y Totalización

**Fecha:** 28 de Septiembre de 2026  
**Módulos Afectados:** Ventas vs Presupuestos (`/sales/budgets`), Presupuesto por Producto (`/sales/product-budgets`), Backend Sales Module  
**Etiquetas:** `feat: [SALES]`, `style: [UX/UI]`

---

## 1. Contexto y Necesidad
En el seguimiento comercial y presupuestario de dTS Instruments, la cartera de pedidos abierta (`outstanding_amount`) incluye tanto pedidos habituales de catálogo de productos como pedidos vinculados a cuentas contables (`G/L Account`), entre los que destaca por su volumen y singularidad operativa el cliente internacional **SEIKO FLOWCONTROL GMBH (`CL100427`)**, gestionado habitualmente por el comercial `JMO` con pedidos imputados a la cuenta `7050004`.

Con el fin de garantizar máxima transparencia contable y permitir auditar en cualquier momento la composición de la cartera viva, se ha integrado en el modal informativo (`ℹ️`) del KPI **"Cartera Pedidos"** un desglose estructurado en tres líneas aditivas independientes con totalización directa.

---

## 2. Estructura del Desglose en el Modal Informativo

Al pulsar el icono `ℹ️` en la tarjeta **Cartera Pedidos**, la interfaz presenta:

| Concepto | Signo | Descripción Técnica y Origen |
| :--- | :---: | :--- |
| **Cartera Pedidos Producto (Items)** | `+` | Pedidos abiertos netos correspondientes a material de catálogo (`Type = 'Item'`). Fórmula: $\max(0, \text{Cartera Neta Total} - \text{Cartera Cuentas G/L Neta})$. |
| **Cuentas G/L Cartera (Diferentes a SEIKO)** | `+` | Pedidos abiertos netos correspondientes a líneas de cuenta contable del resto de clientes. Fórmula: $\max(0, \text{Cartera Cuentas G/L Neta} - \text{Cartera Neta SEIKO})$. |
| **Pedidos Cartera SEIKO (CL100427 - G/L)** | `+` | Pedidos abiertos registrados bajo la cuenta de SEIKO FLOWCONTROL GMBH (líneas `7050004`). |
| **Total Cartera de Pedidos** | `=` | **Suma totalizada** de toda la cartera viva neta tras deducción de prepagos vivos aplicados. |

---

## 3. Cambios Técnicos Realizados

### Backend (`backend/src/modules/sales/sales.service.ts`)
- En `getSalesBudgetPerformance` y `getSalesProductBudgetPerformance`:
  - Se calcula la cartera neta de pedidos de SEIKO (`seikoCarteraNeta`).
  - Se calculan las cuentas G/L netas ajenas a SEIKO: `carteraVentasAccountsSinSeiko = Math.max(0, totalCarteraAccountsNeta - seikoCarteraNeta)`.
  - Se calcula la cartera de producto estándar: `carteraVentasItems = Math.max(0, totalCarteraNeta - totalCarteraAccountsNeta)`.
  - Se devuelven ambos valores en el objeto `kpis` de respuesta.

### Frontend API (`frontend/src/api/salesBudget.ts` y `salesProductBudget.ts`)
- Tipadas las nuevas propiedades en las interfaces `SalesBudgetPerformanceKPIs` y `ProductBudgetKPIs`.

### Componentes y Vistas (`frontend/src/pages/sales/`)
- En `components/budgetShared.tsx`: habilitado soporte para arrays de fórmulas en `KPICardProps` (`formulas?: string | string[]`).
- En `SalesBudgetPage.tsx` y `ProductBudgetPage.tsx`: implementado el desglose aditivo en el array `breakdown` del `infoProps` de la tarjeta KPI.

---

## 4. Verificación y Calidad
- Builds de producción limpios tanto en backend (`nest build`) como en frontend (`tsc -b && vite build`).
- Cero advertencias bloqueantes de TypeScript.

# 📊 Documentación de Vista: Panel de Control (Dashboard)

> **Ubicación en la aplicación:** `/dashboard`  
> **Acceso en menú:** Menú Principal → *Panel de Control*  
> **Enrutador principal:** [`frontend/src/pages/dashboard/index.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/dashboard/index.tsx)  
> **Componentes principales:**  
>   - [`SalesDashboard.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/dashboard/components/SalesDashboard.tsx) (Panel Comercial)  
>   - [`FinancialDashboard.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/dashboard/components/FinancialDashboard.tsx) (Panel Financiero)  
> **Servicios backend:**  
>   - `backend/src/modules/sales-budget/sales-budget.service.ts` (`getPerformance`, `getEvolution`, `getSalesReps`)  
>   - `backend/src/modules/products/products.service.ts` (`getTopProducts`)  
>   - `backend/src/modules/crm/crm.service.ts` (`getWeeklyAgenda`)  
> **Roles asignados:** Acceso universal (distribución de vista por rol: `ADMIN` y `DIRECCION` cargan Financiero; `VENTAS`, `OPERACIONES`, `PRODUCCION` y `TESTER` cargan Comercial).  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

El **Panel de Control** es la pantalla de aterrizaje neurálgica de la WebApp. Proporciona una visión ejecutiva inmediata del estado del negocio, adaptada al perfil del usuario mediante dos variantes especializadas:

1. **Panel Comercial (`SalesDashboard`):** Diseñado para los equipos de ventas, operaciones y producto. Enfocado en el pulso comercial diario:
   - Seguimiento del cumplimiento de ventas reales frente a objetivos presupuestarios (YTD vs Presupuesto).
   - Comparativa año contra año día a día (**VENTAS YTD VS VENTAS LYTD**) sin distorsión por meses incompletos.
   - Estado de la **Cartera de Pedidos** (abiertos y enviados pendientes de facturar), con desglose de cuentas contables (G/L) y compensación cliente a cliente de prepagos.
   - **Agenda Comercial Semanal**: Calendario semanal interactivo de actividades (visitas presenciales, videollamadas Teams, llamadas telefónicas, tareas y eventos).
   - **Top 5 Productos / Familias**: Clasificación de productos más vendidos en el ejercicio por facturación y margen.
   - **Drawer de Cliente Integrado**: Acceso directo al detalle del cliente desde los pedidos o actividades.

2. **Panel Financiero (`FinancialDashboard`):** Diseñado para la Dirección General y Financiera (`ADMIN`, `DIRECCION`). Centrado en el análisis de rentabilidad, evolución macroeconómica del presupuesto anual y rendimiento desagregado por comercial / delegado de zona.

---

## 2. Arquitectura y Enrutamiento por Rol 👥

El archivo `index.tsx` evalúa el rol del usuario conectado mediante el almacén global de autenticación (`useAuthStore`):

```tsx
if (userRole === 'VENTAS' || userRole === 'OPERACIONES' || userRole === 'PRODUCCION' || userRole === 'TESTER') {
  return <SalesDashboard />;
}
return <FinancialDashboard />;
```

---

## 3. Panel de Control Comercial (`SalesDashboard.tsx`) 💼

### 3.1 Estructura Visual
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Cabecera con Selector de Delegado / Comercial + Filtro Temporal                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Bandeja de KPIs Superiores (4 Tarjetas Métricas con estilo ligero text-xl)     │
│  [ Ventas YTD vs LYTD ] [ Objetivo Anual ] [ Cartera Pedidos ] [ Pend. Facturar ]│
├──────────────────────────────────────────────────────────────────────────────────┤
│  Gráfico de Evolución Mensual (Recharts BarChart: Ventas Reales vs Presupuesto) │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Sección Dividida:                                                               │
│  - Agenda Semanal Interactiva (Lunes a Domingo con eventos dTS CRM y Teams)      │
│  - Ranking Top 5 Productos / Familias con porcentaje de margen comercial         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Indicadores Clave (KPIs) y Reglas de Negocio

| KPI | Fórmula / Origen | Regla de Negocio Crítica |
| :--- | :--- | :--- |
| **VENTAS YTD VS VENTAS LYTD** | `sales_invoices` del año actual acumuladas hasta la fecha de hoy vs mismo periodo del año anterior. | **Comparativa día a día (`limitToToday: true`):** No compara el mes completo si estamos a mitad de mes; compara estrictamente hasta el mismo día del año anterior para evitar sesgos. |
| **OBJETIVO FACTURACIÓN ANUAL** | `sales_budget` anual vs total facturado real acumulado. | Muestra el % de consecución y la desviación restante en miles de euros. |
| **CARTERA DE PEDIDOS** | `sales_order_lines` abiertas (`outstanding_quantity * (line_amount / quantity)`). | **Precio Efectivo:** Nunca usa `unit_price` bruto. Deduce los prepagos vivos (`438%` en facturas) cliente a cliente. Desglosa líneas de cuentas contables. |
| **PENDIENTE DE FACTURAR** | `qty_shipped_not_invoiced * (line_amount / quantity)`. | Mercancía entregada pendiente de emisión de factura. Compensa anticipos vivos del cliente. |

### 3.3 Agenda Comercial Semanal
* **Semana Natural (L-D):** Botones de navegación semana anterior/siguiente y botón *"Hoy"*.
* **Tipologías Diferenciadas:** 
  - `VISITA` (Azul, ubicación presencial).
  - `VIDEOLLAMADA` (Púrpura, enlace Teams).
  - `CALL` (Verde, llamada telefónica).
  - `TASK` (Ámbar, tarea interna).
  - `EVENT` (Gris, visita no programada).
* **Integración Outlook:** Botón de icono Outlook en cada evento para abrirlo directamente en el cliente de Outlook (`openCalendarEventInOutlook`).

---

## 4. Panel Financiero (`FinancialDashboard.tsx`) 📈

### 4.1 Estructura Visual
* **Filtro por Responsable Comercial:** Desplegable para analizar el rendimiento individual de cada delegado o el agregado de toda la empresa.
* **KPIs de Rentabilidad y Presupuesto:**
  - Facturación Real YTD vs Presupuesto YTD (€ y % de desviación).
  - Previsión de Cierre Anual según ritmo actual (Run-Rate).
  - Deuda comercial viva de clientes y ratio de cobro.
* **Gráfico de Área / Evolución Acumulada:** Curva acumulada de ventas reales comparada con la trayectoria presupuestaria ideal.
* **Distribución por Familias de Negocio:** Gráfico circular (PieChart) con desglose por líneas de producto.

---

## 5. Endpoints de Backend y Consultas React Query

* `GET /sales-budget/performance?year=YYYY&months=1,2,3...&limitToToday=true`: Devuelve las métricas consolidadas de ventas, presupuesto, backlog y comparativa LYTD.
* `GET /sales-budget/evolution?year=YYYY`: Serie temporal mes a mes de ventas reales y presupuesto.
* `GET /products/top?limit=5&year=YYYY`: Top productos con mayor volumen y margen.
* `GET /crm/agenda/weekly?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: Citas y eventos agendados en la semana del comercial.

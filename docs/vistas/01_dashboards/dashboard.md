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

**Ampliación preparada del piloto (13/10/2026):** `GET /crm-activities` agrega las actividades programadas de `crm_prospect_activities` a las existentes, con filtros por día, tipo y propietario. No copia filas y conserva `source=PROSPECT`, UUID del prospecto, versión, autor original y permiso `can_edit`. El comercial ve solo su cartera; Admin/Dirección consultan globalmente y filtran por propietario. Admin edita; Dirección consulta. Los archivados no aparecen en agenda; los convertidos aparecen una vez, conservando origen. Las notas sin fecha quedan en la ficha del prospecto.

El modal existente y el briefing guardan las actividades locales mediante su endpoint de prospecto, sin enviarlas a `/crm-activities/:id`. El dashboard indica «Prospecto · Modo local» y respeta `can_edit`. El briefing conserva ámbito personal y suma prospectos al contador de equipo de Admin/Dirección; «hoy» se calcula en Madrid. Los informes de actividad reciben el mismo origen, mostrado también en PDF/Excel, sin contabilizar un prospecto sin cliente como cliente BC. La integración Outlook está preparado y desactivado. SQL preparado sin aplicar y piloto desactivado por defecto.
* **Semana Natural (L-D):** Botones de navegación semana anterior/siguiente y botón *"Hoy"*.
* **Tipologías Diferenciadas:** 
  - `VISITA` (Azul, ubicación presencial).
  - `VIDEOLLAMADA` (Púrpura, enlace Teams).
  - `CALL` (Verde, llamada telefónica).
  - `TASK` (Ámbar, tarea interna).
  - `EVENT` (Gris, visita no programada).
* **Integración Outlook:** Sincronización automática y transparente con el calendario personal de Microsoft 365 / Outlook (Graph API) con categorías dTS CRM, sin requerir enlaces directos inestables.

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


### Correos históricos y resumen inicial — 21/10/2026

Los registros EMAIL se conservan en Emails y Timeline, pero no forman parte de Agenda de Hoy, Pendientes de Cierre ni sus contadores personales o de equipo en la ventana inicial. Esta exclusión se aplica también a correos antiguos que tengan el indicador de completado a false; no requiere borrar ni actualizar el histórico mediante SQL.

Las rutas de registro de correo lo guardan como completado a efectos de actividad. En los borradores, el estado de envío sigue controlado por exchange_sync_status: este indicador no significa que el correo se haya enviado. Las reuniones, llamadas, visitas, videollamadas, tareas y eventos mantienen su funcionamiento. Solo REUNION se etiqueta como Reunión; los tipos no reconocidos se muestran como Actividad.

Si un correo necesita una acción futura, crear una tarea independiente desde el CRM, con fecha y estado propios. La fecha del correo se conserva como dato histórico.


## Agenda semanal compacta y apertura de detalle - 22/10/2026

`SalesDashboard.tsx` presenta cada elemento como un único botón con dos filas sin salto de línea: fecha/hora, icono, tipo y asunto; después empresa/contacto, tipología del email cuando existe y estado. `truncate` recorta texto largo; el título emergente y el nombre accesible conservan asunto y contexto. Se reduce la separación vertical entre tarjetas. El botón funciona con ratón y teclado y mantiene estilos claros/oscuros.

Al pulsar se abre `AgendaActivityDetail.tsx`, que reutiliza `Drawer`. Muestra fecha, empresa, contacto, descripción completa, ubicación, mensaje público y conclusiones según el registro. Para EMAIL muestra dirección/tipología y `EmailAttachments` con los nombres guardados, sin consultar Microsoft ni descargar archivos. El acceso a editar queda dentro del detalle para eventos distintos de EMAIL y respeta `can_edit`; utiliza `EditActivityModal` y la ruta correspondiente a actividad normal o prospecto.

EMAIL es de solo lectura en la agenda: el detalle no renderiza el botón de editar y el callback del dashboard rechaza su entrada al editor, incluso si `can_edit` está permitido. Los demás tipos conservan su edición. EMAIL no se marca vencido ni pendiente de conclusiones. Los eventos conservan el aviso de conclusiones y su estado. Se mantienen navegación de semanas, contadores, sincronización y consultas de datos; este cambio no amplía la cartera ni modifica el backend. El panel de detalle permite consulta del registro CRM y no abre por sí mismo el original en Outlook.

El estado guardado determina el estado del detalle; un evento vencido por fecha puede seguir pendiente de completar. La confirmación visual del usuario de la agenda compacta está recogida; compilación frontend correcta. Procedimiento para usuarios: manual CRM, capítulo 31.

# Actualización: Valor Ponderado de Ofertas Abiertas y Nuevo KPI de Previsión Cierre 60 Días

**Fecha:** 29 de Septiembre de 2026  
**Módulos Afectados:** Ofertas Comerciales (`/sales/quotes`), Backend Quotes Service (`quotes.service.ts`)  
**Etiquetas:** `feat: [SALES]`, `style: [UX/UI]`, `docs:`

---

## 1. Resumen de Cambios

1. **Cálculo de Valor Ponderado (Forecast) Exclusivo para Ofertas Abiertas:**
   - **Lógica Anterior:** El valor ponderado acumulaba el producto de `importe * probabilidad` de todas las cotizaciones del listado, incluyendo ofertas ganadas y perdidas históricas.
   - **Nueva Lógica:** El valor ponderado (`totalWeightedValue`) y la probabilidad media asociada (`averageProbability`) se calculan **únicamente sobre las ofertas abiertas / en proceso**. Las ofertas cerradas (ganadas o perdidas) quedan excluidas de este sumatorio para garantizar una previsión fiel del pipeline vivo.
   - **Consistencia de Probabilidad:** Se prioriza la probabilidad efectiva del CRM (`crm.probabilidad_exito`) y, en su defecto, la de la oferta base (`quote.probabilidad_exito`).

2. **Nuevo KPI: Previsión Cierre 60 Días:**
   - Se sustituye el KPI estático de *Tasa de Éxito* por una tarjeta analítica de proyección a corto plazo: **Previsión Cierre 60 Días**.
   - **Métrica Principal:** Importe acumulado (€) de ofertas vivas cuya fecha de cierre previsto (`cierreprev_date`) venza en los próximos 60 días naturales.
   - **Subtítulo:** Número de ofertas vivas en la ventana y su valor ponderado previsto (`N ofertas vivas (Pond: X €)`).
   - **Ventana Informativa Emergente (`InfoPopover`):**
     - Desglose a corto plazo:
       - *Próximos 30 días:* Subconjunto de ofertas con vencimiento inminente en el primer mes.
       - *De 31 a 60 días:* Ofertas previstas para el segundo mes.
       - *Total Previsión 60D:* Sumatorio total del período.
     - Indicación del valor ponderado estimado en dicha ventana temporal.

3. **Mejoras Visuales y Claridad en la Tabla:**
   - **Barra de Cierre Previsto:** Etiqueta actualizada a `Valor Ponderado (Abiertas)` para una lectura sin ambigüedades.
   - **Pie de Tabla (*Sticky Footer*):** Tooltips enriquecidos en las columnas de probabilidad media y valor ponderado, indicando su cómputo sobre las ofertas abiertas.

---

## 2. Archivos Modificados

- `backend/src/modules/quotes/quotes.service.ts`: Cálculo de `totalWeightedValue` en abiertas y cómputo de `closingNext60Days`.
- `frontend/src/api/quotes.ts`: Tipado de la propiedad `closingNext60Days` en la respuesta de `summary`.
- `frontend/src/pages/sales/QuotesPage.tsx`: Tarjeta `KPICard` de Previsión de Cierre 60 Días y ajustes en tooltips de tabla y barra.
- `docs/vistas/ofertas_comerciales.md`: Documentación detallada de la vista comercial.
- `docs/manual-usuario.md`: Actualización del catálogo de KPIs del módulo de ventas.
- `docs/kpi-definitions.md`: Fichas técnicas de los nuevos indicadores comerciales.

---

## 3. Pruebas y Validación

- **Backend:** Compilación exitosa con `nest build` (`npm run build`).
- **Frontend:** Compilación de producción exitosa con `tsc -b && vite build` (`npm run build`).

# 🧾 Documentación de Vista: Ventas — Histórico de Facturación

> **Ubicación en la aplicación:** `/sales/invoices`  
> **Acceso en menú:** Ventas → *Histórico de Facturación*  
> **Componente Frontend:** [`SalesInvoicesPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/SalesInvoicesPage.tsx)  
> **Servicio Backend:** `backend/src/modules/sales-documents/sales-documents.service.ts` (`getBillingHistoryDashboard`, `getAllSalesDocuments`)  
> **Controlador Backend:** `backend/src/modules/sales-documents/sales-documents.controller.ts`  
> **Tablas de Base de Datos:** `sales_invoices`, `sales_invoice_lines`, `sales_credit_memos`, `sales_credit_memo_lines`  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Histórico de Facturación** centraliza la totalidad de los documentos de venta emitidos por dTS Instruments (Facturas ordinarias, Facturas de anticipo/prepago y Abonos/Notas de crédito) sincronizados desde Business Central. Sus objetivos fundamentales son:

* **Auditoría de Ventas Reales Emitidas**: Comprobar importes brutos, descuentos aplicados, bases imponibles netas e IVA repercutido.
* **Análisis Comparativo Multianual y Estacional**: Evaluar la facturación interanual mes a mes mediante gráficos de evolución temporal para detectar tendencias comerciales y estacionalidad.
* **Inspección Línea a Línea**: Capacidad de expandir cualquier factura para auditar los productos vendidos, número de serie, precio unitario efectivo, cantidad e importe neto de cada partida.
* **Control de Facturas de Prepago**: Distinguir facturas ordinarias de facturas de anticipo (`PFV`) para conciliación contable.
* **Exportación Avanzada**: Modal de exportación a Excel (.xlsx) con opciones de filtrado por rango de fechas, clientes o tipologías.

---

## 2. Estructura y Modos de Visualización 🖥️

La pantalla cuenta con un selector superior para conmutar entre dos modos de trabajo:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Filtros Globales de Ejercicio y Meses (Años seleccionables, Meses 1 a 12)       │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Panel de Gráficos de Evolución (Colapsable con botón "Ver / Ocultar Gráficos"): │
│  - LineChart: Comparativa mensual multianual (2024 vs 2025 vs 2026)              │
│  - BarChart: Facturación neta consolidada por ejercicio                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Selector de Modo:  [ 📄 Vista Detallada ]    [ 📊 Vista Comparativa ]           │
├──────────────────────────────────────────────────────────────────────────────────┤
│  A. VISTA DETALLADA                                                              │
│     - Buscador por número de documento, cliente o NIF                            │
│     - Filtros por Tipo (Factura / Abono) y Categoría                             │
│     - Tabla infinita con expansor (+) para ver las líneas de producto            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  B. VISTA COMPARATIVA                                                            │
│     - Matriz agregada mes a mes por año con totales y variaciones porcentuales   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Indicadores Clave de Rendimiento (KPIs) 📈

| Métrica | Cálculo / Origen | Significado Financiero |
| :--- | :--- | :--- |
| **Facturación Neta Total** | $\sum \text{Facturas} - \sum \text{Abonos}$ (base imponible). | Ingresos reales devengados en el periodo seleccionado. |
| **Total Facturas Emitidas** | Conteo de cabeceras de facturas registradas. | Volumen de transacciones documentales emitidas. |
| **Total Abonos / Devoluciones** | Conteo e importe de notas de crédito emitidas. | Impacto de devoluciones, rectificaciones o acuerdos comerciales. |
| **Desviación Interanual (%)** | $\frac{\text{Ventas Actual} - \text{Ventas Año Anterior}}{\text{Ventas Año Anterior}} \times 100$. | Ritmo de crecimiento porcentual del negocio. |

---

## 4. Desglose de Líneas de Factura 🔎

Al pulsar sobre el icono `ChevronRight` de cualquier factura:
* Se despliega la lista completa de artículos o cuentas facturadas.
* Muestra: Código de producto, Descripción, Cantidad, Precio Unitario, Descuento % e Importe Neto.
* Permite a los comerciales y a administración cotejar exactamente qué referencias compusieron un pedido facturado.

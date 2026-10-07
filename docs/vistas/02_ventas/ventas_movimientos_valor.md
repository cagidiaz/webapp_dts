# 📑 Documentación de Vista: Ventas — Movimientos de Valor

> **Ubicación en la aplicación:** `/sales/value-entries`  
> **Acceso en menú:** Ventas → *Movimientos Valor*  
> **Componente Frontend:** [`ValueEntriesPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/ValueEntriesPage.tsx)  
> **Servicio Backend:** `backend/src/modules/value-entries/value-entries.service.ts` (`getAll`)  
> **Controlador Backend:** `backend/src/modules/value-entries/value-entries.controller.ts`  
> **Tabla de Base de Datos:** `value_entries` (de Dynamics 365 Business Central)  
> **Control de Acceso (RBAC):** Restringido exclusivamente a roles `ADMIN` y `DIRECCION`.  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Movimientos de Valor** es la herramienta de auditoría de bajo nivel contable y financiero de la WebApp. Proporciona acceso directo al libro mayor de transacciones de inventario y facturación (`Value Entries`) de Business Central para:

* **Auditoría Contable Forense**: Analizar cada línea registrada que afecta al coste de las ventas y a la facturación de producto.
* **Cálculo Exacto del Margen Real Devengado**: Comparar en cada transacción el `sales_amount_actual` (importe real facturado) frente al `cost_amount_actual` (coste real asumido), detectando desviaciones de margen bruto.
* **Trazabilidad de Ajustes y Descuentos**: Identificar revalorizaciones de inventario, descuentos por pronto pago o ajustes posteriores al cierre contable.
* **Exportación para Análisis Financiero**: Exportar grandes volúmenes de transacciones a Excel para modelos de auditoría externa y fiscalidad.

---

## 2. Estructura de la Vista 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Barra de Filtros y Búsqueda:                                                    │
│  - Buscador global con debounce (Nº documento, artículo, cliente)                │
│  - Selector de Tipo de Documento (Factura de Venta, Abono, Albarán...)           │
│  - Botón de Exportación Excel Masiva (.xlsx)                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Asientos con Scroll Infinito (useInfiniteQuery, 50 registros/página)   │
│  [ Fecha Reg. ] [ Nº Doc ] [ Tipo Doc ] [ Artículo ] [ Cantidad ] [ Venta Real ]  │
│  [ Coste Real ] [ Margen Real ] [ Cód. Cliente / Proveedor ]                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Campos y Columnas Clave 📋

| Campo | Origen en Business Central | Significado Contable |
| :--- | :--- | :--- |
| **Fecha Registro (`reg_date`)** | `Posting Date` | Fecha contable en la que se devengó la operación. |
| **Nº Documento (`document_number`)** | `Document No.` | Número oficial de la factura, abono o apunte. |
| **Tipo Documento (`document_type`)** | `Document Type` | Factura (`Sales Invoice`), Abono (`Sales Credit Memo`), etc. |
| **Artículo (`item_no`)** | `Item No.` | Referencia técnica comercial. |
| **Venta Real (€)** | `sales_amount_actual` | Importe neto ingresado a nivel de línea. |
| **Coste Real (€)** | `cost_amount_actual` | Coste contable real imputado al producto. |

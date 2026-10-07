# ⚖️ Documentación de Vista: Finanzas — Análisis de Balances

> **Ubicación en la aplicación:** `/finance/balances`  
> **Acceso en menú:** Finanzas → *Análisis de Balances*  
> **Componente Frontend:** [`BalancesPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/finance/BalancesPage.tsx)  
> **Servicio Backend:** `backend/src/modules/finance/finance.service.ts` (`getBalanceData`, `groupDataByYear`)  
> **Controlador Backend:** `backend/src/modules/finance/finance.controller.ts`  
> **Tabla de Base de Datos:** `financial_balances`  
> **Control de Acceso (RBAC):** Restringido a roles `ADMIN` y `DIRECCION`.  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Análisis de Balances** es el informe patrimonial de referencia para la Dirección General y Financiera de dTS Instruments. Presenta la estructura oficial del Balance de Situación (Activo, Pasivo y Patrimonio Neto) en formato multianual con análisis vertical y comparativa temporal. Sus objetivos son:

* **Evaluación de la Solidez Patrimonial:** Analizar la evolución del inmovilizado, fondo de maniobra y masa patrimonial de la compañía a lo largo de los ejercicios cerrados y en curso.
* **Análisis Vertical (% sobre Total Inversión):** Medir el peso relativo porcentual de cada masa sobre el total de Activo (inversiones) y sobre el Pasivo + Patrimonio Neto (financiación).
* **Comparativa Multianual y Cierres Estimados:** Comparar balances históricos con el ejercicio en curso, distinguiendo ejercicios auditados de proyecciones estimadas (`(EST.)`).
* **Visualización de Equilibrio Financiero:** Gráficos apilados de estructura patrimonial que contrastan el Activo Corriente y No Corriente frente al Patrimonio Neto y las deudas a corto/largo plazo.

---

## 2. Estructura de Masas Patrimoniales 📊

La vista desglosa de manera exhaustiva el Plan General Contable:

### 2.1 ACTIVO (Estructura Económica / Inversiones)
* **1.A ACTIVO NO CORRIENTE (Inmovilizado):**
  - Inmovilizado Material e Intangible.
  - Inversiones financieras a largo plazo.
* **1.B ACTIVO CORRIENTE (Circulante):**
  - **1.B.II Existencias:** Mercancía e inventario en almacén.
  - **1.B.III Deudores Comerciales:** Clientes y créditos por operaciones comerciales.
  - **1.B.VII Efectivo y Otros Activos Líquidos:** Tesorería en cuentas bancarias.

### 2.2 PATRIMONIO NETO Y PASIVO (Estructura Financiera / Financiación)
* **2.A PATRIMONIO NETO:**
  - Fondos Propios (Capital social, reservas y resultados acumulados).
* **2.B PASIVO NO CORRIENTE:**
  - Deudas a largo plazo con entidades de crédito y proveedores de inmovilizado.
* **2.C PASIVO CORRIENTE:**
  - Deudas comerciales a corto plazo con proveedores y acreedores.
  - Pólizas de crédito y deudas bancarias a corto plazo.

---

## 3. Gráficos Comparativos Multianuales 📈

* **Gráfico de Barras Apiladas (Activo vs Financiación):**
  - Barra 1: Composición del Activo (No Corriente, Existencias, Realizable, Disponible).
  - Barra 2: Composición del Pasivo (Patrimonio Neto, Pasivo LP, Pasivo CP).
* **Evolución Temporal:** Permite identificar a simple vista la capitalización de la empresa y la reducción de deuda con entidades financieras.

# 📈 Documentación de Vista: Finanzas — Gráficos de Ratios

> **Ubicación en la aplicación:** `/finance/ratios-charts`  
> **Acceso en menú:** Finanzas → *Gráficos de Ratios*  
> **Componente Frontend:** [`RatiosChartsPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/finance/RatiosChartsPage.tsx)  
> **Servicio Backend:** `backend/src/modules/finance/finance.service.ts` (`getBalanceData`, `getIncomeStatementData`, `getBudgetsData`)  
> **Control de Acceso (RBAC):** Restringido a roles `ADMIN` y `DIRECCION`.  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Gráficos de Ratios** traslada los datos tabulares del cuadro financiero a una suite visual de análisis de tendencias a medio y largo plazo. Permite a los directivos:

* **Identificar Tendencias Estructurales**: Detectar de forma inmediata si la rentabilidad, la solvencia o los márgenes operativos muestran una trayectoria ascendente, de estancamiento o de deterioro.
* **Comprender Correlaciones Financieras**: Evaluar cómo interactúan los ratios entre sí (por ejemplo, cómo influye un aumento de endeudamiento en el ROE o cómo evolucionan conjuntamente el margen bruto y el operativo).
* **Presentaciones y Reporting Ejecutivo**: Gráficos pulidos con Recharts, gradientes corporativos y tooltips dinámicos optimizados para temas claro y oscuro.

---

## 2. Los 4 Bloques de Análisis Gráfico 📊

### 1. Rentabilidad del Negocio (ROA vs ROE)
* **Métricas representadas:**
  - **ROA (Return on Assets):** Rentabilidad económica del activo global de dTS.
  - **ROE (Return on Equity):** Rentabilidad del capital aportado por los socios y beneficios retenidos.
* **Interpretación:** Muestra el efecto del apalancamiento financiero positivo o negativo sobre los fondos propios.

### 2. Márgenes Operativos (Bruto vs EBIT)
* **Métricas representadas:**
  - **Margen Bruto (%):** Beneficio tras descontar el coste directo de la instrumentación y fungibles.
  - **Margen Operativo / EBIT (%):** Beneficio neto de explotación tras deducir gastos de personal, marketing y estructura.
* **Interpretación:** Permite monitorizar si los costes fijos de la compañía están creciendo a un ritmo superior a los ingresos.

### 3. Solvencia y Apalancamiento (Endeudamiento vs Autonomía)
* **Métricas representadas:**
  - **Endeudamiento Total:** Ratio Pasivo / Patrimonio Neto.
  - **Autonomía Financiera (%):** Peso del Patrimonio Neto sobre el total de balance.
* **Interpretación:** Visualiza la disminución o aumento del riesgo financiero estructural frente a acreedores.

### 4. Liquidez y Cobertura a Corto Plazo (Ratio Corriente vs Acid Test)
* **Métricas representadas:**
  - **Liquidez Corriente:** Capacidad de cobertura total del activo corriente.
  - **Prueba Ácida:** Capacidad de pago inmediata excluyendo existencias no vendidas.
* **Interpretación:** Garantiza que dTS mantiene una posición holgada de tesorería para evitar cualquier tensión operativa.

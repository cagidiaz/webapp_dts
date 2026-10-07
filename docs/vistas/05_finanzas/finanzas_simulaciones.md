# 🧮 Vista: Finanzas - Motor de Simulación (SimulationsPage)

## 1. Propósito y Descripción General
El **Motor de Simulación** es una herramienta analítica interactiva diseñada para la dirección financiera y ejecutiva. Permite proyectar el comportamiento del **EBITDA**, los márgenes operativos y la **caja neta estimada** para el ejercicio en curso ante diferentes hipótesis de mercado (crecimiento o contracción de ventas y variación en la estructura de costes de compras variables).

El sistema permite simular partiendo de dos bases comparativas:
1. **Históricos Cierre (Año Anterior):** Datos consolidados auditados de la cuenta de resultados del ejercicio cerrado.
2. **Presupuesto (Año en Curso):** Metas oficiales presupuestadas para el ejercicio actual.

---

## 2. Ficheros y Rutas del Código
* **Componente Frontend:** [`frontend/src/pages/finance/SimulationsPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/finance/SimulationsPage.tsx)
* **Endpoints / API Service:** [`frontend/src/api/finance.ts`](file:///c:/proyectos/webapp_dts/frontend/src/api/finance.ts)
* **Ruta de Navegación:** `/finance/simulations`
* **Permiso RBAC en BD:** Módulo `/finance/simulations` (`role_modules`)

---

## 3. Modelo Matemático y Reglas de Negocio

### 3.1. Separación de Costes Fijos vs. Variables
* **Ventas Base (`A.1`):** Importe neto de la cifra de negocios del escenario base seleccionado.
* **Costes Variables (`A.4` - Aprovisionamientos / Compras):**
  $$\text{Compras Base} = |A.4|$$
  *En la simulación, **solo las compras escalan con la variación porcentual de costes** ($1 + \Delta \text{Costes}\%$).*
* **Costes Fijos de Explotación (`A.6` Personal + `A.7` Otros Gastos de Explotación):**
  $$\text{Gastos Fijos} = |A.6| + |A.7|$$
  *Se mantienen fijos en la proyección a corto/medio plazo.*
* **Costes No Operativos (`A.8` Amortizaciones + `A.13` Gastos Financieros):**
  $$\text{Gastos No Operativos} = |A.8| + |A.13|$$
  *Excluidos estrictamente del cálculo de EBITDA.*

### 3.2. Fórmulas de Simulación
1. **Ventas Proyectadas:**
   $$\text{Ventas Sim} = \text{Ventas Base} \times \left(1 + \frac{\text{salesGrowth}}{100}\right)$$
2. **Compras Proyectadas:**
   $$\text{Compras Sim} = \text{Compras Base} \times \left(1 + \frac{\text{costVariation}}{100}\right)$$
3. **EBITDA Simulado:**
   $$\text{EBITDA Sim} = \text{Ventas Sim} - \text{Compras Sim} - \text{Gastos Fijos}$$
4. **Margen Bruto Simulado (% s/Ventas):**
   $$\text{Margen Sim} = \frac{\text{EBITDA Sim}}{\text{Ventas Sim}} \times 100$$
5. **Mejora s/Base (%):**
   $$\text{Mejora} = \frac{\text{EBITDA Sim} - \text{EBITDA Base}}{\text{EBITDA Base}} \times 100$$
6. **Tesorería Operativa Estimada (Regla 85%):**
   $$\text{Caja Estimada} = \text{EBITDA Sim} \times 0.85$$
   *(Modelado rápido para estimar la generación de flujo de caja libre descontando el ciclo medio de cobros/pagos).*

> **Nota especial para Escenario 'Presupuesto':**  
> Cuando el usuario selecciona `Presupuesto`, la variación de compras se vincula automáticamente en proporción 1:1 con el crecimiento de ventas (`costVariation = salesGrowth`), deshabilitando el slider de variación de costes para reflejar un modelo de consumo proporcional directo.

---

## 4. Componentes y Controles de la Interfaz
1. **Selector de Escenario Base:**
   * Dropdown para conmutar entre `Historicos Cierre (Año-1)` y `Presupuesto (Año Actual)`.
2. **Deslizadores Interactivos (Sliders):**
   * **Crecimiento de Ventas:** Rango de $-50\%$ a $+100\%$ (resaltado verde en positivo, rojo en negativo).
   * **Variación de Costes:** Rango de $-50\%$ a $+50\%$ (bloqueado en modo Presupuesto).
3. **Desglose Dinámico de Costes:**
   * Muestra en tiempo real los Gastos Fijos estables, las Compras Simuladas y los Gastos Totales proyectados.
4. **Gráfico Comparativo Anual Proyectado (Recharts):**
   * Gráfico de barras dual (`BarChart`) que contrasta **Ventas** y **EBITDA** entre la cifra Base (gris `#64748b`) y la Simulación (turquesa corporativo `#00B0B9`).
5. **Tarjetas KPI de Resultados:**
   * **EBITDA Proyectado:** En tarjeta azul oscura dTS (`#003E51` / dark card) con porcentaje de mejora respecto al real.
   * **Margen Bruto (Sim.):** Porcentaje resultante de EBITDA sobre Ventas.
   * **Tesorería Estimada:** Estimación del 85% de caja libre operativa.

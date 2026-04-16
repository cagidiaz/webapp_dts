# 📘 Documentación Técnica de Cálculos y Lógica Negocio
## Proyecto: dTS Instruments WebApp BI

Este documento detalla la procedencia de los datos y las operaciones matemáticas aplicadas en las distintas vistas de la aplicación para obtener los KPIs financieros mostrados.

---

## 1. Dashboard de Control (Resumen Ejecutivo)
La vista principal orquesta datos de presupuestos y estados de resultados históricos.

*   **Consecución de Ventas (%)**: 
    - *Operación*: `(Ventas Reales YTD / Ventas Presupuestadas Anuales) * 100`
    - *Objetivo*: Medir el grado de cumplimiento del objetivo comercial anual a fecha de hoy.
*   **Proyección de Ventas (Cierre)**:
    - *Operación*: `(Ventas Reales YTD / Número de meses transcurridos) * 12`
    - *Lógica*: Aplica una progresión lineal simple para estimar el cierre de año si se mantiene el ritmo actual.
*   **EBITDA Acumulado**:
    - *Fórmula*: `Ingresos Netos (A1) - Compras (A4) - Gastos Personal (A6) - Otros Gastos (A7)`
    - *Nota*: No incluye amortizaciones (A8) ni gastos financieros (A13) para reflejar el beneficio operativo real.

---

## 2. Balances Estimados (Cierre Proyectado)
A diferencia de los balances históricos, el año en curso (ej. 2026) muestra un **Balance Estimado (Est.)** que proyecta el cierre del ejercicio.

*   **¿Cómo se calcula el Balance Estimado?**:
    - **Punto de Partida**: Se toma el valor real del último mes cerrado en contabilidad.
    - **Escalado por Run-Rate**: Se proyecta el resto de los meses (hasta llegar a 12) basándose en la tendencia real actual multiplicada por la estacionalidad esperada.
    - **Ajuste por Presupuesto**: Las partidas operativas (Cuentas por Cobrar de Clientes, Cuentas por Pagar a Proveedores e Inventario) se ajustan proporcionalmente según el crecimiento de ventas o compras definido en el presupuesto oficial. Si el presupuesto prevé un incremento del 20% en ventas, el saldo de Clientes en el balance estimado escalará ese mismo 20% respecto a su run-rate.
*   **¿Dónde se utiliza?**:
    - **Vistas de Ratios**: Los ratios de DSO (días de cobro) y DPO (días de pago) para el año actual usan este valor proyectado para ofrecer una visión de futuro coherente con el presupuesto.
    - **Análisis de 4 Puntos Clave**: Permite simular el impacto en la liquidez y solvencia a final de año si se cumplen los objetivos comerciales.
    - **Panel de Simulaciones**: El modo "Escenario Presupuesto" utiliza este balance escalado como base inicial.

---

## 3. Análisis de Balances (Estructural)
Esta vista usa el "Análisis Vertical" y "Horizontal" clásico.

*   **Análisis Vertical (% sobre Activo)**:
    - *Operación*: `(Importe de la Cuenta / Total Activo) * 100`
    - *Uso*: Determinar el peso relativo de cada masa (ej. ¿Qué porcentaje del activo es Inmovilizado frente a Caja?).
*   **Variación Interanual (Horizontal)**:
    - *Operación*: `((Valor Año N / Valor Año N-1) - 1) * 100`
    - *Uso*: Identificar crecimientos o desinversiones respecto al año inmediatamente anterior.

---

## 4. Análisis de 4 Puntos Clave
Lógica de ratios de solvencia y estructura financiera.

*   **Ratio de Liquidez**:
    - *Fórmula*: `Activo Circulante (1.B) / Pasivo a Corto Plazo (2.C)`
    - *Umbral*: Óptimo > 1.5. Indica si hay suficiente dinero a corto plazo para pagar deudas inmediatas.
*   **Ratio de Capitalización**:
    - *Fórmula*: `(Patrimonio Neto (2.A) / Total Pasivo y PN (2.TOT)) * 100`
    - *Umbral*: Óptimo > 30%. Es el porcentaje de la empresa financiado por los socios.
*   **Ratio de Endeudamiento**:
    - *Fórmula*: `(Pasivo Largo Plazo (2.B) + Pasivo Corto (2.C)) / Patrimonio Neto (2.A)`
    - *Umbral*: Óptimo < 1.0. Relación entre deuda externa y capital propio.
*   **Ratio de Garantía**:
    - *Fórmula*: `Total Activo (1.TOT) / Total Pasivo (Deuda Externa)`
    - *Umbral*: Óptimo > 1.5. Respaldo patrimonial frente a terceros en caso de liquidación.

---

## 5. Ratios de Ciclo y Rotación (Eficiencia)
Calculados en la vista de Ratios y Gráficos.

*   **DSO (Días de Cobro)**:
    - *Fórmula*: `(Clientes (Balance 1.B.III) / Ventas Anuales (P&L A.1)) * 365`
    - *Lógica*: Tiempo medio que transcurre desde la venta hasta el cobro.
*   **DPO (Días de Pago)**:
    - *Fórmula*: `(Proveedores (Balance 2.C.IV) / Compras Anuales (P&L A.4)) * 365`
    - *Lógica*: Tiempo medio que la empresa tarda en pagar a sus proveedores.
*   **DIO (Días de Inventario)**:
    - *Fórmula*: `(Existencias (Balance 1.B.II) / Compras Anuales (P&L A.4)) * 365`
    - *Lógica*: Cuántos días tarda la mercancía en el almacén antes de ser vendida.
*   **CCC (Ciclo de Conversión de Caja)**:
    - *Fórmula*: `DIO + DSO - DPO`
    - *Interpretación*: Días necesarios para que un euro invertido en compras vuelva a la caja como cobro.

---

## 6. Motor de Simulación (Escenarios)
Lógica predictiva reactiva a inputs del usuario.

*   **Ventas Simuladas**: 
    - `Ventas Base * (1 + Incremento % seleccionado)`
*   **Compras Simuladas**:
    - `Compras Base * (1 + Variación % seleccionada)` 
    - *Vínculo*: En modo "Presupuesto", el motor vincula automáticamente el incremento de ventas al de compras (1:1).
*   **EBITDA Simulado**:
    - `Ventas Sim - Compras Sim - Gastos Operativos Fijos (Personal y Otros)`
    - *Nota*: Los gastos de personal y otros gastos generales se consideran **fijos** en la simulación (no escalan con las ventas).
*   **Estimación de Tesorería (Caja)**:
    - *Fórmula*: `EBITDA Simulado * 0.85`
    - *Lógica*: Aplica un factor de prudencia comercial del 15% para estimar el flujo libre de caja operativa (excluyendo inversiones y amortizaciones).

---

---

## 7. Análisis Comercial (Rendimiento y Pedidos)
Lógica aplicada en los paneles de ventas y presupuestos comerciales.

*   **Rendimiento vs Presupuesto**:
    - *Ventas Reales*: Sumatorio de `sales_performance` (Facturas - Abonos).
    - *Desviación (€)*: `Ventas Reales - Objetivo Presupuestado`.
    - *Desviación (%)*: `(Desviación € / Objetivo) * 100`.
*   **KPIs de Cartera (Pedidos)**:
    - **Total Pedidos (Unique)**: `Count(Distinct Document_No)` sobre la tabla `sales_orders`. Identifica cuántos pedidos "de negocio" están abiertos.
    - **Cartera Total (€)**: `Sum(Outstanding_Quantity * Unit_Price)`. Valor de la mercancía pendiente de gestionar.
    - **Pendiente de Facturar (€)**: `Sum(Qty_Shipped_Not_Invoiced * Unit_Price)`. Mercancía entregada pero no procesada administrativamente.

---

## Origen de Datos (Supabase)
*   **Tablas de Balance**: `financial_balances` (Códigos 1... para Activo, 2... para Pasivo).
*   **Tablas de PyG**: `income_statements` (Códigos A1, A4, A6, etc.).
*   **Tablas de Presupuestos**: `sales_budgets` (Datos mensuales por centro de coste).
*   **Tabla de Pedidos**: `sales_orders` (Líneas de pedido de venta sincronizadas).
*   **Tabla de Transacciones**: `sales_performance` (Sumario de facturación histórica).

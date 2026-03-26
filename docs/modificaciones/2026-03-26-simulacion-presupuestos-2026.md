# Modificación de Simulación: Presupuestos 2026 (2026-03-26)

Este documento registra el análisis y la implementación del vínculo entre ventas y costes para el escenario de 2026.

## Análisis de Datos (Presupuesto 2026)

Tras analizar los datos del presupuesto 2026 en la base de datos, se obtuvieron los siguientes valores:
- **Compras (A.4):** 1.808.200,32 €
- **Total Gastos (Operativos + Financieros):** 2.681.159,90 €

**Ratio de Compras:** 67,44%

## Lógica Implementada

Se ha vinculado el slider de "Variación de Costes" al de "Crecimiento Ventas" mediante la fórmula:
`Variación Costes = Crecimiento Ventas * 0.6744`

Esto asegura que el simulador refleje el incremento proporcional en compras necesario para soportar el crecimiento de ventas proyectado.

## Proceso de Análisis

1. Extracción de datos de la tabla `budgets` para el año 2026.
2. Categorización de cuentas según el estándar del PGC (A.4 para compras, A.6 personal, A.7 opex).
3. Cálculo del peso relativo de las compras sobre la estructura de costes total.
4. Integración de la dependencia funcional en el estado del componente `SimulationsPage.tsx`.

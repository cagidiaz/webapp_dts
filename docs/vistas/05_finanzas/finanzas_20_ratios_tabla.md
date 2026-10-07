# 🔢 Documentación de Vista: Finanzas — Cuadro de 20 Ratios (Tabla)

> **Ubicación en la aplicación:** `/finance/ratios-table`  
> **Acceso en menú:** Finanzas → *20 Ratios*  
> **Componente Frontend:** [`RatiosTablePage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/finance/RatiosTablePage.tsx)  
> **Servicio Backend:** `backend/src/modules/finance/finance.service.ts` (`getBalanceData`, `getIncomeStatementData`, `getBudgetsData`)  
> **Tablas de Base de Datos:** `financial_balances`, `income_statements`, `sales_budget`  
> **Control de Acceso (RBAC):** Restringido a roles `ADMIN` y `DIRECCION`.  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Cuadro de Mando: 20 Ratios** proporciona una auditoría completa del rendimiento financiero, solvencia, rotación de activos y rentabilidad del capital de dTS Instruments a lo largo del tiempo. 

Cruza los datos del **Balance de Situación** y de la **Cuenta de Pérdidas y Ganancias** para calcular los 20 indicadores estándar del análisis financiero corporativo, clasificados en 4 áreas temáticas:
* **Liquidez**: Capacidad de pago inmediata y a corto plazo.
* **Solvencia**: Capacidad de pago a largo plazo y estructura de deuda.
* **Gestión / Actividad**: Eficiencia en el uso de los recursos y plazos de rotación (DSO, DPO).
* **Rentabilidad**: Rendimiento de las ventas, del activo y de los fondos propios.

---

## 2. Catálogo Oficial de los 20 Ratios 📋

### A. Ratios de Liquidez
1. **Liquidez Corriente:** $\frac{\text{Activo Corriente}}{\text{Pasivo Corriente}}$
2. **Prueba Ácida (Acid Test):** $\frac{\text{Activo Corriente} - \text{Existencias}}{\text{Pasivo Corriente}}$
3. **Disponibilidad Inmediata:** $\frac{\text{Tesorería / Efectivo}}{\text{Pasivo Corriente}}$
4. **Fondo de Maniobra:** $\text{Activo Corriente} - \text{Pasivo Corriente}$ (€)

### B. Ratios de Solvencia y Endeudamiento
5. **Endeudamiento Total:** $\frac{\text{Pasivo Total}}{\text{Patrimonio Neto}}$
6. **Autonomía Financiera:** $\frac{\text{Patrimonio Neto}}{\text{Total Pasivo + PN}}$
7. **Calidad de la Deuda:** $\frac{\text{Pasivo Corriente (CP)}}{\text{Pasivo Total}}$
8. **Cobertura de Gastos Financieros:** $\frac{\text{EBITDA}}{\text{Gastos Financieros}}$

### C. Ratios de Gestión y Actividad
9. **Días de Cobro (DSO - Days Sales Outstanding):** $\frac{\text{Clientes / Deudores}}{\text{Ventas Anuales}} \times 365$
10. **Días de Pago (DPO - Days Payable Outstanding):** $\frac{\text{Proveedores / Acreedores}}{\text{Compras Anuales}} \times 365$
11. **Rotación de Existencias (Días):** $\frac{\text{Existencias}}{\text{Coste de Ventas}} \times 365$
12. **Ciclo de Maduración Neto (Días):** $\text{Rotación Existencias} + \text{DSO} - \text{DPO}$
13. **Rotación del Activo Total:** $\frac{\text{Ventas Netas}}{\text{Total Activo}}$

### D. Ratios de Rentabilidad
14. **Margen Bruto (%):** $\frac{\text{Margen Bruto}}{\text{Ventas Netas}} \times 100$
15. **Margen Operativo / EBIT (%):** $\frac{\text{EBIT}}{\text{Ventas Netas}} \times 100$
16. **Margen Neto (%):** $\frac{\text{Resultado del Ejercicio}}{\text{Ventas Netas}} \times 100$
17. **ROA (Rentabilidad Económica):** $\frac{\text{EBIT}}{\text{Total Activo}} \times 100$
18. **ROE (Rentabilidad Financiera):** $\frac{\text{Resultado Neto}}{\text{Patrimonio Neto}} \times 100$
19. **EBITDA (€):** Resultado de explotación antes de amortizaciones e impuestos.
20. **EBITDA sobre Ventas (%):** $\frac{\text{EBITDA}}{\text{Ventas Netas}} \times 100$

---

## 3. Comportamiento en Ejercicios en Curso (Anualización) ⚙️

En la columna correspondiente al ejercicio en curso (año estimado):
* Los ratios de flujo o actividad que cruzan partidas de balance con cuentas de resultados (como el DSO y el DPO) **se calculan anualizando las ventas reales** acumuladas para mantener coherencia estricta con el balance y evitar distorsiones ficticias.

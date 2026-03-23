# Definiciones de KPIs — dTS Instruments

## KPIs Financieros (Dashboard Contable)

### EBITDA
**Earnings Before Interest, Taxes, Depreciation, and Amortization**
- **Fórmula:** Ingresos operativos - Gastos operativos (excluyendo depreciación, amortización, intereses e impuestos)
- **Fuente:** Business Central (tabla de movimientos contables)
- **Color en gráficos:** `#003E51` (Primario — datos reales)

### Liquidez (Ratio de Liquidez Corriente)
- **Fórmula:** Activo corriente / Pasivo corriente
- **Fuente:** Business Central (balance general)
- **Interpretación:** >1 = saludable / <1 = riesgo de insolvencia

### Margen Bruto (%)
- **Fórmula:** (Ingresos - Coste de ventas) / Ingresos × 100
- **Fuente:** Business Central (cuenta de pérdidas y ganancias)

---

## Convenciones Visuales

| Tipo de dato | Color | Estilo |
|-------------|-------|--------|
| Real (BC) | `#003E51` | Línea sólida |
| Previsión manual | `#00B0B9` | Línea sólida |
| Predicción IA | `#00B0B9` | Línea punteada / área sombreada |

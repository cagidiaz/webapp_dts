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

## KPIs de Ventas y Operaciones

### Cartera Total (Order Backlog)
- **Definición:** Valor total de la mercancía comprometida en pedidos abiertos que aún no se ha enviado.
- **Fórmula:** Sumatorio(Cantidad Pendiente * Precio Unitario)
- **Importancia:** Indicador clave de demanda futura y carga de trabajo.

### Pendiente de Facturar (Shipped Not Invoiced)
- **Definición:** Valor de la mercancía que ya ha salido del almacén pero cuya factura aún no se ha emitido legalmente.
- **Fórmula:** Sumatorio(Cant. Enviada No Facturada * Precio Unitario)
- **Alerta:** Un valor alto indica retrasos administrativos en el ciclo de facturación.

### Total Pedidos (Unique Orders)
- **Definición:** Conteo de documentos de venta abiertos ignorando la cantidad de líneas internas.
- **Fórmula:** Count(Distinct document_number)

---

## Convenciones Visuales

| Tipo de dato | Color | Estilo |
|-------------|-------|--------|
| Real (BC) | `#003E51` | Línea sólida |
| Previsión manual | `#00B0B9` | Línea sólida |
| Predicción IA | `#00B0B9` | Línea punteada / área sombreada |

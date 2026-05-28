# Manual de Usuario — WebApp dTS Instruments

> Este documento detalla el funcionamiento técnico y la procedencia de los datos de la plataforma dTS Instruments.

## 1. Dashboard Principal
El Dashboard es el centro de monitorización en tiempo real del cumplimiento de objetivos.
- **Ventas YTD vs Ppto YTD**: Compara la facturación real acumulada contra el presupuesto acumulado a fecha de hoy.
- **CLIENTES NUEVOS**: Panel de captación con facturación (FACT), total de altas (TOTAL) y clientes sin venta (S/VTA).
- **CARTERA Y PENDIENTES**: Tarjeta consolidada que muestra los pedidos abiertos en cartera (CARTE) y la mercancía enviada pendiente de factura (PEND).
- **Objetivo Anual (Velocímetro)**: Porcentaje de cumplimiento del objetivo total de facturación anual.
- **Evolución Ventas vs Presupuesto**: Gráfico con comparativa mensual de Ventas Año en Curso, Objetivo de Presupuesto y Ventas del Año Anterior (línea punteada).

## 2. Ventas vs Presupuesto (Seguimiento de Objetivos)
Vista detallada para analizar el grado de cumplimiento de los objetivos comerciales y detectar desviaciones por familias o vendedores de forma proactiva.
- **Gráfico de Evolución**: Compara mensualmente el presupuesto con las Ventas Año en Curso y una línea de referencia punteada fina con las Ventas del Año Anterior.
- **Tabla de Clientes**: Detalle del rendimiento YTD de cada cliente contra su objetivo, mostrando la desviación monetaria, la desviación porcentual y su comparativa con el año anterior (Fact. LY).

## 3. Presupuesto por Product Manager (PM)
Análisis de cumplimiento presupuestario orientado a Product Managers.
- Permite expandir cada cliente para desglosar la facturación y el presupuesto a nivel de referencia de producto (SKU).
- Incluye el gráfico de evolución mensual idéntico, enriquecido con la línea punteada de ventas del año anterior para contextualizar la estacionalidad del producto.

## 4. Histórico de Ventas (Auditoría de Movimientos)
Vista de auditoría transaccional de la tabla `value_entries`, restringida exclusivamente a los roles de **ADMIN** y **DIRECCION**.
- **Acceso Restringido**: Oculta de forma automática en el menú de navegación y protegida en el enrutamiento para vendedores u otros roles inferiores.
- **Filtro Avanzado**: Permite aislar los registros por **Tipo de Documento** (Facturas o Abonos) mediante un desplegable optimizado sin ruido visual.
- **Buscador en Tiempo Real**: Búsqueda reactiva por número de documento, referencia de producto, código de cliente o vendedor.
- **Ordenación Completa**: Todas las columnas (Nº Movimiento, Fecha, Documento, Producto, Cliente, Cantidad, Ventas y Costes) son interactivas y ordenables.
- **Exportación Directa**: Botón para descargar el histórico filtrado y ordenado a un documento Excel (`.xlsx`).

---
*Manual de dTS Instruments v4.0 — Actualizado a 28 de mayo 2026.*

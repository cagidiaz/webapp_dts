# Documentación de Actualización - 04/05/2026

## Cambios Realizados

### 1. Sistema de Notificaciones de Actualizaciones
Se ha implementado un sistema robusto para informar a los usuarios sobre los cambios en la plataforma directamente desde los commits de GitHub.
- **Store de Estado (`updatesStore.ts`)**: Gestiona la obtención de datos de la API de GitHub y el seguimiento de actualizaciones vistas.
- **Filtrado por Roles**: Soporte para etiquetas en los mensajes de commit.
- **UI Integrada**: Ventana emergente y panel en el icono de la campana.

### 2. Mejora en Gráfico de Evolución de Ventas
- **Acumulación YTD**: Datos de ventas y presupuesto acumulados mensualmente.
- **Comparativa Interanual**: Inclusión de la serie "Año Anterior".
- **Identidad Visual**: Verde vibrante (`#22C55E`) para el año actual.

### 3. Ajuste en KPI de Ventas (YTD vs Ppto YTD)
- El KPI ahora compara el real acumulado contra el presupuesto acumulado (YTD).
- Diseño equilibrado con fuentes del mismo tamaño para ambos valores.

### 4. KPI de Velocímetro (Objetivo Anual)
- Nuevo componente `GaugeChart` de alta precisión.
- **Aguja de Flecha**: Indicador dinámico animado por CSS.
- **Escala Graduada**: Marcas de porcentaje cada 25% y etiquetas numéricas integradas.
- **Guía de Seguimiento**: Línea semicircular sutil que conecta los porcentajes.
- **Semáforo Dinámico**: Cambio de color (Rojo/Azul/Verde) según el éxito.

---
**Mensaje de Commit utilizado:** 
`[GLOBAL] Finalización de velocímetro de precisión y documentación de KPIs ejecutivos`

# Documentación de Actualización - 04/05/2026

## Cambios Realizados

### 1. Sistema de Notificaciones de Actualizaciones
Se ha implementado un sistema robusto para informar a los usuarios sobre los cambios en la plataforma directamente desde los commits de GitHub.
- **Store de Estado (`updatesStore.ts`)**: Gestiona la obtención de datos de la API de GitHub y el seguimiento de qué actualizaciones ha visto cada usuario (vía LocalStorage).
- **Filtrado por Roles**: Soporte para etiquetas en los mensajes de commit (ej: `[VENTAS]`, `[ADMIN]`) para dirigir actualizaciones a grupos específicos.
- **Ventana Emergente (`UpdatesModal.tsx`)**: Se muestra automáticamente al iniciar sesión si hay cambios críticos no leídos.
- **Panel de Notificaciones**: Integrado en el icono de la campana en la barra superior.

### 2. Mejora en Gráfico de Evolución de Ventas
- **Acumulación YTD**: Los datos ahora se muestran de forma acumulada mensual.
- **Comparativa Interanual**: Inclusión de ventas del año anterior.
- **Identidad Visual**: Verde vibrante para el año actual.

### 3. Ajuste en KPI de Ventas (YTD vs Ppto YTD)
- El KPI principal ahora compara el real acumulado contra el presupuesto acumulado (YTD), no contra el anual total.
- Diseño equilibrado con fuentes del mismo tamaño para ambos valores.

### 4. KPI de Velocímetro (Objetivo Anual)
- Nuevo componente `GaugeChart` para visualizar la consecución anual.
- **Aguja en forma de flecha** animada mediante transformaciones CSS.
- Colores dinámicos (Semaforización) según el porcentaje de éxito.

---
**Mensaje de Commit utilizado:** 
`[GLOBAL] Implementación de velocímetro de consecución anual y mejoras en KPIs ejecutivos`

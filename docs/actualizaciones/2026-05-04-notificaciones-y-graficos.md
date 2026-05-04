# Documentación de Actualización - 04/05/2026

## Cambios Realizados

### 1. Sistema de Notificaciones de Actualizaciones
Se ha implementado un sistema robusto para informar a los usuarios sobre los cambios en la plataforma directamente desde los commits de GitHub.
- **Store de Estado (`updatesStore.ts`)**: Gestiona la obtención de datos de la API de GitHub y el seguimiento de qué actualizaciones ha visto cada usuario (vía LocalStorage).
- **Filtrado por Roles**: Soporte para etiquetas en los mensajes de commit (ej: `[VENTAS]`, `[ADMIN]`) para dirigir actualizaciones a grupos específicos. Los mensajes sin etiqueta se consideran globales.
- **Ventana Emergente (`UpdatesModal.tsx`)**: Se muestra automáticamente al iniciar sesión si hay cambios críticos no leídos.
- **Panel de Notificaciones**: Integrado en el icono de la campana en la barra superior, permitiendo ver un resumen de las últimas 3 actualizaciones y acceso al panel completo.

### 2. Mejora en Gráfico de Evolución de Ventas
Actualización del gráfico principal del Panel de Mando Ejecutivo.
- **Acumulación YTD**: Los datos de ventas y presupuesto ahora se muestran de forma acumulada mes a mes.
- **Comparativa Interanual**: Se ha añadido la serie de datos de "Ventas Año Anterior" para permitir una comparación directa de rendimiento.
- **Identidad Visual**: 
  - Año Actual: Verde vibrante (`#22C55E`).
  - Año Anterior: Índigo suave.
  - Presupuesto: Línea gris discontinua.
- **Lógica de Cierre**: Las ventas del año actual dejan de dibujarse a partir del mes vigente para evitar proyecciones planas.

### 3. Backend
- Actualización de `SalesService` para incluir cálculos de facturación del año anterior en el endpoint de evolución.
- Sincronización de tipos en el API frontend.

---
**Mensaje de Commit utilizado:** 
`[GLOBAL] Implementación del sistema de notificaciones de actualizaciones y mejoras en el gráfico de ventas acumuladas`

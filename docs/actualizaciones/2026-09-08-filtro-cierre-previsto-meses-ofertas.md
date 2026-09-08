# Actualización: Filtrado Interactivo de Ofertas por Cierre Previsto (Opción 1 y Mejoras)

**Fecha:** 8 de Septiembre de 2026  
**Módulo:** Ventas / Ofertas Comerciales (`/sales/quotes`)  
**Backend:** NestJS + Prisma (`sales_quotes` y `sales_quotes_crm`)  
**Frontend:** React + TypeScript + TailwindCSS + TanStack React Query  

---

## 1. Resumen de la Funcionalidad

Se ha implementado una **barra interactiva de filtrado por Cierre Previsto** en la vista de Ofertas Comerciales del módulo de Ventas. Esta solución cuenta con un **selector interactivo (Switch Habilitar/Deshabilitar)**:
- **Por defecto (Inactivo):** La tabla se comporta de manera estándar mostrando **todos los registros** del año y filtros generales (vendedor, estado, probabilidad, etc.), sin restringir por fecha de cierre previsto.
- **Al activar el selector (Activo):** Se despliega la barra interactiva de Cierre Previsto, filtrando los registros por el año, trimestres o meses seleccionados (o modos especiales como Vencidas / Sin fecha), además de recalcular en vivo el resumen métrico del periodo.

---

## 2. Componentes y Novedades Implementadas

### A. Selector de Habilitación y Barra Interactiva (Opción 1)
- **Interruptor Toggle (Activo / Inactivo):** Permite encender o apagar el filtrado por cierre previsto en cualquier momento con un solo clic. Cuando está apagado, la tabla muestra todos los registros según los filtros generales anteriores.
- **Navegación por Años:** Selector de año (`2024`, `2025`, `2026`, `2027`, `2028`) con flechas rápidas de navegación anterior/siguiente.
- **Acceso Directo Anual:** Botón `[ Todo 2026 ]` para recuperar el año completo.
- **Botones de Trimestre (Quarters):** Accesos directos a `[ T1 ]`, `[ T2 ]`, `[ T3 ]` y `[ T4 ]`. Al pulsar un trimestre, se activa el filtro automático para los meses correspondientes (ej. T3 = meses 7, 8 y 9).
- **Pills de Meses (Ene - Dic):**
  - Clic simple: selecciona ese mes específico (o desactiva si ya era el único activo, volviendo a todo el año).
  - Multiselección (Ctrl + Clic / Shift + Clic): permite combinar múltiples meses (por ejemplo: Septiembre y Octubre juntos).
  - Indicador de mes en curso: punto parpadeante en color cian dTS sobre el mes del año actual.
- **Filtros Rápidos Especiales:**
  - `[ ⚠️ Vencidas ]`: Filtra de manera instantánea ofertas en estado abierto (no ganadas ni perdidas) cuya fecha de cierre previsto sea anterior a la fecha actual (`< hoy`).
  - `[ ❓ Sin fecha ]`: Filtra aquellas ofertas que carecen de fecha de previsión de cierre para facilitar su saneamiento comercial.
  - `Limpiar fecha`: Permite restablecer el filtro con un solo clic.

### B. Resumen de Métricas del Periodo Seleccionado
En la parte derecha de la barra de cierre previsto se muestra un bloque de métricas en tiempo real que se recalcula según el filtro temporal activo:
- **Cierre Previsto Nominal:** Sumatorio de los importes brutos/nominales de las ofertas previstas para ese periodo.
- **Valor Ponderado:** Sumatorio de importes ponderados según la probabilidad de éxito (`Amount * Probabilidad`).
- **Ofertas:** Cantidad de ofertas previstas para ese horizonte temporal.

### C. Alertas Visuales en la Tabla de Ofertas
En la columna **Cierre Previsto** de cada fila:
- **Badge Rojo Vencida (con animación):** Si la oferta sigue abierta y la fecha ya pasó (`⚠️ dd/mm/aaaa - Vencida (Xd)`).
- **Badge Ámbar Próxima:** Si la oferta vence en los próximos 7 días o vence hoy (`⏰ dd/mm/aaaa - Vence en Xd`).
- **Formato Estándar:** Fecha con icono de calendario para fechas futuras normales.
- **Sin Fecha (`---`):** En caso de no tener registro.

### D. Edición Rápida y Sincronización desde el Drawer Lateral
- Al hacer clic en cualquier oferta de la tabla se abre el **Drawer de Detalle**.
- En la sección **Información de Fechas**, el campo **Cierre Previsto (CRM)** ahora es un selector de fecha interactivo (`<input type="date">`).
- Detecta cambios pendientes de guardar con el indicador `Sin guardar`.
- Botón de guardado rápido con icono de confirmación (`✓`) que invoca `updateCrmQuote` (`PATCH /quotes/crm/:id`), sincronizando de inmediato tanto la base de datos como la caché de React Query.

---

## 3. Modificaciones Técnicas

### Backend (`NestJS` + `Prisma`)
1. **`backend/src/modules/quotes/quotes.controller.ts`**:
   - Parámetros añadidos a `@Get()`: `cierrePrevYear?: number` y `cierrePrevMonths?: string`.
2. **`backend/src/modules/quotes/quotes.service.ts`**:
   - Cláusula `where.AND` extendida para resolver el filtro de cierre previsto priorizando `sales_quotes_crm.cierreprev_date` y como fallback `sales_quotes.cierreprev_date`.
   - Soporte para modos especiales: `'overdue'`, `'none'`, mes único o lista de meses (`'7,8,9'`).
   - `findMany` y `count` unificados con `sales_quotes_crm`.
   - Retorno enriquecido (`formattedData`) mapeando `cierreprev_date`, `estado_oferta`, `probabilidad_exito` y `valor_oferta_ponderado`.

### Frontend (`React` + `Vite`)
1. **`frontend/src/api/quotes.ts`**:
   - Parámetros `cierrePrevYear?: number` y `cierrePrevMonths?: string` en la llamada API `getAllQuotes`.
2. **`frontend/src/pages/sales/QuotesPage.tsx`**:
   - Estados: `cierrePrevYear`, `cierreMode`, `selectedMonths`, `editingCierreDate`, `isSavingCierre`.
   - Inclusión de la barra de meses/trimestres/años/rápidos sobre la tabla.
   - Cálculo en vivo de badges de urgencia/vencimiento.
   - Campo editable de Cierre Previsto en el Drawer con mutación hacia el CRM.

# Actualización: Gráficos de Motivos de Cierre (Ganadas vs Perdidas) y Mejoras Visuales en Ofertas

**Fecha:** 29 de Septiembre de 2026  
**Módulos Afectados:** Ofertas Comerciales (`/sales/quotes`), Backend Quotes Service (`quotes.service.ts`)  
**Etiquetas:** `feat: [SALES]`, `style: [UX/UI]`, `docs:`

---

## 1. Resumen de Cambios

1. **Nuevo Panel Comparativo de Motivos de Cierre:**
   - Se sustituye el antiguo gráfico de *Ofertas Creadas vs Aprobadas* por un panel de dos gráficos de **barras horizontales lado a lado**:
     - **Éxito (Ganadas):** Ranking en verde esmeralda (`#10B981`) con los motivos de cierre positivo (`motivo_ganada`).
     - **Descarte (Perdidas):** Ranking en rojo/rosa (`#F43F5E`) con las causas de desestimación (`motivo_perdida`).
   - Cada columna cuenta con cabecera diferenciada, recuento de ofertas analizadas (`{N} ofertas`) y estado vacío estilizado si no hay registros en el período.

2. **Etiquetas del Eje Y en Dos Líneas (`renderTwoLineYAxisTick`):**
   - Implementación de un componente SVG con `<tspan>` que divide los nombres de motivos largos en dos líneas de forma natural entre palabras, evitando truncados bruscos y facilitando su lectura sin desbordar el gráfico.
   - Amplitud optimizada del eje (`width={85}`) y separación vertical holgada (`barCategoryGap={6}`).

3. **Efecto Hover Premium sin Sombreado Gris (`activeBar`):**
   - Se elimina el fondo gris tosco del cursor (`cursor={false}`).
   - La barra sobrevolada se expande dinámicamente (+4px en altura y +4px en longitud), adquiere un borde perimetral nítido (`strokeWidth={2}`) y una sutil sombra de elevación (`drop-shadow`).

4. **Normalización Automática de Motivos:**
   - Cualquier variante de *"no se hace por falta de financiación"* se normaliza en backend y frontend como **`Falta de financiación`**, unificando las estadísticas del gráfico y el detalle de cotizaciones.

5. **Resolución de Advertencias Técnicas:**
   - Corrección de sintaxis en clases descendentes de Tailwind v4 (`**:outline-none`, `**:focus:outline-none`, `**:focus:ring-0`).

---

## 2. Archivos Modificados

- `backend/src/modules/quotes/quotes.service.ts`: Agrupación y normalización de motivos ganadas y perdidas en `summary.chartData`.
- `frontend/src/api/quotes.ts`: Interfaces de `wonReasonsData` y `lostReasonsData`.
- `frontend/src/pages/sales/QuotesPage.tsx`: Implementación del panel doble de barras horizontales, renderizador de 2 líneas y efecto hover activo.
- `docs/vistas/ofertas_comerciales.md`: Especificación técnica del panel de motivos en la documentación de la vista.
- `docs/manual-usuario.md`: Actualización del catálogo de gráficos analíticos.

---

## 3. Pruebas y Validación

- **Backend:** Compilación limpia con `nest build` (`npm run build`).
- **Frontend:** Compilación de producción limpia con `tsc -b && vite build` (`npm run build`).

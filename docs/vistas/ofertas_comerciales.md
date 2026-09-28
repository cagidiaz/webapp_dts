# 📑 Documentación de Vista: Ofertas Comerciales

> **Ubicación en la aplicación:** `/sales/quotes`  
> **Acceso en Menú:** Ventas (`Sidebar` → Ventas → *Ofertas*)  
> **Componente Frontend:** [`QuotesPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/sales/QuotesPage.tsx)  
> **Servicio Backend:** [`quotes.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/quotes/quotes.service.ts)  
> **Controlador Backend:** [`quotes.controller.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/quotes/quotes.controller.ts) (`GET /quotes`, `GET /quotes/:id`, `PATCH /quotes/:id/crm`)  
> **Última actualización:** Septiembre 2026  

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista de **Ofertas Comerciales** es el módulo central del pipeline de preventa y seguimiento de propuestas técnico-comerciales de dTS Instruments. Permite al equipo comercial, directores de área y administración:

* **Supervisión del Pipeline Vivo:** Analizar el volumen total de ofertas emitidas, importes cotizados y probabilidades de éxito en tiempo real.
* **Control de Cierre Previsto (*Deadlines*):** Detectar inmediatamente ofertas con fecha de cierre prevista vencida (*overdue*) o próximas a vencer mediante semáforos visuales inteligentes.
* **Valoración Ponderada (*Forecast*):** Estimar con precisión matemática los ingresos futuros ponderando el importe de cada oferta por su probabilidad asignada.
* **Tasa de Conversión (*Win Rate*):** Medir la efectividad comercial individual y global calculando el ratio de ofertas ganadas sobre el total de ofertas cerradas (ganadas + perdidas).
* **Edición Ágil sin Cambiar de Pantalla:** Modificar la fecha estimada de cierre previsto directamente desde el cajón lateral (*Drawer*) con sincronización inmediata.

---

## 2. Indicadores Clave de Rendimiento (KPIs Superiores) 📊

En la parte superior de la vista se sitúan cinco tarjetas analíticas con fondo semitransparente (*glassmorphism*) y bordes de alta definición:

| Tarjeta KPI | Métrica Principal | Subtítulo / Detalle | Explicación y Fórmula |
| :--- | :--- | :--- | :--- |
| **Cartera de Ofertas** | `formatCurrency(totalAmount)` | `X ofertas emitidas` | Importe total acumulado y recuento de todas las ofertas emitidas según los filtros.<br>**Ventana Informativa (Info Popover):** Desglose completo de importes y recuentos por estado:<br>• *Ofertas Ganadas:* Total y monto ganado.<br>• *Ofertas Perdidas:* Total y monto desestimado.<br>• *Ofertas Abiertas / En Proceso:* Totaliza el monto vivo de ofertas en negociación/pendientes.<br>• *Total Cartera:* Sumatorio consolidado (`Ganadas + Perdidas + Abiertas`). |
| **Ganadas vs Perdidas vs Abiertas (Donut Chart)** | Mini Gráfico Donut (`PieChart`) + Leyenda Holgada | `Ganadas`, `Perdidas`, `Abiertas` con importes y % | Sustituye al antiguo KPI plano de ofertas ganadas ocupando el mismo espacio modular. Integra un gráfico circular tipo anillo con recuento central (`N ofertas`) y micro-interacción bidireccional limpia: el anillo mantiene su geometría fija sin deformarse; al pasar el cursor por un sector o fila, dicho estado mantiene su color 100% vibrante mientras los otros se atenúan a opacidad 0.25, proyectándose una micro-línea conectora hacia la fila correspondiente de la leyenda en un espacio holgado y aireado. |
| **Valor Ponderado (IA)** | `formatCurrency(totalWeightedValue)` | `Prob. media: avgProb%` | Valor esperado (*Forecast*): $\sum (\text{Importe}_i \times \text{Probabilidad}_i / 100)$. |
| **Tasa de Éxito (*Win Rate*)** | `successRate%` | `X pendientes (Y €)` | Eficacia de cierre: $\frac{\text{Ganadas}}{\text{Ganadas} + \text{Perdidas}} \times 100$. |

---

## 3. Gráficos Analíticos Interactivos (Recharts) 📈

Mediante un botón de alternancia (`Ver Gráficos / Ocultar Gráficos`) con icono dinámico, los usuarios pueden desplegar un panel comparativo de alto impacto visual:

1. **Ofertas por Comercial y Tasa de Éxito:**
   * Gráfico compuesto (`ComposedChart`) con barras verticales por mes desglosadas por vendedor en K€ (`ACI`, `JKU`, `JMO`, `JPG`) y una línea superimposed con la tasa de éxito media mensual.
2. **Comparativa de Ofertas Creadas vs Aprobadas (Ganadas):**
   * Gráfico de barras combinadas que enfrenta mensualmente el volumen cotizado total frente al importe efectivamente ganado, permitiendo auditar la velocidad de conversión comercial.

> **Nota Técnica de Segregación:** Los gráficos consultan una query independiente (`sales-quotes-charts`) que preserva la evolución global anual independientemente de que el usuario filtre la tabla inferior por estados específicos (`Ganada`, `Perdida`, etc.), evitando distorsiones en las curvas históricas.

---

## 4. Barra de Filtros Avanzados y Selector de Cierre Previsto 🔍

La botonera de filtros opera en tiempo real con debounce integrado y persistencia de foco (`keepPreviousData`):

* **Buscador Universal:** Filtra por número de oferta (`document_no`), nombre del cliente, código de cliente o notas internas.
* **Comercial:** Desplegable con todos los vendedores activos en el sistema.
* **Estado:** Filtrado por `Ganada`, `Perdida`, `En Curso`, `Pendiente`, `Cancelada` o `Aprobada`.
* **Probabilidad de Éxito:** Rangos preconfigurados (`> 80%`, `50% - 80%`, `< 50%`, `Sin probabilidad`).
* **Año:** Selector de ejercicio fiscal con historial desde 2022 hasta el año en curso.
* **Selector Dinámico de Cierre Previsto:**
  * **Interruptor de Activación:** Permite activar o pausar el filtrado por cierre previsto sin alterar el resto de filtros.
  * **Modo Todos:** Todas las ofertas del año de cierre previsto.
  * **Modo Sin Fecha:** Ofertas abiertas que carecen de fecha de cierre comprometida.
  * **Modo Vencidas:** Ofertas vivas cuya fecha de cierre ya ha pasado respecto al día actual (alerta de seguimiento urgente).
  * **Selector Mensual Interactivo:** Botones de mes (`Ene` a `Dic`) con punto pulsante en el mes corriente y soporte para multiselección continua mediante `Ctrl + Clic` o `Shift + Clic`.

---

## 5. Estructura de la Tabla de Ofertas y Fila de Totales (*Sticky Footer*) 📋

La tabla cuenta con scroll infinito virtualizado (`IntersectionObserver`), ordenación por cabecera y cabeceras adhesivas (`sticky top-0 z-20`):

### 5.1 Columnas de la Tabla

| # | Columna | Clave | Alineación | Formato / Elemento Visual |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Nº Oferta** | `document_no` | Izquierda | Código tipográfico mono en azul dTS (`#003E51` / cian en dark mode). |
| **2** | **Fecha** | `document_date` | Izquierda | Fecha de emisión de la oferta (`dd/mm/aaaa`). |
| **3** | **Cliente** | `customer_no` | Izquierda | Nombre comercial principal con código de cliente en fuente reducida mono. |
| **4** | **Comercial** | `salesperson_code` | Izquierda | Nombre del comercial responsable o código de vendedor. |
| **5** | **Importe** | `amount` | Derecha | Moneda en fuente mono negrita (`#,##0.00 €`). |
| **6** | **Prob. Éxito** | `probabilidad_exito` | Derecha | Porcentaje mono (`X.X%`) o `---` si no está configurada. |
| **7** | **Cierre Previsto** | `cierreprev_date` | Centro | **Semáforo inteligente:**<br>• 🔴 *Vencida:* Pastilla roja con icono de advertencia y efecto pulsante.<br>• 🟠 *Próxima (< 15 días):* Pastilla ámbar con icono de reloj.<br>• ⚪ *Estándar:* Fecha normal con icono de calendario. |
| **8** | **Estado** | `estado_oferta` | Centro | Insignia redondeada con color de estado (Verde = Ganada, Rojo = Perdida, Azul/Cian = En Curso/Pendiente). |

### 5.2 Fila de Totales Adhesiva al Final de la Tabla (*Sticky Footer*)

En la parte inferior de la tabla se encuentra una fila fija de totales (`<tfoot className="bg-dts-primary text-white sticky bottom-0 z-20 shadow-lg">`) que permanece siempre visible durante el desplazamiento:

```tsx
<tfoot className="bg-dts-primary text-white sticky bottom-0 z-20 shadow-lg font-bold text-xs uppercase border-t-2 border-dts-secondary">
  <tr className="divide-x divide-white/10">
    <td className="px-4 py-3.5 tracking-wider" colSpan={4}>
      TOTALES — [totalCount] ofertas
    </td>
    <td className="px-4 py-3.5 text-right font-mono font-black text-xs text-white">
      [totalAmount €]
    </td>
    <td className="px-4 py-3.5 text-right font-mono text-xs text-dts-secondary">
      [averageProbability %]
    </td>
    <td className="px-4 py-3.5 text-center text-[10px] text-gray-200 font-mono">
      Pond: [totalWeightedValue €]
    </td>
    <td className="px-4 py-3.5 text-center text-[10px]">
      Éxito: [successRate %]
    </td>
  </tr>
</tfoot>
```

* **Distribución Exacta:**
  * **Columnas 1 a 4 (`colSpan={4}`):** Etiqueta `TOTALES` con el recuento oficial de ofertas que cumplen los filtros actuales.
  * **Columna 5 (Importe):** Suma total de importe cotizado de todas las ofertas filtradas.
  * **Columna 6 (Prob. Éxito):** Probabilidad media de éxito en color de acento cian dTS (`#00B0B9`).
  * **Columna 7 (Cierre Previsto):** Total del valor ponderado previsto (*Forecast*).
  * **Columna 8 (Estado):** Tasa de éxito porcentual global del conjunto filtrado.

---

## 6. Cajón Lateral de Detalle y Edición Rápida (*Drawer*) 🗂️

Al hacer clic en cualquier fila de la tabla se abre un panel lateral interactivo (`Drawer`) con la ficha integral de la oferta:

* **Cabecera y Metadatos:** Nº de documento, cliente, comercial, estado actual e importe total.
* **Edición Rápida de Fecha de Cierre:** Selector de fecha con botón de guardado inmediato que dispara `updateCrmQuote` hacia el backend, invalidando automáticamente las queries para refrescar la tabla y los KPIs sin recargar la página.
* **Líneas de la Oferta:** Listado detallado de productos cotizados con código de artículo, descripción, cantidad, precio unitario y total de línea.
* **Motivos de Resolución:** Visualización de motivo de ganada o motivo de pérdida y observaciones internas.

---

## 7. Exportación a Excel (`exportToXlsx`) 📥

El botón superior **Exportar** genera un archivo `.xlsx` estructurado (`ofertas_comerciales.xlsx`) con:
* Todas las ofertas que cumplen los criterios de filtrado actuales (sin restricción de página).
* Columnas completas: Nº Oferta, Fecha, Cód. Cliente, Nombre Cliente, Importe (€), Comercial, Estado, Cerrada, Probabilidad de Éxito, Cierre Previsto, Pedido Confirmado, Motivos de resolución y Observaciones.

---

## 8. Control de Acceso y Permisos de Rol (RBAC) 👥

* **Ruta de Acceso:** `/sales/quotes`
* **Módulo Registrado en Base de Datos:** `Ofertas Comerciales`
* **Roles Autorizados:**
  * `ADMIN`: Acceso total, visualización de todas las ofertas y edición de metadatos.
  * `DIRECCION`: Supervisión completa de cartera corporativa y forecast.
  * `VENTAS`: Gestión y seguimiento de ofertas asignadas al ámbito comercial.
  * `OPERACIONES`: Consulta de ofertas para planificación de demanda y aprovisionamiento.

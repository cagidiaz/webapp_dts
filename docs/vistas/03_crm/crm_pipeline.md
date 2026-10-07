# 📊 Documentación de Vista: CRM — Pipeline y Oportunidades Comerciales

> **Ubicación en la aplicación:** `/crm/pipeline`  
> **Acceso en menú:** CRM → *Oportunidades*  
> **Componente Frontend:** [`CrmPipeline.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/crm/components/CrmPipeline.tsx)  
> **Servicio Backend:** `backend/src/modules/quotes/quotes.service.ts` (`getAllCrmQuotes`, `updateCrmQuote`, `getActivities`, `addActivity`)  
> **Controlador Backend:** `backend/src/modules/quotes/quotes.controller.ts`  
> **Tablas de Base de Datos:** `sales_quotes_crm`, `sales_quote_activities`, `sales_quotes`, `customers`, `contacts`  
> **Última actualización:** Octubre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Pipeline de Oportunidades** es el tablero visual del ciclo comercial de dTS Instruments. Permite al equipo de ventas y dirección monitorizar el avance de las cotizaciones desde su preparación inicial hasta el cierre o adjudicación. Sus funciones clave son:

* **Gestión Visual del Embudo (Funnel de Ventas)**: Tablero Kanban interactivo que organiza las ofertas en 5 fases estandarizadas de madurez comercial.
* **Cálculo del Valor Ponderado del Negocio**: Pondera el importe económico de cada oportunidad según su probabilidad estimada de éxito para proyectar la facturación esperada.
* **Trazabilidad de Negociación y Motivos de Cierre**: Registro obligatorio de notas o actividades comerciales (llamada, reunión, nota) al arrastrar una oferta entre fases.
* **Modo Dual Kanban / Tabla**: Permite alternar entre la vista de tarjetas Kanban para reuniones de seguimiento y la vista en tabla para filtrado denso y exportación.
* **Filtro Automático por Delegado**: Para roles comerciales (`VENTAS`, `OPERACIONES`), pre-filtra automáticamente las ofertas asignadas a su código comercial personal.

---

## 2. Estructura y Fases del Tablero Kanban 🖥️

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Bandeja de KPIs del Pipeline:                                                   │
│  [ Total Pipeline € ] [ Valor Ponderado € ] [ Tasa Conversión % ] [ Ofertas Vivas│
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros (Buscador con debounce, Comercial, Ejercicio, Modo Kanban/Tabla│
├──────────────────────────────────────────────────────────────────────────────────┤
│  COLUMNAS DEL EMBUDO KANBAN (Drag & Drop Interactivo):                           │
│  ┌────────────┬────────────┬──────────────┬────────────┬────────────┐            │
│  │  BORRADOR  │  ENVIADA   │ EN NEGOCIAC. │   GANADA   │  PERDIDA   │            │
│  │  (N) (€)   │  (N) (€)   │   (N) (€)    │  (N) (€)   │  (N) (€)   │            │
│  ├────────────┼────────────┼──────────────┼────────────┼────────────┤            │
│  │ Tarjeta 1  │ Tarjeta A  │ Tarjeta X    │ Tarjeta W  │ Tarjeta Z  │            │
│  │ Tarjeta 2  │ Tarjeta B  │              │            │            │            │
│  └────────────┴────────────┴──────────────┴────────────┴────────────┘            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Drawer Lateral de Oferta (Detalle de líneas, cliente, probabilidad y actividades│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Las 5 Etapas Oficiales del Pipeline 🏷️

1. **Borrador (`borrador`)**: Oferta en confección técnica por parte del comercial o Product Manager antes de ser despachada al cliente.
2. **Enviada (`enviada`)**: Cotización remitida al cliente, a la espera de acuse de recibo o revisión técnica por parte del comprador.
3. **En Negociación (`en negociación`)**: Intercambio activo sobre condiciones de entrega, ajustes de alcance, descuentos o fórmulas de pago.
4. **Ganada (`ganada`)**: Aceptación formal de la propuesta o recepción del pedido de compra. *Probabilidad fijada en 100%*.
5. **Perdida (`perdida`)**: Desestimada por precio, pérdida frente a competidor o cancelación del proyecto por parte del cliente.

---

## 4. Indicadores Clave de Rendimiento (KPIs) 📈

| KPI | Fórmula / Cálculo | Utilidad |
| :--- | :--- | :--- |
| **Total Pipeline (€)** | Suma del importe (`amount`) de todas las ofertas vivas (`borrador`, `enviada`, `en negociación`). | Volumen total de negocio en juego. |
| **Valor Ponderado (€)** | $\sum (\text{amount} \times \frac{\text{probability}}{100})$. | Estimación realista de ingresos esperados. |
| **Tasa de Conversión (%)** | $\frac{\text{Ofertas Ganadas}}{\text{Ganadas} + \text{Perdidas}} \times 100$. | Eficacia de cierre comercial del equipo. |
| **Ofertas Activas** | Conteo total de ofertas vivas no concluidas. | Carga de trabajo comercial abierta. |

---

## 5. Modal de Transición y Trazabilidad de Cambios de Estado 🔄

Al arrastrar una tarjeta a una nueva columna:
* Se abre automáticamente un modal que solicita una breve **justificación o nota de seguimiento**.
* Permite tipificar la interacción (`Llamada`, `Reunión`, `Email`, `Nota interna`).
* Se registra un evento en la tabla `sales_quote_activities`, asegurando que ninguna oportunidad cambie de estado sin una explicación comercial documentada.

# Actualización: Días Reales de Cobro y Filtrado Geográfico Bidireccional en Cartera de Clientes

**Fecha:** 1 de septiembre de 2026  
**Módulo:** Ventas / Cartera de Clientes (`/sales/customers`)  
**Versión:** v5.7  

---

## 1. Resumen Ejecutivo
Esta versión incorpora la métrica financiera de **Días Reales de Cobro** (Opción Híbrida: Términos Contractuales + Demora Real por Mora) en la Cartera de Clientes y añade la capacidad de **Filtrado Geográfico Bidireccional** entre el Mapa Interactivo de la Península Ibérica / Canarias / Portugal, el ranking lateral de Mejores Clientes y la Tabla Principal de Cartera.

---

## 2. Novedades y Mejoras Implementadas

### 📊 Columna de Días Reales de Cobro (Opción 3 - Híbrido Contractual + Mora)
* **Cálculo Backend (`customers.service.ts`)**:
  * **Días Pactados**: Parseo inteligente del término contractual configurado en Dynamics 365 Business Central (`Contado = 0d`, `14d`, `15d`, `30d`, `45d`, `60d`, `90d`, `120d`, etc.).
  * **Demora por Saldo Vencido**: Si el cliente acumula deuda vencida impagada (`balance_due_lcy > 0`), calcula proporcionalmente los días efectivos de retraso adicional sobre su facturación.
  * **Total Días Reales**: Sumatorio de los días pactados más la mora real acumulada.
* **Formato Visual en la Tabla (`CustomersPage.tsx`)**:
  * **Al corriente**: Plazo contractual en gris/verde neutral (ej. `30d`, `60d`, `Contado (0d)`).
  * **Con mora**: Destacado en tono ámbar junto a un badge explicativo (ej. `78d` `+18d mora`).
* **Configurador de Columnas y Exportación Excel**:
  * Disponible en el popover de visibilidad de columnas.
  * Exportación a Excel con columnas desglosadas: *Días Pactados*, *Días Demora Mora* y *Días Reales Cobro*.

---

### 🗺️ Filtrado Geográfico Bidireccional (Mapa, Ranking y Tabla)
* **Conmutación Directa e Instantánea (0 ms)**:
  * Al hacer clic en cualquier provincia o distrito (ej. Madrid, Barcelona, Valencia, Sevilla, Lisboa, Tenerife, etc.), el sistema conmuta directamente a esa zona sin necesidad de deseleccionar la previa.
* **Resaltado Visual en el Mapa (`IberianGeoSalesMap.tsx`)**:
  * La provincia seleccionada se ilumina en **cian vibrante (`#00B0B9`)** con un contorno blanco nítido y fino de **`1.3px`** y resplandor sutil.
  * Las demás provincias se atenúan suavemente al 45% de opacidad para enfocar la atención en el territorio seleccionado.
* **Sincronización del Ranking Lateral de Mejores Clientes**:
  * La lista lateral del mapa filtra y re-clasifica (`#1, #2, #3...`) todas las empresas ubicadas en la provincia seleccionada.
  * Selector de límite ampliado: **Top 5, Top 10, Top 15, Top 25, Top 50 y Todos**.
* **Sincronización con la Tabla Principal**:
  * La tabla de clientes y su scroll continuo muestran exclusivamente las empresas del territorio activo.
  * Se proyecta un chip interactivo `🗺️ [Nombre Provincia] ✕` en la barra de filtros para deseleccionar con un clic.

---

### 📐 Optimización de Pantalla y Ocultación por Defecto
* **Territorio Oculto por Defecto**:
  * La columna *Territorio* queda oculta por defecto (junto con *Mercado* y *Mod. Negocio*), permitiendo que la tabla completa encaje al 100% en pantallas estándar y portátiles sin provocar desplazamientos horizontales innecesarios.
* **Exclusión de Cliente Comodín `9999999` en Cartera**:
  * Oculto exclusivamente de la Cartera de Clientes y preservado intacto en las tablas de seguimiento presupuestario (*Ventas vs Presupuesto*, *Presupuesto PM*).

---

## 3. Archivos Modificados
* `backend/src/modules/customers/customers.service.ts`: Cálculo de días de cobro y ampliación de filtro territorial.
* `frontend/src/api/customers.ts`: Ampliación de interfaz `CustomerDataRow` con campos `payment_days_agreed`, `payment_days_delay` y `payment_days_total`.
* `frontend/src/pages/sales/CustomersPage.tsx`: Integración de estado `selectedGeoZone`, columnas visibles, chip de filtro geográfico y exportación.
* `frontend/src/pages/sales/components/IberianGeoSalesMap.tsx`: Delineado fino de 1.3px, conmutación instantánea de zonas, re-clasificación del ranking y selector ampliado.

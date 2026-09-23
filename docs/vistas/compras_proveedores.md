# 🛍️ Documentación de Vista: Cartera de Proveedores

> **Ubicación en la aplicación:** `/purchases/vendors`  
> **Componente Frontend:** [`VendorsPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/purchases/VendorsPage.tsx)  
> **Componente Mapa:** [`WorldGeoVendorsMap.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/purchases/components/WorldGeoVendorsMap.tsx)  
> **Componente Drawer:** [`VendorDetailDrawer.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/purchases/components/VendorDetailDrawer.tsx)  
> **Servicio Backend:** [`vendors.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/vendors/vendors.service.ts) (`getAll`, `getKPIs`, `getMapData`, `getById`)  
> **Última actualización:** Septiembre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

La vista **Cartera de Proveedores** es la plataforma integral de dTS Instruments para el control del aprovisionamiento, seguimiento de fabricantes y análisis de la cadena de suministro internacional. Permite a la Dirección de Operaciones, Compras y Administración:

* **Control del Aprovisionamiento Global:** Visualizar la distribución geográfica de los fabricantes y distribuidores que suministran instrumentación y fungibles a dTS Instruments en todo el mundo.
* **Seguimiento del Volumen de Compra Real:** Conocer con exactitud el volumen anual o histórico facturado por cada proveedor a partir de los movimientos de valor (`value_entries`) de Business Central.
* **Gestión de Tesorería y Riesgo de Acreedores:** Monitorizar la deuda viva con proveedores (`balance`) y el saldo vencido (`balance_due`) para anticipar pagos y mantener condiciones ventajosas de crédito comercial.
* **Detección de Bloqueos Operativos:** Identificar de inmediato proveedores bloqueados por incidencias de calidad, homologación o disputas administrativas.
* **Filtro Geoespacial Dinámico:** Explorar compras por países (ej. Alemania, EE.UU., Suiza, España) con un mapa interactivo D3 que filtra la tabla de gestión con un solo clic.

---

## 2. Estructura y Layout de la Vista 🖥️

La pantalla sigue la arquitectura corporativa de dTS (paleta `#003E51` y `#00B0B9`, estética limpia y responsiva):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Bandeja de KPIs Superiores (5 Tarjetas Métricas)                                │
│  [ Proveedores ] [ Vol. Compras ] [ Saldo Total ] [ Vencido ] [ Bloqueados ]     │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Mapa Geoespacial de Distribución Global (WorldGeoVendorsMap)                     │
│  - Proyección D3 Mercator / TopoJSON mundial                                     │
│  - Selector de Métrica (Volumen € vs Deuda €) + Presets Regionales (Mundo/EU/ES)│
│  - Ranking Lateral Top 5 Países + Tooltips interactivos                          │
│  - Clic en país -> Filtra tabla inferior reactivamente                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Barra de Filtros y Búsqueda (Input con debounce, Año, Estado Bloqueo, Exportar) │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Tabla de Proveedores con Scroll Infinito (50 por página, Virtualización DOM)    │
│  [ Cód ] [ Proveedor ] [ País/Ciudad ] [ ABC ] [ Saldo ] [ Vol. Compra ] [ NIF ] │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Drawer Lateral de Detalle (VendorDetailDrawer al hacer clic en cualquier fila)  │
│  - Ficha comercial, NIF, condiciones de pago, pedidos en curso y facturas        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Indicadores Clave de Rendimiento (KPI Cards) 📈

Ubicados en la cabecera para una evaluación financiera inmediata:

| KPI | Métrica | Origen de Datos | Utilidad de Negocio |
| :--- | :--- | :--- | :--- |
| **Cartera de Proveedores** | Cantidad entera (ej. `312`) | `COUNT(vendors)` según filtros activos. | Dimensión del panel de compras activas. |
| **Volumen de Compras** | Importe en euros (€) | `SUM(cost_amount_actual)` en `value_entries` (tipo compra). Si hay filtro de año, acota a dicho ejercicio. | Volumen total aprovisionado en el ejercicio o histórico. |
| **Saldo Pendiente (Deuda)** | Importe en euros (€) | `SUM(balance)` de la tabla `vendors`. | Total de pasivo corriente / deuda comercial viva con proveedores. |
| **Saldo Vencido** | Importe en euros (€) | `SUM(balance_due)` de la tabla `vendors`. | Alerta roja de vencimientos sobrepasados que requieren atención urgente de tesorería. |
| **Proveedores Bloqueados** | Cantidad entera (ej. `4`) | `COUNT(vendors WHERE blocked != ' ')`. | Proveedores suspendidos para emisión de pedidos. |

---

## 4. Mapa Geoespacial Interactivo D3 (`WorldGeoVendorsMap`) 🌍

El mapa interactivo es el componente central de inteligencia geográfica de la vista:

### 4.1. Tecnología y Renderizado
- **Motor:** SVG vectorial acelerado por hardware gestionado con **D3-Geo** (`geoMercator`, `geoPath`).
- **Topología:** Cartografía global de alta fidelidad basada en **TopoJSON** (`world-atlas/countries-110m.json`).
- **Desacoplamiento Territorial:** Procesamiento específico para fragmentar territorios de ultramar (ej. Guayana Francesa) y evitar distorsiones en la escala de Europa continental.

### 4.2. Inferencia y Normalización de Países (`detectVendorCountryCode`)
Muchos registros heredados de Business Central no disponen del campo `country_code` formalizado. El motor incluye un algoritmo heurístico multi-capa:
1. **Código ISO Directo:** Si `v.country_code` está relleno, se valida contra el diccionario ISO 3166-1 (`ES`, `DE`, `FR`, `US`, `CH`, `IT`, `GB`, etc.).
2. **Detección de NIF Estadounidense (EIN):** Reconocimiento de formato `XX-XXXXXXX` o mención a estados y ciudades industriales americanas (San Diego, California, Texas, Carolina del Norte, Horsham).
3. **Prefijos VIES / VAT Comunitarios:** Inferencia por los 2 primeros caracteres del `vat_no` (ej. `DE...`, `FR...`, `IT...`, `NL...`).
4. **Geolocalización por Texto y Sede:** Mapeo de ciudades de fabricantes reconocidos (ej. Güglingen, Venlo, Stockerau, Allerød, Malmö, Vestec).
5. **Fallback Local:** Si no se detecta país extranjero, se imputa a España (`ES`).

### 4.3. Funcionalidades del Mapa
- **Conmutador de Métrica:**
  - `Volumen (€)`: El tamaño y brillo de las burbujas y países refleja la facturación acumulada.
  - `Deuda (€)`: Resalta los países donde se concentra el saldo acreedor pendiente de liquidación.
- **Presets de Región Rápida:**
  - 🌍 **Mundial:** Visión planetaria completa.
  - 🇪🇺 **Europa:** Enfoque en los fabricantes del arco industrial europeo.
  - 🇪🇸 **España:** Detalle del aprovisionamiento nacional.
  - 🇺🇸 **América:** Vista centrada en proveedores de Estados Unidos.
  - 🌏 **Asia:** Enfoque en fabricantes asiáticos.
- **Zoom Continuo:** Botones de `+`, `-` y restablecer escala, con soporte para arrastre panorámico (*pan*).
- **Ranking Lateral Top 5:** Tarjetas compactas con las banderas de los principales países suministradores, su volumen y porcentaje sobre el total.
- **Interacción Bidireccional:**
  - Al hacer clic en un país del mapa o del ranking lateral, se emite `onSelectZone({ id: 'DE', name: 'Alemania' })`.
  - La tabla inferior se actualiza automáticamente con `keepPreviousData` para listar únicamente los proveedores de ese país.
  - Un *badge* interactivo en la cabecera permite cancelar el filtro territorial en cualquier momento con un solo clic.

---

## 5. Tabla Dinámica de Proveedores 📋

### 5.1. Columnas y Métricas
1. **Código:** Clave de Business Central (ej. `PR00124`), en tipografía monoespaciada.
2. **Proveedor:** Razón social y nombre comercial.
3. **Ubicación:** Ciudad, provincia y bandera/código de país detectado.
4. **Clasificación ABC:** Categorización por relevancia de gasto en compras (`A`, `B`, `C`).
5. **Saldo Pendiente (€):** Importe debido con código de color (verde al corriente, rojo en vencimiento).
6. **Volumen de Compra (€):** Gasto facturado en el año fiscal seleccionado o total histórico.
7. **NIF / CIF:** Identificador fiscal para cotejo contable.
8. **Estado:** Etiqueta visual indicando si el proveedor está activo o bloqueado.

### 5.2. Paginación y Rendimiento (Scroll Infinito)
- Utiliza `@tanstack/react-query` con `useInfiniteQuery` en bloques de 50 registros.
- Incorpora `IntersectionObserver` al pie de la tabla para carga continua y fluida.
- Configura `placeholderData: keepPreviousData` en todas las consultas para evitar parpadeos y preservar el foco del teclado al filtrar por texto.

---

## 6. Drawer Lateral de Detalle (`VendorDetailDrawer`) 🔍

Al hacer clic en cualquier proveedor de la tabla o desde el mapa:
- Se despliega una barra lateral animada sin salir de la vista.
- **Datos de Cabecera:** Nombre, código, estado de bloqueo, condiciones de pago asociadas en Navision (días de crédito, forma de pago).
- **KPIs Individuales:** Saldo actual, deuda vencida y volumen histórico de compra.
- **Pedidos Abiertos de Compra:** Listado de documentos de pedido en curso (`purchase_headers` + `purchase_lines`) con fecha de recepción estimada e importes pendientes.
- **Facturación Histórica:** Desglose de facturas y notas de abono registradas.

---

## 7. Exportación a Excel (`exportToXlsx`) 📥

El botón superior **Exportar a Excel** genera un archivo `.xlsx` estructurado:
* Contempla todos los filtros aplicados en pantalla (año, búsqueda, bloqueo y país seleccionado en el mapa).
* Formatea importes numéricos con precisión decimal para análisis financiero directo en hojas de cálculo.

---

## 8. Arquitectura de Datos e Inmutabilidad 🔒

De acuerdo con las reglas de gobierno de dTS Instruments:
* **Solo Lectura:** Las tablas sincronizadas de compras (`vendors`, `value_entries`, `purchase_headers`, `purchase_lines`) son estrictamente de solo lectura.
* **Consistencia con Business Central:** Los importes de compra se calculan sobre los movimientos reales devengados (`value_entries`), garantizando coincidencia con el libro diario y las declaraciones de compras intracomunitarias/importaciones.

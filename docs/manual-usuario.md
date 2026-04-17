# Manual de Usuario — WebApp dTS Instruments

> Este documento detalla el funcionamiento técnico y la procedencia de los datos de la plataforma dTS Instruments para asegurar la transparencia en el análisis de negocio.

## Índice

1. [Dashboard Principal](#1-dashboard-principal)
2. [Módulo de Finanzas](#2-módulo-de-finanzas)
    - 2.1 [Análisis de Balances](#21-análisis-de-balances)
    - 2.2 [4 Puntos Clave (Análisis Rápido)](#22-4-puntos-clave-análisis-rápido)
    - 2.3 [Cuadro de Mando (20 Ratios)](#23-cuadro-de-mando-20-ratios)
    - 2.4 [Evolución de Ratios (Gráficos)](#24-evolución-de-ratios-gráficos)
    - 2.5 [Simulador de Escenarios](#25-simulador-de-escenarios)
3. [Módulo de Ventas (Clientes y Productos)](#3-módulo-de-ventas-clientes-y-productos)
    - 3.1 [Scroll Infinito y Rendimiento](#31-scroll-infinito-y-rendimiento)
    - 3.2 [Filtros y Búsqueda Avanzada](#32-filtros-y-búsqueda-avanzada)
    - 3.3 [KPIs Dinámicos y Ordenación](#33-kpis-dinámicos-y-ordenación)
    - 3.4 [Presupuestos de Ventas (Novedad)](#34-presupuestos-de-ventas-novedad)
    - 3.5 [Seguimiento de Pedidos (Novedad)](#35-seguimiento-de-pedidos-novedad)
4. [Lógica de Cálculo y Datos (Backend)](#4-lógica-de-cálculo-y-datos-backend)
    - 4.1 [Fuentes de Información](#41-fuentes-de-información)
    - 4.2 [Proyección de Cierre 2026 (Est.)](#42-proyección-de-cierre-2026-est)
5. [Exportación de Datos (XLSX)](#5-exportación-de-datos-xlsx)
6. [Gestión de Usuarios (Admin)](#6-gestión-de-usuarios-admin)

---

## 1. Dashboard Principal
El Dashboard es el centro de monitorización en tiempo real del cumplimiento de objetivos.
- **Ventas Cierre Est.**: Muestra la previsión de ventas a final de año. Si existe un presupuesto cargado para 2026, toma el valor objetivo del presupuesto.
- **EBITDA Cierre Est.**: Resultado operativo proyectado antes de amortizaciones. Se calcula cruzando el presupuesto de ventas con el de gastos.
- **Consecución Ventas (Novedad 2026)**: Compara las **Ventas Reales YTD** (lo facturado hasta hoy) contra el **Presupuesto Anual 2026**. Incluye una barra de progreso que indica el % de cumplimiento del objetivo anual.

## 2. Módulo de Finanzas

### 2.1 Análisis de Balances
Ubicado en **Finanzas > Balances**.
- **Propósito**: Analizar la solidez patrimonial y el crecimiento de la empresa.
- **Datos utilizados**: Provienen de la tabla `financial_balances` (Snapshots mensuales extraídos del ERP).
- **Análisis Vertical**: Los porcentajes debajo de cada cifra indican el peso de esa partida sobre el **Total Activo** (en el activo) o sobre el **Total Pasivo + PN** (en el pasivo), permitiendo ver la estructura de capital de un vistazo.

### 2.2 4 Puntos Clave (Análisis Rápido)
Ubicado en **Finanzas > Puntos Clave**.
- **Propósito**: Evaluación inmediata de la salud financiera mediante semáforos (Verde/Rojo).
- **Criterios de Evaluación**:
  - **Liquidez**: Capacidad de pago a corto plazo. (Activo Circulante / Pasivo Corto Plazo).
  - **Endeudamiento**: Nivel de deuda sobre fondos propios.
  - **Capitalización**: Peso del Patrimonio Neto sobre el total.
  - **Garantía**: Seguridad para acreedores (Activo Total / Pasivo Total).
- **Gráficos de Composición**: Visualizan cómo se reparte el activo (fijo, existencias, disponible) y el pasivo (propio vs ajeno).

### 2.3 Cuadro de Mando (20 Ratios)
Ubicado en **Finanzas > Ratios (Tabla)**.
- **Propósito**: Auditoría financiera profunda en 4 bloques: Liquidez, Solvencia, Gestión y Rentabilidad.
- **Transparencia**: Debajo de cada indicador aparece la **Fórmula Exacta** utilizada. Por ejemplo:
  - *DSO (Días de Cobro)*: (Clientes / Ventas) * 365.
  - *Punto de Equilibrio*: Ventas necesarias para cubrir todos los costes fijos.
- **Datos Proyectados (Est.)**: Para el año 2026, los ratios se calculan usando los **totales combinados de presupuestos de ventas y gastos**, asegurando que el ROA o el Margen Neto reflejen el objetivo anual.
- **Ajuste de Actividad y Balance (Novedad 2026)**: Para garantizar ratios de gestión coherentes (**DSO/DPO**), el motor de proyección diferencia entre cuentas:
  - **Cuentas Inerciales**: (Activo Fijo, Patrimonio Neto, Pasivo LP) se proyectan como una copia exacta del último saldo real (Febrero 2026), ya que no tienen una relación directa con el volumen de ventas mensual.
  - **Cuentas Operativas**: (Clientes, Proveedores, Existencias) se escalan automáticamente según el factor de crecimiento del presupuesto frente a la realidad. Esto permite proyectar un balance a cierre de año (Diciembre 2026) que sea proporcional a la actividad de ventas y compras prevista, manteniendo los ratios de días de cobro y pago alineados con la realidad operativa.

### 2.4 Evolución de Ratios (Gráficos)
Ubicado en **Finanzas > Ratios (Gráficos)**.
- Visualiza las tendencias históricas. Especialmente útil para ver si la **Eficiencia Operativa** (margen de beneficio por euro vendido) está creciendo año tras año.
- Los nodos marcados como **(Est.)** representan la posición que la empresa debería tener al cierre del ejercicio según sus presupuestos.

### 2.5 Simulador de Escenarios
Ubicado en **Finanzas > Simulador**.
- Permite "jugar" con los números de 2026:
  - **Base de Simulación**: Puedes elegir comparar tus cambios contra el *Cierre Real 2025* o contra el *Presupuesto 2026*.
    - **Ajustes**: Al mover los sliders, el sistema recalcula el **EBITDA Proyectado**, el **Margen Bruto** y la **Tesorería Estimada**.
    - **Vinculación Inteligente (Novedad 2026)**: En el escenario de **Presupuesto 2026**, la *Variación de Costes* se bloquea y se vincula automáticamente al *Crecimiento de Ventas*.
    - **Lógica de Vinculación**: Se basa en el **Ratio de Compras (67,44%)**. Por cada 1% de crecimiento en ventas, el sistema estima un incremento de 0,67% en los costes totales (compras proyectadas).

---

## 3. Módulo de Ventas (Clientes y Productos)
Este módulo permite una gestión ágil de la cartera de clientes y el catálogo de productos, sincronizados directamente con las tablas de Navision/BC.

### 3.1 Scroll Infinito y Rendimiento
- **Carga bajo demanda**: Las tablas ya no usan paginación tradicional. Los datos se cargan automáticamente a medida que el usuario se desplaza hacia abajo (**Scroll Infinito**), permitiendo manejar miles de registros sin ralentizar el navegador.
- **Eficiencia**: Solo se solicitan al servidor los datos visibles en pantalla, reduciendo el consumo de ancho de banda.

### 3.2 Filtros y Búsqueda Avanzada
- **Filtro por Vendedor**: Permite filtrar el catálogo de clientes y productos para ver solo aquellos asignados a un comercial o proveedor específico.
- **Buscadores Inteligentes (Combobox - Novedad)**: Los selectores de **Familia** y **Proveedor** ahora permiten escribir para filtrar las opciones. Esto facilita encontrar rápidamente cualquiera de las +160 subfamilias sin necesidad de desplazarse por una lista larga.
- **Jerarquía de Categorías (Novedad Abril 2026)**: Integración de un maestro de categorías que vincula cada producto a su **Familia**, **Subfamilia** y **Product Manager (PM)**. La búsqueda global ahora también permite encontrar productos escribiendo el nombre de su familia (ej: "Automatización").

### 3.3 KPIs Dinámicos y Ordenación
- **Ordenación por Columnas**: Al hacer clic en el nombre de cualquier columna, la base de datos reordena los miles de registros de forma instantánea (descendente/ascendente), manteniendo la posición del scroll.
- **Lógica de Stock Físico (Novedad Abril 2026)**: El KPI de **Stock Total** ha sido optimizado para ignorar valores negativos procedentes del ERP. Esto asegura que la cifra mostrada represente el **Stock Real Disponible** para venta, evitando que productos con stock negativo (pendientes de regularizar) disminuyan el valor total del inventario físico.

#### 3.4 Presupuestos de Ventas (Novedad)
Ubicado en **Ventas > Presupuestos**.
- **Propósito**: Comparativa en tiempo real de la facturación (Albaranes + Facturas de Abono y Cargo) frente a los presupuestos (Objetivos) cargados en la base de datos.
- **Visualización Detallada**:
  - **KPIs (6 Indicadores)**: Resumen de Ventas Totales, Objetivo Anual, Desviación Monetaria (€), Desviación Porcentual (%), Cartera de Ventas y **Enviados por Facturar**.
  - **Tabla de Clientes**: Desglose de cumplimiento de objetivos nivel cliente, destacando en positivo o negativo su % de desviación.
  - **Gráfico de Evolución**: Comparativa mensual de ventas reales (Facturación neta) frente a la meta (Budget).
- **Lógica de Datos y Exclusiones**:
  - **Solo Productos**: Los importes mostrados proceden de la tabla `value_entries` filtrada por movimientos de inventario. **No se incluyen conceptos de transporte, embalajes ni otros servicios** facturados que no estén tipificados como productos en el ERP, garantizando que el análisis se centra en el rendimiento de ventas del catálogo físico.
  - **Abonos incluidos**: El cálculo de ventas es neto; los Abonos de Venta restan automáticamente del total facturado.
- **Seguridad y Filtros por Vendedor**:
  - **Administradores y Dirección**: Pueden visualizar los datos de toda la empresa y filtrar por cualquier vendedor, familia o mes de forma interactiva.
  - **Vendedores**: Cuando un usuario está vinculado a un perfil de `vendedor` en el ERP, el filtro de comerciales desaparece y **el sistema fuerza automáticamente el filtrado a nivel de base de datos**. Un vendedor *solo* puede ver su propia cartera de ventas y sus propios objetivos, asegurando la total privacidad de los datos ajenos.

#### 3.5 Seguimiento de Pedidos (Novedad)
Ubicado en **Ventas > Pedidos**.
- **Propósito**: Monitorización de la cartera de pedidos abierta (backlog) y el estado de los envíos pendientes de facturar.
- **Diferencia entre Líneas y Pedidos**: La tabla muestra líneas individuales de producto para un control detallado, pero el KPI **Total Pedidos** cuenta únicamente documentos únicos (cabeceras), ofreciendo una visión real del volumen de operaciones comerciales activas.
- **Ordenación por Columnas**: Permite reorganizar la lista por cualquier campo (Fecha, Cliente, Importe, etc.) manteniendo la carga fluida de datos. Por defecto, el sistema muestra primero los números de pedido más recientes.
- **KPIs de Cartera**:
  - **Cartera Total**: Valor económico de lo que el cliente ha pedido pero aún no se ha enviado.
  - **Pendiente de Facturar**: Valor de lo que ya se ha enviado pero el departamento administrativo aún no ha facturado.

### 3.6 Exportación de Datos (XLSX) — Novedad Abril 2026
- **Propósito**: Facilitar el análisis off-line de los datos comerciales permitiendo la descarga de cualquier listado en formato Excel (.xlsx).
- **Funcionamiento**: El botón **"Exportar XLSX"** (color verde) se encuentra integrado en la barra de herramientas de todas las tablas de la sección de Ventas.
- **Exportación Inteligente**: 
  - Al pulsar el botón, el sistema genera dinámicamente el archivo respetando todos los **filtros activos** (búsqueda por nombre, vendedor, familia, etc.).
  - A diferencia de la tabla visual (que usa scroll infinito), el archivo exportado contiene el **conjunto completo de registros** que cumplen los criterios del filtro, no solo los cargados en pantalla.
  - El formato incluye cabeceras estilizadas y, en el caso de la vista de Presupuestos, una **fila de totales automáticos** al final del documento.

---

## 4. Lógica de Cálculo y Datos (Backend)

La plataforma dTS Instruments utiliza un motor de procesamiento que unifica datos reales de contabilidad con objetivos de negocio estratégicos.

### 4.1 Fuentes de Información
1.  **Datos Reales (Actuals)**: Registros contables mensuales subidos desde el ERP a las tablas `income_statements` y `financial_balances`.
2.  **Presupuesto de Ventas 2026 (Sales Budgets)**: Una tabla detallada que contiene los objetivos de venta por comercial y cliente para el año 2026. Es la fuente para la partida **A.1** dEL 2026.
3.  **Presupuesto de Gastos 2026**: Datos cargados para las partidas de Personal, Compras y Otros Gastos de explotación.

### 4.2 Proyección de Cierre 2026 (Est.)
Para el año actual (2026), la WebApp aplica la siguiente jerarquía de cálculo:

- **Si NO existe presupuesto**: El sistema toma lo facturado hasta el último mes y lo **extrapola linealmente** hasta los 12 meses (Ej: si en marzo llevas 300k, estima 1.2M al final de año).
- **Si EXISTE presupuesto**: El sistema **prioriza el presupuesto anual**. Las partidas de ventas y gastos muestran el valor total que se prevé alcanzar en diciembre.
- **Recálculo de Totales**: Para evitar errores de márgenes (como el ROA bajo que se producía al inicio), el sistema **recalcula el EBIT y el Beneficio Neto** proyectado para 2026 sumando/restando las partidas presupuestadas y aplicando un **estimado de impuestos (25%)**.

---

## 6. Gestión de Usuarios (Admin)
Módulo restringido para el control de la seguridad.
- **Roles**: 
  - `ADMIN`: Gestión total y de usuarios.
  - `DIRECCION`: Visibilidad total de finanzas y ventas.
  - `VENTAS`: Visibilidad de objetivos comerciales.
- **Seguridad**: Todas las contraseñas están encriptadas y los accesos se validan mediante tokens JWT que expiran a las 24 horas.

---

---

## 6. Registro de Modificaciones Técnicas
- **Actualización 17 Abril 2026 (v3.0)**:
  - Implementación de **Exportación a Excel (XLSX)** en todos los módulos de Ventas (Presupuestos, Clientes, Pedidos y Productos).
  - Desarrollo de utilidad `exportToXlsx` con soporte para formateo dinámico y auto-ajuste de columnas.
  - Integración de la descarga del **dataset completo** mediante llamadas optimizadas al backend filtradas por el estado actual de la UI.
  - Estilización de documentos exportados con colores corporativos y filas de totales.
- **Actualización 16 Abril 2026 (v2.9)**:
  - Implementación del módulo **Pedidos de Venta** con seguimiento de backlog.
  - Estandarización estética integral: Unificación de diseño entre las pantallas de Clientes y Presupuestos (eliminación de espacios, integración de buscadores en contenedores y pies de totales fijos).
  - Mejora en KPIs comerciales: El conteo de pedidos ahora distingue entre líneas totales y documentos únicos.
  - Sistema de **Ordenación Dinámica** habilitado para todas las columnas en la vista de pedidos.
- **Actualización 9 Abril 2026 (v2.8)**:
  - Integración del módulo **Ventas vs Presupuestos** con análisis de desviaciones.
  - Sincronización de perfiles de usuario con **Vendedores del ERP** para filtrado automático y seguro.
  - Implementación de 6 KPIs estratégicos (Ventas, Objetivo, Desviación, Cartera y Enviados por Facturar).
  - Ajuste de lógica de datos: Los movimientos de venta (`value_entries`) se centran exclusivamente en **líneas de producto**, excluyendo cargos por embalaje o transporte para un análisis comercial puro.
- **Actualización 1 Abril 2026 (v2.6)**:
  - Integración del maestro de **Categorías y Subfamilias** (166 registros).
  - Implementación de **Buscadores Inteligentes (Combobox)** con autocompletado en filtros.
  - Ajuste de la lógica de agregación de **Stock Total** (ignorar negativos para stock físico).
  - Ampliación de columnas en tablas para mayor legibilidad de descripciones largas.

*Manual de dTS Instruments v2.9 — Actualizado a 16 de abril 2026.*

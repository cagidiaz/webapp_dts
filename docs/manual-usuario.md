# Manual de Usuario — WebApp dTS Instruments

> Este documento detalla el funcionamiento técnico y la procedencia de los datos de la plataforma dTS Instruments.

## 1. Dashboard Principal
El Dashboard es el centro de monitorización en tiempo real del cumplimiento de objetivos.
- **Ventas YTD vs Ppto YTD**: Compara la facturación real acumulada contra el presupuesto acumulado a fecha de hoy.
- **CLIENTES NUEVOS**: Panel de captación con facturación (FACT), total de altas (TOTAL) y clientes sin venta (S/VTA).
- **CARTERA Y PENDIENTES**: Tarjeta consolidada que muestra los pedidos abiertos en cartera (CARTE) y la mercancía enviada pendiente de factura (PEND).
- **Objetivo Anual (Velocímetro)**: Porcentaje de cumplimiento del objetivo total de facturación anual.
- **Evolución Ventas vs Presupuesto**: Gráfico con comparativa mensual de Ventas Año en Curso, Objetivo de Presupuesto y Ventas del Año Anterior (línea punteada).

## 2. Ventas vs Presupuesto (Seguimiento de Objetivos)
Vista detallada para analizar el grado de cumplimiento de los objetivos comerciales y detectar desviaciones por familias o vendedores de forma proactiva.
- **Gráfico de Evolución**: Compara mensualmente el presupuesto con las Ventas Año en Curso y una línea de referencia punteada fina con las Ventas del Año Anterior.
- **Tabla de Clientes**: Detalle del rendimiento YTD de cada cliente contra su objetivo, mostrando la desviación monetaria, la desviación porcentual y su comparativa con el año anterior (Fact. LY).

## 3. Presupuesto por Product Manager (PM)
Análisis de cumplimiento presupuestario orientado a Product Managers.
- Permite expandir cada cliente para desglosar la facturación y el presupuesto a nivel de referencia de producto (SKU).
- Incluye el gráfico de evolución mensual idéntico, enriquecido con la línea punteada de ventas del año anterior para contextualizar la estacionalidad del producto.

## 4. Histórico de Ventas (Auditoría de Movimientos)
Vista de auditoría transaccional de la tabla `value_entries`, restringida exclusivamente a los roles de **ADMIN** y **DIRECCION**.
- **Acceso Restringido**: Oculta de forma automática en el menú de navegación y protegida en el enrutamiento para vendedores u otros roles inferiores.
- **Filtro Avanzado**: Permite aislar los registros por **Tipo de Documento** (Facturas o Abonos) mediante un desplegable optimizado sin ruido visual.
- **Buscador en Tiempo Real**: Búsqueda reactiva por número de documento, referencia de producto, código de cliente o vendedor.
- **Ordenación Completa**: Todas las columnas (Nº Movimiento, Fecha, Documento, Producto, Cliente, Cantidad, Ventas y Costes) son interactivas y ordenables.
- **Exportación Directa**: Botón para descargar el histórico filtrado y ordenado a un documento Excel (`.xlsx`).

## 5. Histórico de Facturación (Consolidación de Documentos y Líneas)
Vista unificada para consultar facturas y abonos de venta con soporte para filtros y desglose de líneas detalladas.
- **Desglose de Líneas**: Permite expandir cada fila de factura para consultar sus líneas detalladas (SKU/Producto, Descripción, Tipo de línea, Cantidad, Precio Unitario, Descuento %, Importe Neto, Margen LDR y el número de línea `line_no`).
- **Resumen y KPIs de Facturación**: Panel de indicadores superiores que calcula en tiempo real para la selección actual:
  - Facturación Neta total (Excl. IVA) y el desglose correspondiente a portes y servicios.
  - Margen Real Medio (%).
  - Cantidad de Documentos Emitidos.
  - Descuentos Aplicados en las líneas.
- **Filtros Avanzados**: Desplegables para filtrar de forma simultánea por año de emisión del documento y tipo de línea (productos o cuentas contables de servicio).
- **Búsqueda Dinámica**: Filtro reactivo en tiempo real por número de documento, código o nombre de cliente, SKU, pedido de origen o referencia externa.
- **Exportación Excel**: Botón de exportación para descargar a un reporte Excel (`.xlsx`) el detalle consolidado de las cabeceras junto con sus líneas (incluyendo la nueva columna de número de línea `line_no`).

## 6. CRM de Ofertas (Seguimiento del Pipeline Comercial)
El módulo CRM de Ofertas permite centralizar, gestionar y dar seguimiento a las oportunidades comerciales y cotizaciones emitidas de manera interactiva.
- **Vista Tablero (Kanban)**: Permite visualizar las ofertas agrupadas en columnas según su estado comercial actual: *Borrador*, *Enviada*, *En Negociación*, *Ganada* o *Perdida*. Facilita el avance del embudo mediante arrastrar y soltar (Drag & Drop) tarjetas entre columnas.
- **Vista de Tabla**: Presentación tabular compacta y detallada de todas las ofertas que facilita búsquedas globales, filtros simultáneos por año, comercial asignado o tipo de oferta (Proyecto, Cliente Nuevo, Cliente Existente) y ordenamiento ágil de datos.
- **Panel de KPIs Superiores**: Indicadores clave de rendimiento calculados reactivamente:
  - **Pipeline Activo**: Sumatorio total del importe de ofertas en estados abiertos.
  - **Previsión Ponderada**: Estimación probabilística de facturación calculada como `Sumatorio(Importe * Probabilidad / 100)`.
  - **Tasa de Cierre**: Porcentaje de éxito basado en ofertas Ganadas frente al total de cerradas.
  - **Seguimiento Vencido**: Cantidad de oportunidades activas cuya fecha de próxima acción programada es anterior a la fecha de hoy.
- **Drawer de Detalles y Registro de Actividades**: Al hacer clic en cualquier oferta se despliega un panel lateral para:
  - Cambiar manualmente el estado, la probabilidad de éxito (con preajustes por estado) o el tipo de oferta.
  - Asignar fechas de cierre previsto o de seguimiento.
  - Registrar notas y justificaciones de éxito o pérdida.
  - Registrar bitácoras de actividades (Llamadas, Visitas, Correos, Tareas, etc.) marcándolas como completadas o pendientes.

## 7. Complemento de Outlook (Add-in dTS CRM)
El Complemento de Outlook centraliza la correspondencia comercial vinculando correos directamente en el CRM de dTS Instruments desde la interfaz de Outlook (tanto en versión Web como de Escritorio).
- **Activación en Lectura (Read Mode)**: Al abrir el panel del complemento visualizando un correo recibido, este detecta la dirección de email del remitente y busca coincidencias en la base de datos de clientes y contactos. Si encuentra una coincidencia, muestra la información del cliente, vendedor asignado y ventas totales.
- **Activación en Redacción (Compose Mode)**: Al abrir el panel al redactar un correo nuevo o responder, detecta automáticamente la dirección del primer destinatario (campo *Para*) y busca coincidencias en el CRM.
- **Buscador y Vinculación Manual**: Si un correo no coincide con ningún cliente o contacto registrado en el CRM, se activa la sección "Cuenta no identificada". Esta sección dispone de:
  - **Buscador de Empresas**: Un campo de texto interactivo con búsqueda predictiva (`customerSearchInput`) que consulta la base de datos de empresas del CRM en tiempo real a medida que el usuario escribe.
  - **Menú de Selección**: Un desplegable con las empresas coincidentes. Una vez seleccionada una empresa, el comercial puede pulsar "Vincular a esta empresa" para asociarla al contexto actual de correo.
- **Sincronización Directa y Limpieza**: Al pulsar el botón "Registrar Email en dTS CRM", el complemento extrae el asunto, la dirección de correo y el cuerpo del mensaje. El sistema limpia de forma automática el contenido del mensaje detectando y recortando firmas, bloques de descargo de responsabilidad y el hilo de correos anteriores, y limitando el texto a un máximo de 500 caracteres (con puntos suspensivos si se excede) para guardar una nota de actividad de tipo `EMAIL` limpia, concisa y ligera en la ficha del cliente en el CRM.
- **Seguridad y Control de Sesión**: El complemento detecta la expiración de la sesión (respuestas `401 Unauthorized` de la API). Si el token del usuario ha expirado, cierra la sesión automáticamente en el complemento y redirige al usuario al panel de inicio de sesión de forma segura.

---
*Manual de dTS Instruments v5.2 — Actualizado a 29 de junio 2026.*

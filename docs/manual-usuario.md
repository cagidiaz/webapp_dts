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
- **Vista de Tabla**: Presentación tabular compacta y detallada de todas las ofertas que facilita búsquedas globales, filtros simultáneos por año, comercial asignado o tipo de oferta (Proyecto, Comercial Nuevo, Comercial Existente) y ordenamiento ágil de datos.
- **Panel de KPIs Superiores**: Indicadores clave de rendimiento calculados reactivamente:
  - **Pipeline Activo**: Sumatorio total del importe de ofertas en estados abiertos.
  - **Previsión Ponderada**: Estimación probabilística de facturación calculada como `Sumatorio(Importe * Probabilidad / 100)`.
  - **Tasa de Cierre**: Porcentaje de éxito basado en ofertas Ganadas frente al total de cerradas.
  - **Seguimiento Vencido**: Cantidad de oportunidades activas cuya fecha de próxima acción programada es anterior a la fecha de hoy.
- **Resumen de Pipeline y Acción Crítica Unificada (Pestaña Información)**:
  - Muestra el sumatorio financiero del pipeline abierto y ponderado de la empresa.
  - **Próxima Acción Crítica**: Muestra la acción pendiente más urgente de toda la empresa (unificando tareas generales de cliente, tareas específicas de ofertas y reuniones programadas en el calendario).
- **Drawer de Detalles y Registro de Actividades**: Al hacer clic en cualquier oferta se despliega un panel lateral para:
  - **Parámetros en una Línea**: El Estado de la oferta, la Probabilidad de éxito y el Tipo de oferta se encuentran distribuidos horizontalmente en una misma fila para optimizar el espacio.
  - **Formulario de Planificación Local**: Los campos de "Próxima Acción", "Fecha Límite" y "Observaciones del Comercial" están agrupados en un formulario unificado que maneja estado local de React, evitando peticiones instantáneas en red al escribir, y dispone de un botón explícito de **"Guardar"**.
  - **Sincronización Bidireccional de Tareas**: Guardar una próxima acción crea o actualiza la tarea comercial de la oferta. Completar la tarea comercial desde el Timeline o la pestaña de Tareas limpia la próxima acción de la oferta automáticamente.

## 7. Complemento de Outlook (Add-in dTS CRM)
El Complemento de Outlook centraliza la correspondencia comercial vinculando correos directamente en el CRM de dTS Instruments desde la interfaz de Outlook (tanto en versión Web como de Escritorio).
- **Activación en Lectura (Read Mode)**: Al abrir el panel del complemento visualizando un correo recibido, este detecta la dirección de email del remitente y busca coincidencias en la base de datos de clientes y contactos. Si encuentra una coincidencia, muestra la información del cliente, vendedor asignado y ventas totales.
- **Activación en Redacción (Compose Mode)**: Al abrir el panel al redactar un correo nuevo o responder, detecta automáticamente la dirección del primer destinatario (campo *Para*) y busca coincidencias en el CRM.
- **Buscador y Vinculación Manual**: Si un correo no coincide con ningún cliente o contacto registrado en el CRM, se activa la sección "Cuenta no identificada". Esta sección dispone de un buscador de empresas predictivo y un desplegable para su vinculación manual.
- **Visualización y Conservación de la Fecha de Outlook**:
  - **Ficha Informativa**: El complemento lee de forma nativa la fecha y hora de recepción original del correo en Outlook y la muestra en la cabecera informativa de la tarjeta del correo.
  - **Sincronización Histórica**: Al pulsar "Registrar Email en dTS CRM", la fecha original del correo (`dateTimeCreated`) se envía al backend y se almacena en la columna `created_at` de la actividad del CRM. Esto asegura que el Timeline del cliente mantenga la cronología histórica exacta en que ocurrió el intercambio de correos, en lugar del momento de su registro manual.
- **Sincronización Directa y Limpieza**: Al registrar, el sistema limpia de forma automática firmas, bloques legales de descargo y el hilo de correos anteriores, acotando el cuerpo del mensaje a un máximo de 500 caracteres para guardar notas ligeras.
- **Seguridad y Control de Sesión**: Cierre de sesión automático si la llamada al API devuelve un error `401 Unauthorized`.

## 8. Pestaña de Emails y Redactor Mailto Inteligente
La pestaña **Emails** en la ficha del cliente centraliza el histórico de comunicaciones por correo electrónico y permite redactar nuevos emails de manera ágil:
- **Procedencia Clara (Badges)**: Los correos se catalogan visualmente en el historial:
  - **Outlook**: Correos sincronizados de forma externa usando el Complemento oficial de Outlook.
  - **Enviado desde CRM**: Correos iniciados y registrados directamente desde la WebApp del CRM.
- **Redactor Comercial con Plantillas**: En lugar de registro manual estático, el botón "Redactar Email" abre un asistente de correspondencia interactivo:
  - **Selección de Destinatario**: Menú desplegable para elegir rápidamente entre el correo principal de la empresa o cualquiera de sus personas de contacto.
  - **Plantillas Predefinidas**: Selección de plantillas para *Presentación comercial dTS*, *Seguimiento de oferta* o *Agradecimiento de reunión*.
  - **Tokenización Automática**: El sistema autocompleta los campos de asunto y cuerpo reemplazando dinámicamente variables del cliente (`[Nombre Empresa]`), contacto (`[Contacto]`) y el comercial actual (`[Vendedor]`).
- **Envío vía Outlook**: Al pulsar "Abrir en Outlook y Registrar", el sistema guarda la actividad `EMAIL` en el CRM y ejecuta un enlace `mailto` que abre el cliente de correo local del usuario (como Outlook) con toda la información ya pre-rellenada para proceder a su envío final.

---
*Manual de dTS Instruments v5.4 — Actualizado a 30 de junio 2026.*

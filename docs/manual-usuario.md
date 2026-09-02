# Manual de Usuario — WebApp dTS Instruments

> Guía operativa y técnica del sistema **dTS Instruments WebApp**. Este documento describe el funcionamiento de cada módulo, la interpretación de KPIs, el flujo de datos sincronizado con Microsoft Dynamics 365 Business Central y las herramientas de productividad comercial.

---

## 📑 Índice de Módulos
1. [Panel de Control (Dashboard Principal)](#1-panel-de-control-dashboard-principal)
2. [Módulo de Ventas y Gestión Comercial](#2-módulo-de-ventas-y-gestión-comercial)
   - [2.1 Cartera de Clientes & Inteligencia Geográfica](#21-cartera-de-clientes--inteligencia-geográfica)
   - [2.2 Presupuestos y Seguimiento de Objetivos (Ventas vs Ppto)](#22-presupuestos-y-seguimiento-de-objetivos-ventas-vs-ppto)
   - [2.3 Presupuesto por Product Manager (PM)](#23-presupuesto-por-product-manager-pm)
   - [2.4 Pedidos de Venta (Cartera y Pendientes)](#24-pedidos-de-venta-cartera-y-pendientes)
   - [2.5 Catálogo de Productos y Stock](#25-catálogo-de-productos-y-stock)
   - [2.6 Histórico de Facturación (Documentos y Líneas)](#26-histórico-de-facturación-documentos-y-líneas)
   - [2.7 Movimientos de Valor (Auditoría de value_entries)](#27-movimientos-de-valor-auditoría-de-value_entries)
3. [Módulo de CRM y Productividad Comercial](#3-módulo-de-crm-y-productividad-comercial)
   - [3.1 CRM de Ofertas y Pipeline Comercial](#31-crm-de-ofertas-y-pipeline-comercial)
   - [3.2 Contactos, Cuentas y Timeline de Actividades](#32-contactos-cuentas-y-timeline-de-actividades)
   - [3.3 Pestaña de Emails y Envío Directo por Exchange](#33-pestaña-de-emails-y-envío-directo-por-exchange)
   - [3.4 Complemento de Outlook (Add-in dTS CRM)](#34-complemento-de-outlook-add-in-dts-crm)
4. [Módulo de Compras](#4-módulo-de-compras)
   - [4.1 Directorio de Proveedores](#41-directorio-de-proveedores)
   - [4.2 Pedidos de Compra](#42-pedidos-de-compra)
5. [Módulo de Finanzas y Análisis Económico](#5-módulo-de-finanzas-y-análisis-económico)
   - [5.1 Análisis de Balances y Cuentas de Resultados](#51-análisis-de-balances-y-cuentas-de-resultados)
   - [5.2 4 Puntos Clave y 20 Ratios Financieros](#52-4-puntos-clave-y-20-ratios-financieros)
   - [5.3 Gráficos de Ratios y Simulador Financiero](#53-gráficos-de-ratios-y-simulador-financiero)
6. [Configuración, Seguridad y Control de Acceso (RBAC)](#6-configuración-seguridad-y-control-de-acceso-rbac)

---

## 1. Panel de Control (Dashboard Principal)
El **Panel de Control** (`/dashboard`) es el centro de mando visual para la monitorización ejecutiva y comercial en tiempo real.

* **Tarjetas KPI Superiores**:
  * **Ventas YTD vs Ppto YTD**: Compara la facturación neta real acumulada desde el 1 de enero hasta la fecha actual con el presupuesto acumulado proporcional exacto (*día a día*).
  * **Clientes Nuevos**: Panel de captación con desglose de facturación generada por clientes captados en el año (`FACT`), total de nuevas altas registradas (`TOTAL`) y clientes nuevos sin venta inicial (`S/VTA`).
  * **Cartera de Pedidos y Pendientes**: Muestra el total valorado de pedidos de venta abiertos (`CARTE`) y la mercancía despachada pendiente de emitir factura (`PEND`).
  * **Objetivo Anual (Velocímetro)**: Medidor circular interactivo que refleja el porcentaje de consecución del presupuesto total de facturación anual.
* **Gráficos de Tendencia**:
  * **Evolución Mensual (Real vs Presupuesto vs LY)**: Gráfico de barras combinadas con la facturación real mensual (azul corporativo `#003E51`), el objetivo fijado (cian `#00B0B9`) y una línea punteada de referencia con las ventas del año anterior (*Last Year*), permitiendo analizar estacionalidad y desvíos.
* **Adaptación por Rol**:
  * Los roles `ADMIN` y `DIRECCION` acceden a la visión consolidada corporativa.
  * Los roles `VENTAS` y `OPERACIONES` cargan de forma predeterminada el panel comercial filtrado por su ámbito de asignación.

---

## 2. Módulo de Ventas y Gestión Comercial

### 2.1 Cartera de Clientes & Inteligencia Geográfica
Ubicado en `/sales/customers`, ofrece un directorio analítico de clientes con facturación multianual (2023–2026 YTD), plazos de pago y geolocalización cartográfica.

* **Mapa Interactivo de Inteligencia Geográfica (Península Ibérica, Canarias y Portugal)**:
  * Proyección cartográfica dual D3 con recuadro específico e inset dedicado para Canarias.
  * **Filtrado Geográfico Bidireccional**: Al hacer clic en cualquier provincia o distrito, el territorio se resalta con relleno cian (`#00B0B9`) y contorno blanco de `1.3px`, atenuando las demás zonas y filtrando simultáneamente el ranking lateral y la tabla de clientes.
  * **Conmutación Instantánea (0 ms)**: Permite saltar de una provincia a otra de manera inmediata sin tiempos de espera.
  * **Pin Vectorial 3D Verde Esmeralda**: Al pasar el ratón sobre cualquier cliente del ranking o del mapa, proyecta su posición geográfica exacta con un halo de radar concéntrico.
* **Días Reales de Cobro (Cálculo Híbrido Contractual + Mora)**:
  * Combina los términos contractuales de Business Central (`payment_terms_code`, ej. *Contado*, *30d*, *60d*) con el cálculo proporcional de retraso por saldo vencido impagado (`balance_due_lcy > 0`).
  * Muestra el plazo al corriente (ej. `30d`) o con badge de advertencia si existe demora (ej. `78d (+18d mora)`).
* **Tabla de Alto Rendimiento y Filtros Avanzados**:
  * Scroll continuo y memoización de filas con buffer de 40 clientes.
  * Columnas secundarias (*Territorio*, *Mercado*, *Mod. Negocio*) configurables en el popover selector y optimizadas para evitar scroll horizontal.
  * Filtros por Tipo de Cliente (A–F), Términos de Pago, Vendedor, Portes y Mercado (con desplegable acotado a 5 elementos visibles).
  * Exclusión de clientes comodín de sistema (`9999999`).
  * Exportación completa a Excel (`.xlsx`) con desglose de días pactados, demora y totales.

---

### 2.2 Presupuestos y Seguimiento de Objetivos (Ventas vs Ppto)
Ubicado en `/sales/budgets`, permite el seguimiento del grado de cumplimiento comercial frente al plan anual.

* **Comparativa YTD Día a Día**: Facturación neta del ejercicio acumulada hasta la fecha frente a la cuota presupuestaria equivalente.
* **Desviaciones Financieras y Porcentuales**: Cálculo automático de la brecha en euros y en porcentaje, con alertas por colores (verde si está por encima de meta, ámbar/rojo si está por debajo).
* **Tabla de Detalle por Cliente y Vendedor**: Desglose por cuenta cliente con facturación del año actual, meta presupuestada, desvío y comparativa con el año precedente (*Fact. LY*).

---

### 2.3 Presupuesto por Product Manager (PM)
Ubicado en `/sales/product-budgets`, enfocado al análisis presupuestario por línea de producto y responsable técnico.

* **Desglose Jerárquico por SKU / Referencia**: Permite desplegar cada cliente para examinar las ventas y metas presupuestadas a nivel de artículo individual.
* **Análisis de Cartera por Fabricante / Marca**: Evaluación de líneas de producto para Product Managers y responsables de marca.

---

### 2.4 Pedidos de Venta (Cartera y Pendientes)
Ubicado en `/sales/orders`, centraliza los pedidos abiertos sincronizados desde Dynamics 365 Business Central.

* **Cartera Abierta**: Pedidos confirmados en fase de preparación o suministro.
* **Valoración Neta Real**: Cálculo del importe efectivo mediante `(line_amount / quantity)` excluyendo líneas a coste cero.
* **Desglose de Cuentas G/L**: Separación transparente entre artículos físicos y líneas de servicios o cuentas contables.

---

### 2.5 Catálogo de Productos y Stock
Ubicado en `/sales/products`, proporciona la consulta técnica y disponibilidad de inventario de dTS Instruments.

* **Disponibilidad en Almacén**: Stock físico actual, cantidades reservadas en pedidos abiertos y stock disponible neto.
* **Precios y Tarifas**: Precios base unitarios, costes estándar y familias de producto.

---

### 2.6 Histórico de Facturación (Documentos y Líneas)
Ubicado en `/sales/invoices`, consolida todas las facturas y abonos emitidos por la empresa.

* **Desglose Expandible de Líneas**: Consulta detallada de artículos, servicios, precios netos, descuentos y margen por línea (`line_no`).
* **KPIs Superiores de Facturación**: Facturación neta total, margen real medio ponderado (%), número de documentos emitidos y volumen total de descuentos concedidos.
* **Exportación Avanzada**: Descarga en Excel incluyendo la cabecera del documento y todas sus líneas desglosadas.

---

### 2.7 Movimientos de Valor (Auditoría de value_entries)
Ubicado en `/sales/value-entries`, vista de auditoría transaccional directa restringida a los roles `ADMIN` y `DIRECCION`.

* **Trazabilidad Completa**: Número de movimiento, fecha contable, tipo de documento (Factura o Abono), código de producto, cliente, cantidad, importes de venta y costes reales asociados.
* **Búsqueda Reactiva y Ordenación**: Filtros dinámicos en todas las columnas y exportación a Excel.

---

## 3. Módulo de CRM y Productividad Comercial

### 3.1 CRM de Ofertas y Pipeline Comercial
Ubicado en `/sales/quotes` (y `/crm/pipeline`), gestiona el ciclo de vida de las cotizaciones y oportunidades de venta.

* **Vista Tablero Kanban Interactivo**:
  * Columnas por estado: *Borrador*, *Enviada*, *En Negociación*, *Ganada* o *Perdida*.
  * Arrastrar y soltar (Drag & Drop) para avanzar el estado comercial de las ofertas.
* **Vista Tabla Compacta**: Listado tabular con filtros por ejercicio, comercial, tipo de oferta (*Proyecto*, *Comercial Nuevo*, *Comercial Existente*) y probabilidad de éxito.
* **Indicadores Clave del Pipeline**:
  * **Pipeline Activo**: Sumatorio nominal de cotizaciones abiertas.
  * **Previsión Ponderada**: Estimación probabilística calculada como `∑(Importe × Probabilidad / 100)`.
  * **Tasa de Cierre**: Porcentaje de éxito de ofertas ganadas sobre el total de resueltas.
  * **Seguimiento Vencido**: Oportunidades cuya fecha de próxima acción está vencida.
* **Drawer Lateral de Oferta**: Edición rápida de próxima acción, fecha límite, notas del comercial y sincronización bidireccional automática con la agenda de tareas.

---

### 3.2 Contactos, Cuentas y Timeline de Actividades
Ubicado en `/crm/contacts` y `/crm/customers`.

* **Directorio de Interlocutores**: Registro de personas de contacto por empresa (nombre, cargo, teléfono, email y notas).
* **Timeline Histórico de Actividades**: Registro cronológico de reuniones, llamadas, notas comerciales y correos electrónicos vinculados al cliente.

---

### 3.3 Pestaña de Emails, Preparación de Correos y Apertura en Outlook
Integrada en la ficha del contacto/cliente en el CRM.

* **Preparación Directa en Outlook (Sin Envío Automático)**:
  * El comercial redacta el correo o carga una plantilla corporativa en la WebApp y, al pulsar **"Abrir y Preparar en Outlook"**, el sistema genera el nuevo correo en Outlook con todos los datos precargados (destinatario, asunto y cuerpo).
  * Permite al comercial revisar el texto, adjuntar archivos o catálogos PDF y pulsar **"Enviar"** directamente desde Outlook.
* **Memorización de Preferencia (Escritorio vs Web)**:
  * El usuario selecciona su cliente preferido (**Outlook de Escritorio** o **Outlook Web Microsoft 365**) y la WebApp **recuerda su elección de forma permanente en el navegador (`localStorage`)**, no teniendo que volver a seleccionarlo en usos posteriores.
* **Botón Directo "Abrir en Outlook"**:
  * En cada tarjeta de email de la pestaña *Emails*, en los eventos de correo del *Timeline* y en el botón de email de la cabecera del contacto, se incluye la acción **"Abrir en Outlook"** para acceder inmediatamente al mensaje o hilo en Outlook con un clic.
* **Utilidad "Copiar Texto"**: Botón rápido para copiar el asunto y cuerpo al portapapeles con un clic para pegarlo en hilos existentes.
* **Trazabilidad Automática en el CRM**: Registra la actividad en el Timeline del contacto como interacción de correo electrónico.
* **Plantillas Comerciales**: Modelos precargados (*Presentación dTS*, *Seguimiento de Oferta*, *Reunión técnica*) con tokenización dinámica del cliente y comercial.

---

### 3.4 Complemento de Outlook (Add-in dTS CRM)
Extensión integrada para Microsoft Outlook (Web y Escritorio).

* **Detección Automática**: Reconocimiento del remitente o destinatarios buscando coincidencias en la base de datos de clientes y contactos de dTS Instruments.
* **Registro de Correos con Fecha Histórica**: Al pulsar *Registrar Email en dTS CRM*, conserva la fecha y hora de emisión original del mensaje (`created_at`) en el Timeline.
* **Limpieza Inteligente**: Depuración automática de firmas, cadenas de respuesta y cláusulas legales (limitando a 500 caracteres clave).
* **Vinculación Manual**: Buscador predictivo para asociar correos a empresas cuando el remitente no esté registrado previamente.

---

## 4. Módulo de Compras

### 4.1 Directorio de Proveedores
Ubicado en `/purchases/vendors`.

* Ficha de proveedores sincronizada con Business Central con condiciones de pago, contacto, moneda y volumen acumulado de compras.

### 4.2 Pedidos de Compra
Ubicado en `/purchases/orders`.

* Consulta de pedidos de aprovisionamiento emitidos, estado de recepción de mercancía y control de entregas pendientes de proveedores.

---

## 5. Módulo de Finanzas y Análisis Económico

*(Acceso exclusivo para roles de Dirección y Administración).*

### 5.1 Análisis de Balances y Cuentas de Resultados
Ubicado en `/finance/balances`.

* Estructura financiera patrimonial (Activo Corriente, No Corriente, Pasivo y Patrimonio Neto) y Cuenta de Pérdidas y Ganancias multianual.

### 5.2 4 Puntos Clave y 20 Ratios Financieros
Ubicado en `/finance/key-points` y `/finance/ratios-table`.

* **4 Puntos Clave**: Liquidez, Solvencia, Rentabilidad y Endeudamiento.
* **20 Ratios Financieros**: Cuadro de mando económico con ratios de liquidez inmediata, rotación de activos, período medio de cobro/pago, margen EBITDA y ROE/ROA.

### 5.3 Gráficos de Ratios y Simulador Financiero
Ubicado en `/finance/ratios-charts` y `/finance/simulations`.

* Proyecciones dinámicas y simulaciones de escenarios económicos para la toma de decisiones estratégicas.

---

## 6. Configuración, Ajustes y Control de Acceso (RBAC)

### 6.1 Ajustes Generales y Preferencias de Outlook (`/settings`)
*(Disponible para todos los roles: `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`)*

* **Integración con Microsoft 365 (Microsoft Graph)**:
  * Vinculación segura OAuth 2.0 con el buzón corporativo de dTS Instruments.
  * Diagnóstico del estado de la conexión, visualización del correo vinculado y estado de sincronización.
  * Botones para forzar sincronización manual de borradores y eventos o desconectar la cuenta.
* **Cliente de Outlook Predeterminado**:
  * Selector dual entre **Outlook de Escritorio (App Windows/Mac)** y **Outlook Web (Microsoft 365)**.
  * Memorización persistente en el navegador local (`localStorage`).
  * Botón de prueba inmediata para validar la apertura de Outlook.

### 6.2 Gestión de Usuarios y Roles (`/users`)
*(Acceso exclusivo para rol `ADMIN`)*

* Control de acceso basado en roles: `ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`.
* Matriz de permisos modulares dinámicos (`role_modules`) gestionada mediante Supabase Auth.

### 6.3 Inmutabilidad y Seguridad de Datos
* Los datos de negocio procedentes de Dynamics 365 Business Central son de **estricta solo lectura**.
* Únicamente se permite la persistencia de datos en metadatos propios del CRM (ofertas locales, actividades, tareas y configuraciones de usuario).

---

*Manual de dTS Instruments v5.8 — Actualizado a 2 de septiembre de 2026.*


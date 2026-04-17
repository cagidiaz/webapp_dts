# ESPECIFICACIÓN DE REQUERIMIENTOS DE SOFTWARE (ERS)

## Proyecto: WebApp dTS (Dashboard de KPIs y Gestión Empresarial)  
**Versión:** 1.0  
**Empresa:** dTS Instruments

---

## 1. INTRODUCCIÓN

### 1.1 Propósito  
Este documento define los requisitos funcionales y no funcionales para la creación de la "WebApp dTS Instruments", una plataforma Fullstack modular diseñada para la visualización interactiva de KPIs contables, financieros y de negocio.

### 1.2 Alcance del Sistema  
La WebApp dTS consumirá datos provenientes de Microsoft Dynamics 365 Business Central (sincronizados vía n8n) y archivos Excel/CSV, almacenados en una base de datos Supabase. El sistema permitirá a usuarios autenticados visualizar dashboards interactivos según su rol.   
**Nota crítica:** La aplicación tiene permisos estrictos de **SOLO LECTURA** sobre los datos de negocio; no se permite la creación, modificación o eliminación de registros empresariales desde la interfaz.

### 1.3 Glosario  
* **KPI:** Key Performance Indicator (Indicador Clave de Rendimiento).  
* **OData v4:** Protocolo utilizado para extraer datos de Dynamics 365 Business Central.  
* **n8n:** Herramienta de automatización que actuará como ETL (Extraer, Transformar, Cargar) hacia Supabase.  
* **RBAC:** Role-Based Access Control (Control de Acceso Basado en Roles).  
* **Dokploy:** Plataforma PaaS auto-alojada en VPS para el despliegue de la aplicación.

---

## 2. DESCRIPCIÓN GENERAL

### 2.1 Perspectiva del Producto  
El sistema consta de tres capas principales:  
1.  **Capa de Datos (Externa):** n8n procesa datos de ERP y Excel hacia Supabase (PostgreSQL).  
2.  **Capa Lógica (Backend):** API RESTful en NestJS que sirve los datos a la vista y gestiona la autenticación.  
3.  **Capa de Presentación (Frontend):** SPA (Single Page Application) en React.js que renderiza los dashboards usando Tremor y Tailwind CSS.

### 2.2 Perfiles de Usuario  
* **Administrador:** Acceso total a todos los módulos y gestión de usuarios/roles.  
* **Dirección / C-Level:** Acceso a vistas consolidadas, contabilidad y presupuestos.  
* **Ventas:** Acceso exclusivo a módulos comerciales y facturación.  
* **Operaciones:** Acceso a fabricación, stock y maestros.

---

## 3. REQUISITOS FUNCIONALES (RF)

### RF-01: Gestión de Autenticación y Autorización  
* **RF-01.1:** El sistema debe permitir el inicio de sesión mediante correo y contraseña utilizando Supabase Auth.  
* **RF-01.2:** El sistema debe soportar la recuperación de contraseña.  
* **RF-01.3:** El sistema debe asignar un rol a cada usuario.  
* **RF-01.4:** El menú de navegación (Sidebar) debe ocultar los módulos a los que el usuario no tenga permiso de acceso.

### RF-02: Visualización y Filtrado Global  
* **RF-02.1:** El sistema debe incluir un panel global de filtros (rango de fechas, etc.) que actualice todos los gráficos en pantalla.  
* **RF-02.2:** Las tablas de datos deben soportar paginación (infinite scroll), ordenamiento dinámico por todas las columnas y búsqueda de texto libre persistente.
* **RF-02.3:** Los pies de totales en las tablas de rendimiento deben permanecer fijos (sticky) en la base de la vista para facilitar la lectura de sumatorios.

### RF-03: Módulo Dashboard Contable  
* **RF-03.1:** Mostrar tarjetas de KPI en tiempo real para: EBITDA, Liquidez y Margen Bruto.  
* **RF-03.2:** Mostrar gráficos de tendencia (líneas/barras) comparando el rendimiento del mes actual vs. mes anterior y año actual vs. año anterior.

### RF-04: Módulo Ventas y Compras  
* **RF-04.1:** Visualizar análisis detallado de facturación (Total facturado, tickets promedio).  
* **RF-04.2:** Mostrar ranking de "Top 10 Clientes" y "Top 10 Proveedores".  
* **RF-04.3:** Visualizar desglose de gastos operativos mediante gráficos de "Donut" (torta).
* **RF-04.4:** Módulo de Pedidos de Venta: Seguimiento de cartera de pedidos abiertos, distinguiendo entre unidades pendientes de envío y pendientes de facturar.

### RF-05: Módulo Presupuestos Anuales  
* **RF-05.1:** Visualizar comparativa "Presupuesto vs. Real" calculada a partir de los datos de Excel (Presupuesto) y Business Central (Real).  
* **RF-05.2:** Resaltar en verde/rojo las desviaciones positivas o negativas respecto al presupuesto.

### RF-06: Módulo Gestión de Maestros  
* **RF-06.1:** Proveer un listado interactivo (DataGrid) de Clientes y Proveedores.  
* **RF-06.2:** Al hacer clic en un maestro, mostrar una "Ficha Detalle" con su información de contacto y el histórico de sus transacciones (facturas, pagos).

### RF-07: Módulo Fabricación y Stock  
* **RF-07.1:** Mostrar el inventario actual valorado.  
* **RF-07.2:** Listar el estado de las órdenes de producción sincronizadas con Business Central (Pendientes, En Curso, Finalizadas).

### RF-08: Documentación Integrada  
* **RF-08.1:** El frontend debe incluir un visor de archivos `.md` para leer el Manual de Usuario directamente desde la interfaz.

### RF-09: Simulador de Escenarios y Presupuestos Variantes (Manual)  
* **RF-09.1:** El sistema debe permitir la creación de múltiples "Escenarios de Previsión" (ej: Optimista, Conservador, Recesión) vinculados a un ejercicio fiscal.  
* **RF-09.2:** El usuario podrá cargar datos de presupuestos masivamente mediante plantillas Excel/CSV o duplicar datos de un escenario anterior para modificarlos.  
* **RF-09.3:** La interfaz de edición debe permitir modificar valores por cuenta contable y mes, recalculando automáticamente totales y márgenes en pantalla.  
* **RF-09.4:** Visualización de "Gap Analysis": Comparativa gráfica entre el Dato Real (Business Central) vs. Escenario de Previsión seleccionado, resaltando desviaciones en valor absoluto y porcentaje.

### RF-10: Inteligencia de Negocio y Forecasting Predictivo (IA)  
* **RF-10.1:** El sistema debe incluir un motor de Forecasting basado en series temporales que analice el histórico de Business Central (mínimo 24 meses) para proyectar los 6 meses siguientes.  
* **RF-10.2:** Generación de "Escenario Sugerido por IA": Un escenario automático basado en tendencias estacionales y crecimiento histórico que el usuario puede guardar como base para su presupuesto.  
* **RF-10.3:** Análisis de Tendencias: Detección automática de anomalías en ingresos o gastos comparando el mes actual con la predicción estadística.  
* **RF-10.4:** El usuario podrá ajustar el "Nivel de Confianza" de la predicción (ej. 80%, 95%) para visualizar rangos de probabilidad en los gráficos de líneas.

### RF-11: Exportación y Portabilidad de Datos
* **RF-11.1:** El sistema debe permitir la exportación de cualquier listado de datos (Ventas, Clientes, Productos, Pedidos) a formato XLSX.
* **RF-11.2:** La exportación debe ser representativa del estado actual de los filtros aplicados en la interfaz de usuario.
* **RF-11.3:** El proceso de exportación debe recuperar el conjunto completo de datos del servidor, superando las limitaciones del scroll infinito de la vista.

---

## 4. REQUISITOS NO FUNCIONALES (RNF)

### RNF-01: Interfaz y Experiencia de Usuario (UI/UX)  
* **RNF-01.1:** La interfaz debe ser completamente responsiva (Mobile, Tablet, Desktop).  
* **RNF-01.2:** Se deben aplicar estrictamente los colores corporativos: Principal `#003E51` y Secundario `#00B0B9`.  
* **RNF-01.3:** El tiempo de carga de un dashboard no debe superar los 3 segundos en condiciones normales de red.

### RNF-02: Seguridad e Integridad  
* **RNF-02.1:** Las consultas a las tablas de negocio en la base de datos deben ser estrictamente de `SELECT`. El backend bloqueará cualquier intento de `INSERT`, `UPDATE` o `DELETE` sobre estos datos.  
* **RNF-02.2:** La API debe estar protegida mediante tokens JWT.  
* **RNF-02.3:** Todas las comunicaciones deben estar cifradas mediante HTTPS/TLS.

### RNF-03: Arquitectura y Mantenibilidad  
* **RNF-03.1:** El backend (NestJS) debe implementar Swagger (OpenAPI) expuesto en la ruta `/api-docs`.  
* **RNF-03.2:** El código fuente, especialmente los servicios de cálculo de KPIs, debe incluir comentarios JSDoc obligatorios.  
* **RNF-03.3:** El frontend debe desarrollarse utilizando componentes funcionales de React y hooks.

### RNF-04: Infraestructura y Despliegue  
* **RNF-04.1:** El sistema debe estar contenerizado usando Docker (frontend y backend).  
* **RNF-04.2:** Debe existir un archivo `docker-compose.yml` listo para despliegue en un VPS Linux gestionado con Dokploy.  
* **RNF-04.3:** El control de versiones se gestionará a través de Git y GitHub, usando el modelo Git Flow.

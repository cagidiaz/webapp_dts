# 📚 Catálogo Central de Vistas de la WebApp (dTS Instruments)

Bienvenido al índice central de documentación técnica y funcional de todas las vistas de la aplicación **dTS Instruments WebApp**. 

Este compendio ha sido diseñado para que cualquier miembro del equipo o desarrollador pueda comprender la arquitectura, origen de datos (Business Central / Supabase / Microsoft Graph), reglas matemáticas de KPIs, componentes y particularidades de cada pantalla sin necesidad de inspeccionar el código fuente.

Los documentos están organizados físicamente en **carpetas temáticas estructuradas** siguiendo el orden funcional oficial de la aplicación:

---

## 🗂️ Índice por Módulos y Carpetas

### 1. 📊 Paneles de Control (`01_dashboards/`)
| Vista / Documento | Ruta WebApp | Componentes Clave | Propósito Principal |
| :--- | :--- | :--- | :--- |
| [**Dashboard General y Comercial**](file:///c:/proyectos/webapp_dts/docs/vistas/01_dashboards/dashboard.md) | `/dashboard` | `SalesDashboard.tsx`<br>`FinancialDashboard.tsx` | Doble cuadro de mando (Comercial vs Financiero). Comparativas YTD día a día, agenda ejecutiva y seguimiento de objetivos de ventas. |

---

### 2. 💼 Área Comercial y Ventas (`02_ventas/`)
| Vista / Documento | Ruta WebApp | Componentes Clave | Propósito Principal |
| :--- | :--- | :--- | :--- |
| [**Ventas: Clientes y Mapa Peninsular**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ventas_clientes.md) | `/sales/customers` | `CustomersPage.tsx`<br>`IberianGeoSalesMap.tsx`<br>`CustomerDetailDrawer.tsx` | Cartera comercial con mapa D3 provincial (España y Portugal), ventas históricas 3 años, cálculo de DSO y drawer 360°. |
| [**Ventas: Pedidos y Cartera Viva**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ventas_pedidos.md) | `/sales/orders` | `SalesOrdersPage.tsx`<br>`OrderDetailModal.tsx` | Cartera de pedidos abiertos, deducción de prepagos vivos (PFV/FV cliente a cliente) y precios netos efectivos. |
| [**Ventas: Catálogo y Stock de Productos**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ventas_productos.md) | `/sales/products` | `ProductsPage.tsx`<br>`ProductDetailDrawer.tsx` | Catálogo de referencias (Items), valoración de existencias, cálculo de PVP y márgenes teóricos/reales con historial de compras. |
| [**Ventas: Histórico de Facturación**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ventas_historico_facturacion.md) | `/sales/invoices` | `SalesInvoicesPage.tsx`<br>`InvoiceLinesDrawer.tsx` | Auditoría de facturas y abonos, comparativa mensual interanual, desglose de líneas y trazabilidad contable. |
| [**Ventas: Movimientos de Valor (Costes)**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ventas_movimientos_valor.md) | `/sales/value-entries` | `ValueEntriesPage.tsx` | Auditoría de transacciones contables del inventario, ventas reales vs coste de ventas real por referencia. |
| [**Ventas vs Presupuestos**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ventas_vs_presupuestos.md) | `/sales/budgets` | `SalesBudgetPage.tsx`<br>`BudgetFiltersSidebar.tsx` | Control presupuestario comercial con homogeneidad de producto (Items), desglose de portes/cuentas contables y prepagos. |
| [**Presupuesto x Product Manager**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/presupuestos_x_product_manager.md) | `/sales/product-budgets` | `ProductBudgetPage.tsx`<br>`BudgetEvolutionChart.tsx` | Rendimiento de líneas de producto a doble nivel jerárquico (Cliente ➔ Productos) con total coincidencia contable. |
| [**Ofertas Comerciales (Quotes)**](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/ofertas_comerciales.md) | `/sales/quotes` | `QuotesPage.tsx`<br>`QuoteDetailDrawer.tsx` | Pipeline de propuestas técnicas, semáforo de cierre previsto, ponderación por probabilidad y comparativa ganadas vs perdidas. |

---

### 3. 🤝 CRM: Gestión de Clientes (`03_crm/`)
| Vista / Documento | Ruta WebApp | Componentes Clave | Propósito Principal |
| :--- | :--- | :--- | :--- |
| [**CRM: Pipeline y Oportunidades**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_pipeline.md) | `/crm/pipeline` | `CrmPipeline.tsx`<br>`CrmDealModal.tsx` | Tablero Kanban con 5 etapas comerciales, valor ponderado, cálculo de días en etapa y registro de actividades. |
| [**CRM: Clientes y Matriz de Relación**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_clientes.md) | `/crm/customers` | `CrmCustomers.tsx`<br>`CustomerRelationshipMatrix.tsx` | Segmentación de clientes en categorías de fidelidad (A–F), matriz YTD interanual y seguimiento de cuentas activas. |
| [**CRM: Contactos y Sincronización de Correo**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md) | `/crm/contacts` | `CrmContacts.tsx`<br>`CrmContactDetail.tsx`<br>`CrmEmails.tsx` | Directorio de personas de contacto, timeline de actividades, apertura nativa en Outlook Classic (`dts-mail://`), menú secundario de acciones y fallback inteligente. |
| [**Complemento de Outlook para CRM**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/complemento_outlook_crm.md) | `/outlook-addin` | `OutlookAddinPage.tsx`<br>`outlook-addin.service.ts` | Add-in Office.js para registrar correos en el CRM desde Outlook, detección automática de cliente, limpieza de firmas y tipificación comercial. |

---

### 4. 🛍️ Compras y Aprovisionamiento (`04_compras/`)
| Vista / Documento | Ruta WebApp | Componentes Clave | Propósito Principal |
| :--- | :--- | :--- | :--- |
| [**Compras: Cartera de Proveedores**](file:///c:/proyectos/webapp_dts/docs/vistas/04_compras/compras_proveedores.md) | `/purchases/vendors` | `VendorsPage.tsx`<br>`WorldGeoVendorsMap.tsx`<br>`VendorDetailDrawer.tsx` | Mapa mundial interactivo D3 de fabricantes y distribuidores, análisis de deuda comercial, saldo vencido y volumen de compras. |
| [**Compras: Pedidos de Compra Abiertos**](file:///c:/proyectos/webapp_dts/docs/vistas/04_compras/compras_pedidos.md) | `/purchases/orders` | `PurchaseOrdersPage.tsx` | Cartera de pedidos de aprovisionamiento pendientes de recepción, control de fechas prometidas y coste comprometido. |

---

### 5. 💰 Dirección Financiera (`05_finanzas/`)
| Vista / Documento | Ruta WebApp | Componentes Clave | Propósito Principal |
| :--- | :--- | :--- | :--- |
| [**Finanzas: Balances y Cuenta de Resultados**](file:///c:/proyectos/webapp_dts/docs/vistas/05_finanzas/finanzas_balances.md) | `/finance/balances` | `BalancesPage.tsx`<br>`BalanceTable.tsx` | Balance de Situación y PyG estructurales con análisis vertical (% s/Activo y % s/Ventas) y evolución multianual. |
| [**Finanzas: 4 Puntos Clave**](file:///c:/proyectos/webapp_dts/docs/vistas/05_finanzas/finanzas_4_puntos_clave.md) | `/finance/key-points` | `KeyPointsPage.tsx` | Evaluación ejecutiva de los 4 pilares: Liquidez, Capitalización, Endeudamiento y Garantía con semáforos de diagnóstico. |
| [**Finanzas: 20 Ratios Financieros (Tabla)**](file:///c:/proyectos/webapp_dts/docs/vistas/05_finanzas/finanzas_20_ratios_tabla.md) | `/finance/ratios` | `RatiosTablePage.tsx` | Matriz detallada de los 20 ratios oficiales organizados en 4 áreas analíticas con soporte de anualización. |
| [**Finanzas: Gráficos de Tendencia de Ratios**](file:///c:/proyectos/webapp_dts/docs/vistas/05_finanzas/finanzas_graficos_ratios.md) | `/finance/ratios-charts` | `RatiosChartsPage.tsx` | 4 gráficos interactivos de evolución multianual (Equilibrio de Fondos, ROE/ROA, Solvencia y Días de Ciclo Operativo). |
| [**Finanzas: Motor de Simulación**](file:///c:/proyectos/webapp_dts/docs/vistas/05_finanzas/finanzas_simulaciones.md) | `/finance/simulations` | `SimulationsPage.tsx` | Modelado de escenarios de crecimiento de ventas y variación de compras variables, proyección de EBITDA y tesorería estimada (85%). |

---

### 6. ⚙️ Administración y Configuración (`06_administracion_configuracion/`)
| Vista / Documento | Ruta WebApp | Componentes Clave | Propósito Principal |
| :--- | :--- | :--- | :--- |
| [**Administración: Usuarios y Permisos RBAC**](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/administracion_usuarios_rbac.md) | `/users` | `pages/users/index.tsx`<br>`RoleGuard.tsx` | CRUD de usuarios, gestión de 6 roles del sistema y matriz granular dinámica de permisos por módulo (`role_modules`). |
| [**Ajustes Generales y Conexión Outlook**](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/ajustes_generales.md) | `/settings` | `SettingsPage.tsx`<br>`exchangeSync.ts` | Selección de cliente Outlook (Classic vs Web), asistente de instalación en 1 clic de protocolo Windows, conexión OAuth M365 y pruebas interactivas. |
| [**Generador de Presupuestos de Ventas**](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/generador_presupuestos.md) | `/settings/budget-generator` | `BudgetGeneratorPage.tsx`<br>`budget-generator.service.ts` | Generación del libro Excel de 23 columnas para el proceso presupuestario anual con fórmulas protegidas y excepción Seiko Flowcontrol. |

---

## 🎨 Principios de Diseño y Buenas Prácticas Compartidas
1. **Paleta de Colores Corporativa:**
   * **Azul Corporativo dTS (`#003E51`):** Menús, cabeceras, datos reales consolidados y botones primarios.
   * **Turquesa / Cian Corporativo dTS (`#00B0B9`):** Previsiones, objetivos presupuestarios, acentos y tendencias.
2. **Persistencia de Foco en Búsquedas (`keepPreviousData`):**
   * Todas las tablas con búsqueda implementan `placeholderData: keepPreviousData` en React Query para evitar que el input pierda el foco o cursor mientras el usuario escribe.
3. **Inmutabilidad de Datos de Negocio:**
   * Los datos procedentes de Business Central son de **SOLO LECTURA**. Las modificaciones de usuario se circunscriben a tablas gestionadas en Supabase (`crm_*`, `profiles`, `role_modules`).
4. **Control de Acceso Granular (RBAC):**
   * Toda nueva vista debe registrarse en `public.modules` y contar con permisos iniciales en `public.role_modules` para todos los roles.

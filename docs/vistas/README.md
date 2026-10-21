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
| [**CRM: Pipeline y Oportunidades**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_pipeline.md) | `/crm/pipeline` | `CrmOpportunities.tsx`<br>`CrmProspects.tsx`<br>`CrmPipeline.tsx`<br>`PipelineCuts.tsx`<br>`CutAnalytics.tsx` | Orquestador tripartito: 1) Prospección local (Fases 0/1, seguimiento y vinculación reversible a BC), 2) Ofertas (6 fases abiertas en fila única, probabilidad en servidor, notas obligatorias y catálogo de cierre) y 3) Cortes históricos semanales con 8 informes analíticos congelados. |
| [**CRM: Clientes y Matriz de Relación**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_clientes.md) | `/crm/customers` | `CrmCustomers.tsx`<br>`CustomerRelationshipMatrix.tsx`<br>`CustomerDetailDrawer.tsx` | Segmentación A–F y matriz YTD. Ficha compartida con seguimiento local de prospectos actualmente vinculados para el piloto, todavía desactivado. |
| [**CRM: Contactos y Sincronización de Correo**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/crm_contactos_mails.md) | `/crm/contacts` | `CrmContactsView.tsx`<br>`CrmContacts.tsx`<br>`CrmContactDetail.tsx`<br>`CrmEmails.tsx`<br>`ProspectActivities.tsx` | Directorio, timeline cronológico por horas y sincronización de correo con Microsoft Graph. Ciclo de borradores y envíos con estados transitorios (`sent_pending`, `send_unconfirmed`), badges preventivos y conciliación determinista por `ImmutableId`. |
| [**Complemento de Outlook para CRM**](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/complemento_outlook_crm.md) | `/outlook-addin` | `OutlookAddinSession.tsx`<br>`OutlookAddinPage.tsx`<br>`outlook-addin.service.ts`<br>`email-identity.service.ts` | Add-in Office.js para registrar correos en el CRM desde Outlook. Autenticación JWT integrada sin expulsión del iframe, control estricto de cartera comercial (`customerScope`), tipificación en 5 categorías y conversión de `ewsId` a `ImmutableId` inmutable. |

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

- Pipeline: catálogo fijo aprobado de 5 motivos de Ganada y 9 de Perdida, sin Otros; validación en servidor y selectores en la ficha y diálogo de cierre. Se conserva el histórico.

- Oportunidades del piloto: seis fases abiertas en una fila, porcentajes automáticos, nota y cierre atómicos, listas de ganadas/perdidas y reutilización en Contactos.

- Cortes de Oportunidades: pestaña de consulta/exportación por cartera, captura manual Admin/Dirección y programación semanal preparada. Tres tablas locales propuestas, sin aplicar SQL ni activar automatización.

- Cortes: ocho informes sobre la fotografía autorizada y comparación por identidad estable, con CSV por informe y tratamiento explícito de importes desconocidos.

- Revisión integral del piloto y preparación PostgreSQL aislado: docs/propuestas/2026-10-14-revision-integral-y-pruebas-piloto.md. Conexión compartida y producción sin cambios.

- Validación SQL de cortes: superada en PostgreSQL real aislado el 14/10/2026; servidor detenido. Integración completa con CRM/BC pendiente.

### Actualización 15/10/2026: apertura exacta en Outlook Classic

Guías de [Contactos y Emails](03_crm/crm_contactos_mails.md), [Ajustes](06_administracion_configuracion/ajustes_generales.md) y [Complemento Outlook](03_crm/complemento_outlook_crm.md) actualizadas con apertura exacta, equipos vinculados y distribución interna sin certificado. Las dos tablas de Classic ya están creadas y comprobadas; la activación y la prueba completa instalada siguen pendientes de confirmación.

- [Manual de usuario: apertura y seguimiento](../manual-usuario.md#35-abrir-correos-con-el-nuevo-componente-de-outlook-classic).
- [Manual de instalación, vinculación, retirada e incidencias](../manual-instalacion-addin-outlook.md#7-instalador-interno-para-abrir-correos-en-outlook-classic).
- [Guía de integración con Microsoft 365](../guia-integracion-outlook-exchange.md).
- [Documentación técnica: tablas, endpoints, activación y vuelta atrás](../propuestas/2026-10-15-fase-4-apertura-exacta-classic.md).

### Corrección de arranque del complemento en Outlook Web (16/10/2026)

La [guía del complemento](03_crm/complemento_outlook_crm.md#8-arranque-de-outlook-web-independiente-de-la-sesión-crm-16102026) documenta la inicialización de Office antes de la sesión CRM, la protección de la navegación y las pruebas de descarga bloqueada o espera agotada. El usuario confirmó en producción que el complemento Web vuelve a iniciar correctamente.

### Respuestas verificadas y menú compartido (16/10/2026)

La [vista de correos](03_crm/crm_contactos_mails.md) incorpora un menú común para Emails y Timeline, con Responder y Responder a todos separados. [Entrega técnica y activación](../propuestas/2026-10-16-respuestas-verificadas-outlook.md): borradores Web, Classic 1.1.0 y columna de acción en solicitudes. El usuario confirmó Responder y Responder a todos en Classic y Web desde producción. Sin recuperación automática del histórico.

### Nombres de adjuntos en tarjetas de correo (16/10/2026)

[Plan de implementación](../propuestas/2026-10-16-plan-nombres-adjuntos-correos-crm.md), 16/10/2026. Implementado: captura de metadatos en ambos complementos, componente compartido en Emails/Timeline y conciliación de borradores nuevos. Sin SQL, descargas ni recuperación del histórico. Pruebas automáticas y PostgreSQL aislado superadas; el usuario confirmó la captura y visualización de nombres con un correo real el 16/10/2026. Guías y manuales actualizados.

### Documentación de adjuntos consolidada (16/10/2026)

- [Manual de uso: nombres y estados](../manual-usuario.md#nombres-de-adjuntos-en-las-tarjetas-de-correo).
- [Instalación y comprobaciones de aceptación](../manual-instalacion-addin-outlook.md#10-nombres-de-adjuntos-actualización-del-registro).
- [Arquitectura, datos y soporte](../guia-integracion-outlook-exchange.md#7-nombres-de-adjuntos-en-el-crm).

La apertura y las respuestas ya están confirmadas por el usuario en producción. La captura de nombres es una entrega posterior: implementada, comprobada automáticamente y verificada por el usuario al sincronizar un correo real con adjuntos.

### Correos: borrado y contadores de filtros (16/10/2026)

La [vista de Contactos y Emails](03_crm/crm_contactos_mails.md) documenta el borrado exclusivo del registro CRM para correos, el texto explícito de confirmación y los contadores de tipología calculados dentro de la oferta seleccionada. [Uso](../manual-usuario.md#correos-eliminar-del-crm-y-contadores-por-oferta-16102026). Correcciones comprobadas automáticamente, pendientes de aceptación real tras desplegar.

### Verificación real comunicada el 16/10/2026

El usuario indicó: «he probado sincronizar un correo con adjuntos y los muestra perfectamente, esa funcionalidad ya esta verificada». Queda registrada la captura y visualización correcta de los nombres para el correo probado. No se especificó si se utilizó Classic o Web, si era enviado o recibido, ni se confirmó individualmente la matriz completa (ambas pestañas, expansión, modos claro/oscuro, incrustados o conciliación de borradores).

La corrección del borrado exclusivo del CRM y los contadores de tipología por oferta son cambios posteriores independientes: su verificación real sigue pendiente de confirmación. No se inicia ninguna recuperación histórica ni se modifica ningún registro por esta actualización documental.

### Outlook verificado para todos los usuarios autorizados (19/10/2026)

Se retira la apertura heredada y su configurador; Ajustes descarga Classic 1.1.0 y enlaza a la vinculación. La búsqueda de conversaciones se conserva en Web. Disponibilidad por perfil activo y permisos CRM del rol, sin listas de correos ni flags de piloto. Véanse [Ajustes](06_administracion_configuracion/ajustes_generales.md), [Contactos y Emails](03_crm/crm_contactos_mails.md), [complemento](03_crm/complemento_outlook_crm.md), [manual](../manual-usuario.md) e [instalación](../manual-instalacion-addin-outlook.md). Entrega preparada; pendiente de despliegue y aceptación real del nuevo comportamiento general.

### Gestión de usuarios: pestaña Vinculaciones Outlook (19/10/2026)

Nueva pestaña dentro de `/users` para ADMIN activo: conexión Microsoft 365 registrada, equipos de todos los usuarios, vínculos vigentes/revocados, versión y fechas, búsqueda y filtros, y revocación con confirmación. No informa de presencia online ni expone tokens o claves. [Guía técnica](06_administracion_configuracion/administracion_usuarios_rbac.md#pestaña-3-vinculaciones-outlook-19102026), [manual](../manual-usuario.md#administración-de-vinculaciones-outlook-19102026). Sin SQL adicional ni nuevas rutas de vista; pendiente de despliegue y aceptación real.

### Avisos flotantes de Outlook con cierre automático (19/10/2026)

La [vista de correos](03_crm/crm_contactos_mails.md) muestra los estados de apertura/respuesta en un panel inferior flotante, fuera del flujo de la ficha. Conserva las acciones y los modos claro/oscuro, se cierra a los 10 segundos o con la X y no desplaza el contenido. [Manual](../manual-usuario.md#avisos-de-apertura-de-correos-sin-desplazar-la-vista-19102026). Pruebas automáticas preparadas; sin SQL ni cambios de backend. Pendiente de comprobación visual en la app.


### Prueba de arranque de Classic sin borrador (19/10/2026)

En Ajustes Generales, «Probar Apertura en Outlook» muestra la ventana principal de Classic sin crear correos ni actividades. Actualizar el ZIP e instalar con `Instalar_Outlook_dTS.bat` (1.1.1); conserva la vinculación. La acción local `dts-outlook://v1/launch` no accede a mensajes ni acredita una apertura verificada. Las versiones 1.1.0 siguen siendo compatibles con abrir y responder. La prueba Web abre directamente la bandeja de entrada sin crear borradores. Sin SQL. Pendiente de prueba del usuario con Classic abierto y cerrado.


**Prueba Web actualizada (19/10/2026):** En Ajustes, «Probar Apertura en Outlook» abre la bandeja de entrada de Outlook Web en otra pestaña, sin generar borradores ni actividades. Puede solicitar inicio de sesión Microsoft. No necesita actualizar el componente Windows ni ejecutar SQL. Pendiente de confirmación del usuario.


### Diagnóstico de tiempos Classic (19/10/2026)

Componente 1.1.2: instalar el ZIP actualizado conservando la vinculación. Sin SQL. El navegador registra preparación (equipos y solicitud), espera de clic adicional y confirmación en consola `[Classic timing]`; backend registra `classic_timing` por etapa y UUID de solicitud. El componente guarda tiempos de carga, consulta al backend, conexión/arranque de Outlook, localización y visualización en `%LOCALAPPDATA%\dTS\OutlookClassic\timings.jsonl` (se trunca al superar 256 KiB). Solo UUID técnico, versión, etapa y tiempos: sin asunto, cuerpo, destinatarios ni tokens. Una etapa registrada no acredita éxito; prevalece la confirmación autenticada existente. Comparar un correo con Classic abierto y otro con Classic cerrado; el tiempo total del navegador puede incluir confirmación manual adicional. Pendiente de medición real con esta versión.


### Manual práctico de Clientes y Contactos (19/10/2026)

Disponible el [manual desde cero en Markdown](../manuales/crm-clientes-contactos/manual-crm-clientes-contactos.md) y su [edición PDF](../../output/pdf/manual-crm-clientes-contactos.pdf): 34 capítulos, procedimientos, capturas reales y diagramas. Distingue funciones habilitables y entregas pendientes de despliegue.


## Aceptación comunicada por el usuario (20/10/2026)

El usuario aprueba expresamente estas cinco comprobaciones: prueba de apertura sin crear borradores; vinculaciones de equipos; permisos por rol; avisos flotantes; contadores de tipología al filtrar por oferta. Esta confirmación actualiza los pendientes históricos de esos puntos. No se amplía a casos individuales adicionales que el usuario no haya detallado.

Prueba real de Classic 1.1.2: dos aperturas correctas del mismo correo, con Outlook abierto y cerrado. Desde solicitud emitida hasta confirmación: 2,51 s abierto y 6,23 s cerrado. Trabajo local de Outlook: 1,56 s y 5,16 s; consulta HTTP del componente al backend: 0,65 s y 0,57 s. El arranque en el caso cerrado consume 2,01 s. Los totales no incluyen la preparación inicial anterior a emitir la solicitud; son una muestra por situación, no una garantía de rendimiento. Recomendación: conservar el flujo actual de momento, sin optimización aplicada en esta entrega.

Actualización posterior del 20/10/2026: el usuario aprueba los adjuntos tras editar, el correo preparado desde CRM y las pruebas del segundo usuario. Queda completada la lista principal de aceptación de Outlook. No consta confirmación específica de nombres de adjuntos muy largos, selección entre varias copias del mensaje o escenarios con múltiples cuentas; se conservan como cobertura adicional no verificada. Se conservan las validaciones anteriores de apertura/respuestas, movimiento entre carpetas, adjuntos y borrado exclusivo del CRM.


## Cierre de las pruebas principales de Outlook (20/10/2026)

El usuario confirma: «adjuntos tras editar aprobado», «correo preparado desde crm aprobado» y «segundo usuario pruebas ok». Estas tres aceptaciones completan la lista principal junto con las aprobaciones de prueba sin borradores, vinculaciones, permisos por rol, avisos flotantes y contadores por oferta. Se mantienen las validaciones anteriores de apertura y respuestas Classic/Web, enviados/recibidos, cambio de carpeta, adjuntos y borrado exclusivo del CRM.

La apertura con Classic abierto y cerrado también finalizó correctamente con 1.1.2 (2,51 s y 6,23 s desde solicitud emitida hasta confirmación, respectivamente). No se aplica optimización de rendimiento. Este cierre es aceptación funcional del recorrido principal; no certifica todos los escenarios posibles. Los nombres de adjuntos muy largos, la selección de varias copias y múltiples cuentas siguen sin confirmación específica. PST, archivo en línea y buzones compartidos no quedan acreditados por estas pruebas. Sin cambios de código, SQL ni datos.


### Mejora aplazada de Outlook PWA (20/10/2026)

Anotada en [CRM Contactos y Emails](03_crm/crm_contactos_mails.md#mejora-pendiente-abrir-correos-dentro-de-outlook-pwa-20102026): estudiar la apertura de correos en la PWA instalada y la reutilización de su ventana, según soporte de Outlook y navegador. Pendiente de identificar Chrome/Edge y validar el comportamiento; sin cambios funcionales.


## Acceso por rol y pruebas locales — 20/10/2026

Oportunidades ya no depende de un piloto, de un correo concreto ni de `CRM_PROSPECTS_PILOT_ENABLED`. El administrador asigna el acceso desde Gestión de Usuarios mediante los permisos **CRM** y **CRM: Oportunidades** del rol; ambos deben estar concedidos. El backend comprueba estos permisos también para Admin. Si falla la comprobación, la vista muestra un aviso y no abre un pipeline alternativo.

- **Admin:** consulta global, creación de prospectos propios, edición de datos y fases de cualquier prospecto y seguimiento APP de cualquier comercial. No cambia propietarios; archivo, restauración y vinculación de prospectos conservan sus restricciones de propietario.
- **Dirección:** consulta global y creación de cortes manuales; sin edición comercial.
- **Otros roles autorizados, incluido Tester:** prospectos propios y ofertas de su código comercial. Un código comercial ausente no concede acceso global.
- **Business Central:** tablas importadas de solo lectura. Las ofertas se crean en BC. n8n suministra `crm_offer_followups`; la app no prepara ni crea seguimientos automáticamente. Solo las filas `source=APP` admiten edición; las filas BC y las ofertas sin seguimiento permanecen consultables.
- **Automatizaciones:** los cortes programados requieren `CRM_CUTS_AUTOMATION_ENABLED=true`; el calendario de prospectos requiere `CRM_PROSPECTS_OUTLOOK_ENABLED=true`. Son opciones independientes, desactivadas por defecto para las pruebas locales. Los cortes manuales siguen disponibles para Admin y Dirección.

Para probar: reiniciar la aplicación desde `C:\proyectos\webapp_dts`, acceder como Admin y abrir CRM → Oportunidades. Revisar Prospección (crear y editar), Ofertas (filtros, Kanban y tabla) y Cortes. Los cambios manuales desde la app local utilizan la misma base compartida. No se ha desplegado en producción ni cambiado permisos en Supabase.



### Correos históricos y resumen inicial — 21/10/2026

Los registros EMAIL se conservan en Emails y Timeline, pero no forman parte de Agenda de Hoy, Pendientes de Cierre ni sus contadores personales o de equipo en la ventana inicial. Esta exclusión se aplica también a correos antiguos que tengan el indicador de completado a false; no requiere borrar ni actualizar el histórico mediante SQL.

Las rutas de registro de correo lo guardan como completado a efectos de actividad. En los borradores, el estado de envío sigue controlado por exchange_sync_status: este indicador no significa que el correo se haya enviado. Las reuniones, llamadas, visitas, videollamadas, tareas y eventos mantienen su funcionamiento. Solo REUNION se etiqueta como Reunión; los tipos no reconocidos se muestran como Actividad.

Si un correo necesita una acción futura, crear una tarea independiente desde el CRM, con fecha y estado propios. La fecha del correo se conserva como dato histórico.

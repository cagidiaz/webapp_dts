# 📜 Reglas de Comportamiento e Instrucciones del Agente (AGENTS.md)

Este archivo contiene las directrices críticas, arquitectura técnica y reglas de desarrollo específicas para el proyecto **dTS Instruments WebApp**. Estas instrucciones extienden mi comportamiento y deben ser seguidas estrictamente en todas las interacciones.

---

## 1. PREFERENCIAS DE COMUNICACIÓN E IDIOMA 🗣️
* **Idioma del Agente:** Háblame **SIEMPRE en español** en todas tus respuestas, explicaciones y propuestas.
* **Mensajes de Commit:** **TODOS** los mensajes de commit deben redactarse en **español** y su título debe ser un resumen claro de todos los cambios realizados.
* **Prefijos Semánticos:** Usar prefijos semánticos en español (`feat:`, `fix:`, `style:`, `docs:`, `refactor:`) y opcionalmente etiquetas de rol/área: `[ADMIN]`, `[SALES]`, `[OPERACIONES]`, `[FINANZAS]`, `[CRM]`.
* **Novedades de la App:** Solo los commits `feat:` y `style:` que sean descriptivos aparecerán en el modal de novedades de la aplicación. Los commits tipo `fix:` y cambios puramente técnicos deben filtrarse de esta vista.

---

## 2. CONTROL DE VERSIONES (GIT) Y DESPLIEGUE 🚨
* **PROHIBICIÓN TOTAL DE PUSH AUTOMÁTICO (REGLA INQUEBRANTABLE):** Está **estrictamente prohibido** que realices subidas (`git push`) a GitHub o servidores remotos por tu cuenta bajo ninguna circunstancia.
* **VERIFICACIÓN Y PRUEBAS PREVIAS DEL USUARIO:** **NUNCA** subas a GitHub hasta que el usuario haya probado y verificado personalmente en su entorno que todo funciona a la perfección. La subida a GitHub solo se realizará cuando el usuario lo solicite de forma explícita (ej. *"sube a producción"*, *"haz git push"*).
* **Compilación Limpia:** Antes de dar por finalizada cualquier tarea o cambio de código, es **mandatorio verificar** que tanto el frontend (`npm run build` / `tsc -b`) como el backend (`npm run build` en NestJS) compilen con **0 errores**.

---

## 3. ARQUITECTURA TÉCNICA Y STACK DEL PROYECTO 🏗️
* **Frontend:** React 18, Vite 8, TypeScript, Tailwind CSS, TanStack Query (React Query v5), Recharts, D3-Geo / TopoJSON (mapas interactivos), Headless UI, Lucide React, Zustand (`useUIStore`, `useAuthStore`).
* **Backend:** NestJS, TypeScript, TypeORM, PostgreSQL (Supabase), Microsoft Graph API SDK, ExcelJS.
* **Integración ERP:** Microsoft Dynamics 365 Business Central sincronizado de forma continua mediante flujos n8n a tablas PostgreSQL en Supabase.
* **Sistema Operativo del Entorno:** Windows (PowerShell / CMD).

---

## 4. INMUTABILIDAD DE DATOS (REGLA DE ORO) 🔒
* **Solo Lectura (Business Central):** Los datos de negocio sincronizados desde Dynamics 365 Business Central (vía n8n) son de **SOLO LECTURA** (tablas de clientes `customers`, pedidos `sales_headers`/`sales_lines`, facturación `sales_documents`/`sales_document_lines`, movimientos de valor `value_entries`, catálogo y stock `items`, presupuestos `sales_budget_entries`, etc.). Están prohibidas las operaciones `INSERT`, `UPDATE`, `PATCH` o `DELETE` sobre ellas.
* **Escritura Autorizada:** Solo se permite escribir en:
  1. Tablas de control de acceso y perfiles de Supabase (`auth.users`, `public.profiles`, `public.roles`, `public.modules`, `public.role_modules`).
  2. Tablas del metadato local del CRM (`sales_quotes_crm`, `sales_quote_activities`, `crm_activities`, `crm_contacts`, `crm_pipeline_stages`, `crm_deals`).
  3. Tokens de Microsoft 365 / Exchange (`user_exchange_tokens`).

---

## 5. CONTROL DE ACCESO (RBAC) Y ROLES 👥
* **Roles Corporativos Oficiales:**
  1. `ADMIN`: Control total y administración de permisos de rol.
  2. `DIRECCION`: Visión ejecutiva 360° (Finanzas, Ventas, CRM, Compras).
  3. `VENTAS`: Panel comercial, cartera de clientes/pedidos, pipeline CRM y presupuestos.
  4. `OPERACIONES`: Acceso al área de ventas y pedidos con foco logístico/operativo. Carga por defecto `SalesDashboard`.
  5. `PRODUCCION`: Consultas de catálogo, stock y pedidos pendientes.
  6. `TESTER`: Rol de pruebas y validación sin privilegios de administración.
* **Registro Obligatorio de Nuevas Vistas en la Matriz RBAC:**
  Cada vez que se cree una nueva vista o ruta en la WebApp:
  1. **Base de Datos (`public.modules`):** Registrar el nuevo módulo con su nombre oficial descriptivo (`name`) y su ruta exacta (`route_path`).
  2. **Permisos por Rol (`public.role_modules`):** Crear registros para **todos** los roles del sistema, inicializándolos en `true` o `false` para permitir al Administrador activarlos o desactivarlos desde la interfaz.
  3. **Frontend (`pages/users/index.tsx`):** Asegurar que `groupedModules` clasifique la ruta dentro del módulo padre adecuado para su gestión visual en la pestaña "Permisos de Roles".
  4. **Navegación Dinámica (`Sidebar.tsx` y `App.tsx`):** No limitar estáticamente las rutas a roles fijos; delegar el control granular en `isPathAllowed(path)`.

---

## 6. CÁLCULO DE KPIS Y REGLAS DE NEGOCIO 📊
* **Precio Efectivo (Neto):** No utilizar nunca `unit_price` bruto si existen descuentos. La valoración real es:
  $$\text{Precio Efectivo} = \frac{\text{line\_amount}}{\text{quantity}}$$
* **Exclusión de Ceros:** Excluir de los KPIs cualquier línea cuyo precio efectivo o cantidad sea igual a cero.
* **Comparativas YTD Día a Día:** Las comparativas temporales de ventas acumuladas anuales deben ser estrictamente "día a día" (YTD vs LYTD con soporte del parámetro `limitToToday=true`) para evitar sesgos con meses incompletos.
* **Homogeneidad Total de Producto (Items):**
  Las vistas de **Ventas vs Presupuestos** y **Presupuesto x Product Manager** deben consumir **las mismas tablas documentales** (`sales_documents` + `sales_document_lines`) evaluando exclusivamente líneas `type = 'Item'`, garantizando **0,00 € de discrepancia** entre ambas pantallas. Portes (cuenta 624) y prepagos vivos (PFV) deben presentarse de forma desglosada y separada.
* **Excepción de Seiko Flowcontrol:**
  Para el cliente `CL100427` (Seiko Flowcontrol GmbH), la cuenta contable `7050004` (Comisiones Seiko) está expresamente autorizada y se unifica bajo el código de producto virtual `SEICOMIS`.
* **Deducción de Prepagos (PFV) en Pedidos:**
  * **Deducción Cliente a Cliente:** Los prepagos vivos de un cliente solo compensan pedidos de ese mismo cliente.
  * **Orden de Imputación:** Compensa primero lo enviado pendiente de facturar (`qty_shipped_not_invoiced`) y, si hay remanente, la cartera abierta (`outstanding_quantity`).
  * **Compensaciones Parciales:** Comprobar la suma acumulada de líneas de anticipo (`438%` en `FV`).
  * **Consistencia de Cuentas:** El desglose de cuentas contables nunca debe superar el total neto ($\min(\text{cuentas}, \text{totalNeto})$).

---

## 7. INTEGRACIÓN CON MICROSOFT 365 Y OUTLOOK 📧
* **Modalidad Dual de Outlook:**
  1. **Outlook Classic (Escritorio):** Debe lanzarse mediante el protocolo seguro `mailto:` usando un enlace DOM temporal e invisible (`triggerMailtoUri`) para evitar que el navegador aborte la ejecución de la SPA de React.
  2. **Outlook Online (Web):** Si hay sesión activa en Microsoft Graph, genera el borrador en la nube (`/me/messages`) y abre su `webLink`. En caso contrario, recurre al enlace profundo canónico: `https://outlook.office.com/mail/deeplink/compose?to=...&cc=...&subject=...&body=...`.
* **Prevención de Bloqueo de Ventanas Emergentes (Popup Blocker):**
  En llamadas asíncronas hacia Graph API, **pre-abrir una pestaña en blanco (`window.open('about:blank', 'dts_outlook_web')`) de forma síncrona en el evento de clic del usuario** antes del `await`, redirigiendo su URL una vez que la API responda.
* **Soporte Multi-destinatario:**
  Los formularios de envío deben aceptar múltiples correos en "Para" y "CC" separados por comas o puntos y coma.
* **Add-in de Outlook (Office.js):**
  Cargar `Office.js` de forma dinámica y no bloqueante; fuera de Outlook, habilitar automáticamente el entorno de prueba simulado (*mock*). Aplicar siempre la limpieza inteligente de texto (`cleanBody`) para eliminar firmas y cláusulas RGPD.

---

## 8. CAPA VISUAL, DISEÑO Y EXPERIENCIA DE USUARIO (UX/UI) 🎨
* **Colores Corporativos Oficiales:**
  * **Primario:** `#003E51` (Azul corporativo dTS - representa datos Reales consolidados, menús y cabeceras).
  * **Secundario/Acento:** `#00B0B9` (Turquesa/Cian corporativo dTS - representa Previsiones, presupuestos, botones de acción y tendencias).
* **Diseño Premium (Rich Aesthetics):** Interfaz limpia, moderna, responsiva, con tipografías cuidadas, modo oscuro impecable y componentes visuales atractivos (micro-animaciones, gráficos Recharts interactivos y mapas vectoriales D3).
* **Nomenclatura Oficial:**
  * `VENTAS YTD VS VENTAS LYTD`: Comparativas de facturación acumulada.
  * `OBJETIVO FACTURACIÓN ANUAL`: Presupuesto anual.
  * `CARTERA DE PEDIDOS`: Pedidos abiertos.
* **Persistencia de Foco en Buscadores (`keepPreviousData`):**
  En tablas con filtros o búsqueda mediante React Query, **SIEMPRE** configurar `placeholderData: keepPreviousData`. Nunca destruir el input durante el estado de carga (`isLoading`), utilizando spinners no destructivos en el icono de búsqueda.
* **Responsividad:** El menú lateral (`Sidebar`) debe colapsar automáticamente en pantallas inferiores a 1024px.

---

## 9. GUÍAS TÉCNICAS Y DOCUMENTACIÓN DE VISTAS (`docs/vistas/`) 📚
* **CONSULTA OBLIGATORIA DEL AGENTE ANTES DE REVISAR CÓDIGO (REGLA DE EFICIENCIA):**
  Siempre que tengas que trabajar en una vista, resolver una duda, realizar modificaciones o comprender el funcionamiento de una pantalla, **DEBES consultar en primer lugar su guía técnica correspondiente en [`docs/vistas/`](file:///c:/proyectos/webapp_dts/docs/vistas/)** o el índice general [**`docs/vistas/README.md`**](file:///c:/proyectos/webapp_dts/docs/vistas/README.md) **ANTES** de ponerte a inspeccionar múltiples archivos de código fuente.
  * En estas guías ya se detallan los componentes frontend clave, servicios/endpoints del backend, tablas de base de datos implicadas, fórmulas matemáticas de los KPIs, lógica de negocio y permisos RBAC.
* **Estructura Oficial por Carpetas:**
  * [`docs/vistas/01_dashboards/`](file:///c:/proyectos/webapp_dts/docs/vistas/01_dashboards/): Paneles comerciales y ejecutivos.
  * [`docs/vistas/02_ventas/`](file:///c:/proyectos/webapp_dts/docs/vistas/02_ventas/): Clientes, pedidos, productos, facturación, movimientos de valor, presupuestos y ofertas.
  * [`docs/vistas/03_crm/`](file:///c:/proyectos/webapp_dts/docs/vistas/03_crm/): Pipeline, clientes, contactos, correos y complemento de Outlook.
  * [`docs/vistas/04_compras/`](file:///c:/proyectos/webapp_dts/docs/vistas/04_compras/): Proveedores y pedidos de aprovisionamiento.
  * [`docs/vistas/05_finanzas/`](file:///c:/proyectos/webapp_dts/docs/vistas/05_finanzas/): Balances, ratios, análisis estructural y simulador.
  * [`docs/vistas/06_administracion_configuracion/`](file:///c:/proyectos/webapp_dts/docs/vistas/06_administracion_configuracion/): Usuarios RBAC, ajustes generales y generador de presupuestos.
* **Mantenimiento Continuo:** Cualquier modificación relevante en la lógica de negocio o en la interfaz de una vista debe actualizar de inmediato su documento markdown correspondiente y el catálogo general [`docs/vistas/README.md`](file:///c:/proyectos/webapp_dts/docs/vistas/README.md).

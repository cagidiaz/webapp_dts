# 📜 Reglas de Comportamiento e Instrucciones del Agente (AGENTS.md)

Este archivo contiene las directrices críticas y reglas de desarrollo específicas para el proyecto **dTS Instruments WebApp**. Estas instrucciones extienden mi comportamiento y deben ser seguidas estrictamente en todas las interacciones.

---

## 1. PREFERENCIAS DE COMUNICACIÓN E IDIOMA 🗣️
* **Idioma del Agente:** Háblame **SIEMPRE en español** en todas tus respuestas y explicaciones.
* **Mensajes de Commit:** **TODOS** los mensajes de commit deben redactarse en **español** y su título debe ser un resumen claro de todos los cambios realizados.

---

## 2. CONTROL DE VERSIONES (GIT) Y DESPLIEGUE 🚨
* **PROHIBICIÓN TOTAL DE PUSH AUTOMÁTICO (REGLA INQUEBRANTABLE):** Está **estrictamente prohibido** que realices subidas (`git push`) a GitHub por tu cuenta bajo ninguna circunstancia.
* **VERIFICACIÓN Y PRUEBAS PREVIAS DEL USUARIO:** **NUNCA** subas a GitHub hasta que el usuario haya probado y verificado personalmente en su entorno que todo funciona a la perfección. La subida a GitHub solo se realizará cuando el usuario lo solicite de forma explícita (ej. *"sube a producción"*, *"haz git push"*).
* **Mensajes de Commit Semánticos:** Usar prefijos semánticos en español (`feat:`, `fix:`, `style:`, `docs:`, etc.) y opcionalmente etiquetas de rol: `[ADMIN]`, `[SALES]`, `[OPERACIONES]`.
* **Novedades de la App:** Solo los commits `feat:` y `style:` que sean descriptivos aparecerán en el modal de novedades de la aplicación. Los commits tipo `fix:` y cambios puramente técnicos deben filtrarse de esta vista.

---

## 3. INMUTABILIDAD DE DATOS (REGLA DE ORO) 🔒
* **Solo Lectura:** Los datos de negocio sincronizados desde Dynamics 365 Business Central (vía n8n) son de **SOLO LECTURA** (tablas de clientes, facturación, stock, etc.). Están prohibidas las operaciones `INSERT`, `UPDATE`, `PATCH` o `DELETE` sobre ellas.
* **Excepción:** Solo se permite escribir en las tablas de control de acceso y perfiles gestionadas por Supabase (`auth`, `profiles`, `roles`, `role_modules`) o tablas del metadato local del CRM (`sales_quotes_crm`, `sales_quote_activities`, `crm_activities`).

---

## 4. CONTROL DE ACCESO (RBAC) Y ROLES 👥
* **Rol de Operaciones:** El rol de **Operaciones** (`OPERACIONES`) tiene acceso autorizado a la ruta de Ventas (`/sales`). Sin embargo, el acceso a las sub-vistas específicas se controla dinámicamente mediante los permisos configurados en la base de datos (tabla `role_modules`).
* **Dashboard por Defecto:** El rol de `OPERACIONES` debe cargar por defecto el **Panel de Control Comercial** (`SalesDashboard`) en lugar del financiero, al igual que el rol `VENTAS`.
* **Páginas Protegidas:** Asegurar que `App.tsx` y `Sidebar.tsx` permitan los accesos a `OPERACIONES` según corresponda.
* **Registro Obligatorio de Nuevas Vistas en la Matriz de Permisos (`modules` y `role_modules`):**
  Cada vez que se desarrolle una nueva vista o ruta en la WebApp, es **MANDATORIO** integrarla en el sistema RBAC:
  1. **Base de Datos (`public.modules`):** Registrar el nuevo módulo con su nombre oficial descriptivo (`name`) y su ruta exacta (`route_path`).
  2. **Permisos por Rol (`public.role_modules`):** Crear los registros correspondientes para **todos** los roles del sistema (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`), inicializándolos en `true` o `false` según la lógica del rol para que el Administrador pueda encender o apagar el acceso dinámicamente desde la interfaz.
  3. **Gestión de Permisos en Frontend (`pages/users/index.tsx`):** Comprobar que `groupedModules` agrupe la ruta dentro de su categoría padre correspondiente para que los administradores puedan verla y gestionarla en la pestaña "Permisos de Roles".
  4. **Navegación y Rutas (`Sidebar.tsx` y `App.tsx`):** No limitar estáticamente las rutas a roles fijos (evitar `roles: ['ADMIN', 'DIRECCION']` hardcodeado en `Sidebar` o `RoleGuard` si el módulo debe ser asignable); delegar el control granular en `isPathAllowed(path)` (`role_modules`).
  5. **Endpoints de Backend:** Si el backend protege los endpoints de esa vista, debe verificar dinámicamente los permisos en `role_modules` para el rol del usuario en lugar de comparar únicamente nombres de rol fijos.

---

## 5. CÁLCULO DE KPIS Y REGLAS DE NEGOCIO (BACKEND/FRONTEND) 📊
* **Precio Efectivo (Neto):** No utilizar `unit_price` directamente para valorar pedidos/oportunidades si existen descuentos. La fórmula correcta de valoración es `(line_amount / quantity)`.
* **Exclusión de Ceros:** Excluir del cálculo de KPIs cualquier línea cuyo precio efectivo o cantidad sea igual a cero.
* **Comparativas YTD:** Las comparativas temporales de ventas acumuladas anuales deben ser "día a día" (YTD vs LYTD, soportando el parámetro `limitToToday` en consultas) para evitar sesgos con meses incompletos.
* **Desglose de Cuentas (G/L Accounts):** En los KPIs de pedidos, mostrar de forma desglosada el total correspondiente a líneas de cuentas contables.
* **Deducción de Prepagos (PFV) en Pedidos:**
  * **Deducción Cliente a Cliente:** Los prepagos vivos de un cliente solo deben deducirse de los pedidos vivos de ese mismo cliente; está prohibido restar prepagos de un cliente sobre los pedidos de otros clientes.
  * **Orden de Imputación:** El prepago vivo de un cliente compensa primero sus pedidos enviados pendientes de facturar (`qty_shipped_not_invoiced`). Si existe remanente, compensa su cartera de pedidos abierta (`outstanding_quantity`).
  * **Compensaciones Parciales Acumuladas:** La verificación de liquidación de prepagos debe evaluar la suma acumulada de líneas de anticipo (`438%` en `FV`), ya que un prepago puede compensarse en varias entregas/facturas parciales.
  * **Consistencia en Cuentas Contables:** El desglose de líneas de cuenta contable nunca debe exceder el valor neto total resultante del KPI ($\min(\text{cuentas}, \text{totalNeto})$), evitando incongruencias visuales donde las cuentas superen al total.

---

## 6. CAPA VISUAL Y DISEÑO (UX/UI) 🎨
* **Colores Corporativos:**
  * **Primario:** `#003E51` (Azul corporativo dTS - representa datos Reales y menús).
  * **Secundario/Acento:** `#00B0B9` (Cian corporativo dTS - representa Previsiones, botones y tendencias).
* **Diseño Premium (Rich Aesthetics):** Interfaz moderna, limpia, responsiva, con buenas tipografías y efectos visuales de alta calidad.
* **Estilo de KPIs:** Los porcentajes de desviación en el Dashboard deben usar clases grandes y ligeras (`text-xl`, `font-light`, `mt-0.5`).
* **Nomenclatura Oficial:**
  * `VENTAS YTD VS VENTAS LYTD`: Para comparativas de ventas acumuladas.
  * `OBJETIVO FACTURACIÓN ANUAL`: Para el seguimiento del presupuesto anual.
  * `CARTERA DE PEDIDOS`: Título general para el bloque de pedidos abiertos.
* **Responsividad:** El menú lateral (`Sidebar`) debe colapsarse automáticamente en pantallas de ancho inferior a 1024px.

---

## 7. BÚSQUEDAS EN TABLAS Y EXPERIENCIA DE USUARIO (UX) 🔍
* **Persistencia de Foco en Buscadores (`keepPreviousData`):**
  * Al implementar búsquedas o filtros en tablas con React Query (`useQuery` o `useInfiniteQuery`), **SIEMPRE** se debe configurar `placeholderData: keepPreviousData`.
  * **Causa del problema:** Si no se incluye `placeholderData: keepPreviousData`, al cambiar el término de búsqueda se genera un nuevo `queryKey`, dejando `data` como `undefined` durante la carga. Esto activa condiciones de guarda como `if (isLoading && !data) return <Skeleton />`, lo que desmonta el componente y destruye el elemento `<input>` del DOM, provocando que el usuario pierda el foco y el cursor con cada letra que escribe.
  * **Feedback Visual:** Utilizar indicadores no destructivos durante la búsqueda (ej. spinner `Loader2` en el propio icono de la lupa con `isFetching && debouncedSearch`) para informar al usuario de la consulta en curso sin desmontar el input ni entorpecer la escritura.

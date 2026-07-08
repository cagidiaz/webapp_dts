# 📜 Reglas de Comportamiento e Instrucciones del Agente (AGENTS.md)

Este archivo contiene las directrices críticas y reglas de desarrollo específicas para el proyecto **dTS Instruments WebApp**. Estas instrucciones extienden mi comportamiento y deben ser seguidas estrictamente en todas las interacciones.

---

## 1. PREFERENCIAS DE COMUNICACIÓN E IDIOMA 🗣️
* **Idioma del Agente:** Háblame **SIEMPRE en español** en todas tus respuestas y explicaciones.
* **Mensajes de Commit:** **TODOS** los mensajes de commit deben redactarse en **español** y su título debe ser un resumen claro de todos los cambios realizados.

---

## 2. CONTROL DE VERSIONES (GIT) Y DESPLIEGUE 🚨
* **Mensajes de Commit Semánticos:** Usar prefijos semánticos en español (`feat:`, `fix:`, `style:`, `docs:`, etc.) y opcionalmente etiquetas de rol: `[ADMIN]`, `[SALES]`, `[OPERACIONES]`.
* **PUSH MANUAL ESTRICTO:** Está **estrictamente prohibido** que realices subidas automáticas (`git push`) a GitHub por tu cuenta. Solo se realizarán subidas bajo petición explícita y aprobación del usuario.
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

---

## 5. CÁLCULO DE KPIS Y REGLAS DE NEGOCIO (BACKEND/FRONTEND) 📊
* **Precio Efectivo (Neto):** No utilizar `unit_price` directamente para valorar pedidos/oportunidades si existen descuentos. La fórmula correcta de valoración es `(line_amount / quantity)`.
* **Exclusión de Ceros:** Excluir del cálculo de KPIs cualquier línea cuyo precio efectivo o cantidad sea igual a cero.
* **Comparativas YTD:** Las comparativas temporales de ventas acumuladas anuales deben ser "día a día" (YTD vs LYTD, soportando el parámetro `limitToToday` en consultas) para evitar sesgos con meses incompletos.
* **Desglose de Cuentas (G/L Accounts):** En los KPIs de pedidos, mostrar de forma desglosada el total correspondiente a líneas de cuentas contables.

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

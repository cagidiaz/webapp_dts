# 📑 Documentación de Vista: Generador de Presupuestos de Ventas

> **Ubicación en la aplicación:** `/settings/budget-generator`  
> **Acceso en Menú:** Ajustes / Configuración (`Sidebar` → Configuración → *Generador de Presupuestos*)  
> **Componente Frontend:** [`BudgetGeneratorPage.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/settings/BudgetGeneratorPage.tsx)  
> **Servicio Backend:** [`budget-generator.service.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/sales/budget-generator.service.ts)  
> **Controlador Backend:** [`sales.controller.ts`](file:///c:/proyectos/webapp_dts/backend/src/modules/sales/sales.controller.ts) (`GET /sales/budget-generator/template`, `GET /sales/budget-generator/export`)  
> **Última actualización:** Septiembre 2026

---

## 1. Propósito y Utilidad de Negocio 🎯

El **Generador de Presupuestos de Ventas** es la herramienta estratégica diseñada para la Dirección Comercial y Administración de dTS Instruments que automatiza la confección del libro de trabajo en Excel para el proceso presupuestario anual del siguiente ejercicio (por ejemplo, confeccionar el presupuesto de 2027 a partir del año en curso 2026).

### Principales Ventajas:
- **Automatización del Punto de Partida:** Extrae directamente de Business Central el histórico de facturación del año anterior y las ventas reales acumuladas del año en curso.
- **Normalización de Fórmulas y Criterios:** Garantiza que todos los comerciales utilicen exactamente la misma estructura de archivo, fórmulas de cálculo de objetivos y redondeos.
- **Simulación de Precios de Venta:** Aplica un incremento porcentual configurable (ej. +3%, +5%) sobre los precios de venta históricos para proyectar el nuevo ejercicio.
- **Hoja Desbloqueada para Nuevas Líneas:** Permite a los comerciales añadir nuevas filas para presupuestar nuevos productos o clientes captados sin romper la plantilla.
- **Fórmulas de Objetivo Bloqueadas (Protección de Integridad):** La columna de cálculo de objetivo final incorpora una fórmula Excel nativa protegida contra borrado accidental (`=Previsión_Cierre * P.Vta_Siguiente_Año`).
- **Exclusión Estricta de Cuentas Contables:** Filtra cualquier línea de tipo cuenta contable (`G/L Account` o cuentas `438%`, `624%`, `700%`, etc.), asegurando que el presupuesto contenga únicamente referencias reales de catálogo comercial (`Item`).

---

## 2. Parámetros de Configuración y Generación ⚙️

Desde la interfaz de usuario en `/settings/budget-generator`, el administrador o responsable comercial configura los siguientes parámetros antes de descargar el libro de trabajo:

| Parámetro | Tipo | Valor Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| **Año en Curso** | Automático | Año actual (ej. `2026`) | Define el año base de referencia histórica. El ejercicio a presupuestar se calcula automáticamente como `Año en Curso + 1` (ej. `2027`). |
| **Vendedor (Comercial)** | Desplegable | *Todos los Comerciales* | Permite generar el archivo consolidado para toda la empresa o un Excel individual segmentado para un vendedor específico (`ACI`, `JKU`, `JMO`, `JPG`). |
| **% Incremento Precio Venta** | Numérico (`%`) | `0 %` | Porcentaje de ajuste que se aplicará sobre el precio medio efectivo de venta para proyectar el precio del ejercicio siguiente. |
| **Proteger Celdas de Fórmula** | Casilla (*Checkbox*) | `Desmarcada (false)` | Por defecto la hoja se genera desbloqueada para máxima flexibilidad. Si se activa, aplica protección de hoja estándar de Excel dejando editables solo las celdas de previsiones y nuevas filas. |

---

## 3. Estructura de Columnas del Archivo Excel 📊

El libro de trabajo generado (`.xlsx`) organiza los datos con la siguiente jerarquía y tipos de celda:

| # | Columna | Campo / Fórmula | Tipo de Celda | Descripción |
| :-: | :--- | :--- | :--- | :--- |
| **A** | **Cod vendedor** | `repCode` | Texto centrado | Código del comercial asignado al cliente. |
| **B** | **Cod cliente** | `customerCode` | Texto centrado | Código de cliente en Business Central. |
| **C** | **Nombre cliente** | `customerName` | Texto | Razón social comercial del cliente. |
| **D** | **Comunidad Autónoma** | `community` | Texto | Comunidad autónoma (o país internacional) del cliente. |
| **E** | **Cod Product Manager** | `pmCode` | Texto centrado | Código del Product Manager responsable de la categoría. |
| **F** | **familia** | `familyCode` | Texto centrado | Código de familia de producto. |
| **G** | **Desc_familia** | `familyName` | Texto | Descripción de la familia de producto. |
| **H** | **subfamilia** | `subfamilyCode` | Texto centrado | Código de subfamilia de producto. |
| **I** | **Desc_subfam** | `subfamilyName` | Texto | Descripción de la subfamilia de producto. |
| **J** | **Nº producto** | `productNo` | Texto centrado | Código de artículo/referencia comercial (`Item`), situado a la izquierda de la descripción. |
| **K** | **Descripción** | `description` | Texto | Nombre o descripción oficial del artículo. |
| **L** | **UdFacturadas a dia de hoy** | `udFacturadas` | Numérico (`#,##0`) | Unidades netas facturadas en el año en curso. |
| **M** | **UdCartera** | `udCartera` | Numérico (`#,##0`) | Unidades vivas pendientes en pedidos de cartera. |
| **N** | **UdPrevision 31/12/{Año}** | `udPrevision` | **Editable** (`#,##0`) | Celda en blanco con fondo amarillo suave para estimación de unidades a cierre. |
| **O** | **UdObjetivo {Año Siguiente}** | `udObjetivo` | **Editable** (`#,##0`) | Celda en blanco con fondo amarillo suave para fijar la meta de unidades del año siguiente. |
| **P** | **PrecioVentaUd {Año}** | `precioVentaActual` | Moneda (`#,##0.00 €`) | Precio medio efectivo por unidad calculado para el ejercicio base. |
| **Q** | **PrecioVentaUd {Año Siguiente} (+X%)** | `precioVentaSiguiente` | **Solo Lectura** (`#,##0.00 €`) | Precio unitario proyectado con el % de incremento oficial. |
| **R** | **TotalLineaFacturado a dia de hoy** | `totalFacturado` | Moneda (`#,##0.00 €`) | Importe neto acumulado facturado en el año en curso. |
| **S** | **€ Cartera** | `eurosCartera` | Moneda (`#,##0.00 €`) | Importe valorado de los pedidos vivos en cartera. |
| **T** | **€ Previsión {Año}** | `=SI(O(ESBLANCO(N);ESBLANCO(P)); ""; N*P)` | **Fórmula Bloqueada** (`#,##0.00 €`) | Importe proyectado de cierre en base a unidades previstas y precio base. |
| **U** | **€ Objetivo {Año Siguiente}** | `=SI(O(ESBLANCO(O);ESBLANCO(Q)); ""; O*Q)` | **Fórmula Bloqueada** (`#,##0.00 €`) | Meta en euros proyectada automáticamente para el año siguiente. |

---

## 4. Reglas Técnicas y de Negocio 🛡️

1. **Exclusión de Cuentas Contables:**  
   Se excluyen de forma estricta tanto las líneas con `type = 'G/L Account'` como cualquier código de producto numérico correspondiente a cuentas contables del PGC (`/^[0-9]{7}$/` o códigos de tipo `624%`, `438%`, etc.).
2. **Cálculo de Precios Unitarios Efectivos:**  
   El precio de partida nunca utiliza precios de tarifa brutos, sino el precio neto efectivo real:
   $$\text{Precio Efectivo} = \frac{\text{Importe Neto}}{\text{Unidades}}$$
   Posteriormente se aplica el incremento:
   $$\text{P.Vta Siguiente} = \text{Precio Efectivo} \times \left(1 + \frac{\text{\% Incremento}}{100}\right)$$
3. **Integración en la Navegación:**  
   Se accede a través de la sección de Configuración (`/settings/budget-generator`). Su título e icono (`TrendingUp`) se sincronizan de forma estándar en el `TopBar` superior de la aplicación mediante `useUIStore`.

---

## 5. Control de Acceso y Permisos de Rol (RBAC) 👥

La vista está plenamente integrada en la matriz dinámica de control de acceso basada en roles:

1. **Catálogo de Módulos (`public.modules`):**
   * Registrado bajo el nombre `Configuración: Generador de Presupuestos` con ruta base `/settings/budget-generator`.
2. **Matriz de Permisos (`public.role_modules`):**
   * Asignado con registro propio para todos los roles del sistema (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`).
   * Activado por defecto para los roles directivos y configurable dinámicamente por el Administrador desde la interfaz web de **Gestión de Usuarios > Permisos de Roles**.
3. **Protección en Backend (`SalesController`):**
   * Los endpoints `GET /sales/budget-generator/meta` y `GET /sales/budget-generator/export` verifican en tiempo real si el `role_id` del usuario tiene asignado `can_view = true` en `role_modules` (o rol `ADMIN`), denegando el acceso de forma segura ante roles no autorizados.
4. **Navegación Dinámica (`Sidebar.tsx` y `App.tsx`):**
   * El elemento del menú lateral se muestra u oculta automáticamente evaluando `isPathAllowed('/settings/budget-generator')`, sin bloqueos estáticos o hardcodeados en el frontend.

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
| **A** | **Cód. Vendedor** | `salesperson_code` | Texto | Código del comercial asignado al cliente. |
| **B** | **Vendedor** | `salesperson_name` | Texto | Nombre completo del comercial. |
| **C** | **Cód. Cliente** | `customer_no` | Texto | Código de cliente en Business Central. |
| **D** | **Nombre Cliente** | `customer_name` | Texto | Razón social comercial del cliente. |
| **E** | **Cód. Producto** | `product_no` | Texto | Código de artículo/referencia comercial (`Item`). |
| **F** | **Descripción Producto** | `product_description` | Texto | Nombre o descripción del artículo. |
| **G** | **Familia** | `family_code` | Texto | Familia de producto principal. |
| **H** | **Subfamilia** | `subfamily_code` | Texto | Subfamilia o categoría técnica. |
| **I** | **Uds {Año-1}** | `units_prev` | Numérico (`#,##0`) | Cantidad total de unidades vendidas en el año anterior. |
| **J** | **Fact. {Año-1} (€)** | `sales_prev` | Moneda (`#,##0.00 €`) | Importe neto facturado en el año anterior. |
| **K** | **Uds {Año Actual} (YTD)** | `units_curr` | Numérico (`#,##0`) | Unidades vendidas hasta la fecha en el año en curso. |
| **L** | **Fact. {Año Actual} (€)** | `sales_curr` | Moneda (`#,##0.00 €`) | Facturación neta devengada hasta la fecha en el año en curso. |
| **M** | **Previsión Cierre {Año Actual} (€)** | *En Blanco* | **Editable** (`#,##0.00 €`) | Celda en blanco con fondo suave para que el comercial estime la facturación total a cierre del año en curso. |
| **N** | **P.Vta {Año Siguiente} (+X.X%) (€)** | `unit_price_next` | **Solo Lectura** (`#,##0.00 €`) | Precio medio efectivo incrementado con el porcentaje configurado. El encabezado refleja explícitamente el porcentaje usado. |
| **O** | **Objetivo {Año Siguiente} (€)** | `=M{row} * (1 + %)` o `=Uds * P.Vta` | **Fórmula Bloqueada** (`#,##0.00 €`) | Cálculo automático del objetivo anual. Celda con fórmula bloqueada contra sobreescritura accidental. |

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

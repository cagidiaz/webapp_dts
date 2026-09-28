# 🚀 Registro de Actualización: Histórico del Año Anterior y Excepción Permanente Seiko en el Generador de Presupuestos

> **Fecha:** 28 de Septiembre de 2026  
> **Tipo:** `feat:` / `docs:`  
> **Alcance:** Generador de Presupuestos de Ventas, Backend NestJS, Motor ExcelJS, Interfaz Frontend y Documentación Técnica

---

## 1. Columnas de Histórico del Año Anterior (2025) en el Libro Excel (23 Columnas) 📊

Se ha incorporado la facturación completa del ejercicio anterior en columnas dedicadas dentro de la plantilla de presupuestos sin fragmentar las filas, garantizando una **visión 360° en una única línea por Cliente + Producto**:

* **Columna L (12) — `UdFacturadas {Año Anterior}` (`udFacturadasPrev`):** Unidades físicas netas facturadas en el ejercicio cerrado previo (ej. 2025). Formato `#,#0`, fondo gris claro (`#F3F4F6`) y cabecera gris pizarra (`#475569`) para distinguirla claramente del año actual.
* **Columna S (19) — `Facturacion {Año Anterior}` (`facturacionPrev`):** Importe neto acumulado en euros (€) facturado en el ejercicio cerrado previo. Formato `#,##0.00 €`, fondo gris claro (`#F3F4F6`) y cabecera gris pizarra (`#475569`).
* **Cero Ambigüedad Comercial:** Las ventas de ambos ejercicios nunca se suman entre sí en la misma celda. El comercial dispone en una sola fila del histórico completo:
  $$\text{Cierre } 2025 \longrightarrow \text{Real } 2026\ (\text{Facturado} + \text{Cartera}) \longrightarrow \text{Previsión } 2026 \longrightarrow \text{Objetivo } 2027$$
* **Reactivación de Cuentas:** Si un cliente compró un producto en 2025 pero aún no en 2026, la línea se incluye automáticamente para permitir proyectar objetivos para el nuevo año.

---

## 2. Recalibración de Celdas Editables y Fórmulas Vivas 🛠️

Al insertar las columnas L y S, la matriz de 23 columnas queda recalibrada de forma exacta:

| Concepto | Columna Anterior | Nueva Columna | Fórmula / Estado |
| :--- | :---: | :---: | :--- |
| **`UdPrevision 31/12/{Año}`** | N (14) | **O (15)** | **Editable** *(Fondo amarillo pastel `#FEF9C3`, cabecera cian `#00B0B9`)* |
| **`UdObjetivo {Año Siguiente}`** | O (15) | **P (16)** | **Editable** *(Fondo amarillo pastel `#FEF9C3`, cabecera cian `#00B0B9`)* |
| **`PrecioVentaUd {Año}`** | P (16) | **Q (17)** | Solo Lectura (`#,##0.00 €`) |
| **`PrecioVentaUd {Año Siguiente}`** | Q (17) | **R (18)** | Solo Lectura con fondo gris sutil (`#F9FAFB`) |
| **`€ Previsión {Año}`** | T (20) | **V (22)** | **Fórmula Bloqueada:** `=SI(O(ESBLANCO(O);ESBLANCO(Q)); ""; O*Q)` |
| **`€ Objetivo {Año Siguiente}`** | U (21) | **W (23)** | **Fórmula Bloqueada:** `=SI(O(ESBLANCO(P);ESBLANCO(R)); ""; P*R)` |

* **Autofiltros:** Extendidos de `A1` a `W[última_fila]`.
* **Paneles Congelados:** Configurados con cursor activo por defecto en la celda editable `O2`.

---

## 3. Regla de Negocio Permanente: Seiko Flowcontrol GMBH (`CL100427`) 🏢

Se ha implementado una regla permanente e intemporal en el backend (`budget-generator.service.ts`) para el cliente **SEIKO FLOWCONTROL**:
* **Contexto:** En ejercicios anteriores se facturaba mediante el artículo `SEICOMIS`. A partir de 2026, se comenzó a facturar mediante la cuenta contable **`7050004`** (*Comisiones Seiko*).
* **Solución Permanente (Alternativa A):**
  1. En las consultas Prisma de facturas y pedidos se autoriza explícitamente el código `7050004`.
  2. En el procesamiento en memoria, toda línea de `7050004` perteneciente a `CL100427` se unifica automáticamente bajo el producto **`SEICOMIS`**.
  3. Si la descripción no viniese informada, se asigna el texto oficial `Comisiones Seiko`.
* **Resultado:** El comercial (`JMO`) dispone de una sola fila consolidada de Comisiones Seiko con todo el histórico (8.827,40 € en 2025 y 38.765,43 € en 2026).

---

## 4. Mejoras en la Interfaz de Usuario (Frontend) 💻

* El endpoint `/meta` expone dinámicamente `previousYear`, `currentYear` y `nextYear`.
* La cabecera de la sección `/settings/budget-generator` muestra la secuencia temporal completa:
  $$\mathbf{2025}\ \text{(Histórico)} \longrightarrow \mathbf{2026}\ \text{(Base en Curso)} \longrightarrow \mathbf{2027}\ \text{(Objetivo)}$$
* El distintivo del modo de protección actualiza la advertencia a **Solo Columnas O y P**.

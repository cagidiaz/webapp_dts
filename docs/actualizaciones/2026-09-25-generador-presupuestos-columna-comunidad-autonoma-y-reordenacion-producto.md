# 🚀 Registro de Actualización: Columna de Comunidad Autónoma y Reordenación de Producto en el Generador de Presupuestos

> **Fecha:** 25 de Septiembre de 2026  
> **Tipo:** `feat:` / `docs:`  
> **Alcance:** Generador de Presupuestos de Ventas, Exportación Excel/ZIP, Geo-normalización y Documentación Técnica

---

## 1. Nueva Columna de Comunidad Autónoma (Columna D) 🌍

Se ha añadido la columna **Comunidad Autónoma** en el libro de trabajo Excel generado para la planificación presupuestaria anual:
* **Ubicación:** Inmediatamente posterior al `Nombre cliente` (Columna D).
* **Resolución Inteligente en Backend:**
  1. Identificación por código postal español (prefijos de 2 dígitos `01` a `52` asociados a sus 17 Comunidades Autónomas y 2 Ciudades Autónomas).
  2. Coincidencia por provincia / condado (`county`) o ciudad (`city`) en caso de códigos postales incompletos.
  3. Soporte para clientes internacionales fuera de España, asignando automáticamente el nombre del país (ej. *Portugal*, *Francia*, *Austria*, etc.).

---

## 2. Reordenación de la Columna `Nº producto` (Columna J) 📦

* La columna **`Nº producto`** se ha reubicado para posicionarse **directamente a la izquierda de la `Descripción`**.
* La jerarquía del bloque de artículo queda alineada de forma natural:
  $$\text{Desc\_subfam}\ (\text{I}) \longrightarrow \mathbf{Nº\ producto}\ (\text{J}) \longrightarrow \mathbf{Descripción}\ (\text{K})$$

---

## 3. Recalibración de Fórmulas y Celdas Editables (21 Columnas) 📊

Al incorporar la nueva columna y reordenar el archivo:
* **Columnas editables por los comerciales:** Pasan a ser las columnas **N** (`UdPrevision 31/12/{Año}`) y **O** (`UdObjetivo {Año Siguiente}`), configuradas con fondo amarillo suave y desbloqueadas en modo protegido.
* **Fórmula € Previsión (Columna T):** Actualizada a `=SI(O(ESBLANCO(N2); ESBLANCO(P2)); ""; N2*P2)`.
* **Fórmula € Objetivo (Columna U):** Actualizada a `=SI(O(ESBLANCO(O2); ESBLANCO(Q2)); ""; O2*Q2)`.
* **Autofiltros:** Extendidos dinámicamente hasta la columna **U**.
* **Frontend:** Actualizado [`BudgetGeneratorSection.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/settings/components/BudgetGeneratorSection.tsx) para reflejar las columnas editables N y O.
* **Documentación:** Actualizados [`generador_presupuestos.md`](file:///c:/proyectos/webapp_dts/docs/vistas/generador_presupuestos.md) y [`manual-usuario.md`](file:///c:/proyectos/webapp_dts/docs/manual-usuario.md).

# 🚀 Registro de Actualización: Integración de RBAC para el Generador de Presupuestos y Corrección de Clases UI

> **Fecha:** 24 de Septiembre de 2026  
> **Tipo:** `feat:` / `fix:` / `docs:`  
> **Alcance:** Control de Acceso Granular (RBAC), Base de Datos, Configuración y Estilos de Frontend

---

## 1. Integración del Generador de Presupuestos en la Matriz RBAC 👥

Se ha conectado la vista y los servicios del **Generador de Presupuestos de Ventas** al sistema dinámico de permisos por roles, permitiendo que el Administrador conceda o revoque el acceso a cualquier rol con un clic:

1. **Catálogo de Módulos (`public.modules`):**
   * Se dio de alta el registro con `name = 'Configuración: Generador de Presupuestos'` y `route_path = '/settings/budget-generator'`.
2. **Matriz de Permisos (`public.role_modules`):**
   * Se crearon los registros para todos los roles (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`), inicializados en `true` para directivos y listos para asignación a demanda en los roles comerciales u operativos.
3. **Gestión Visual de Permisos (`frontend/src/pages/users/index.tsx`):**
   * Se actualizó la función `groupedModules` para agrupar automáticamente cualquier ruta bajo `/settings*` dentro del bloque padre de Configuración.
   * Ahora aparece visible el toggle interactivo en la pestaña *Permisos de Roles*.
4. **Protección en Navegación y Rutas (`Sidebar.tsx` y `App.tsx`):**
   * Se eliminaron las restricciones estáticas basadas en arrays de roles fijos (`roles: ['ADMIN', 'DIRECCION']`), delegando el acceso a `isPathAllowed` y a `role_modules`.
5. **Seguridad en Backend (`backend/src/modules/sales/sales.controller.ts`):**
   * Se implementó el método `checkBudgetGeneratorAccess` para verificar en tiempo real si el `role_id` del usuario tiene asignado `can_view: true` en `role_modules` o si es `ADMIN`.

---

## 2. Regla Permanente en `.agents/AGENTS.md` 📜

* Se estableció como directriz obligatoria en la sección 4 (*CONTROL DE ACCESO Y ROLES*) que **toda nueva vista o ruta** desarrollada en la aplicación debe registrarse en `public.modules`, poblar `public.role_modules` para todos los roles, integrarse en la UI de gestión de usuarios y evitar dependencias de roles fijos en el código.

---

## 3. Correcciones de Estilos y Clases Tailwind v4 🎨

* **`MultiSearchableSelect.tsx`:**
  * Reemplazo de `min-h-[30px]` por la clase nativa `min-h-7.5`.
  * Reemplazo de `stroke-[3]` por `stroke-3`.
* **`BudgetGeneratorSection.tsx` y `SettingsPage.tsx`:**
  * Normalización de los colores hexadecimales arbitrarios `#00B0B9` al token oficial del sistema `dts-secondary`.
  * Actualización de sintaxis de degradados a `bg-linear-to-br`.

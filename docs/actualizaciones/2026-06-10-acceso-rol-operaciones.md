# Actualización de Permisos - Rol de Operaciones (10/06/2026)

Se ha modificado el comportamiento del rol de **Operaciones** (`OPERACIONES`) para permitirle acceder al módulo comercial (Ventas) y visualizar el Dashboard Comercial por defecto, respetando las políticas de acceso dinámicas configuradas desde la base de datos.

## Cambios Realizados

### 1. Enrutamiento y Guardias (Frontend)
* **`frontend/src/App.tsx`**: Se añadió `'OPERACIONES'` a la lista de roles autorizados (`allowedRoles`) en la ruta `/sales`, permitiendo la carga y el procesamiento de la información comercial para este rol.
* **`frontend/src/pages/dashboard/index.tsx`**: Se configuró para que los usuarios con el rol `'OPERACIONES'` carguen la vista `SalesDashboard` (Panel de Control Comercial) en lugar de la vista general financiera (`FinancialDashboard`).

### 2. Navegación del Menú Lateral (Sidebar)
* **`frontend/src/components/shared/Sidebar.tsx`**: Se incluyó `'OPERACIONES'` en el array de roles autorizados para visualizar el menú principal de **Ventas**.

### 3. Base de Datos (Módulos)
* Se detectó la falta del módulo de **Ofertas** (`/sales/quotes`) en la tabla `modules`.
* Se insertó el módulo `Ventas: Ofertas` (`/sales/quotes`) y se le asociaron registros en `role_modules` para todos los roles (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES` establecidos con `can_view: true` por defecto), permitiendo que el administrador pueda desactivar o activar este menú de forma dinámica en la pantalla de gestión de usuarios.

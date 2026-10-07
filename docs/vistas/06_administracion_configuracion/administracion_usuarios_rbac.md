# 🛡️ Vista: Administración de Usuarios y Permisos RBAC (UsersPage)

## 1. Propósito y Descripción General
La vista de **Administración de Usuarios y Permisos RBAC** es el centro de seguridad y control de acceso de la WebApp. Permite a los administradores:
1. **Gestión de Cuentas de Usuario:** Crear, editar, activar/desactivar y eliminar usuarios del sistema (autenticación en Supabase / Backend NestJS).
2. **Asignación de Roles:** Vincular a cada usuario a un rol corporativo específico.
3. **Matriz Granular de Permisos por Rol (RBAC):** Configurar dinámicamente qué módulos y submódulos puede ver cada rol (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`), eliminando la necesidad de hardcodear permisos en el código.

---

## 2. Ficheros y Rutas del Código
* **Componente Frontend:** [`frontend/src/pages/users/index.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/pages/users/index.tsx)
* **API Endpoints (NestJS):**
  * `GET /users`: Listado de usuarios con perfil y rol asignado.
  * `POST /users`: Creación de un nuevo usuario en Supabase Auth y tabla `profiles`.
  * `PATCH /users/:id`: Edición de datos, contraseña o cambio de estado `isActive`.
  * `DELETE /users/:id`: Eliminación física o baja del usuario.
  * `GET /users/roles`: Listado de roles disponibles.
  * `GET /users/modules`: Catálogo completo de módulos y rutas registradas (`public.modules`).
  * `GET /users/roles/:roleId/modules`: Matriz de permisos asignados al rol (`role_modules`).
  * `POST /users/roles/:roleId/modules`: Actualización en lote de permisos de un rol.
* **Control de Acceso en Frontend:**
  * Contexto de Autenticación: [`frontend/src/store/authStore.ts`](file:///c:/proyectos/webapp_dts/frontend/src/store/authStore.ts)
  * Guardián de Rutas: [`frontend/src/components/RoleGuard.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/components/RoleGuard.tsx)
  * Menú de Navegación: [`frontend/src/components/Sidebar.tsx`](file:///c:/proyectos/webapp_dts/frontend/src/components/Sidebar.tsx) (`isPathAllowed(path)`)
* **Ruta en la App:** `/users`

---

## 3. Modelo de Datos y Roles del Sistema

### 3.1. Roles Corporativos Oficiales
| Rol | Identificador | Enfoque Principal |
| :--- | :--- | :--- |
| **Administrador** | `ADMIN` | Acceso total y configuración de permisos de todos los roles. |
| **Dirección** | `DIRECCION` | Visión ejecutiva global (Finanzas, Ventas, CRM, Compras). |
| **Ventas** | `VENTAS` | Panel comercial, pipeline, ofertas, histórico de facturación y CRM. |
| **Operaciones** | `OPERACIONES` | Acceso autorizado al área de ventas y pedidos con foco logístico/operativo. Carga por defecto `SalesDashboard`. |
| **Producción** | `PRODUCCION` | Consultas de stock, catálogo de productos y cartera de pedidos pendientes. |
| **Tester** | `TESTER` | Rol de pruebas y validación sin privilegios de administración. |

### 3.2. Estructura de Tablas Supabase
* `public.profiles`: Metadatos del usuario (`first_name`, `last_name`, `email`, `is_active`, `role_id`).
* `public.roles`: Definición de los roles (`id`, `name`).
* `public.modules`: Catálogo de rutas del sistema (`id`, `name`, `route_path`).
* `public.role_modules`: Matriz relacional (`role_id`, `module_id`, `can_view`).

---

## 4. Estructura de la Interfaz

### 4.1. Pestaña 1: "Usuarios"
* **Tarjetas de Estadísticas:** Muestra en la cabecera el total de usuarios, usuarios activos y administradores registrados.
* **Formulario de Creación / Edición:**
  * Campos: Nombre, Apellidos, Correo Electrónico, Contraseña (opcional al editar), Rol (selector estilizado con HeadlessUI) y Switch de Activo/Inactivo.
* **Filtros y Búsqueda:**
  * Búsqueda por texto (nombre, apellido o email).
  * Filtro por rol específico o "Todos".
* **Tabla de Usuarios:**
  * Indicador de estado visual (badge verde para activo, rojo para inactivo).
  * Acciones: Toggle rápido de activación/bloqueo (`UserCheck`/`UserX`), botón de edición (carga los datos en el formulario con auto-scroll superior) y botón de eliminación.

### 4.2. Pestaña 2: "Permisos de Rol"
* **Columna Izquierda (Selector de Rol):**
  * Lista vertical interactiva con todos los roles del sistema.
  * Al seleccionar un rol, se consulta `GET /users/roles/:roleId/modules` y se actualiza el estado local de checkboxes.
* **Columna Derecha (Matriz Agrupada de Módulos):**
  * Agrupación jerárquica por secciones principales:
    * `/dashboard`: Paneles de Control.
    * `/finance`: Finanzas (Balances, Ratios, Simulaciones).
    * `/sales`: Área Comercial y Ventas (Pedidos, Productos, Clientes, Facturación, Presupuestos).
    * `/purchases`: Compras y Proveedores.
    * `/crm`: CRM (Pipeline, Oportunidades, Contactos, Mails).
    * `/config`: Configuración (`/users`, `/settings`).
  * Checkboxes individuales por submódulo con guardado en lote mediante el botón "Guardar Cambios de Permisos".

---

## 5. Regla Obligatoria para Nuevas Vistas (Checklist RBAC)
Cada vez que se añade una nueva vista a la WebApp, debe seguirse el siguiente protocolo:
1. **Base de Datos (`public.modules`):** Insertar la nueva ruta (`route_path`) y nombre descriptivo.
2. **Permisos Iniciales (`public.role_modules`):** Insertar un registro para **cada uno** de los 6 roles, configurando `can_view` en `true` o `false` según la política corporativa.
3. **Agrupación en Frontend (`pages/users/index.tsx`):** Asegurar que `groupedModules` clasifique la ruta dentro del módulo padre adecuado para que aparezca en el panel de permisos.
4. **Guardián de Rutas:** Evitar arrays estáticos en `App.tsx` o `Sidebar.tsx`; utilizar `isPathAllowed(path)`.

# 🛡️ Vista: Administración de Usuarios y Permisos RBAC (UsersPage)

## 1. Propósito y Descripción General
La vista de **Administración de Usuarios y Permisos RBAC** es el centro de seguridad y control de acceso de la WebApp. Permite a los administradores:
1. **Gestión de Cuentas de Usuario:** Crear, editar, activar/desactivar y eliminar usuarios del sistema (autenticación en Supabase / Backend NestJS).
2. **Asignación de Roles:** Vincular a cada usuario a un rol corporativo específico.
3. **Matriz Granular de Permisos por Rol (RBAC):** Configurar dinámicamente qué módulos y submódulos puede ver cada rol (`ADMIN`, `DIRECCION`, `VENTAS`, `OPERACIONES`, `PRODUCCION`, `TESTER`), eliminando la necesidad de hardcodear permisos en el código.

4. **Vinculaciones Outlook:** supervisar conexiones registradas y equipos de todos los usuarios, consultar sus estados y revocar vínculos Classic.

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


## Aclaración de permisos del piloto: Antoni es TESTER (13/10/2026)

- Antoni Ciurans mantiene el rol TESTER. Admin gestiona el acceso desde Usuarios → Permisos de Rol → TESTER, activando CRM (`/crm`) y Oportunidades (`/crm/pipeline`). Se reutilizan `modules` y `role_modules`; no se crea otra matriz ni se conceden permisos automáticamente en Supabase.
- Los permisos actuales son por rol: conceder una vista a TESTER afecta a todos los miembros del rol. La participación en el piloto sigue limitada a Antoni por identidad; otros testers no obtienen funciones nuevas del piloto. No equivale a un permiso individual ni exige cambiarlo a VENTAS.
- Admin y Dirección también necesitan sus permisos de CRM/Oportunidades para consultar el piloto. Conservan las operaciones acordadas: Admin edita prospectos, Dirección consulta. El propietario sigue siendo el único que confirma/deshace asociaciones y archiva/restaura.
- La API verifica permisos vigentes en cada operación. Revocar CRM u Oportunidades bloquea el piloto aunque se invoque por ID. Outlook también respeta esa revocación y reconoce el origen sin reimportarlo como actividad BC.
- Las rutas CRM verifican la matriz también al acceder por URL directa. Guardar desde el panel invalida consultas de permisos y refresca el menú de la sesión actual. Las otras sesiones revalidan al recuperar foco o recargar; las rutas CRM abiertas revalidan cada 30 segundos. No es una revocación instantánea de datos ya descargados, pero las operaciones nuevas del piloto sí se comprueban en servidor.
- TESTER usa el código comercial propio al consultar ofertas desde la vista, desde la primera petición. Si no tiene código asignado, la consulta no se lanza. Confirmar el código de Antoni antes de activar el piloto. La validación de cartera en el endpoint general de ofertas se revisará al implementar la convivencia BC/app.
- Los interruptores de despliegue del piloto y Outlook permanecen como salvaguarda técnica, apagados por defecto. No sustituyen los permisos que Admin decide en su panel. No se ha alterado la carpeta local, ni aplicado SQL, ni concedido permisos reales.

## Pestaña 3: Vinculaciones Outlook (19/10/2026)

Entrega preparada para desplegar y comprobar en la app. Dentro de `/users`, junto a Usuarios y Permisos de Rol, se añade «Vinculaciones Outlook». Reutiliza la ruta y el acceso administrativo existentes; no crea un módulo RBAC ni requiere SQL adicional.

Solo un perfil **ADMIN activo** puede consultar o revocar mediante los nuevos endpoints. La autorización se comprueba desde la base en cada petición, no desde el rol declarado por el navegador ni de una consulta anterior.

| Dato mostrado | Origen y significado |
| --- | --- |
| Usuario, email, rol y activo/inactivo | Metadatos de `profiles` y `roles`. |
| Microsoft 365 | Conexión registrada, sin conexión, requiere consentimiento o reconexión, según el registro de `user_exchange_accounts`. No hace una comprobación Graph del buzón en ese momento. |
| Buzón y última sincronización | Metadatos guardados de la cuenta; no se entregan access_token ni refresh_token. |
| Equipos vinculados | `crm_outlook_devices`: nombre, vínculo vigente/revocado, versión, fecha de vinculación, último contacto registrado y fecha de revocación. |

Vigente no significa equipo encendido o Outlook abierto. Un usuario inactivo o sin permiso CRM no puede utilizar su vínculo aunque todavía figure vigente. Los equipos revocados se conservan en el listado. Las solicitudes de vinculación pendientes y sin usuario asignado no se presentan como equipos de un usuario.

La pestaña permite buscar por usuario, correo, rol o equipo, filtrar estado Microsoft 365 y equipos vigentes/revocados o usuarios sin equipos. Actualizar recarga la información. La interfaz mantiene modos claro/oscuro y tabla desplazable en pantallas estrechas. La caché se separa por administrador y no reutiliza datos del actor anterior al cambiar de cuenta.

**Revocar** pide confirmación con usuario y equipo, conserva el primer `revoked_at` y no borra el dispositivo ni los correos. No desconecta la cuenta Microsoft 365. La apertura Classic comprueba esta revocación en las solicitudes firmadas, incluidas las pendientes; no cierra ventanas que ya estén abiertas. El usuario deberá vincular de nuevo el equipo para recuperar su uso. El servidor registra actor y dispositivo en el log, sin secretos.

### Archivos y API

- Frontend: `frontend/src/pages/users/OutlookLinksTab.tsx`, `frontend/src/api/usersOutlook.ts`, integración en `pages/users/index.tsx`.
- Backend: `UsersOutlookController` y `UsersOutlookService`, registrados en `UsersModule` con `PrismaModule`.
- `GET /users/outlook`: metadatos globales, solo ADMIN activo.
- `POST /users/outlook/devices/:id/revoke`: UUID validado y revocación administrativa parametrizada, solo ADMIN activo.

Se utiliza la conexión SQL del backend para las tablas Classic; no acceso del navegador ni ampliación de permisos de Supabase. Solo se modifica `crm_outlook_devices.revoked_at` al confirmar la acción. No se leen cuerpos de correo ni se devuelven tokens, claves públicas, hashes o secretos de vinculación. No cambia ninguna tabla sincronizada desde Business Central.

### Validación y despliegue

Pruebas HTTP con JWT: anonimato, roles no administrativos, administrador inactivo, revocación del rol entre peticiones, metadatos permitidos, usuarios sin conexión, ID inválido, equipo ausente y error de esquema. Pruebas PostgreSQL aisladas: estados de cuenta, no exposición de secretos, revocación idempotente y bloqueo de una solicitud firmada pendiente. Componente frontend: filtros, estados, confirmación/cancelación, error, caché por actor y estilo oscuro.

Publicar backend y frontend, abrir Gestión de usuarios → Vinculaciones Outlook, comprobar con una cuenta ADMIN y revocar solo un equipo elegido para la prueba. Confirmar que el propietario ya no puede abrir con ese vínculo. No se ha revocado ningún equipo real durante el desarrollo. La aceptación real de esta pestaña queda pendiente.


## Aceptación comunicada por el usuario (20/10/2026)

El usuario aprueba expresamente estas cinco comprobaciones: prueba de apertura sin crear borradores; vinculaciones de equipos; permisos por rol; avisos flotantes; contadores de tipología al filtrar por oferta. Esta confirmación actualiza los pendientes históricos de esos puntos. No se amplía a casos individuales adicionales que el usuario no haya detallado.

Prueba real de Classic 1.1.2: dos aperturas correctas del mismo correo, con Outlook abierto y cerrado. Desde solicitud emitida hasta confirmación: 2,51 s abierto y 6,23 s cerrado. Trabajo local de Outlook: 1,56 s y 5,16 s; consulta HTTP del componente al backend: 0,65 s y 0,57 s. El arranque en el caso cerrado consume 2,01 s. Los totales no incluyen la preparación inicial anterior a emitir la solicitud; son una muestra por situación, no una garantía de rendimiento. Recomendación: conservar el flujo actual de momento, sin optimización aplicada en esta entrega.

Actualización posterior del 20/10/2026: el usuario aprueba los adjuntos tras editar, el correo preparado desde CRM y las pruebas del segundo usuario. Queda completada la lista principal de aceptación de Outlook. No consta confirmación específica de nombres de adjuntos muy largos, selección entre varias copias del mensaje o escenarios con múltiples cuentas; se conservan como cobertura adicional no verificada. Se conservan las validaciones anteriores de apertura/respuestas, movimiento entre carpetas, adjuntos y borrado exclusivo del CRM.


## Cierre de las pruebas principales de Outlook (20/10/2026)

El usuario confirma: «adjuntos tras editar aprobado», «correo preparado desde crm aprobado» y «segundo usuario pruebas ok». Estas tres aceptaciones completan la lista principal junto con las aprobaciones de prueba sin borradores, vinculaciones, permisos por rol, avisos flotantes y contadores por oferta. Se mantienen las validaciones anteriores de apertura y respuestas Classic/Web, enviados/recibidos, cambio de carpeta, adjuntos y borrado exclusivo del CRM.

La apertura con Classic abierto y cerrado también finalizó correctamente con 1.1.2 (2,51 s y 6,23 s desde solicitud emitida hasta confirmación, respectivamente). No se aplica optimización de rendimiento. Este cierre es aceptación funcional del recorrido principal; no certifica todos los escenarios posibles. Los nombres de adjuntos muy largos, la selección de varias copias y múltiples cuentas siguen sin confirmación específica. PST, archivo en línea y buzones compartidos no quedan acreditados por estas pruebas. Sin cambios de código, SQL ni datos.

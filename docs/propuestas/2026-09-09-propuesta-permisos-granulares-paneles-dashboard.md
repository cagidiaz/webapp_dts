# 📋 Propuesta de Arquitectura: Permisos Granulares de Rol para Paneles de Control (Dashboard)

> **Documento de Propuesta Técnica**  
> **Fecha:** 9 de Septiembre de 2026  
> **Estado:** Propuesta en estudio  
> **Objetivo:** Permitir la asignación dinámica de permisos para el Panel Ejecutivo y el Panel de Comerciales desde la Administración de Usuarios, garantizando la regla de validación de al menos un panel activo.

---

## 1. Contexto y Problemática Actual

Actualmente, la plataforma **dTS Instruments** cuenta con dos paneles de control en la ruta `/dashboard`:
1. **Panel Ejecutivo (`FinancialDashboard`):** Enfocado en facturación global, seguimiento de presupuestos anuales, EBITDA, comparativas financieras y gráficos de evolución.
2. **Panel de Comerciales (`SalesDashboard`):** Enfocado en el funnel de ventas, actividad comercial (agenda de visitas, llamadas, Teams), ofertas abiertas y ranking de productos/clientes.

### Limitación identificada:
La asignación de qué panel ve cada usuario se realiza mediante una comprobación rígida por código en `DashboardPage.tsx` basada en el nombre del rol:
* `VENTAS`, `OPERACIONES` y `TESTER` cargan por defecto el **Panel de Comerciales**.
* `ADMIN` y `DIRECCION` cargan el **Panel Ejecutivo**.

En la tabla de base de datos `public.modules` únicamente existe un registro para `/dashboard` (`Módulo: Panel de Control`), por lo que no es posible habilitar o deshabilitar de forma independiente ambos paneles desde la matriz de permisos de rol (`public.role_modules`).

---

## 2. Requerimientos de la Propuesta

1. **Permisos Granulares en la Matriz de Roles:**
   * En **Administración de Usuarios ➔ Permisos de Rol**, el acordeón de *Módulo: Panel de Control* debe desplegar dos submódulos:
     * `Panel: Panel Ejecutivo` (`/dashboard/executive`)
     * `Panel: Panel de Comerciales` (`/dashboard/sales`)
2. **Regla de Negocio Crítica ("Siempre tiene que estar marcado al menos uno"):**
   * Siempre que el módulo principal de *Panel de Control* esté habilitado para un rol, **al menos uno de los dos paneles debe permanecer activo**.
   * La interfaz debe impedir desmarcar el último panel activo e informar visualmente al administrador.
   * El backend debe validar la misma regla en el endpoint de guardado de permisos (`/users/roles/:roleId/modules`).
3. **Experiencia de Usuario en el Dashboard (`/dashboard`):**
   * **Un solo panel asignado:** Si el rol solo tiene permiso para uno de los dos paneles, se renderiza directamente su panel sin controles adicionales.
   * **Ambos paneles asignados:** Si el rol tiene permiso para ambos (ej. `ADMIN` o `DIRECCION`), se muestra un selector de subpestañas estilo píldora corporativa en la cabecera del Dashboard (`[ 💼 Panel Ejecutivo ]  [ 👥 Panel de Comerciales ]`), permitiendo alternar de forma inmediata entre ambos paneles sin recargar la página.
   * **Carga por Defecto:** Se mantiene la preferencia corporativa por rol (Ventas/Operaciones/Tester abren por defecto Comerciales; Admin/Dirección abren Ejecutivo).

---

## 3. Diseño Técnico Detallado

### 3.1 Base de Datos (`public.modules` y `public.role_modules`)

Se crearán los dos registros de submódulos en la tabla `modules`:
```sql
INSERT INTO public.modules (name, route_path, is_active) VALUES 
('Panel: Panel Ejecutivo', '/dashboard/executive', true),
('Panel: Panel de Comerciales', '/dashboard/sales', true)
ON CONFLICT (route_path) DO NOTHING;
```

Y se inicializarán los permisos en `role_modules` para los roles actuales:
| Rol | `/dashboard` (Padre) | `/dashboard/executive` | `/dashboard/sales` | Comportamiento en Dashboard |
| :--- | :---: | :---: | :---: | :--- |
| **ADMIN** | `true` | `true` | `true` | Selector de pestañas (Ejecutivo por defecto) |
| **DIRECCION** | `true` | `true` | `true` | Selector de pestañas (Ejecutivo por defecto) |
| **VENTAS** | `true` | `false` | `true` | Solo Panel de Comerciales |
| **OPERACIONES** | `true` | `false` | `true` | Solo Panel de Comerciales |
| **TESTER** | `true` | `false` | `true` | Solo Panel de Comerciales |

---

### 3.2 Backend (NestJS - `UsersService`)

En `updateRolePermissions(roleId, permissions)`:
* Si `/dashboard` está marcado como `can_view = true`, verificar que:
  ```typescript
  const executive = permissions.find(p => p.routePath === '/dashboard/executive')?.canView;
  const sales = permissions.find(p => p.routePath === '/dashboard/sales')?.canView;
  if (!executive && !sales) {
    throw new BadRequestException('Debe haber al menos un panel de control (Ejecutivo o Comerciales) activo para este rol.');
  }
  ```

---

### 3.3 Frontend (`UsersPage` y `DashboardPage`)

#### A. Matriz de Permisos (`frontend/src/pages/users/index.tsx`)
* Al renderizar `groupedModules`, los submódulos `/dashboard/executive` y `/dashboard/sales` se muestran anidados bajo `Módulo: Panel de Control`.
* Control de validación reactiva:
  ```typescript
  const handleChildToggle = (childId: string, currentVal: boolean) => {
    // Si intenta desmarcar el único panel activo de /dashboard
    if (isDashboardChild(childId) && currentVal === true && isOtherDashboardChildOff(childId)) {
      alert('Debe haber al menos un panel de control asignado a este rol.');
      return;
    }
    // Proceder con el cambio...
  };
  ```

#### B. Vista de Dashboard (`frontend/src/pages/dashboard/index.tsx`)
```tsx
export const DashboardPage: React.FC = () => {
  const { allowedPermissions } = usePermissions();
  const canExecutive = allowedPermissions.some(p => p.routePath === '/dashboard/executive' && p.canView);
  const canSales = allowedPermissions.some(p => p.routePath === '/dashboard/sales' && p.canView);

  const [activeTab, setActiveTab] = useState<'executive' | 'sales'>(() => {
    if (canSales && !canExecutive) return 'sales';
    if (canExecutive && !canSales) return 'executive';
    return (userRole === 'VENTAS' || userRole === 'OPERACIONES' || userRole === 'TESTER') ? 'sales' : 'executive';
  });

  return (
    <div>
      {canExecutive && canSales && (
        <DashboardTabSelector activeTab={activeTab} onChange={setActiveTab} />
      )}
      {activeTab === 'executive' ? <FinancialDashboard /> : <SalesDashboard />}
    </div>
  );
};
```

---

## 4. Plan de Despliegue cuando se apruebe

1. **Paso 1:** Ejecutar migración de inserción en Supabase (`modules` y `role_modules`).
2. **Paso 2:** Aplicar validación en `users.service.ts`.
3. **Paso 3:** Implementar el control en `UsersPage.tsx` y el selector en `DashboardPage.tsx`.
4. **Paso 4:** Pruebas en local con diferentes usuarios y perfiles.
5. **Paso 5:** Commit semántico y subida a producción tras aprobación.

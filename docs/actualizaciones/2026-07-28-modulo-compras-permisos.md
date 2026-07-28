# Actualización de Permisos - Módulo de Compras (28/07/2026)

Se ha adaptado la vista de **Gestión de Usuarios** (`/users`) para agrupar y gestionar dinámicamente el nuevo módulo de **Compras** y sus subvistas, incluyendo prevención de duplicados por ruta.

## Script SQL para Limpieza y Registro en Supabase

Si tenías filas duplicadas en la tabla `modules`, ejecuta este script SQL completo en el Editor SQL de Supabase para limpiar y asegurar registros únicos:

```sql
-- ========================================================
-- 1. ELIMINAR DUPLICADOS EN LA TABLA modules MANTENIENDO EL ID MÁS RECIENTE
-- ========================================================
DELETE FROM public.modules
WHERE id NOT IN (
    SELECT DISTINCT ON (route_path) id
    FROM public.modules
    ORDER BY route_path, created_at DESC
);

-- ========================================================
-- 2. INSERTAR MÓDULO PADRE Y SUBVISTAS DE COMPRAS EN modules
-- ========================================================
INSERT INTO public.modules (name, route_path) VALUES 
('Módulo: Compras', '/purchases'),
('Compras: Proveedores', '/purchases/vendors'),
('Compras: Pedidos de Compra', '/purchases/orders')
ON CONFLICT (name) DO NOTHING;

-- ========================================================
-- 3. ASIGNAR PERMISOS INICIALES EN role_modules
-- Habilitados por defecto (can_view = TRUE) para ADMIN, DIRECCION y OPERACIONES
-- ========================================================
INSERT INTO public.role_modules (role_id, module_id, can_view)
SELECT r.id, m.id, TRUE
FROM public.roles r
CROSS JOIN public.modules m
WHERE m.route_path IN ('/purchases', '/purchases/vendors', '/purchases/orders')
  AND r.name IN ('ADMIN', 'DIRECCION', 'OPERACIONES')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- ========================================================
-- 4. REGISTRAR EN role_modules PARA OTROS ROLES (can_view = FALSE)
-- ========================================================
INSERT INTO public.role_modules (role_id, module_id, can_view)
SELECT r.id, m.id, FALSE
FROM public.roles r
CROSS JOIN public.modules m
WHERE m.route_path IN ('/purchases', '/purchases/vendors', '/purchases/orders')
  AND r.name NOT IN ('ADMIN', 'DIRECCION', 'OPERACIONES')
ON CONFLICT (role_id, module_id) DO NOTHING;
```

-- Migración: Añadir campo territory_code a la tabla public.customers
-- dTS Instruments WebApp - Sincronización con Dynamics 365 Business Central (Campo 'Territory Code')

-- 1. Añadir la columna territory_code si no existe
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS territory_code VARCHAR(50);

-- 2. Crear índice para optimizar búsquedas y filtros por territorio
CREATE INDEX IF NOT EXISTS idx_customers_territory_code 
ON public.customers (territory_code);

-- 3. Documentar la columna en el catálogo de PostgreSQL
COMMENT ON COLUMN public.customers.territory_code IS 'Código de territorio asignado en Business Central (ej. CAT, MAD, AND, NORTE, EXPORT, etc.)';

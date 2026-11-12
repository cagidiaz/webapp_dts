-- Ejecutar solo tras revisar la copia de seguridad y el despliegue coordinado.
-- Añade un campo a la tabla de actividades del CRM; no modifica tablas de BC.
BEGIN;
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS oferta_vinculada varchar(50);
CREATE INDEX IF NOT EXISTS crm_activities_oferta_vinculada_idx
  ON public.crm_activities (oferta_vinculada) WHERE oferta_vinculada IS NOT NULL;
COMMIT;

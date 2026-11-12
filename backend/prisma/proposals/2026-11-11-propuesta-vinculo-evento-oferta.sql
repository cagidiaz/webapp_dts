-- BORRADOR PARA REVISIÓN: no ejecutar todavía.
-- Relación nueva para actividades del CRM; no modifica tablas de BC.
BEGIN;
ALTER TABLE public.crm_activities
  ADD COLUMN oferta_vinculada varchar(50) DEFAULT NULL;
CREATE INDEX crm_activities_oferta_vinculada_idx
  ON public.crm_activities (oferta_vinculada)
  WHERE oferta_vinculada IS NOT NULL;
COMMIT;
-- La limpieza de actividades manuales se definirá en un script separado,
-- tras inventariar y revisar los registros; se conservan correos y vínculos,
-- auditoría, cambios de fase y cortes históricos. No se tocan tablas de BC.

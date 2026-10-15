-- Ampliar exclusivamente la tabla NUEVA de seguimiento del piloto.
-- Ejecutar con el rol propietario de la tabla desde Supabase SQL Editor.
-- No modifica sales_quotes ni ninguna tabla sincronizada desde BC.
-- BC: copia sincronizada, sin sustituir el origen BC en las pantallas.
-- APP: seguimiento gestionado desde la app, protegido frente a importaciones.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.crm_offer_followups DROP CONSTRAINT IF EXISTS crm_offer_followups_source_check;
ALTER TABLE public.crm_offer_followups ADD CONSTRAINT crm_offer_followups_source_check CHECK (source IN ('BC','APP'));
ALTER TABLE public.crm_offer_followups ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.crm_offer_followups DROP CONSTRAINT IF EXISTS crm_offer_followups_app_owner_check;
ALTER TABLE public.crm_offer_followups ADD CONSTRAINT crm_offer_followups_app_owner_check CHECK (source <> 'APP' OR owner_id IS NOT NULL);
COMMIT;

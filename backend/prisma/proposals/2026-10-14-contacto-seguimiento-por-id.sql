-- Ejecutar completo desde Supabase SQL Editor con el propietario de la tabla.
-- Solo modifica crm_offer_followups. contacts y las tablas de BC son solo lectura.
-- contact_id almacena el UUID contacts.id; no el número BC contacts.contact_no.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_offer_followups' AND column_name='contacto_id') THEN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_offer_followups' AND column_name='contact_id') THEN
     RAISE EXCEPTION 'Existen contact_id y contacto_id. Revisar ambas referencias antes de eliminar campos.';
   END IF;
   ALTER TABLE public.crm_offer_followups RENAME COLUMN contacto_id TO contact_id;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_offer_followups' AND column_name='contact_id' AND udt_name='uuid') THEN
   RAISE EXCEPTION 'Se requiere contact_id de tipo uuid. No se han eliminado campos.';
 END IF;
END $$;
ALTER TABLE public.crm_offer_followups
 DROP COLUMN IF EXISTS contacto_nombre,
 DROP COLUMN IF EXISTS contacto_email,
 DROP COLUMN IF EXISTS contacto_telefono;
COMMIT;
-- La referencia existente se conserva. Los cortes publicados mantienen su foto histórica.
-- Se resuelve contacts.id desde la API sin añadir una FK que bloquee importaciones BC.

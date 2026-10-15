-- Solo sobre la base aislada dts_crm_review, antes de cargar el esquema de la API.
DO $$ BEGIN IF current_database()<>'dts_crm_review' THEN RAISE EXCEPTION 'Base incorrecta'; END IF; END $$;
CREATE TABLE public.contacts(id uuid PRIMARY KEY, name text);
INSERT INTO public.contacts VALUES ('60000000-0000-4000-8000-000000000001','Datos BC intactos');
CREATE TABLE public.crm_offer_followups(id uuid PRIMARY KEY, contacto_id uuid, contacto_nombre text, contacto_email text, contacto_telefono text);
INSERT INTO public.crm_offer_followups VALUES ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Duplicado','duplicado@test','123');
\ir ../../prisma/proposals/2026-10-14-contacto-seguimiento-por-id.sql
\ir ../../prisma/proposals/2026-10-14-contacto-seguimiento-por-id.sql
DO $$ BEGIN
 IF (SELECT contact_id FROM public.crm_offer_followups LIMIT 1)<>'60000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'Referencia perdida'; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_offer_followups' AND column_name IN ('contacto_id','contacto_nombre','contacto_email','contacto_telefono')) THEN RAISE EXCEPTION 'Quedan columnas antiguas'; END IF;
 IF (SELECT name FROM public.contacts LIMIT 1)<>'Datos BC intactos' THEN RAISE EXCEPTION 'Tabla BC modificada'; END IF;
 RAISE NOTICE 'PASS: UUID conservado, columnas eliminadas, repetición segura y contacts intacta';
END $$;

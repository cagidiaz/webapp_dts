\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database()<>'outlook_identity_review' OR inet_server_addr()<>'127.0.0.1'::inet OR inet_server_port()<>55438 THEN
   RAISE EXCEPTION 'La prueba solo se permite en la base local aislada de Outlook';
 END IF;
END $$;
CREATE TYPE public.activity_kind AS ENUM ('EMAIL','EVENT','TASK');
CREATE TABLE public.crm_activities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),type public.activity_kind NOT NULL,
 title text,exchange_item_id varchar(255),exchange_web_link text,exchange_sync_status varchar(50)
);
INSERT INTO public.crm_activities(type,title,exchange_item_id,exchange_web_link,exchange_sync_status) VALUES
 ('EMAIL','Existing email','legacy-EWS','https://outlook.office.com/mail/legacy','synced'),
 ('EVENT','Existing calendar','calendar-ID','https://outlook.office.com/calendar/existing','synced');
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY existing_activity_policy ON public.crm_activities FOR SELECT USING (true);
CREATE TABLE public.sales_quotes(document_no text PRIMARY KEY, marker text);
CREATE TABLE public.contacts(contact_no text PRIMARY KEY, marker text);
INSERT INTO public.sales_quotes VALUES('Q1','BC unchanged');
INSERT INTO public.contacts VALUES('C1','BC unchanged');
CREATE TEMP TABLE before_activities AS SELECT * FROM public.crm_activities;
CREATE TEMP TABLE before_permissions AS SELECT relacl,relrowsecurity,relowner FROM pg_class WHERE oid='public.crm_activities'::regclass;

\ir ../../prisma/proposals/2026-10-15-identidad-estable-correos-crm.sql
\ir ../../prisma/proposals/2026-10-15-identidad-estable-correos-crm.sql

DO $$ BEGIN
 IF EXISTS(SELECT id,type,title,exchange_item_id,exchange_web_link,exchange_sync_status FROM public.crm_activities EXCEPT SELECT * FROM before_activities)
 OR EXISTS(SELECT * FROM before_activities EXCEPT SELECT id,type,title,exchange_item_id,exchange_web_link,exchange_sync_status FROM public.crm_activities) THEN RAISE EXCEPTION 'Se modificaron datos anteriores'; END IF;
 IF EXISTS(SELECT 1 FROM public.crm_activities WHERE exchange_tenant_id IS NOT NULL OR exchange_immutable_id IS NOT NULL OR exchange_resolution_status IS NOT NULL) THEN RAISE EXCEPTION 'Se rellenó el histórico'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.crm_activities'::regclass AND polname='existing_activity_policy') THEN RAISE EXCEPTION 'Política original eliminada'; END IF;
 IF EXISTS(SELECT relacl,relrowsecurity,relowner FROM pg_class WHERE oid='public.crm_activities'::regclass EXCEPT SELECT * FROM before_permissions) THEN RAISE EXCEPTION 'Permisos o propietario cambiados'; END IF;
 IF (SELECT marker FROM public.sales_quotes WHERE document_no='Q1')<>'BC unchanged' OR (SELECT marker FROM public.contacts WHERE contact_no='C1')<>'BC unchanged' THEN RAISE EXCEPTION 'Se modificaron datos BC'; END IF;
 BEGIN
   UPDATE public.crm_activities SET exchange_mailbox_id='wrong' WHERE type='EVENT';
   RAISE EXCEPTION 'Se aceptó identidad de email en calendario';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   UPDATE public.crm_activities SET exchange_resolution_status='resolved' WHERE type='EMAIL';
   RAISE EXCEPTION 'Se aceptó identidad incompleta como resuelta';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   UPDATE public.crm_activities SET exchange_original_id_type='guessed' WHERE type='EMAIL';
   RAISE EXCEPTION 'Se aceptó formato inventado';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   UPDATE public.crm_activities SET exchange_resolution_status='invented' WHERE type='EMAIL';
   RAISE EXCEPTION 'Se aceptó estado inventado';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO public.crm_activities(type,title,exchange_tenant_id,exchange_mailbox_id,exchange_immutable_id,exchange_internet_message_id,exchange_original_id_type,exchange_resolution_status,exchange_resolved_at)
SELECT 'EMAIL',title,'tenant-A','mailbox-A','SameCaseSensitiveId','<message@example.invalid>','ewsId','resolved',now()
FROM (VALUES('Commercial association A'),('Commercial association B')) x(title);
-- Same long ID can be referenced by more than one activity without oversized-index errors.
INSERT INTO public.crm_activities(type,exchange_tenant_id,exchange_mailbox_id,exchange_immutable_id,exchange_internet_message_id,exchange_original_id_type,exchange_resolution_status,exchange_resolved_at)
VALUES('EMAIL','tenant-A','mailbox-A',repeat('opaque',3000),'<large@example.invalid>','restId','resolved',now());
DO $$ BEGIN
 IF (SELECT count(*) FROM public.crm_activities WHERE exchange_immutable_id='SameCaseSensitiveId')<>2 THEN RAISE EXCEPTION 'Se perdieron asociaciones múltiples'; END IF;
 IF (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='crm_activities' AND indexname IN ('crm_email_identity_immutable_idx','crm_email_identity_internet_idx'))<>2 THEN RAISE EXCEPTION 'Faltan índices'; END IF;
 RAISE NOTICE 'PASS: migración repetible, histórico y calendario intactos, restricciones válidas, asociaciones múltiples e IDs largos admitidos';
END $$;

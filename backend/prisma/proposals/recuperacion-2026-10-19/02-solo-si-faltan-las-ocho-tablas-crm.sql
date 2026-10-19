-- Recuperación estructural de CRM/Outlook. 19/10/2026.
-- Ejecutar como propietario (postgres) en Supabase SQL Editor, completo.
-- No recupera datos perdidos. No escribe ni modifica tablas de Business Central.
-- Una sola transacción: cualquier error revierte esta ejecución completa.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ DECLARE present_count integer; BEGIN
 SELECT count(*) INTO present_count FROM unnest(ARRAY['crm_prospects','crm_prospect_events','crm_prospect_activities','crm_offer_followups','crm_offer_activities','crm_pipeline_cuts','crm_pipeline_cut_rows','crm_pipeline_cut_events']) n WHERE to_regclass('public.'||n) IS NOT NULL;
 IF present_count<>0 THEN
  RAISE EXCEPTION 'Este archivo es SOLO para las ocho tablas CRM ausentes. Hay % tablas presentes: no ejecutar, revisar diagnóstico y conservar sus datos.',present_count;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.crm_prospects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 company_name varchar(255) NOT NULL CHECK (length(trim(company_name)) > 0),
 company_normalized varchar(255) NOT NULL,
 contact_name varchar(255), email varchar(255), phone varchar(50),
 phase integer NOT NULL DEFAULT 0 CHECK (phase IN (0,1)),
 archived_at timestamptz, version integer NOT NULL DEFAULT 1,
 linked_client_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
 converted_at timestamptz,
 CONSTRAINT crm_prospects_conversion_check CHECK (
   (linked_client_id IS NULL AND converted_at IS NULL) OR
   (linked_client_id IS NOT NULL AND converted_at IS NOT NULL AND archived_at IS NULL)
 ),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT crm_prospects_owner_company_key UNIQUE(owner_id,company_normalized)
);
CREATE INDEX IF NOT EXISTS crm_prospects_owner_archive_idx ON public.crm_prospects(owner_id,archived_at);
CREATE INDEX IF NOT EXISTS crm_prospects_linked_client_idx ON public.crm_prospects(linked_client_id);
CREATE TABLE IF NOT EXISTS public.crm_prospect_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 prospect_id uuid NOT NULL REFERENCES public.crm_prospects(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 type varchar(30) NOT NULL, title varchar(255) NOT NULL, description text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_prospect_events_prospect_date_idx ON public.crm_prospect_events(prospect_id,created_at);
ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.crm_prospect_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 prospect_id uuid NOT NULL REFERENCES public.crm_prospects(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 type varchar(30) NOT NULL CHECK (type IN ('NOTE','TASK','CALL','VISITA','EVENT','VIDEOLLAMADA')),
 title varchar(255) NOT NULL CHECK (length(trim(title)) > 0),
 description text, due_date date, time_scheduled varchar(5), location varchar(500), conclusions text,
 is_completed boolean NOT NULL DEFAULT false,
 exchange_item_id varchar(500) CONSTRAINT crm_prospect_activities_exchange_key UNIQUE,
 exchange_sync_status varchar(30) NOT NULL DEFAULT 'LOCAL', exchange_synced_version integer,
 exchange_last_synced_at timestamptz, exchange_lock_token uuid, exchange_lock_until timestamptz,
 exchange_create_payload jsonb,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (type = 'NOTE' OR due_date IS NOT NULL),
 CHECK (time_scheduled IS NULL OR time_scheduled ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
CREATE INDEX IF NOT EXISTS crm_prospect_activities_prospect_date_idx ON public.crm_prospect_activities(prospect_id,created_at);
ALTER TABLE public.crm_prospect_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_prospect_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_prospects, public.crm_prospect_events, public.crm_prospect_activities FROM anon, authenticated;
-- Acceso exclusivo a través de la API autenticada. Verificar que su rol SQL permite
-- consultar/escribir estas tablas sin conceder acceso directo a clientes Supabase.
-- Reversión operativa: desactivar CRM_PROSPECTS_PILOT_ENABLED. Conservar los datos.
-- No incluir DROP ni limpieza automática de registros del piloto.


CREATE TABLE IF NOT EXISTS public.crm_offer_followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_no varchar(50) NOT NULL UNIQUE,
 source varchar(10) NOT NULL DEFAULT 'APP' CHECK (source IN ('BC','APP')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 estado_oferta varchar(50),
 probabilidad_exito numeric(5,2),
 oferta_type varchar(50),
 cierreprev_date date,
 confirmacion_date date,
 motivo_ganada text,
 motivo_perdida text,
 observaciones text,
 contacto_id varchar NOT NULL CHECK (btrim(contacto_id)<>''),
 proxima_accion text,
 fecha_proxima_accion date,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT crm_offer_followups_contacto_id_fkey
   FOREIGN KEY (contacto_id) REFERENCES public.contacts(contact_no)
   ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT crm_offer_followups_document_no_fkey
   FOREIGN KEY (document_no) REFERENCES public.sales_quotes(document_no)
   ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Esquema final: document_no referencia sales_quotes; contacto_id varchar referencia contacts.contact_no.
CREATE TABLE IF NOT EXISTS public.crm_offer_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), followup_id uuid NOT NULL REFERENCES public.crm_offer_followups(id) ON DELETE RESTRICT,
 author_id uuid, tipo varchar(50) NOT NULL, notas text NOT NULL, fecha timestamptz NOT NULL, hecho boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS crm_offer_followups_contacto_id_idx ON public.crm_offer_followups(contacto_id);
CREATE INDEX IF NOT EXISTS crm_offer_activities_followup_id_fecha_idx ON public.crm_offer_activities(followup_id,fecha);
ALTER TABLE public.crm_offer_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_offer_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_offer_followups, public.crm_offer_activities FROM anon, authenticated;
-- Revisar permisos del rol SQL de la API y flujos n8n antes de aplicar.
-- Desactivar el interruptor del piloto para volver a la lectura anterior; conservar estas filas.


-- No modifica tablas importadas de Business Central.
CREATE TABLE IF NOT EXISTS public.crm_pipeline_cuts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key varchar(150) NOT NULL UNIQUE,
 kind varchar(20) NOT NULL CHECK (kind IN ('MANUAL','WEEKLY')),
 status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','FAILED','PUBLISHED')),
 reason text NOT NULL, created_by uuid, scheduled_at timestamptz, captured_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
 lease_until timestamptz, lease_token uuid, retry_at timestamptz, error_message text,
 row_count integer NOT NULL DEFAULT 0, rules_version varchar(50) NOT NULL DEFAULT 'piloto-v1',
 supersedes_id uuid REFERENCES public.crm_pipeline_cuts(id) ON DELETE RESTRICT,
 CHECK (attempts BETWEEN 0 AND 3), CHECK (row_count >= 0),
 CHECK (status <> 'PUBLISHED' OR captured_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.crm_pipeline_cut_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cut_id uuid NOT NULL REFERENCES public.crm_pipeline_cuts(id) ON DELETE RESTRICT,
 entity_type varchar(20) NOT NULL CHECK (entity_type IN ('OFFER','PROSPECT')), entity_key varchar(100) NOT NULL,
 owner_id uuid, salesperson_code varchar(50), phase varchar(50), source varchar(20) NOT NULL,
 amount numeric(18,4), probability numeric(5,2), payload jsonb NOT NULL,
 UNIQUE(cut_id,entity_type,entity_key)
);
CREATE TABLE IF NOT EXISTS public.crm_pipeline_cut_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cut_id uuid NOT NULL REFERENCES public.crm_pipeline_cuts(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), event varchar(30) NOT NULL, author_id uuid, detail text NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_pipeline_cuts_status_retry_idx ON public.crm_pipeline_cuts(status,retry_at);
CREATE INDEX IF NOT EXISTS crm_pipeline_cut_rows_owner_scope_idx ON public.crm_pipeline_cut_rows(cut_id,owner_id,salesperson_code);
CREATE INDEX IF NOT EXISTS crm_pipeline_cut_events_cut_created_idx ON public.crm_pipeline_cut_events(cut_id,created_at);
ALTER TABLE public.crm_pipeline_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_cut_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_cut_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_pipeline_cuts, public.crm_pipeline_cut_rows, public.crm_pipeline_cut_events FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.guard_pipeline_cut() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' OR OLD.status = 'PUBLISHED' THEN RAISE EXCEPTION 'Los cortes publicados se conservan sin modificaciones'; END IF;
 RETURN NEW;
END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.crm_pipeline_cuts'::regclass AND tgname='pipeline_cut_immutable') THEN
CREATE TRIGGER pipeline_cut_immutable BEFORE UPDATE OR DELETE ON public.crm_pipeline_cuts FOR EACH ROW EXECUTE FUNCTION public.guard_pipeline_cut();
END IF; END $$;
CREATE OR REPLACE FUNCTION public.guard_pipeline_cut_rows() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' OR EXISTS (SELECT 1 FROM public.crm_pipeline_cuts WHERE id=NEW.cut_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'El detalle de un corte es inmutable'; END IF;
 RETURN NEW;
END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.crm_pipeline_cut_rows'::regclass AND tgname='pipeline_cut_rows_immutable') THEN
CREATE TRIGGER pipeline_cut_rows_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.crm_pipeline_cut_rows FOR EACH ROW EXECUTE FUNCTION public.guard_pipeline_cut_rows();
END IF; END $$;
CREATE OR REPLACE FUNCTION public.guard_pipeline_cut_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Los eventos de cortes son inmutables'; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.crm_pipeline_cut_events'::regclass AND tgname='pipeline_cut_events_immutable') THEN
CREATE TRIGGER pipeline_cut_events_immutable BEFORE UPDATE OR DELETE ON public.crm_pipeline_cut_events FOR EACH ROW EXECUTE FUNCTION public.guard_pipeline_cut_events();
END IF; END $$;


-- Solo las tablas nuevas: acceso directo bloqueado para el navegador.
REVOKE ALL ON TABLE
 public.crm_prospects, public.crm_prospect_events, public.crm_prospect_activities,
 public.crm_offer_followups, public.crm_offer_activities,
 public.crm_pipeline_cuts, public.crm_pipeline_cut_rows, public.crm_pipeline_cut_events
FROM PUBLIC, anon, authenticated;

-- La API de servidor también puede usar service_role; nunca publicar su clave.
-- La conexión Prisma como postgres dispone de los permisos del propietario.
GRANT SELECT, INSERT, UPDATE ON TABLE
 public.crm_prospects, public.crm_prospect_events, public.crm_prospect_activities,
 public.crm_offer_followups, public.crm_offer_activities,
 public.crm_pipeline_cuts, public.crm_pipeline_cut_rows, public.crm_pipeline_cut_events
TO service_role;

COMMIT;

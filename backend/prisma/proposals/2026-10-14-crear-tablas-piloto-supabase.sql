-- CRM Oportunidades: creación de las ocho tablas nuevas del piloto.
-- Ejecutar completo UNA VEZ en Supabase SQL Editor, con el rol postgres.
-- Las tablas sincronizadas desde Business Central son SOLO LECTURA para la app.
-- Este archivo no modifica sus datos, columnas, índices, permisos ni triggers.
-- profiles y customers se referencian únicamente mediante claves externas.
-- No activa el piloto, Outlook ni los cortes automáticos.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Si ya hay alguna tabla del piloto, detenerse: no sobrescribir ni borrar datos.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'crm_prospects','crm_prospect_events','crm_prospect_activities',
    'crm_offer_followups','crm_offer_activities',
    'crm_pipeline_cuts','crm_pipeline_cut_rows','crm_pipeline_cut_events'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      RAISE EXCEPTION 'Ya existe public.%. No volver a ejecutar: revisar el esquema existente.', table_name;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.profiles') AND attname='id' AND atttypid='uuid'::regtype AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.customers') AND attname='id' AND atttypid='uuid'::regtype AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Se requieren public.profiles(id uuid) y public.customers(id uuid). No se han modificado tablas existentes.';
  END IF;
END $$;

-- Aplicar únicamente tras revisar copia, permisos del usuario SQL de la API y esquema real.
CREATE TABLE public.crm_prospects (
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
CREATE INDEX crm_prospects_owner_archive_idx ON public.crm_prospects(owner_id,archived_at);
CREATE INDEX crm_prospects_linked_client_idx ON public.crm_prospects(linked_client_id);
CREATE TABLE public.crm_prospect_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 prospect_id uuid NOT NULL REFERENCES public.crm_prospects(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 type varchar(30) NOT NULL, title varchar(255) NOT NULL, description text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_prospect_events_prospect_date_idx ON public.crm_prospect_events(prospect_id,created_at);
ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.crm_prospect_activities (
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
CREATE INDEX crm_prospect_activities_prospect_date_idx ON public.crm_prospect_activities(prospect_id,created_at);
ALTER TABLE public.crm_prospect_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_prospect_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_prospects, public.crm_prospect_events, public.crm_prospect_activities FROM anon, authenticated;
-- Acceso exclusivo a través de la API autenticada. Verificar que su rol SQL permite
-- consultar/escribir estas tablas sin conceder acceso directo a clientes Supabase.
-- Reversión operativa: desactivar CRM_PROSPECTS_PILOT_ENABLED. Conservar los datos.
-- No incluir DROP ni limpieza automática de registros del piloto.


CREATE TABLE public.crm_offer_followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_no varchar(50) NOT NULL UNIQUE,
 owner_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 source varchar(10) NOT NULL DEFAULT 'APP' CHECK(source IN ('BC','APP')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 estado_oferta varchar(50), probabilidad_exito numeric(5,2), oferta_type varchar(50),
 cierreprev_date date, confirmacion_date date, motivo_ganada text, motivo_perdida text, observaciones text,
 contact_id uuid,
 proxima_accion text, fecha_proxima_accion date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT crm_offer_followups_app_owner_check CHECK (source <> 'APP' OR owner_id IS NOT NULL)
);
-- Sin FK a sales_quotes: una sincronización que recree la oferta no borra el seguimiento.
CREATE TABLE public.crm_offer_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), followup_id uuid NOT NULL REFERENCES public.crm_offer_followups(id) ON DELETE RESTRICT,
 author_id uuid, tipo varchar(50) NOT NULL, notas text NOT NULL, fecha timestamptz NOT NULL, hecho boolean NOT NULL DEFAULT false
);
CREATE INDEX crm_offer_activities_followup_id_fecha_idx ON public.crm_offer_activities(followup_id,fecha);
ALTER TABLE public.crm_offer_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_offer_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_offer_followups, public.crm_offer_activities FROM anon, authenticated;
-- Revisar permisos del rol SQL de la API y flujos n8n antes de aplicar.
-- Desactivar el interruptor del piloto para volver a la lectura anterior; conservar estas filas.


-- No modifica tablas importadas de Business Central.
CREATE TABLE public.crm_pipeline_cuts (
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
CREATE TABLE public.crm_pipeline_cut_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cut_id uuid NOT NULL REFERENCES public.crm_pipeline_cuts(id) ON DELETE RESTRICT,
 entity_type varchar(20) NOT NULL CHECK (entity_type IN ('OFFER','PROSPECT')), entity_key varchar(100) NOT NULL,
 owner_id uuid, salesperson_code varchar(50), phase varchar(50), source varchar(20) NOT NULL,
 amount numeric(18,4), probability numeric(5,2), payload jsonb NOT NULL,
 UNIQUE(cut_id,entity_type,entity_key)
);
CREATE TABLE public.crm_pipeline_cut_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cut_id uuid NOT NULL REFERENCES public.crm_pipeline_cuts(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), event varchar(30) NOT NULL, author_id uuid, detail text NOT NULL
);
CREATE INDEX ON public.crm_pipeline_cuts(status,retry_at);
CREATE INDEX ON public.crm_pipeline_cut_rows(cut_id,owner_id,salesperson_code);
CREATE INDEX ON public.crm_pipeline_cut_events(cut_id,created_at);
ALTER TABLE public.crm_pipeline_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_cut_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_cut_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_pipeline_cuts, public.crm_pipeline_cut_rows, public.crm_pipeline_cut_events FROM anon, authenticated;
CREATE FUNCTION public.guard_pipeline_cut() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' OR OLD.status = 'PUBLISHED' THEN RAISE EXCEPTION 'Los cortes publicados se conservan sin modificaciones'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pipeline_cut_immutable BEFORE UPDATE OR DELETE ON public.crm_pipeline_cuts FOR EACH ROW EXECUTE FUNCTION public.guard_pipeline_cut();
CREATE FUNCTION public.guard_pipeline_cut_rows() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' OR EXISTS (SELECT 1 FROM public.crm_pipeline_cuts WHERE id=NEW.cut_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'El detalle de un corte es inmutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pipeline_cut_rows_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.crm_pipeline_cut_rows FOR EACH ROW EXECUTE FUNCTION public.guard_pipeline_cut_rows();
CREATE FUNCTION public.guard_pipeline_cut_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Los eventos de cortes son inmutables'; END $$;
CREATE TRIGGER pipeline_cut_events_immutable BEFORE UPDATE OR DELETE ON public.crm_pipeline_cut_events FOR EACH ROW EXECUTE FUNCTION public.guard_pipeline_cut_events();


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

-- Resultado esperado: ocho filas, todas con rls_habilitado = true.
SELECT c.relname AS tabla, c.relrowsecurity AS rls_habilitado
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN (
 'crm_prospects','crm_prospect_events','crm_prospect_activities',
 'crm_offer_followups','crm_offer_activities',
 'crm_pipeline_cuts','crm_pipeline_cut_rows','crm_pipeline_cut_events'
) ORDER BY c.relname;

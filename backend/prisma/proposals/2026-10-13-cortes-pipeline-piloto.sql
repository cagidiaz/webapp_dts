-- PROPUESTA: revisar y aplicar únicamente durante la activación autorizada del piloto.
-- No modifica tablas importadas de Business Central.
BEGIN;
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
COMMIT;

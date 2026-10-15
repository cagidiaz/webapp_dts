-- PROPUESTA PARA REVISIÓN. NO EJECUTADA. No modifica tablas importadas desde BC.
-- Aplicar únicamente tras revisar copia, permisos del usuario SQL de la API y esquema real.
BEGIN;
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
COMMIT;
-- Reversión operativa: desactivar CRM_PROSPECTS_PILOT_ENABLED. Conservar los datos.
-- No incluir DROP ni limpieza automática de registros del piloto.

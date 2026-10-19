-- Recuperación estructural de CRM/Outlook. 19/10/2026.
-- Ejecutar como propietario (postgres) en Supabase SQL Editor, completo.
-- No recupera datos perdidos. No escribe ni modifica tablas de Business Central.
-- Una sola transacción: cualquier error revierte esta ejecución completa.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF to_regclass('public.profiles') IS NULL OR to_regclass('public.crm_activities') IS NULL THEN
  RAISE EXCEPTION 'Faltan tablas base profiles/crm_activities. No continuar: revisar la copia restaurada.';
 END IF;
END $$;
-- Origen verificado: 2026-10-15-identidad-estable-correos-crm.sql
-- Fase 1. Ampliación aditiva de datos propios del CRM. Ejecutar completo en SQL Editor.
-- No modifica datos, estructura, permisos ni triggers de tablas importadas desde BC.
-- No borra ni rellena actividades existentes, no cambia calendarios ni los IDs antiguos.
-- Aplicar antes de incorporar los campos nuevos al modelo Prisma de producción.
DO $$ BEGIN
 IF to_regclass('public.crm_activities') IS NULL THEN
   RAISE EXCEPTION 'No existe public.crm_activities. No se realizará ninguna operación.';
 END IF;
 IF EXISTS (
   SELECT 1 FROM (VALUES
     ('exchange_tenant_id','character varying'),
     ('exchange_mailbox_id','character varying'),
     ('exchange_immutable_id','text'),
     ('exchange_original_id_type','character varying'),
     ('exchange_internet_message_id','text'),
     ('exchange_resolution_status','character varying'),
     ('exchange_resolved_at','timestamp with time zone')
   ) AS expected(name,kind)
   JOIN information_schema.columns c ON c.table_schema='public' AND c.table_name='crm_activities' AND c.column_name=expected.name
   WHERE c.data_type<>expected.kind OR c.is_nullable<>'YES'
      OR (expected.kind='character varying' AND c.character_maximum_length IS DISTINCT FROM
        CASE WHEN expected.name IN ('exchange_original_id_type','exchange_resolution_status') THEN 32 ELSE 255 END)
 ) THEN
   RAISE EXCEPTION 'Hay columnas de identidad con un esquema incompatible. Revisar antes de ejecutar.';
 END IF;
END $$;

ALTER TABLE public.crm_activities
 ADD COLUMN IF NOT EXISTS exchange_tenant_id varchar(255),
 ADD COLUMN IF NOT EXISTS exchange_mailbox_id varchar(255),
 ADD COLUMN IF NOT EXISTS exchange_immutable_id text,
 ADD COLUMN IF NOT EXISTS exchange_original_id_type varchar(32),
 ADD COLUMN IF NOT EXISTS exchange_internet_message_id text,
 ADD COLUMN IF NOT EXISTS exchange_resolution_status varchar(32),
 ADD COLUMN IF NOT EXISTS exchange_resolved_at timestamptz;

-- Solo se reemplazan restricciones nuevas propias de esta migración.
ALTER TABLE public.crm_activities
 DROP CONSTRAINT IF EXISTS crm_email_identity_type_check,
 DROP CONSTRAINT IF EXISTS crm_email_identity_format_check,
 DROP CONSTRAINT IF EXISTS crm_email_identity_status_check,
 DROP CONSTRAINT IF EXISTS crm_email_identity_resolved_check;

ALTER TABLE public.crm_activities
 ADD CONSTRAINT crm_email_identity_type_check CHECK (
   type::text='EMAIL' OR (
     exchange_tenant_id IS NULL AND exchange_mailbox_id IS NULL AND exchange_immutable_id IS NULL
     AND exchange_original_id_type IS NULL AND exchange_internet_message_id IS NULL
     AND exchange_resolution_status IS NULL AND exchange_resolved_at IS NULL
   )
 ),
 ADD CONSTRAINT crm_email_identity_format_check CHECK (
   exchange_original_id_type IS NULL OR exchange_original_id_type IN ('ewsId','restId','restImmutableEntryId','entryId','unknown')
 ),
 ADD CONSTRAINT crm_email_identity_status_check CHECK (
   exchange_resolution_status IS NULL OR exchange_resolution_status IN ('pending','resolved','not_found','ambiguous','access_denied','reconnect_required','temporary_error')
 ),
 ADD CONSTRAINT crm_email_identity_resolved_check CHECK (
   exchange_resolution_status IS DISTINCT FROM 'resolved' OR (
     exchange_tenant_id IS NOT NULL AND btrim(exchange_tenant_id)<>''
     AND exchange_mailbox_id IS NOT NULL AND btrim(exchange_mailbox_id)<>''
     AND exchange_immutable_id IS NOT NULL AND btrim(exchange_immutable_id)<>''
     AND exchange_internet_message_id IS NOT NULL AND btrim(exchange_internet_message_id)<>''
     AND exchange_original_id_type IS NOT NULL AND exchange_resolved_at IS NOT NULL
   )
 );

-- Índices NO únicos: un mismo correo puede conservar varias asociaciones comerciales.
-- La huella evita claves de índice demasiado largas; la consulta comprobará también el ID original completo.
CREATE INDEX IF NOT EXISTS crm_email_identity_immutable_idx
 ON public.crm_activities(exchange_tenant_id,exchange_mailbox_id,md5(exchange_immutable_id))
 WHERE type='EMAIL' AND exchange_immutable_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_email_identity_internet_idx
 ON public.crm_activities(exchange_tenant_id,exchange_mailbox_id,md5(exchange_internet_message_id))
 WHERE type='EMAIL' AND exchange_internet_message_id IS NOT NULL;

-- Origen verificado: 2026-10-15-outlook-classic-dispositivos-solicitudes.sql
-- Fase 4. Solo dos tablas nuevas del CRM. No cambia ninguna tabla existente ni datos de BC.
-- Ejecutar con el propietario de la base. El acceso pasa exclusivamente por el backend.
CREATE TABLE IF NOT EXISTS public.crm_outlook_devices (
 id uuid PRIMARY KEY,
 user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
 label varchar(80) NOT NULL,
 public_key_pem text NOT NULL,
 public_key_sha256 varchar(64) NOT NULL,
 pairing_secret_hash varchar(64) NOT NULL,
 pairing_code_hash varchar(64) NOT NULL,
 pairing_expires_at timestamptz NOT NULL,
 pairing_attempts integer NOT NULL DEFAULT 0 CHECK (pairing_attempts BETWEEN 0 AND 5),
 paired_at timestamptz,
 revoked_at timestamptz,
 last_seen_at timestamptz,
 helper_version varchar(24),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((user_id IS NULL AND paired_at IS NULL) OR (user_id IS NOT NULL AND paired_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS crm_outlook_devices_user_idx ON public.crm_outlook_devices(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS crm_outlook_devices_pair_expiry_idx ON public.crm_outlook_devices(pairing_expires_at) WHERE user_id IS NULL;
CREATE TABLE IF NOT EXISTS public.crm_outlook_requests (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES public.crm_outlook_devices(id) ON DELETE CASCADE,
 activity_id uuid NOT NULL REFERENCES public.crm_activities(id) ON DELETE CASCADE,
 token_hash varchar(64) NOT NULL,
 tenant_id varchar(255) NOT NULL,
 mailbox_id varchar(255) NOT NULL,
 immutable_id text NOT NULL,
 internet_message_id text NOT NULL,
 state varchar(24) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','claiming','claimed','opened','failed')),
 claim_nonce_hash varchar(64),
 outcome varchar(40),
 helper_version varchar(24),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 claimed_at timestamptz,
 completed_at timestamptz,
 CHECK (expires_at > created_at AND expires_at <= created_at + interval '2 minutes'),
 CHECK (state NOT IN ('claimed','opened') OR (claimed_at IS NOT NULL AND claim_nonce_hash IS NOT NULL)),
 CHECK (state <> 'opened' OR (completed_at IS NOT NULL AND outcome='opened'))
);
CREATE INDEX IF NOT EXISTS crm_outlook_requests_owner_idx ON public.crm_outlook_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_outlook_requests_expiry_idx ON public.crm_outlook_requests(expires_at);
ALTER TABLE public.crm_outlook_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_outlook_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_outlook_devices, public.crm_outlook_requests FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON public.crm_outlook_devices, public.crm_outlook_requests FROM %I', role_name);
  END IF;
 END LOOP;
END $$;

-- Origen verificado: 2026-10-16-outlook-respuestas-verificadas.sql
-- Solo una columna en la tabla propia de solicitudes de Classic. No modifica tablas de BC.
ALTER TABLE public.crm_outlook_requests ADD COLUMN IF NOT EXISTS action varchar(16) NOT NULL DEFAULT 'open';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.crm_outlook_requests'::regclass AND conname='crm_outlook_requests_action_check') THEN
  ALTER TABLE public.crm_outlook_requests ADD CONSTRAINT crm_outlook_requests_action_check CHECK(action IN ('open','reply','reply_all'));
 END IF;
END $$;

COMMIT;
-- SOLO LECTURA. Ejecutar primero y conservar el resultado.
-- No recupera registros ni cambia objetos. Revisar antes de restaurar datos desde una copia.
SELECT name AS tabla, to_regclass('public.'||name) IS NOT NULL AS existe
FROM unnest(ARRAY['crm_prospects','crm_prospect_events','crm_prospect_activities','crm_offer_followups','crm_offer_activities','crm_pipeline_cuts','crm_pipeline_cut_rows','crm_pipeline_cut_events','crm_outlook_devices','crm_outlook_requests']) name ORDER BY name;
SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public'
AND (table_name IN ('crm_offer_followups','crm_outlook_devices','crm_outlook_requests')
OR (table_name='crm_activities' AND column_name LIKE 'exchange_%'))
ORDER BY table_name,ordinal_position;
SELECT c.relname AS tabla,c.relrowsecurity AS rls,c.relowner::regrole AS propietario,
has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE') AS permisos_del_ejecutor
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('crm_prospects','crm_prospect_events','crm_prospect_activities','crm_offer_followups','crm_offer_activities','crm_pipeline_cuts','crm_pipeline_cut_rows','crm_pipeline_cut_events','crm_outlook_devices','crm_outlook_requests') ORDER BY c.relname;

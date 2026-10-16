-- Fase 4. Solo dos tablas nuevas del CRM. No cambia ninguna tabla existente ni datos de BC.
-- Ejecutar con el propietario de la base. El acceso pasa exclusivamente por el backend.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
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
COMMIT;
SELECT table_name FROM information_schema.tables WHERE table_schema='public'
 AND table_name IN ('crm_outlook_devices','crm_outlook_requests') ORDER BY table_name;

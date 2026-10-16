-- Solo una columna en la tabla propia de solicitudes de Classic. No modifica tablas de BC.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.crm_outlook_requests ADD COLUMN IF NOT EXISTS action varchar(16) NOT NULL DEFAULT 'open';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.crm_outlook_requests'::regclass AND conname='crm_outlook_requests_action_check') THEN
  ALTER TABLE public.crm_outlook_requests ADD CONSTRAINT crm_outlook_requests_action_check CHECK(action IN ('open','reply','reply_all'));
 END IF;
END $$;
COMMIT;

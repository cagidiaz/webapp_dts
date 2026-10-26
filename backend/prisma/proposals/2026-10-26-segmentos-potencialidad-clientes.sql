-- Ejecutar en Supabase SQL Editor con el propietario de la base.
-- Solo crea una tabla independiente. No altera datos, columnas ni permisos de BC.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.crm_customer_segments (
  client_id varchar(50) NOT NULL REFERENCES public.customers(client_id) ON DELETE RESTRICT,
  segment_code varchar(40) NOT NULL CHECK (segment_code IN (
    'dtstemp-atex', 'dtstemp-oem', 'dtstemp-process', 'dtstemp-varios',
    'dtspres-oem', 'dtspres-process', 'dtsflow-basics', 'dtsflow-process', 'dtsflow-tronic',
    'dtscal', 'dtslevel', 'dtssens'
  )),
  potential_amount numeric(14,2) CHECK (potential_amount >= 0),
  billing_amount numeric(14,2) CHECK (billing_amount IS NULL),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, segment_code)
);
COMMENT ON COLUMN public.crm_customer_segments.potential_amount IS 'Estimación anual de ventas en EUR. NULL = pendiente de estimar; cero = estimación cero.';
COMMENT ON COLUMN public.crm_customer_segments.billing_amount IS 'Pendiente de definir. Debe permanecer NULL; no representa cero facturado.';
ALTER TABLE public.crm_customer_segments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_customer_segments FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON public.crm_customer_segments FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
-- La aplicación accede por backend con el propietario/BYPASSRLS de la base,
-- igual que las otras tablas locales del CRM. No se accede con el SDK de Supabase.
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_customer_segments';

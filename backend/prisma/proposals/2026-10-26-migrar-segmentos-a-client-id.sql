-- SOLO si ya se ejecutó la primera versión de segmentos con customer_id UUID.
-- Si todavía no existe crm_customer_segments, utilizar el SQL de creación actualizado.
-- Conserva filas e importes. Solo modifica la tabla local de segmentos, nunca customers.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.crm_customer_segments IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE column_number smallint; constraint_name text;
BEGIN
  SELECT attnum INTO column_number FROM pg_attribute
    WHERE attrelid = 'public.crm_customer_segments'::regclass AND attname = 'customer_id' AND NOT attisdropped;
  IF column_number IS NULL THEN
    RAISE EXCEPTION 'Esta tabla no tiene customer_id UUID. No se aplica la migración; comprueba si ya usa client_id.';
  END IF;
  ALTER TABLE public.crm_customer_segments ADD COLUMN client_id varchar(50);
  UPDATE public.crm_customer_segments AS s SET client_id = c.client_id
    FROM public.customers AS c WHERE c.id = s.customer_id;
  IF EXISTS (SELECT 1 FROM public.crm_customer_segments WHERE client_id IS NULL) THEN
    RAISE EXCEPTION 'Hay segmentos sin cliente identificable. Se cancela sin borrar datos.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.crm_customer_segments GROUP BY client_id, segment_code HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Hay segmentos duplicados por código de cliente. Se cancela sin borrar datos.';
  END IF;
  FOR constraint_name IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.crm_customer_segments'::regclass AND column_number = ANY(conkey) AND contype IN ('p','f')
  LOOP
    EXECUTE format('ALTER TABLE public.crm_customer_segments DROP CONSTRAINT %I', constraint_name);
  END LOOP;
  ALTER TABLE public.crm_customer_segments
    ALTER COLUMN client_id SET NOT NULL,
    DROP COLUMN customer_id,
    ADD PRIMARY KEY (client_id, segment_code),
    ADD CONSTRAINT crm_customer_segments_client_id_fkey FOREIGN KEY (client_id)
      REFERENCES public.customers(client_id) ON DELETE RESTRICT;
END $$;
COMMIT;
SELECT column_name, data_type, character_maximum_length FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'crm_customer_segments' AND column_name = 'client_id';

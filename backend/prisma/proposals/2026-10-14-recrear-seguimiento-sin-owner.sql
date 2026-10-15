-- Recrear crm_offer_followups con 17 campos, sin owner_id ni datos duplicados de contacto.
-- Ejecutar COMPLETO con el rol propietario en Supabase SQL Editor.
-- Detener la app y el flujo n8n durante la operación y adaptar el backend antes de reanudarlos.
-- Se conserva el seguimiento existente, sus UUID, versiones y actividades vinculadas.
-- No modifica sales_quotes, contacts ni ninguna tabla importada de BC. No usa CASCADE.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.crm_offer_followups IN ACCESS EXCLUSIVE MODE;

DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_constraint WHERE confrelid='public.crm_offer_followups'::regclass AND contype='f' AND conrelid<>'public.crm_offer_activities'::regclass) THEN
   RAISE EXCEPTION 'Hay dependencias adicionales. Revisarlas antes de recrear la tabla.';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.crm_offer_followups'::regclass)
 OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.crm_offer_followups'::regclass AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Hay políticas o triggers personalizados. Revisarlos antes de recrear la tabla.';
 END IF;
END $$;

CREATE TEMP TABLE dts_followup_saved ON COMMIT DROP AS
SELECT id, document_no, source, version, estado_oferta, probabilidad_exito,
 oferta_type, cierreprev_date, confirmacion_date, motivo_ganada, motivo_perdida,
 observaciones,
 COALESCE(NULLIF(to_jsonb(t)->>'contact_id',''),NULLIF(to_jsonb(t)->>'contacto_id','')) AS contacto_id,
 proxima_accion, fecha_proxima_accion, created_at, updated_at
FROM public.crm_offer_followups t;

DO $$ BEGIN
 IF EXISTS (
   SELECT 1 FROM dts_followup_saved f
   LEFT JOIN public.contacts c ON c.contact_no=f.contacto_id
   LEFT JOIN public.sales_quotes q ON q.document_no=f.document_no
   WHERE f.contacto_id IS NULL OR btrim(f.contacto_id)='' OR c.contact_no IS NULL
      OR q.document_no IS NULL OR nullif(btrim(q.salesperson_code),'') IS NULL
      OR c.client_id IS DISTINCT FROM q.customer_no
 ) THEN
   RAISE EXCEPTION 'Hay seguimientos sin oferta, comercial o contacto válido del cliente. Corregirlos antes de recrear la tabla.';
 END IF;
END $$;

CREATE TEMP TABLE dts_followup_owner ON COMMIT DROP AS
SELECT pg_get_userbyid(relowner) AS role_name FROM pg_class WHERE oid='public.crm_offer_followups'::regclass;
CREATE TEMP TABLE dts_followup_grants ON COMMIT DROP AS
SELECT r.rolname AS role_name, e.privilege_type, e.is_grantable
FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) e
JOIN pg_roles r ON r.oid=e.grantee
WHERE c.oid='public.crm_offer_followups'::regclass AND r.rolname NOT IN ('anon','authenticated');
CREATE TEMP TABLE dts_followup_fk ON COMMIT DROP AS
SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE confrelid='public.crm_offer_followups'::regclass AND contype='f';

DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT * FROM dts_followup_fk LOOP
   EXECUTE format('ALTER TABLE public.crm_offer_activities DROP CONSTRAINT %I',item.conname);
 END LOOP;
END $$;

DROP TABLE public.crm_offer_followups;
CREATE TABLE public.crm_offer_followups (
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
-- document_no se resuelve contra sales_quotes; contacto_id contiene contacts.contact_no.
-- Se conserva varchar sin limite, tal como existe en Supabase; no se convierten los valores.
-- Las ofertas y contactos con seguimiento no se pueden eliminar.
-- n8n debe importar primero ofertas/contactos y conservar las filas source APP.
CREATE INDEX crm_offer_followups_contacto_id_idx ON public.crm_offer_followups(contacto_id);
INSERT INTO public.crm_offer_followups SELECT * FROM dts_followup_saved;

DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT * FROM dts_followup_fk LOOP
   EXECUTE format('ALTER TABLE public.crm_offer_activities ADD CONSTRAINT %I %s',item.conname,item.definition);
 END LOOP;
END $$;
ALTER TABLE public.crm_offer_followups ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE item record; BEGIN
 SELECT role_name INTO item FROM dts_followup_owner;
 EXECUTE format('ALTER TABLE public.crm_offer_followups OWNER TO %I',item.role_name);
 FOR item IN SELECT * FROM dts_followup_grants LOOP
   EXECUTE format('GRANT %s ON TABLE public.crm_offer_followups TO %I%s',item.privilege_type,item.role_name,CASE WHEN item.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
 END LOOP;
END $$;
REVOKE ALL ON TABLE public.crm_offer_followups FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.crm_offer_followups)<>(SELECT count(*) FROM dts_followup_saved) THEN
   RAISE EXCEPTION 'Recuento distinto. Operación revertida.';
 END IF;
END $$;
COMMIT;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='crm_offer_followups' ORDER BY ordinal_position;

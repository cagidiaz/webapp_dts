-- PROPUESTA NO EJECUTADA. No modifica tablas BC ni la tabla CRM anterior.
BEGIN;
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
COMMIT;
-- Revisar permisos del rol SQL de la API y flujos n8n antes de aplicar.
-- Desactivar el interruptor del piloto para volver a la lectura anterior; conservar estas filas.

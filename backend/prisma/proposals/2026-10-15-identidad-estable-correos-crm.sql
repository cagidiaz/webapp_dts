-- Fase 1. Ampliación aditiva de datos propios del CRM. Ejecutar completo en SQL Editor.
-- No modifica datos, estructura, permisos ni triggers de tablas importadas desde BC.
-- No borra ni rellena actividades existentes, no cambia calendarios ni los IDs antiguos.
-- Aplicar antes de incorporar los campos nuevos al modelo Prisma de producción.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

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
COMMIT;

SELECT column_name,data_type,is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='crm_activities' AND column_name IN (
 'exchange_tenant_id','exchange_mailbox_id','exchange_immutable_id','exchange_original_id_type',
 'exchange_internet_message_id','exchange_resolution_status','exchange_resolved_at'
) ORDER BY ordinal_position;

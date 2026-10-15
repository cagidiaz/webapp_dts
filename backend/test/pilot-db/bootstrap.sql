-- Solo se carga en el contenedor de revisión, sin conexiones a Supabase.
DO $$ BEGIN
 IF current_database() <> 'dts_crm_review' THEN RAISE EXCEPTION 'Base de revisión incorrecta'; END IF;
END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

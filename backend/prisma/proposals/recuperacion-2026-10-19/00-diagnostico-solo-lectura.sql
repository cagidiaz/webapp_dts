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

\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE cut uuid; rejected boolean;
BEGIN
 IF current_database() <> 'dts_crm_review' THEN RAISE EXCEPTION 'Ejecutar solo en la base aislada dts_crm_review'; END IF;
 INSERT INTO public.crm_pipeline_cuts(request_key,kind,reason,status) VALUES ('review-only','MANUAL','Prueba aislada','RUNNING') RETURNING id INTO cut;
 INSERT INTO public.crm_pipeline_cut_rows(cut_id,entity_type,entity_key,phase,source,amount,probability,payload)
 VALUES (cut,'OFFER','OF-TEST','aceptada','APP',1234.5678,90,'{}'),(cut,'PROSPECT','P-TEST','Fase 0','APP',NULL,NULL,'{}');
 INSERT INTO public.crm_pipeline_cut_events(cut_id,event,detail) VALUES (cut,'PUBLISHED','Prueba');
 UPDATE public.crm_pipeline_cuts SET status='PUBLISHED',captured_at=transaction_timestamp(),row_count=2 WHERE id=cut;
 IF (SELECT amount FROM public.crm_pipeline_cut_rows WHERE cut_id=cut AND entity_key='OF-TEST') <> 1234.5678 THEN RAISE EXCEPTION 'Deriva decimal'; END IF;
 IF (SELECT amount FROM public.crm_pipeline_cut_rows WHERE cut_id=cut AND entity_key='P-TEST') IS NOT NULL THEN RAISE EXCEPTION 'Se inventó importe'; END IF;
 rejected:=false;
 BEGIN UPDATE public.crm_pipeline_cuts SET reason='Cambio' WHERE id=cut; EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'La cabecera publicada se pudo modificar'; END IF;
 rejected:=false;
 BEGIN UPDATE public.crm_pipeline_cut_rows SET amount=0 WHERE cut_id=cut; EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'El detalle se pudo modificar'; END IF;
 rejected:=false;
 BEGIN DELETE FROM public.crm_pipeline_cut_rows WHERE cut_id=cut; EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'El detalle se pudo borrar'; END IF;
 rejected:=false;
 BEGIN INSERT INTO public.crm_pipeline_cut_rows(cut_id,entity_type,entity_key,source,payload) VALUES(cut,'OFFER','NUEVA','APP','{}'); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Se añadieron filas a una captura publicada'; END IF;
 rejected:=false;
 BEGIN DELETE FROM public.crm_pipeline_cut_events WHERE cut_id=cut; EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Se borró auditoría'; END IF;
 rejected:=false;
 BEGIN INSERT INTO public.crm_pipeline_cuts(request_key,kind,reason) VALUES ('review-only','MANUAL','Duplicado'); EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'La clave de solicitud no es única'; END IF;
 IF has_table_privilege('authenticated','public.crm_pipeline_cut_rows','SELECT') OR has_table_privilege('anon','public.crm_pipeline_cut_rows','INSERT') THEN RAISE EXCEPTION 'Permiso directo inesperado'; END IF;
 RAISE NOTICE 'PASS: precisión, nulos, cabecera/detalle/auditoría inmutables, clave única y permisos';
END $$;
-- Comprobar rollback de una captura parcial sin guardar datos de prueba.
SAVEPOINT partial_capture;
INSERT INTO public.crm_pipeline_cuts(request_key,kind,reason,status) VALUES ('partial-only','MANUAL','Rollback','RUNNING');
INSERT INTO public.crm_pipeline_cut_rows(cut_id,entity_type,entity_key,source,payload)
SELECT id,'OFFER','PARCIAL','APP','{}' FROM public.crm_pipeline_cuts WHERE request_key='partial-only';
ROLLBACK TO SAVEPOINT partial_capture;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.crm_pipeline_cuts WHERE request_key='partial-only') THEN RAISE EXCEPTION 'Captura parcial persistida'; END IF; END $$;
ROLLBACK;

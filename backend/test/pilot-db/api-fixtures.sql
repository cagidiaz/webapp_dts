-- Datos inventados para probar HTTP/permisos en dts_crm_api_review.
DO $$ BEGIN
 IF current_database() <> 'dts_crm_api_review' THEN RAISE EXCEPTION 'Base API de revisión incorrecta'; END IF;
END $$;

INSERT INTO auth.users (id, email) VALUES
 ('10000000-0000-4000-8000-000000000001', 'aciurans@dtsinstruments.com'),
 ('10000000-0000-4000-8000-000000000002', 'vendedor@example.invalid'),
 ('10000000-0000-4000-8000-000000000003', 'admin@example.invalid');

INSERT INTO roles (id, name) VALUES
 ('20000000-0000-4000-8000-000000000001', 'TESTER'),
 ('20000000-0000-4000-8000-000000000002', 'VENTAS'),
 ('20000000-0000-4000-8000-000000000003', 'ADMIN');

INSERT INTO sales_reps (code, name) VALUES ('ACI', 'Vendedor piloto'), ('BOB', 'Vendedor demo');

INSERT INTO profiles (id, email, first_name, last_name, role_id, is_active, code) VALUES
 ('10000000-0000-4000-8000-000000000001', 'aciurans@dtsinstruments.com', 'Antoni', 'Piloto', '20000000-0000-4000-8000-000000000001', true, 'ACI'),
 ('10000000-0000-4000-8000-000000000002', 'vendedor@example.invalid', 'Vendedor', 'Demo', '20000000-0000-4000-8000-000000000002', true, 'BOB'),
 ('10000000-0000-4000-8000-000000000003', 'admin@example.invalid', 'Admin', 'Demo', '20000000-0000-4000-8000-000000000003', true, null);

INSERT INTO modules (id, name, route_path, is_active) VALUES
 ('30000000-0000-4000-8000-000000000001', 'CRM demo', '/crm', true),
 ('30000000-0000-4000-8000-000000000002', 'Pipeline demo', '/crm/pipeline', true);
INSERT INTO role_modules (role_id, module_id, can_view)
 SELECT role_id, module_id, true
 FROM (VALUES
  ('20000000-0000-4000-8000-000000000001'::uuid),
  ('20000000-0000-4000-8000-000000000002'::uuid),
  ('20000000-0000-4000-8000-000000000003'::uuid)
 ) AS role_ids(role_id)
 CROSS JOIN (VALUES
  ('30000000-0000-4000-8000-000000000001'::uuid),
  ('30000000-0000-4000-8000-000000000002'::uuid)
 ) AS module_ids(module_id);

INSERT INTO customers (client_id, name, salesperson_code) VALUES
 ('C-ACI', 'Empresa piloto', 'ACI'),
 ('C-BOB', 'Empresa demo', 'BOB');

INSERT INTO sales_quotes (document_no, customer_no, amount, salesperson_code, estado_oferta, probabilidad_exito, cierreprev_date, oferta_type) VALUES
 ('OF-ACI', 'C-ACI', 1234.5678, 'ACI', 'negociacion', 55, DATE '2026-12-15', 'proyecto'),
 ('OF-BOB', 'C-BOB', 500, 'BOB', 'ganada', 100, DATE '2026-10-01', 'servicio');

INSERT INTO contacts (id, contact_no, client_id, name, email, phone_no, business_relation, updated_at)
 VALUES ('60000000-0000-4000-8000-000000000001','CONTACT-ACI','C-ACI','Comprador inicial','comprador@example.invalid','600111222','Customer',now());

INSERT INTO contacts (contact_no, client_id, name, business_relation, updated_at) VALUES ('CONTACT-BOB','C-BOB','Comprador demo','Customer',now());

INSERT INTO crm_offer_followups (document_no, estado_oferta, probabilidad_exito, oferta_type, cierreprev_date, contacto_id)
 VALUES ('OF-ACI', 'negociacion', 55, 'proyecto', DATE '2026-12-15','CONTACT-ACI');

-- Simula la copia de seguimiento entregada por n8n para el comercial fuera del piloto.
INSERT INTO crm_offer_followups (document_no, source, estado_oferta, probabilidad_exito, contacto_id)
 VALUES ('OF-BOB', 'BC', 'ganada', 100, 'CONTACT-BOB');

INSERT INTO crm_prospects (id, owner_id, company_name, company_normalized, phase) VALUES
 ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Prospecto piloto', 'prospecto piloto', 0),
 ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Prospecto demo', 'prospecto demo', 1);

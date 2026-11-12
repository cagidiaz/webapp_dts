-- CONSULTAS DE SOLO LECTURA. Ejecutar por separado en el editor SQL de Supabase.
-- No elimina ni cambia datos. Las categorías son indicios, no una lista de borrado.
-- Los textos de actividades pueden contener datos comerciales confidenciales.

-- 1. Seguimiento APP: distinguir auditorías y el patrón conocido de fase.
SELECT CASE
    WHEN tipo = 'Auditoría' THEN 'Auditoría: conservar'
    WHEN notas LIKE 'Cambio de fase [%' THEN 'Posible cambio de fase: conservar y revisar'
    ELSE 'Otro registro: revisar individualmente'
  END AS categoria,
  tipo, count(*) AS cantidad
FROM public.crm_offer_activities
GROUP BY 1, 2 ORDER BY 1, 2;

-- 2. Historial anterior: no hay un identificador inequívoco de origen manual.
SELECT tipo, count(*) AS cantidad
FROM public.sales_quote_activities
GROUP BY tipo ORDER BY tipo;

-- 3. Planificaciones antiguas con al menos uno de los campos informado.
SELECT 'crm_offer_followups' AS tabla, source AS fuente, count(*) AS ofertas
FROM public.crm_offer_followups
WHERE nullif(trim(proxima_accion), '') IS NOT NULL OR fecha_proxima_accion IS NOT NULL
GROUP BY source
UNION ALL
SELECT 'sales_quotes_crm', 'histórico', count(*)
FROM public.sales_quotes_crm
WHERE nullif(trim(proxima_accion), '') IS NOT NULL OR fecha_proxima_accion IS NOT NULL
ORDER BY 1, 2;

-- 4. Detalle para revisión privada; incluye notas, no compartir sin revisarlas.
SELECT a.id, f.document_no, a.tipo, a.fecha, a.hecho, a.notas,
  CASE WHEN a.tipo = 'Auditoría' OR a.notas LIKE 'Cambio de fase [%'
       THEN 'Conservar' ELSE 'Revisar, no borrar automáticamente' END AS tratamiento
FROM public.crm_offer_activities a
JOIN public.crm_offer_followups f ON f.id = a.followup_id
ORDER BY a.fecha DESC, a.id;

SELECT a.id, q.document_no, a.tipo, a.fecha, a.hecho, a.notas,
  'Revisar, no borrar automáticamente' AS tratamiento
FROM public.sales_quote_activities a
JOIN public.sales_quotes_crm q ON q.id = a.crm_quote_id
ORDER BY a.fecha DESC, a.id;

-- Migración: Crear índice en la fecha de contabilización para el histórico
CREATE INDEX IF NOT EXISTS idx_sales_documents_posting_date ON public.sales_documents(posting_date);

-- 1. ELIMINAR LOS DATOS DE LAS TABLAS sales_document_lines Y sales_documents
-- Se utiliza CASCADE por seguridad para asegurar que las líneas se borren si hubiera alguna restricción
TRUNCATE TABLE public.sales_document_lines, public.sales_documents CASCADE;

-- 2. AGREGAR LA NUEVA COLUMNA line_no A LA TABLA sales_document_lines
ALTER TABLE public.sales_document_lines 
ADD COLUMN IF NOT EXISTS line_no INTEGER;

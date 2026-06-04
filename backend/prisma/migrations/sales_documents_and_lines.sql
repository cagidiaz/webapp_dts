-- Migration: Drop 'sales_invoices' and create 'sales_documents' & 'sales_document_lines'
-- This script replaces the old flat invoice table with a normalized header-detail structure.

CREATE TABLE IF NOT EXISTS public.sales_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_no VARCHAR(20) UNIQUE NOT NULL,
    disc_amount NUMERIC(15,4) DEFAULT 0.0,
    total_amount_excl_vat NUMERIC(15,4) DEFAULT 0.0,
    total_vat_amount NUMERIC(15,4) DEFAULT 0.0,
    total_amount_incl_vat NUMERIC(15,4) DEFAULT 0.0,
    invoice_margen NUMERIC(15,4) DEFAULT 0.0,
    customer_no VARCHAR(20) NOT NULL,
    your_reference VARCHAR(100),
    document_date DATE,
    posting_date DATE,
    quote_no VARCHAR(20),
    order_no VARCHAR(20),
    external_doc_no VARCHAR(100),
    corrected_invoice_no VARCHAR(20),
    shipment_no VARCHAR(20),
    shipment_date DATE,
    payment_terms_code VARCHAR(50),
    payment_method_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_sales_documents_customer FOREIGN KEY (customer_no) REFERENCES public.customers(client_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sales_document_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_no VARCHAR(20) NOT NULL,
    line_no INTEGER,
    type VARCHAR(50),
    product_no VARCHAR(50),
    gen_prod_posting_group VARCHAR(50),
    vat_bus_posting_group VARCHAR(50),
    quantity NUMERIC(18,4) DEFAULT 0.0,
    unit_of_measure_code VARCHAR(20),
    unit_cost_lcy NUMERIC(18,4) DEFAULT 0.0,
    unit_price NUMERIC(18,4) DEFAULT 0.0,
    vat_percent NUMERIC(5,2) DEFAULT 0.0,
    line_disc_percent NUMERIC(5,2) DEFAULT 0.0,
    line_amount NUMERIC(18,4) DEFAULT 0.0,
    line_disc_amount NUMERIC(18,4) DEFAULT 0.0,
    margen_percent_ldr NUMERIC(15,4) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_sales_document_lines_document FOREIGN KEY (document_no) REFERENCES public.sales_documents(document_no) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_documents_customer ON public.sales_documents(customer_no);
CREATE INDEX IF NOT EXISTS idx_sales_documents_date ON public.sales_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_sales_document_lines_doc ON public.sales_document_lines(document_no);
CREATE INDEX IF NOT EXISTS idx_sales_document_lines_prod ON public.sales_document_lines(product_no);

COMMENT ON TABLE public.sales_documents IS 'Cabeceras de facturas y abonos de venta.';
COMMENT ON TABLE public.sales_document_lines IS 'Líneas de detalle de facturas y abonos de venta.';

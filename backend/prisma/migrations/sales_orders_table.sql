-- Migration: Create 'sales_orders' table
-- This table stores information about open sales orders, linked to customers and products.

CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posting_date DATE,
    document_type VARCHAR(50),
    type VARCHAR(50),
    document_number VARCHAR(50) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20),
    quantity DECIMAL(18,4) DEFAULT 0,
    outstanding_quantity DECIMAL(18,4) DEFAULT 0,
    quantity_invoice DECIMAL(18,4) DEFAULT 0,
    qty_shipped_not_invoiced DECIMAL(18,4) DEFAULT 0,
    unit_price DECIMAL(18,4) DEFAULT 0,
    line_amount DECIMAL(18,4) DEFAULT 0,
    customer_code VARCHAR(50) NOT NULL,
    shipment_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Relationships
    CONSTRAINT fk_sales_orders_customer FOREIGN KEY (customer_code) REFERENCES public.customers(client_id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_orders_product FOREIGN KEY (item_code) REFERENCES public.products(item_no) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_code);
CREATE INDEX IF NOT EXISTS idx_sales_orders_item ON public.sales_orders(item_code);
CREATE INDEX IF NOT EXISTS idx_sales_orders_doc_no ON public.sales_orders(document_number);

-- Standard tags for Supabase UI
COMMENT ON TABLE public.sales_orders IS 'Tabla de pedidos de venta abiertos y pendientes.';

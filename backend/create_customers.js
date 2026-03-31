const { Client } = require('pg');
require('dotenv').config();

const sql = `
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    balance_lcy DECIMAL DEFAULT 0,
    balance_due_lcy DECIMAL DEFAULT 0,
    credit_limit_lcy DECIMAL DEFAULT 0,
    blocked VARCHAR(20),
    privacy_blocked BOOLEAN DEFAULT FALSE,
    salesperson_code VARCHAR(20),
    market_segment VARCHAR(50),
    business_model VARCHAR(50),
    total_sales DECIMAL DEFAULT 0,
    cost_profit_variance_lcy DECIMAL DEFAULT 0,
    adjusted_profit DECIMAL DEFAULT 0,
    adjusted_profit_pct DECIMAL DEFAULT 0,
    order_margin DECIMAL DEFAULT 0,
    invoice_margin DECIMAL DEFAULT 0,
    last_date_modified DATE,
    address TEXT,
    address_2 TEXT,
    country_reg_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),
    post_code VARCHAR(20),
    phone_no VARCHAR(50),
    mobile_no VARCHAR(50),
    email VARCHAR(255),
    home_page VARCHAR(255),
    language_code VARCHAR(10),
    vat_no VARCHAR(50),
    customer_posting_group VARCHAR(50),
    payment_terms_code VARCHAR(50),
    payment_method_code VARCHAR(50),
    shipment_method_code VARCHAR(50),
    shipping_agent_code VARCHAR(50),
    customer_since DATE,
    payments_lcy DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions (standard for this app)
GRANT ALL ON public.customers TO postgres;
GRANT ALL ON public.customers TO webapp_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT ON public.customers TO anon;
`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL.replace('?pgbouncer=true', '') });
  try {
    await client.connect();
    console.log("Creating customers table...");
    await client.query(sql);
    console.log("Customers table created successfully!");
  } catch (err) {
    console.error("Failed to create table:", err);
  } finally {
    await client.end();
  }
}

run();

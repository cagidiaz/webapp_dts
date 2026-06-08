const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL no encontrada en .env');
    return;
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Conectado a PostgreSQL.');

    console.log('Creando tabla public.sales_quotes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sales_quotes (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        document_type varchar(50),
        document_no varchar(50) UNIQUE NOT NULL,
        customer_no varchar(50) NOT NULL REFERENCES public.customers(client_id) ON DELETE CASCADE,
        amount numeric(15, 4) DEFAULT 0.0,
        salesperson_code varchar(20) REFERENCES public.sales_reps(code) ON DELETE SET NULL,
        cerrado boolean DEFAULT false NOT NULL,
        catproducto_code varchar(50),
        document_date date,
        estado_oferta varchar(50),
        external_doc_no varchar(100),
        confirmacion_date date,
        cierreprev_date date,
        motivo_ganada text,
        motivo_perdida text,
        observaciones text,
        pedido_confirmado boolean DEFAULT false NOT NULL,
        probabilidad_exito numeric(5, 2),
        oferta_type varchar(50),
        valor_oferta_ponderado numeric(15, 4) DEFAULT 0.0,
        your_reference varchar(100),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('Tabla sales_quotes creada o ya existía.');

    console.log('Creando índices...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sales_quotes_customer ON public.sales_quotes(customer_no);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sales_quotes_salesperson ON public.sales_quotes(salesperson_code);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sales_quotes_date ON public.sales_quotes(document_date);');
    console.log('Índices creados.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();

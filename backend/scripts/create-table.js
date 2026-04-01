const { Client } = require('pg');
const fs = require('fs');
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

    console.log('Creando tabla public.product_categories...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.product_categories (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        family_code varchar(50),
        subfamily_code varchar(50) UNIQUE,
        family_name varchar(255),
        subfamily_name varchar(255),
        pm_code varchar(50),
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('Tabla creada o ya existía.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();

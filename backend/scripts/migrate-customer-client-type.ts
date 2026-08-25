import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL no está definida en el entorno.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración para agregar columna client_type a la tabla customers...');

    // 1. Agregar columna client_type
    await client.query(`
      ALTER TABLE public.customers 
      ADD COLUMN IF NOT EXISTS client_type VARCHAR(10);
    `);
    console.log('Columna client_type agregada correctamente a la tabla customers.');

    // 2. Crear índice para optimizar búsquedas y filtrados
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_client_type 
      ON public.customers(client_type);
    `);
    console.log('Índice idx_customers_client_type creado correctamente.');

    console.log('Migración completada con éxito.');
  } catch (error) {
    console.error('Error durante la migración de client_type:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL no está configurada.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración para soporte de Microsoft Exchange / Outlook...');

    // 1. Crear tabla user_exchange_accounts si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_exchange_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        microsoft_user_id VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMPTZ NOT NULL,
        calendar_sync_enabled BOOLEAN DEFAULT TRUE,
        mail_sync_enabled BOOLEAN DEFAULT TRUE,
        calendar_delta_token TEXT,
        mail_delta_token TEXT,
        calendar_subscription_id VARCHAR(255),
        subscription_expires_at TIMESTAMPTZ,
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT unique_user_exchange UNIQUE (user_id)
      );
    `);
    console.log('Tabla user_exchange_accounts verificada/creada.');

    // 2. Agregar columnas a crm_activities si no existen
    await client.query(`
      ALTER TABLE public.crm_activities
      ADD COLUMN IF NOT EXISTS exchange_item_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS exchange_change_key VARCHAR(255),
      ADD COLUMN IF NOT EXISTS exchange_web_link TEXT,
      ADD COLUMN IF NOT EXISTS exchange_sync_status VARCHAR(50) DEFAULT 'local_only',
      ADD COLUMN IF NOT EXISTS exchange_last_synced_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS attendees JSONB,
      ADD COLUMN IF NOT EXISTS location VARCHAR(255);
    `);
    console.log('Columnas de sincronización agregadas a crm_activities.');

    // 3. Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crm_activities_exchange_item_id ON public.crm_activities(exchange_item_id);
      CREATE INDEX IF NOT EXISTS idx_user_exchange_accounts_user_id ON public.user_exchange_accounts(user_id);
    `);
    console.log('Índices creados con éxito.');

    console.log('Migración de Microsoft Exchange completada correctamente.');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

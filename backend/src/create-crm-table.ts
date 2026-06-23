import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL no está definida en las variables de entorno.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  console.log('Iniciando script de creación de tabla crm_activities utilizando pg Pool...');
  const client = await pool.connect();
  
  try {
    // 1. Create Enum Type if it does not exist
    console.log('Intentando crear el tipo ENUM CrmActivityType...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrmActivityType') THEN
          CREATE TYPE public."CrmActivityType" AS ENUM ('NOTE', 'TASK', 'EMAIL', 'EVENT', 'CALL');
        END IF;
      END
      $$;
    `);
    console.log('Tipo ENUM verificado/creado con éxito.');

    // 2. Create Table crm_activities if it does not exist
    console.log('Intentando crear la tabla crm_activities...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.crm_activities (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        client_id VARCHAR(50) NOT NULL,
        created_by UUID NOT NULL,
        type public."CrmActivityType" NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE,
        time_scheduled VARCHAR(10),
        is_completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT crm_activities_pkey PRIMARY KEY (id),
        CONSTRAINT crm_activities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.customers(client_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT crm_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE NO ACTION ON UPDATE CASCADE
      );
    `);
    console.log('Tabla crm_activities verificada/creada con éxito.');

    // 3. Create Indexes if they do not exist
    console.log('Creando índices para crm_activities...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crm_activities_client_id ON public.crm_activities(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crm_activities_created_by ON public.crm_activities(created_by);
    `);
    console.log('Índices creados/verificados con éxito.');
    
    console.log('Proceso de base de datos completado correctamente.');
  } catch (error) {
    console.error('Error al ejecutar las consultas SQL:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

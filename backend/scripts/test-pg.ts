import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
  const url = process.env.DATABASE_URL;
  console.log('Attempting to connect to:', url?.replace(/:[^:]*@/, ':****@'));
  
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('SUCCESS: Connected to PostgreSQL server.');
    const res = await client.query('SELECT current_database(), current_schema();');
    console.log('Query result:', res.rows[0]);
    
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in public schema:', tables.rows.map(r => r.table_name).join(', '));
    
  } catch (err: any) {
    console.error('CONNECTION ERROR:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();

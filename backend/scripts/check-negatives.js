const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query(`
    SELECT 
      SUM(inventory_qty) as total_raw,
      SUM(CASE WHEN inventory_qty > 0 THEN inventory_qty ELSE 0 END) as total_positive,
      SUM(CASE WHEN inventory_qty < 0 THEN inventory_qty ELSE 0 END) as total_negative,
      COUNT(*) FILTER (WHERE inventory_qty < 0) as count_negative
    FROM public.products
  `);
  
  console.log('Resultados de DB:', res.rows[0]);
  await client.end();
}

run();

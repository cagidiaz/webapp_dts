const { Client } = require('pg');
require('dotenv').config();

const sql = `
CREATE INDEX IF NOT EXISTS idx_value_reg_date ON public.value_entries (reg_date);
CREATE INDEX IF NOT EXISTS idx_value_item ON public.value_entries (item_no);
CREATE INDEX IF NOT EXISTS idx_value_salesperson ON public.value_entries (salesperson_code);
`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log("Creating indices manually (this may take a few seconds due to 130k rows)...");
    await client.query(sql);
    console.log("Indices created successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();

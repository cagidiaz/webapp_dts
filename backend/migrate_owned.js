const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL.replace('?pgbouncer=true', '') });
  try {
    await client.connect();
    console.log("Trying to reassign ownership to postgres temporary...");
    await client.query('REASSIGN OWNED BY webapp_admin TO postgres');
    
    console.log("Renaming columns and indices...");
    await client.query(`
      ALTER TABLE public.sales_budgets RENAME COLUMN sales_rep_code TO salesperson_code;
      ALTER TABLE public.value_entries RENAME COLUMN sales_rep_code TO salesperson_code;
      ALTER INDEX public.idx_sales_rep RENAME TO idx_salesperson;
      ALTER INDEX public.idx_value_sales_rep RENAME TO idx_value_salesperson;
    `);
    
    console.log("Reassigning ownership back to webapp_admin...");
    await client.query('REASSIGN OWNED BY postgres TO webapp_admin');
    
    console.log("Database migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();

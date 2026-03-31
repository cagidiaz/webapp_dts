const { Client } = require('pg');
require('dotenv').config();

const sql = `
-- Assume role of owner
SET ROLE webapp_admin;

-- Rename column in sales_budgets
ALTER TABLE public.sales_budgets RENAME COLUMN sales_rep_code TO salesperson_code;
-- Rename column in value_entries
ALTER TABLE public.value_entries RENAME COLUMN sales_rep_code TO salesperson_code;

-- Rename indices
ALTER INDEX public.idx_sales_rep RENAME TO idx_salesperson;
ALTER INDEX public.idx_value_sales_rep RENAME TO idx_value_salesperson;
`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log("Renaming columns in sales_budgets and value_entries...");
    await client.query(sql);
    console.log("Database migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();

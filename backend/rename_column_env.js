const fs = require('fs');
const { Client } = require('pg');

async function renameColumn() {
  const env = fs.readFileSync('.env', 'utf8');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (!match) {
    console.error("DATABASE_URL not found in .env");
    return;
  }
  
  const connectionString = match[1].trim();
  console.log("Found connection string (sanitized)...");
  
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to database.");
    
    await client.query("ALTER TABLE public.customers RENAME COLUMN cost_profit_variance TO cost_profit_variance_lcy;");
    console.log("Column 'cost_profit_variance' renamed to 'cost_profit_variance_lcy' successfully.");
  } catch (err) {
    console.error("Error executing query:", err.message);
  } finally {
    await client.end();
  }
}

renameColumn();

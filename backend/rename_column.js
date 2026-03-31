const { Client } = require('pg');

async function renameColumn() {
  const client = new Client({
    connectionString: "postgresql://postgres.oyjgtvttkvjghdckmxyf:C4g1d1az-01!!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
  });

  try {
    await client.connect();
    console.log("Connected to database.");
    
    const query = "ALTER TABLE public.customers RENAME COLUMN cost_profit_variance TO cost_profit_variance_lcy;";
    await client.query(query);
    
    console.log("Column 'cost_profit_variance' renamed to 'cost_profit_variance_lcy' successfully.");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

renameColumn();

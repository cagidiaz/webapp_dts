const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });

async function debugDirect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log("Connected to DB:", process.env.DATABASE_URL.split('@')[1]);
    
    console.log("\n--- Checking BUDGETS ---");
    const budgetsRes = await client.query('SELECT * FROM budgets LIMIT 5');
    console.log("Rows found:", budgetsRes.rowCount);
    budgetsRes.rows.forEach(r => console.log(r));

    console.log("\n--- Checking INCOME ---");
    const incRes = await client.query('SELECT account_id, amount, year FROM income_statements LIMIT 2');
    console.log("Rows found:", incRes.rowCount);
    incRes.rows.forEach(r => console.log(r));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

debugDirect();

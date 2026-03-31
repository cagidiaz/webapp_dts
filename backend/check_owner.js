const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL.replace('?pgbouncer=true', '') });
  try {
    await client.connect();
    const usersRes = await client.query('SELECT usename FROM pg_user');
    console.log("Users in DB:", usersRes.rows.map(r => r.usename));
    
    const userRes = await client.query('SELECT current_user');
    const tableRes = await client.query(`
      SELECT schemaname, tablename, tableowner 
      FROM pg_tables 
      WHERE tablename = 'value_entries' OR tablename = 'sales_budgets'
    `);
    console.log("Current User:", userRes.rows[0].current_user);
    console.log("Tables info:", JSON.stringify(tableRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();

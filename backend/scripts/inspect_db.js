const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.your-tenant-id:b1rv9vn6zg1fdvq7clur1nzkcjeqrjvn@187.124.42.101:5432/postgres?sslmode=disable',
});

async function run() {
  try {
    await client.connect();
    console.log("Connected");
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_budgets';
    `);
    console.log("Table schema:");
    console.table(res.rows);

    const data = await client.query(`SELECT * FROM sales_budgets LIMIT 1;`);
    console.log("Sample data:", data.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();

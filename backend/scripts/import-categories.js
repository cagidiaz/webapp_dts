const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  const csvFilePath = path.resolve(__dirname, '../../tmp/categorias.csv');

  if (!connectionString) {
    console.error('DATABASE_URL no encontrada.');
    return;
  }

  const client = new Client({ connectionString });

  try {
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Encontrados ${records.length} registros en el CSV.`);

    await client.connect();
    console.log('Conectado a PostgreSQL.');

    let count = 0;
    for (const record of records) {
      const { 
        familia, 
        subfamilia, 
        Desc_familia, 
        Desc_subfam, 
        'Product Manager': pm 
      } = record;

      if (!subfamilia) continue;

      // Upsert usando SQL puro (INSERT ... ON CONFLICT)
      await client.query(`
        INSERT INTO public.product_categories 
        (family_code, subfamily_code, family_name, subfamily_name, pm_code)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (subfamily_code) 
        DO UPDATE SET 
          family_code = EXCLUDED.family_code,
          family_name = EXCLUDED.family_name,
          subfamily_name = EXCLUDED.subfamily_name,
          pm_code = EXCLUDED.pm_code;
      `, [familia, subfamilia, Desc_familia, Desc_subfam, pm]);

      count++;
      if (count % 50 === 0) console.log(`Procesados ${count}...`);
    }

    console.log(`¡Importación completada! ${count} registros insertados/actualizados.`);

  } catch (err) {
    console.error('Error durante importación:', err.message);
  } finally {
    await client.end();
  }
}

run();

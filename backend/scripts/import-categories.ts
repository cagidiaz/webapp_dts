import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
  const csvFilePath = path.resolve(__dirname, '../../../tmp/categorias.csv');
  console.log(`Leyendo archivo: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    console.error('El archivo CSV no existe en la ruta especificada.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Encontrados ${records.length} registros en el CSV.`);

  // 1. Asegurar la creación de la tabla (Como psql falló, lo hacemos vía Prisma)
  try {
     console.log('Verificando/Creando tabla public.product_categories...');
     await prisma.$executeRawUnsafe(`
       CREATE TABLE IF NOT EXISTS public.product_categories (
         id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
         family_code varchar(50),
         subfamily_code varchar(50) UNIQUE,
         family_name varchar(255),
         subfamily_name varchar(255),
         pm_code varchar(50),
         created_at timestamptz DEFAULT now()
       );
     `);
     console.log('Tabla lista.');
  } catch (err) {
     console.warn('Error al crear tabla (puede que ya exista):', err.message);
  }

  // 2. Importar registros (Upsert por subfamily_code)
  let count = 0;
  for (const record of records) {
    // Mapeo de columnas CSV a campos de base de datos
    // CSV: familia,subfamilia,Desc_familia,Desc_subfam,Product Manager
    const { 
      familia, 
      subfamilia, 
      Desc_familia, 
      Desc_subfam, 
      'Product Manager': pm 
    } = record as any;

    if (!subfamilia) continue;

    await (prisma as any).product_categories.upsert({
      where: { subfamily_code: subfamilia },
      update: {
        family_code: familia,
        family_name: Desc_familia,
        subfamily_name: Desc_subfam,
        pm_code: pm,
      },
      create: {
        family_code: familia,
        subfamily_code: subfamilia,
        family_name: Desc_familia,
        subfamily_name: Desc_subfam,
        pm_code: pm,
      },
    });
    count++;
    if (count % 50 === 0) console.log(`Procesados ${count}...`);
  }

  console.log(`¡Importación completada! ${count} categorías procesadas.`);
}

main()
  .catch((e) => {
    console.error('Error durante la importación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

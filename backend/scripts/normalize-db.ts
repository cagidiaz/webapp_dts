import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any) as any;
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('Normalizando estados de ofertas a minúsculas...');
  
  // 1. Update sales_quotes
  const quotesRes = await prisma.$executeRaw`
    UPDATE sales_quotes 
    SET estado_oferta = LOWER(TRIM(estado_oferta))
    WHERE estado_oferta IS NOT NULL
  `;
  console.log(`Actualizadas ${quotesRes} ofertas en sales_quotes.`);

  // 2. Update sales_quotes_crm
  const crmRes = await prisma.$executeRaw`
    UPDATE sales_quotes_crm 
    SET estado_oferta = LOWER(TRIM(estado_oferta))
    WHERE estado_oferta IS NOT NULL
  `;
  console.log(`Actualizadas ${crmRes} ofertas en sales_quotes_crm.`);
  
  console.log('Normalización completada con éxito.');
}

main()
  .catch((e) => {
    console.error('Error normalizando base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

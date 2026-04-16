import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.sales_orders.count();
    console.log(`\n--- DIAGNÓSTICO SALES_ORDERS ---`);
    console.log(`Total registros: ${count}`);
    
    if (count > 0) {
      const sample = await prisma.sales_orders.findMany({ take: 3 });
      console.log('Muestra de datos (3 primeros):');
      console.log(JSON.stringify(sample, null, 2));
      
      const sumCheck = await prisma.sales_orders.aggregate({
        _sum: {
          outstanding_quantity: true,
          qty_shipped_not_invoiced: true
        }
      });
      console.log('Sumatorios globales en DB:');
      console.log(sumCheck);
    }
  } catch (e) {
    console.error('Error al conectar con la base de datos:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

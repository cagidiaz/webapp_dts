const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const total = await prisma.products.aggregate({
    _sum: { inventory_qty: true }
  });
  const positive = await prisma.products.aggregate({
    _sum: { inventory_qty: true },
    where: { inventory_qty: { gt: 0 } }
  });
  const negative = await prisma.products.aggregate({
    _sum: { inventory_qty: true },
    where: { inventory_qty: { lt: 0 } }
  });

  console.log('--- DIAGNÓSTICO DE STOCK ---');
  console.log('Stock Total (Sin filtros):', total._sum.inventory_qty);
  console.log('Stock Filtrado (Solo > 0):', positive._sum.inventory_qty);
  console.log('Stock Negativo (Solo < 0):', negative._sum.inventory_qty);
  console.log('Diferencia:', Number(total._sum.inventory_qty) - Number(positive._sum.inventory_qty));
}

run().finally(() => prisma.$disconnect());

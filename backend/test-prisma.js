
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const year = 2024;
    const res = await prisma.value_entries.groupBy({
      by: ['source_no'],
      where: {
        calendar: { year }
      },
      _sum: { sales_amount: true },
      take: 1
    });
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

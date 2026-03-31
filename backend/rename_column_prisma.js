const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameColumn() {
  try {
    await prisma.$executeRaw`ALTER TABLE public.customers RENAME COLUMN cost_profit_variance TO cost_profit_variance_lcy;`;
    console.log("Column 'cost_profit_variance' renamed to 'cost_profit_variance_lcy' successfully.");
  } catch (err) {
    if (err.message.includes('does not exist')) {
       console.log("Column might already have been renamed or does not exist.");
    } else {
       console.error("Error executing query:", err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

renameColumn();

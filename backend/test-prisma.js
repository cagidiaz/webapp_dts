const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

// Inicialización correcta de Prisma con el adaptador Pool de pg (igual que en NestJS)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Utilidad 1: Analizar descuadres de códigos de cliente (CL*)
 * Comprueba si existen códigos 'CL' en ventas o presupuestos que falten en la ficha de clientes.
 */
async function checkClientMismatches() {
  console.log("\n=== Analizando códigos de cliente (CL*) en ventas y presupuestos ===");
  const years = [2024, 2025, 2026];

  for (const year of years) {
    console.log(`\nAño ${year}:`);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 1. Facturas (value_entries)
    const rawSources = await prisma.value_entries.findMany({
      where: {
        source_no: { startsWith: 'CL' },
        reg_date: { gte: startDate, lte: endDate }
      },
      select: { source_no: true },
      distinct: ['source_no']
    });
    const valueEntryClCodes = rawSources.map(r => r.source_no).filter(Boolean);
    const valueEntryClMatches = await prisma.customers.findMany({
      where: { client_id: { in: valueEntryClCodes } },
      select: { client_id: true }
    });
    const valueEntryClMatchSet = new Set(valueEntryClMatches.map(c => c.client_id));
    const valueEntryClMismatches = valueEntryClCodes.filter(c => !valueEntryClMatchSet.has(c));
    console.log(`  - Ventas (value_entries): ${valueEntryClCodes.length} clientes encontrados | ${valueEntryClMismatches.length} descuadres.`);
    if (valueEntryClMismatches.length > 0) {
      console.log("    Códigos descuadrados:", valueEntryClMismatches);
    }

    // 2. Presupuestos (sales_budgets)
    const rawBudgets = await prisma.sales_budgets.findMany({
      where: {
        customer_code: { startsWith: 'CL' },
        budget_date: { gte: startDate, lte: endDate }
      },
      select: { customer_code: true },
      distinct: ['customer_code']
    });
    const budgetClCodes = rawBudgets.map(r => r.customer_code).filter(Boolean);
    const budgetClMatches = await prisma.customers.findMany({
      where: { client_id: { in: budgetClCodes } },
      select: { client_id: true }
    });
    const budgetClMatchSet = new Set(budgetClMatches.map(c => c.client_id));
    const budgetClMismatches = budgetClCodes.filter(c => !budgetClMatchSet.has(c));
    console.log(`  - Presupuestos (sales_budgets): ${budgetClCodes.length} clientes encontrados | ${budgetClMismatches.length} descuadres.`);
    if (budgetClMismatches.length > 0) {
      console.log("    Códigos descuadrados:", budgetClMismatches);
    }
  }
}

/**
 * Utilidad 2: Buscar discrepancias en la asignación de vendedores
 * Compara el vendedor asignado en la ficha del cliente frente al del presupuesto asignado.
 */
async function checkSalespersonDiscrepancies() {
  console.log("\n=== Analizando discrepancias de vendedor (Presupuesto vs Ficha Cliente) ===");
  
  const budgets = await prisma.sales_budgets.findMany({
    select: { customer_code: true, salesperson_code: true },
    distinct: ['customer_code', 'salesperson_code']
  });

  let mismatchCount = 0;
  for (const b of budgets) {
    if (b.customer_code === '99999999') continue; // Ignorar comodín
    const customer = await prisma.customers.findUnique({
      where: { client_id: b.customer_code.trim() }
    });
    
    if (customer && customer.salesperson_code !== b.salesperson_code) {
      mismatchCount++;
      if (mismatchCount <= 10) {
        console.log(`  [Diferente] Cliente "${customer.client_id}" (${customer.name}): Ficha tiene "${customer.salesperson_code}" | Presupuesto tiene "${b.salesperson_code}"`);
      }
    }
  }
  console.log(`\nTotal de asignaciones de vendedor discrepantes encontradas: ${mismatchCount}`);
  if (mismatchCount > 10) {
    console.log("  (Se muestran solo los primeros 10 resultados para no saturar la consola)");
  }
}

async function main() {
  console.log("Conexión con Prisma establecida con éxito.");
  
  // Activa las utilidades descomentando las líneas siguientes:
  // await checkClientMismatches();
  // await checkSalespersonDiscrepancies();
}

main().catch(console.error).finally(() => prisma.$disconnect());

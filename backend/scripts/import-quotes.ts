import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any) as any;
const prisma = new PrismaClient({
  adapter,
  errorFormat: 'pretty',
});

// Helper to parse dates and clean them
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (trimmed === '' || trimmed === '0001-01-01' || trimmed.startsWith('0001')) return null;
  
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }
  return null;
}

// Helper to parse boolean
function parseBool(boolStr: string | null | undefined): boolean {
  if (!boolStr) return false;
  const cleaned = boolStr.trim().toLowerCase();
  return cleaned === 'true' || cleaned === 'yes' || cleaned === '1';
}

// Helper to parse decimal
function parseDecimal(numStr: string | null | undefined): number {
  if (!numStr) return 0;
  const cleaned = numStr.trim().replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  const csvFilePath = path.resolve(__dirname, '../test/ofertas.csv');
  console.log(`Leyendo archivo de ofertas: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    console.error('El archivo CSV de ofertas no existe.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Encontrados ${records.length} registros en el CSV de ofertas.`);

  let count = 0;
  for (const record of records) {
    const {
      document_type,
      document_no,
      customer_no,
      amount,
      salesperson_code,
      cerrado,
      catproducto_code,
      document_date,
      estado_oferta,
      external_doc_no,
      confirmacion_date,
      cierreprev_date,
      motivo_ganada,
      motivo_perdida,
      observaciones,
      pedido_confirmado,
      probabilidad_exito,
      oferta_type,
      valor_oferta_ponderado,
      your_reference
    } = record as any;

    if (!document_no || !customer_no) {
      console.warn(`Saltando registro sin document_no o customer_no:`, record);
      continue;
    }

    // Verify if customer exists
    const customer = await prisma.customers.findUnique({
      where: { client_id: customer_no.trim() }
    });

    if (!customer) {
      console.warn(`Cliente ${customer_no} no existe en la DB. Creando cliente temporal para mantener integridad referencial.`);
      await prisma.customers.create({
        data: {
          client_id: customer_no.trim(),
          name: `Cliente Temporal (${customer_no})`
        }
      });
    }

    // Verify salesperson salesperson_code
    if (salesperson_code && salesperson_code.trim()) {
      const rep = await prisma.sales_reps.findUnique({
        where: { code: salesperson_code.trim() }
      });
      if (!rep) {
        console.warn(`Comercial ${salesperson_code} no existe en la DB. Creándolo.`);
        await prisma.sales_reps.create({
          data: {
            code: salesperson_code.trim(),
            name: `Comercial (${salesperson_code})`
          }
        });
      }
    }

    await prisma.sales_quotes.upsert({
      where: { document_no: document_no.trim() },
      update: {
        document_type: document_type ? document_type.trim() : null,
        customer_no: customer_no.trim(),
        amount: parseDecimal(amount),
        salesperson_code: salesperson_code && salesperson_code.trim() ? salesperson_code.trim() : null,
        cerrado: parseBool(cerrado),
        catproducto_code: catproducto_code ? catproducto_code.trim() : null,
        document_date: parseDate(document_date),
        estado_oferta: estado_oferta ? estado_oferta.trim() : null,
        external_doc_no: external_doc_no ? external_doc_no.trim() : null,
        confirmacion_date: parseDate(confirmacion_date),
        cierreprev_date: parseDate(cierreprev_date),
        motivo_ganada: motivo_ganada ? motivo_ganada.trim() : null,
        motivo_perdida: motivo_perdida ? motivo_perdida.trim() : null,
        observaciones: observaciones ? observaciones.trim() : null,
        pedido_confirmado: parseBool(pedido_confirmado),
        probabilidad_exito: probabilidad_exito && probabilidad_exito.trim() ? parseDecimal(probabilidad_exito) : null,
        oferta_type: oferta_type ? oferta_type.trim() : null,
        valor_oferta_ponderado: parseDecimal(valor_oferta_ponderado),
        your_reference: your_reference ? your_reference.trim() : null,
        updated_at: new Date()
      },
      create: {
        document_type: document_type ? document_type.trim() : null,
        document_no: document_no.trim(),
        customer_no: customer_no.trim(),
        amount: parseDecimal(amount),
        salesperson_code: salesperson_code && salesperson_code.trim() ? salesperson_code.trim() : null,
        cerrado: parseBool(cerrado),
        catproducto_code: catproducto_code ? catproducto_code.trim() : null,
        document_date: parseDate(document_date),
        estado_oferta: estado_oferta ? estado_oferta.trim() : null,
        external_doc_no: external_doc_no ? external_doc_no.trim() : null,
        confirmacion_date: parseDate(confirmacion_date),
        cierreprev_date: parseDate(cierreprev_date),
        motivo_ganada: motivo_ganada ? motivo_ganada.trim() : null,
        motivo_perdida: motivo_perdida ? motivo_perdida.trim() : null,
        observaciones: observaciones ? observaciones.trim() : null,
        pedido_confirmado: parseBool(pedido_confirmado),
        probabilidad_exito: probabilidad_exito && probabilidad_exito.trim() ? parseDecimal(probabilidad_exito) : null,
        oferta_type: oferta_type ? oferta_type.trim() : null,
        valor_oferta_ponderado: parseDecimal(valor_oferta_ponderado),
        your_reference: your_reference ? your_reference.trim() : null
      }
    });

    count++;
  }

  console.log(`¡Importación completada! ${count} ofertas procesadas.`);
}

main()
  .catch((e) => {
    console.error('Error durante la importación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

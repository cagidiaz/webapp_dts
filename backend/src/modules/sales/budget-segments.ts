import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import catalog from '../customers/customer-segments.catalog.json';

export interface BudgetSegmentFilters {
  year: number;
  months: number[];
  salespersonCode?: string;
  pmCode?: string;
  familyCode?: string;
  subfamilyCodes: string[];
  segmentCodes: string[];
  productCode?: string;
  search?: string;
}

export async function getBudgetSegments(prisma: PrismaService, filters: BudgetSegmentFilters) {
  const { year, months, salespersonCode, pmCode, familyCode, subfamilyCodes, segmentCodes, productCode, search } = filters;
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const previous = `${year - 1}-01-01`;
  const options = [...catalog, { value: 'unclassified', label: 'Sin segmento' }];
  const subfamilies = subfamilyCodes.length ? Prisma.sql`AND pc.subfamily_code IN (${Prisma.join(subfamilyCodes)})` : Prisma.empty;
  const period = months.length ? Prisma.sql`AND EXTRACT(MONTH FROM entry_date) IN (${Prisma.join(months)})` : Prisma.empty;
  const searchPattern = `%${search?.trim() ?? ''}%`;
  const sku = `%${productCode?.trim() ?? ''}%`;

  const result = await prisma.$queryRaw<{ segment: string; month: number; sales: number; previous_sales: number; budget: number }[]>(Prisma.sql`
    WITH entries AS (
      SELECT b.budget_date AS entry_date, b.customer_code, b.subfamily_code, b.pm_code,
             b.monthly_budget AS amount, 'budget' AS source
      FROM public.sales_budgets b
      LEFT JOIN public.customers c ON c.client_id = b.customer_code
      WHERE b.budget_date >= ${start}::date AND b.budget_date < ${end}::date
        AND (${salespersonCode ?? null}::text IS NULL OR b.salesperson_code = ${salespersonCode ?? null})
        AND b.item_no ILIKE ${sku}
        AND (b.customer_code ILIKE ${searchPattern} OR c.name ILIKE ${searchPattern})
      UNION ALL
      SELECT d.posting_date, d.customer_no, p.subfamily_code, pc.pm_code,
             CASE WHEN d.document_type = 'Abono' THEN -l.line_amount ELSE l.line_amount END,
             CASE WHEN d.posting_date < ${start}::date THEN 'previous' ELSE 'sales' END
      FROM public.sales_documents d
      JOIN public.sales_document_lines l ON l.document_no = d.document_no
      LEFT JOIN public.products p ON p.item_no = l.product_no
      LEFT JOIN public.product_categories pc ON pc.subfamily_code = p.subfamily_code
      LEFT JOIN public.customers c ON c.client_id = d.customer_no
      WHERE d.posting_date >= ${previous}::date AND d.posting_date < ${end}::date
        AND d.document_type IN ('Factura', 'Abono') AND lower(l.type) = 'item'
        AND (${salespersonCode ?? null}::text IS NULL OR c.salesperson_code = ${salespersonCode ?? null})
        AND (${productCode || null}::text IS NULL OR l.product_no ILIKE ${sku})
        AND (d.customer_no ILIKE ${searchPattern} OR c.name ILIKE ${searchPattern})
    ), classified AS (
      SELECT e.*,
        COALESCE(m.segment_code, CASE
          WHEN pc.family_code = 'ETM' AND m.subfamily_code IS NOT NULL
               AND e.customer_code <> '99999999' AND NULLIF(TRIM(c.business_model), '') IS NOT NULL
            THEN CASE WHEN UPPER(TRIM(c.business_model)) = 'OEM' THEN 'dtstemp-oem' ELSE 'dtstemp-process' END
          WHEN pc.family_code = 'ETM' AND e.source = 'budget' THEN 'dtstemp-process'
        END, 'unclassified') AS segment
      FROM entries e
      LEFT JOIN public.customers c ON c.client_id = e.customer_code
      LEFT JOIN public.product_categories pc ON pc.subfamily_code = e.subfamily_code
      LEFT JOIN public.crm_segment_subcategories m ON m.family_code = pc.family_code AND m.subfamily_code = pc.subfamily_code
      WHERE (${pmCode ?? null}::text IS NULL OR e.pm_code = ${pmCode ?? null})
        AND (${familyCode ?? null}::text IS NULL OR pc.family_code = ${familyCode ?? null})
        ${subfamilies} ${period}
    )
    SELECT segment, EXTRACT(MONTH FROM entry_date)::int AS month,
      COALESCE(SUM(amount) FILTER (WHERE source = 'sales'), 0)::float8 AS sales,
      COALESCE(SUM(amount) FILTER (WHERE source = 'previous'), 0)::float8 AS previous_sales,
      COALESCE(SUM(amount) FILTER (WHERE source = 'budget'), 0)::float8 AS budget
    FROM classified
    ${segmentCodes.length ? Prisma.sql`WHERE segment IN (${Prisma.join(segmentCodes)})` : Prisma.empty}
    GROUP BY 1, 2 ORDER BY 1, 2
  `);
  return { options, result };
}

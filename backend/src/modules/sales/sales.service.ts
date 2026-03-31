import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Valid document types from Supabase:
 * - Purchase Credit Memo
 * - Sales Credit Memo
 * - Purchase Invoice
 * - Purchase Receipt
 * - Sales Shipment
 * - Sales Invoice
 * - Posted Assembly
 */
const SALES_DOC_TYPES = ['Sales Invoice', 'Sales Credit Memo'];
const PURCHASE_DOC_TYPES = ['Purchase Invoice', 'Purchase Credit Memo'];
const MIN_DATE_FOR_QUERIES = new Date('2022-01-01');

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los presupuestos de ventas por año.
   */
  async getSalesBudgets(year?: number) {
    try {
      const targetYear = year || new Date().getFullYear();
      const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);

      const budgets = await this.prisma.sales_budgets.groupBy({
        by: ['budget_date'],
        _sum: {
          monthly_budget: true,
        },
        where: {
          budget_date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalBudget = budgets.reduce((acc: number, current: any) => {
        return acc + (current._sum.monthly_budget ? Number(current._sum.monthly_budget) : 0);
      }, 0);

      return { year: targetYear, totalSalesBudget: totalBudget };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene exclusivamente las entradas de ventas de value_entries.
   * Filtra por tipos de documento de venta y opcionalmente excluye datos históricos previos a 2022.
   */
  async getSalesEntries(excludeHistorical = true) {
    return this.prisma.value_entries.findMany({
      where: {
        document_type: { in: SALES_DOC_TYPES },
        reg_date: excludeHistorical ? { gte: MIN_DATE_FOR_QUERIES } : undefined,
      },
      orderBy: { reg_date: 'desc' },
      take: 100, // Limit for safety
    });
  }

  /**
   * Obtiene exclusivamente las entradas de compras de value_entries.
   */
  async getPurchasesEntries(excludeHistorical = true) {
    return this.prisma.value_entries.findMany({
      where: {
        document_type: { in: PURCHASE_DOC_TYPES },
        reg_date: excludeHistorical ? { gte: MIN_DATE_FOR_QUERIES } : undefined,
      },
      orderBy: { reg_date: 'desc' },
      take: 100, // Limit for safety
    });
  }
}


import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todas las ofertas con soporte para filtros, búsqueda global y paginación.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    customerCode?: string;
    salespersonCode?: string;
    estadoOferta?: string;
    cerrado?: boolean | string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    year?: number;
  } = {}) {
    const { 
      skip, 
      take, 
      search, 
      customerCode, 
      salespersonCode, 
      estadoOferta, 
      cerrado, 
      sortBy = 'document_date', 
      sortDir = 'desc',
      year
    } = params;

    const where: any = {};
    const and: any[] = [];

    if (year) {
      and.push({
        document_date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      });
    }

    if (search) {
      and.push({
        OR: [
          { document_no: { contains: search, mode: 'insensitive' } },
          { customer_no: { contains: search, mode: 'insensitive' } },
          { external_doc_no: { contains: search, mode: 'insensitive' } },
          { your_reference: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        ],
      });
    }

    if (customerCode) {
      and.push({ customer_no: customerCode });
    }

    if (salespersonCode) {
      and.push({ salesperson_code: salespersonCode });
    }

    if (estadoOferta) {
      and.push({ estado_oferta: estadoOferta });
    }

    if (cerrado !== undefined && cerrado !== '') {
      const isCerrado = cerrado === true || cerrado === 'true';
      and.push({ cerrado: isCerrado });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    try {
      const [data, total, allRelevantQuotes] = await Promise.all([
        this.prisma.sales_quotes.findMany({
          where,
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          orderBy: [
            { [sortBy]: sortDir },
            { id: 'asc' }
          ],
          include: {
            customer: {
              select: {
                name: true,
                salesperson_code: true,
              },
            },
            sales_rep: {
              select: {
                name: true,
              }
            }
          },
        }),
        this.prisma.sales_quotes.count({ where }),
        this.prisma.sales_quotes.findMany({
          where,
          select: {
            amount: true,
            estado_oferta: true,
            probabilidad_exito: true,
            valor_oferta_ponderado: true,
            cerrado: true,
            document_date: true,
            salesperson_code: true,
            sales_rep: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      // Calcular KPIs para la selección actual y datos de gráficos
      let totalAmount = 0;
      let wonAmount = 0;
      let wonCount = 0;
      let lostAmount = 0;
      let lostCount = 0;
      let pendingAmount = 0;
      let pendingCount = 0;
      let totalWeightedValue = 0;
      let totalProbabilitySum = 0;
      let probabilityCount = 0;

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthlyStatusList = monthNames.map((name, idx) => ({
        month: name,
        monthIndex: idx,
        createdCount: 0,
        createdAmount: 0,
        approvedCount: 0,
        approvedAmount: 0,
      }));

      const salespersonMonthlyMap = new Map<string, {
        month: string;
        salespersonCode: string;
        salespersonName: string;
        count: number;
        amount: number;
        wonCount: number;
        wonAmount: number;
      }>();

      allRelevantQuotes.forEach(quote => {
        const amt = Number(quote.amount || 0);
        const weighted = Number(quote.valor_oferta_ponderado || 0);
        const prob = Number(quote.probabilidad_exito || 0);
        const state = (quote.estado_oferta || '').toLowerCase();

        totalAmount += amt;

        if (prob > 0) {
          totalProbabilitySum += prob;
          probabilityCount++;
        }

        totalWeightedValue += weighted;

        const isWon = state.includes('ganada');
        const isLost = state.includes('perdida');

        if (isWon) {
          wonAmount += amt;
          wonCount++;
        } else if (isLost) {
          lostAmount += amt;
          lostCount++;
        } else {
          pendingAmount += amt;
          pendingCount++;
        }

        // --- Agrupación para gráficos ---
        if (quote.document_date) {
          const dateObj = new Date(quote.document_date);
          const monthIdx = dateObj.getMonth();

          if (monthIdx >= 0 && monthIdx < 12) {
            monthlyStatusList[monthIdx].createdCount++;
            monthlyStatusList[monthIdx].createdAmount += amt;

            if (isWon) {
              monthlyStatusList[monthIdx].approvedCount++;
              monthlyStatusList[monthIdx].approvedAmount += amt;
            }

            const spCode = quote.salesperson_code || 'SIN_VENDEDOR';
            const spName = quote.sales_rep?.name || spCode;
            const key = `${monthIdx}_${spCode}`;

            if (!salespersonMonthlyMap.has(key)) {
              salespersonMonthlyMap.set(key, {
                month: monthNames[monthIdx],
                salespersonCode: spCode,
                salespersonName: spName,
                count: 0,
                amount: 0,
                wonCount: 0,
                wonAmount: 0,
              });
            }

            const spItem = salespersonMonthlyMap.get(key)!;
            spItem.count++;
            spItem.amount += amt;
            if (isWon) {
              spItem.wonCount++;
              spItem.wonAmount += amt;
            }
          }
        }
      });

      const monthlySalespersonList = Array.from(salespersonMonthlyMap.values()).map(item => {
        const successRate = item.count > 0 ? (item.wonCount / item.count) * 100 : 0;
        return {
          ...item,
          amount: Number(item.amount.toFixed(2)),
          wonAmount: Number(item.wonAmount.toFixed(2)),
          successRate: Number(successRate.toFixed(2)),
        };
      });

      monthlyStatusList.forEach(item => {
        item.createdAmount = Number(item.createdAmount.toFixed(2));
        item.approvedAmount = Number(item.approvedAmount.toFixed(2));
      });

      const closedCount = wonCount + lostCount;
      const successRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
      const avgProbability = probabilityCount > 0 ? (totalProbabilitySum / probabilityCount) : 0;

      return {
        data,
        total,
        summary: {
          totalCount: allRelevantQuotes.length,
          totalAmount: Number(totalAmount.toFixed(2)),
          wonAmount: Number(wonAmount.toFixed(2)),
          wonCount,
          lostAmount: Number(lostAmount.toFixed(2)),
          lostCount,
          pendingAmount: Number(pendingAmount.toFixed(2)),
          pendingCount,
          successRate: Number(successRate.toFixed(2)),
          totalWeightedValue: Number(totalWeightedValue.toFixed(2)),
          averageProbability: Number(avgProbability.toFixed(2)),
          chartData: {
            monthlyStatusData: monthlyStatusList,
            monthlySalespersonData: monthlySalespersonList,
          },
        }
      };

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene una oferta por su ID (UUID) con sus relaciones completas.
   */
  async getById(id: string) {
    try {
      const quote = await this.prisma.sales_quotes.findUnique({
        where: { id },
        include: {
          customer: true,
          sales_rep: true,
        },
      });
      if (!quote) throw new NotFoundException('Oferta no encontrada');
      return quote;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}

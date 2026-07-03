import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesDocumentsService {
  private cacheHistory: {
    aggregated: any[];
    yearlyBreakdown: Record<number, Record<number, {
      itemsTotal: number;
      accounts: {
        account_no: string;
        description: string;
        amount: number;
      }[]
    }>>;
    lastFetched: number;
  } | null = null;

  // Cache validity duration: 2 hours (in milliseconds)
  private readonly CACHE_DURATION = 2 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los documentos de venta con soporte para filtros, búsqueda global y paginación.
   */
  async getAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    customerCode?: string;
    type?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    years?: number[];
    months?: number[];
  } = {}) {
    const { skip, take, search, customerCode, type, sortBy = 'posting_date', sortDir = 'desc', years, months } = params;

    const where: any = {};
    const and: any[] = [];

    if (years && years.length > 0) {
      const activeMonths = months && months.length > 0 ? months : Array.from({ length: 12 }, (_, i) => i + 1);
      const dateFilters: any[] = [];
      years.forEach(y => {
        activeMonths.forEach(m => {
          dateFilters.push({
            posting_date: {
              gte: new Date(Date.UTC(y, m - 1, 1)),
              lt: new Date(Date.UTC(y, m, 1)),
            }
          });
        });
      });
      and.push({ OR: dateFilters });
    }

    if (search) {
      and.push({
        OR: [
          { document_no: { contains: search, mode: 'insensitive' } },
          { external_doc_no: { contains: search, mode: 'insensitive' } },
          { order_no: { contains: search, mode: 'insensitive' } },
          { your_reference: { contains: search, mode: 'insensitive' } },
          { customer_no: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: search, mode: 'insensitive' }
            }
          },
          {
            lines: {
              some: {
                OR: [
                  { product_no: { contains: search, mode: 'insensitive' } },
                  {
                    product: {
                      description: { contains: search, mode: 'insensitive' }
                    }
                  }
                ]
              }
            }
          }
        ],
      });
    }

    if (customerCode) {
      and.push({ customer_no: customerCode });
    }

    // Filtrado por tipo (por ejemplo, si tiene líneas del tipo especificado, o si es factura/abono)
    if (type) {
      and.push({
        lines: {
          some: {
            type: type
          }
        }
      });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    try {
      const [data, total, allRelevantDocuments] = await Promise.all([
        this.prisma.sales_documents.findMany({
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
            lines: {
              include: {
                product: {
                  select: {
                    description: true,
                  }
                }
              }
            }
          },
        }),
        this.prisma.sales_documents.count({ where }),
        this.prisma.sales_documents.findMany({
          where,
          select: {
            document_no: true,
            document_type: true,
            total_amount_excl_vat: true,
            total_vat_amount: true,
            total_amount_incl_vat: true,
            disc_amount: true,
            lines: {
              select: {
                quantity: true,
                unit_cost_lcy: true,
                line_disc_amount: true,
                line_amount: true,
                type: true,
                product_no: true,
              }
            }
          },
        }),
      ]);

      // Calcular KPIs consolidados de la selección
      let totalFacturadoNeto = 0;
      let totalVatAmount = 0;
      let totalAmountInclVat = 0;
      let totalDescuentosLínea = 0;
      let totalDescuentosGlobales = 0;
      let totalCoste = 0;
      let totalTransporte = 0;
      let totalServicios = 0;

      allRelevantDocuments.forEach(doc => {
        const docAmountExclVat = Number(doc.total_amount_excl_vat || 0);
        const docVatAmount = Number(doc.total_vat_amount || 0);
        const docAmountInclVat = Number(doc.total_amount_incl_vat || 0);
        const docDisc = Number(doc.disc_amount || 0);
        const isAbono = doc.document_type?.toLowerCase()?.includes('abono') || doc.document_no?.toUpperCase().startsWith('AB');
        const multiplier = isAbono ? -1 : 1;

        totalFacturadoNeto += docAmountExclVat * multiplier;
        totalVatAmount += docVatAmount * multiplier;
        totalAmountInclVat += docAmountInclVat * multiplier;
        totalDescuentosGlobales += docDisc;

        doc.lines.forEach(line => {
          const qty = Number(line.quantity || 0);
          const unitCost = Number(line.unit_cost_lcy || 0);
          const lineDisc = Number(line.line_disc_amount || 0);
          const lineAmount = Number(line.line_amount || 0);

          totalCoste += (qty * unitCost) * multiplier;
          totalDescuentosLínea += lineDisc;

          const typeLower = (line.type || '').toLowerCase();
          const prodLower = (line.product_no || '').toLowerCase();

          const isTransport = 
            typeLower === 'charge (item)' || 
            prodLower === '6240001' || 
            prodLower.includes('trans') || 
            prodLower.includes('flete') || 
            prodLower.includes('portes');

          const isService = 
            (typeLower === 'g/l account' && prodLower !== '6240001') || 
            (typeLower !== 'item' && !isTransport);

          if (isTransport) {
            totalTransporte += lineAmount * multiplier;
          } else if (isService) {
            totalServicios += lineAmount * multiplier;
          }
        });
      });

      const totalMarginAmount = totalFacturadoNeto - totalCoste;
      const margenMedioPct = totalFacturadoNeto > 0 ? (totalMarginAmount / totalFacturadoNeto) * 100 : 0;

      const mappedData = data.map(doc => {
        if (doc.lines) {
          doc.lines = doc.lines.map(line => {
            if (line.type?.toLowerCase() === 'g/l account') {
              const accountNo = line.product_no || '';
              const defaultDesc = line.product?.description || '';
              const mappedDesc = this.getGLAccountDescription(accountNo, defaultDesc);
              return {
                ...line,
                product: line.product ? {
                  ...line.product,
                  description: mappedDesc
                } : {
                  description: mappedDesc
                } as any
              };
            }
            return line;
          });
        }
        return doc;
      });

      return {
        data: mappedData,
        total,
        summary: {
          totalDocuments: allRelevantDocuments.length,
          totalInvoicedNet: totalFacturadoNeto,
          totalVatAmount: totalVatAmount,
          totalAmountInclVat: totalAmountInclVat,
          totalDiscountsLine: totalDescuentosLínea,
          totalDiscountsGlobal: totalDescuentosGlobales,
          averageMarginPct: Number(margenMedioPct.toFixed(2)),
          totalCost: totalCoste,
          totalTransport: totalTransporte,
          totalServices: totalServicios,
        }
      };

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene un documento de venta completo por su ID (UUID) con sus líneas y relaciones.
   */
  async getById(id: string) {
    try {
      const document = await this.prisma.sales_documents.findUnique({
        where: { id },
        include: {
          customer: true,
          lines: {
            include: {
              product: true,
            }
          }
        },
      });
      if (!document) throw new NotFoundException('Documento no encontrado');
      
      if (document.lines) {
        document.lines = document.lines.map(line => {
          if (line.type?.toLowerCase() === 'g/l account') {
            const accountNo = line.product_no || '';
            const defaultDesc = line.product?.description || '';
            const mappedDesc = this.getGLAccountDescription(accountNo, defaultDesc);
            return {
              ...line,
              product: line.product ? {
                ...line.product,
                description: mappedDesc
              } : {
                description: mappedDesc
              } as any
            };
          }
          return line;
        });
      }
      
      return document;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene documentos de venta por código de cliente.
   */
  async getByCustomer(customerCode: string) {
    return this.getAll({ customerCode });
  }

  /**
   * Obtiene datos agregados de facturación para el dashboard histórico de facturación.
   * Optimizado con caché en memoria para los datos cerrados de años anteriores (2022-2025).
   */
  async getBillingHistoryDashboard() {
    try {
      const currentYear = new Date().getFullYear();
      const now = Date.now();

      // Check if cache for previous years is loaded and still valid
      const isCacheValid = this.cacheHistory && (now - this.cacheHistory.lastFetched < this.CACHE_DURATION);
      
      let historicalAggregated: any[] = [];
      let historicalYearlyBreakdown: Record<number, Record<number, {
        itemsTotal: number;
        accounts: {
          account_no: string;
          description: string;
          amount: number;
        }[]
      }>> = {};

      if (isCacheValid && this.cacheHistory) {
        historicalAggregated = this.cacheHistory.aggregated;
        historicalYearlyBreakdown = this.cacheHistory.yearlyBreakdown;
      } else {
        // Fetch and process historical years (2022 up to previous year)
        const historicalDocs = await this.prisma.sales_documents.findMany({
          where: {
            posting_date: {
              gte: new Date(Date.UTC(2022, 0, 1)),
              lt: new Date(Date.UTC(currentYear, 0, 1))
            }
          },
          select: {
            document_no: true,
            document_type: true,
            total_amount_excl_vat: true,
            posting_date: true,
            customer_no: true,
            customer: {
              select: {
                name: true,
                salesperson_code: true,
                sales_rep: { select: { name: true } }
              }
            },
            lines: {
              select: {
                type: true,
                line_amount: true,
                product_no: true,
                product: { select: { description: true } }
              }
            }
          }
        });

        const { aggregated: histAgg, yearlyBreakdown: histBreak } = this.processDocuments(historicalDocs);
        
        // Cache historical data
        this.cacheHistory = {
          aggregated: histAgg,
          yearlyBreakdown: histBreak,
          lastFetched: now
        };
        historicalAggregated = histAgg;
        historicalYearlyBreakdown = histBreak;
      }

      // Fetch and process current year data (Always real-time live data)
      const currentYearDocs = await this.prisma.sales_documents.findMany({
        where: {
          posting_date: {
            gte: new Date(Date.UTC(currentYear, 0, 1)),
            lt: new Date(Date.UTC(currentYear + 1, 0, 1))
          }
        },
        select: {
          document_no: true,
          document_type: true,
          total_amount_excl_vat: true,
          posting_date: true,
          customer_no: true,
          customer: {
            select: {
              name: true,
              salesperson_code: true,
              sales_rep: { select: { name: true } }
            }
          },
          lines: {
            select: {
              type: true,
              line_amount: true,
              product_no: true,
              product: { select: { description: true } }
            }
          }
        }
      });

      const { aggregated: currentAgg, yearlyBreakdown: currentBreak } = this.processDocuments(currentYearDocs);

      // Merge historical cache with current year live data
      const mergedAggregated = [...historicalAggregated, ...currentAgg];
      const mergedYearlyBreakdown = {
        ...historicalYearlyBreakdown,
        ...currentBreak
      };

      return {
        aggregated: mergedAggregated,
        yearlyBreakdown: mergedYearlyBreakdown
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Helper function to process and aggregate document arrays
   */
  private processDocuments(documents: any[]) {
    const aggregated: Record<string, {
      customer_no: string;
      customer_name: string;
      year: number;
      month: number;
      salesperson_code: string;
      salesperson_name: string;
      amount: number;
      accounts_amount: number;
      accounts_positive_amount: number;
      accounts_negative_amount: number;
    }> = {};

    const yearlyBreakdown: Record<number, Record<number, {
      itemsTotal: number;
      accounts: Record<string, {
        account_no: string;
        description: string;
        amount: number;
      }>;
    }>> = {};

    documents.forEach(doc => {
      const isAbono = doc.document_type?.toLowerCase()?.includes('abono') || doc.document_no?.toUpperCase().startsWith('AB');
      const multiplier = isAbono ? -1 : 1;
      const amount = Number(doc.total_amount_excl_vat || 0) * multiplier;
      
      let accountsAmount = 0;
      let accountsPositiveAmount = 0;
      let accountsNegativeAmount = 0;
      
      const date = doc.posting_date ? new Date(doc.posting_date) : null;
      if (!date) return;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!yearlyBreakdown[year]) {
        yearlyBreakdown[year] = {};
      }
      if (!yearlyBreakdown[year][month]) {
        yearlyBreakdown[year][month] = {
          itemsTotal: 0,
          accounts: {}
        };
      }

      if (doc.lines) {
        doc.lines.forEach((line: any) => {
          const lineAmt = Number(line.line_amount || 0) * multiplier;
          const typeLower = line.type?.toLowerCase();

          if (typeLower === 'item') {
            yearlyBreakdown[year][month].itemsTotal += lineAmt;
          } else if (typeLower === 'g/l account') {
            accountsAmount += lineAmt;
            const acctNo = line.product_no || 'Sin cuenta';
            if (acctNo.startsWith('438')) {
              accountsNegativeAmount += lineAmt;
            } else {
              accountsPositiveAmount += lineAmt;
            }

            const desc = this.getGLAccountDescription(acctNo, line.product?.description);

            if (!yearlyBreakdown[year][month].accounts[acctNo]) {
              yearlyBreakdown[year][month].accounts[acctNo] = {
                account_no: acctNo,
                description: desc,
                amount: 0
              };
            }
            yearlyBreakdown[year][month].accounts[acctNo].amount += lineAmt;
          }
        });
      }

      const customer_no = doc.customer_no;
      const customer_name = doc.customer?.name || 'Desconocido';
      const salesperson_code = doc.customer?.salesperson_code || 'En blanco';
      const salesperson_name = doc.customer?.sales_rep?.name || 'En blanco';

      const key = `${customer_no}_${year}_${month}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          customer_no,
          customer_name,
          year,
          month,
          salesperson_code,
          salesperson_name,
          amount: 0,
          accounts_amount: 0,
          aggregated_positive_amount: 0, // renamed to avoid overlap errors if any
          accounts_positive_amount: 0,
          accounts_negative_amount: 0
        } as any;
      }
      aggregated[key].amount += amount;
      aggregated[key].accounts_amount += accountsAmount;
      aggregated[key].accounts_positive_amount += accountsPositiveAmount;
      aggregated[key].accounts_negative_amount += accountsNegativeAmount;
    });

    const finalYearlyBreakdown: Record<number, Record<number, {
      itemsTotal: number;
      accounts: {
        account_no: string;
        description: string;
        amount: number;
      }[]
    }>> = {};

    Object.entries(yearlyBreakdown).forEach(([yr, monthsData]) => {
      const yrNum = Number(yr);
      finalYearlyBreakdown[yrNum] = {};
      Object.entries(monthsData).forEach(([m, data]) => {
        finalYearlyBreakdown[yrNum][Number(m)] = {
          itemsTotal: data.itemsTotal,
          accounts: Object.values(data.accounts).sort((a, b) => b.amount - a.amount)
        };
      });
    });

    return {
      aggregated: Object.values(aggregated),
      yearlyBreakdown: finalYearlyBreakdown
    };
  }

  private getGLAccountDescription(accountNo: string, defaultDescription: string | null | undefined): string {
    let desc = defaultDescription || 'Sin descripción';
    if (accountNo === '6240001') {
      desc = 'Embalaje y transporte';
    } else if (accountNo === '6260001') {
      desc = 'Servicios bancarios';
    } else if (accountNo === '7050004') {
      desc = 'Comisiones Seiko';
    } else if (accountNo === '4380001') {
      desc = 'Anticipo clientes NAC';
    } else if (accountNo === '4380002') {
      desc = 'Anticipos clientes UE';
    } else if (accountNo === '4380003') {
      desc = 'Anticipos clientes exp.';
    } else if (accountNo === '7050013') {
      desc = 'Colaboración Expoquimia';
    } else if (accountNo === '6290032') {
      desc = 'Comisiones a clientes';
    } else if (accountNo === '6000001') {
      desc = 'Compras nacional';
    }

    if (desc) {
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    }
    return desc;
  }
}

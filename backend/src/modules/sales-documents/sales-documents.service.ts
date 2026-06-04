import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesDocumentsService {
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
    year?: number;
  } = {}) {
    const { skip, take, search, customerCode, type, sortBy = 'document_date', sortDir = 'desc', year } = params;

    const where: any = {};
    const and: any[] = [];

    if (year) {
      const yearNum = Number(year);
      and.push({
        document_date: {
          gte: new Date(`${yearNum}-01-01`),
          lte: new Date(`${yearNum}-12-31T23:59:59.999Z`),
        }
      });
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
      let totalDescuentosLínea = 0;
      let totalDescuentosGlobales = 0;
      let totalCoste = 0;
      let totalTransporte = 0;
      let totalServicios = 0;

      allRelevantDocuments.forEach(doc => {
        const docAmountExclVat = Number(doc.total_amount_excl_vat || 0);
        const docDisc = Number(doc.disc_amount || 0);
        const isAbono = doc.document_type?.toLowerCase()?.includes('abono') || doc.document_no?.toUpperCase().startsWith('AB');
        const multiplier = isAbono ? -1 : 1;

        totalFacturadoNeto += docAmountExclVat * multiplier;
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

      return {
        data,
        total,
        summary: {
          totalDocuments: allRelevantDocuments.length,
          totalInvoicedNet: totalFacturadoNeto,
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
}

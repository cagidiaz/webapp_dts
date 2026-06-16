import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCrmQuoteDto, CreateActivityDto, UpdateActivityDto } from './dto/crm-quote.dto';


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

  /**
   * Obtiene la vista unificada de ofertas CRM filtrada por comercial si corresponde.
   */
  async getAllCrm(params: {
    salespersonCode?: string;
    estadoOferta?: string;
    probabilidadExito?: string;
    ofertaType?: string;
    search?: string;
    year?: number;
  }, userId: string) {
    try {
      // 1. Obtener perfil del usuario para validar permisos
      const profile = await this.prisma.profiles.findUnique({
        where: { id: userId },
        include: { roles: true }
      });
      if (!profile) throw new ForbiddenException('Usuario sin perfil configurado');

      const userRole = (profile.roles?.name || '').toUpperCase();
      let spCodeFilter = params.salespersonCode;

      // Si el rol es VENTAS u OPERACIONES, forzar filtro de su propio código
      if (userRole === 'VENTAS' || userRole === 'OPERACIONES') {
        spCodeFilter = profile.code || 'SIN_CODIGO';
      }

      // 2. Construir la consulta
      const where: any = {};
      const and: any[] = [];

      if (spCodeFilter) {
        and.push({ salesperson_code: spCodeFilter });
      }

      if (params.year) {
        and.push({
          document_date: {
            gte: new Date(`${params.year}-01-01`),
            lte: new Date(`${params.year}-12-31`),
          },
        });
      }

      if (params.search) {
        and.push({
          OR: [
            { document_no: { contains: params.search, mode: 'insensitive' } },
            { customer_no: { contains: params.search, mode: 'insensitive' } },
            {
              customer: {
                name: { contains: params.search, mode: 'insensitive' }
              }
            }
          ]
        });
      }

      if (params.estadoOferta) {
        and.push({
          OR: [
            { sales_quotes_crm: { estado_oferta: params.estadoOferta } },
            {
              AND: [
                { sales_quotes_crm: null },
                { estado_oferta: { equals: params.estadoOferta, mode: 'insensitive' } }
              ]
            }
          ]
        });
      }

      if (params.probabilidadExito) {
        and.push({
          OR: [
            { sales_quotes_crm: { probabilidad_exito: Number(params.probabilidadExito) } },
            {
              AND: [
                { sales_quotes_crm: null },
                { probabilidad_exito: Number(params.probabilidadExito) }
              ]
            }
          ]
        });
      }

      if (params.ofertaType) {
        and.push({
          OR: [
            { sales_quotes_crm: { oferta_type: params.ofertaType } },
            {
              AND: [
                { sales_quotes_crm: null },
                { oferta_type: { equals: params.ofertaType, mode: 'insensitive' } }
              ]
            }
          ]
        });
      }

      if (and.length > 0) {
        where.AND = and;
      }

      // 3. Ejecutar consulta
      const quotes = await this.prisma.sales_quotes.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
              salesperson_code: true
            }
          },
          sales_rep: {
            select: {
              name: true
            }
          },
          sales_quotes_crm: {
            include: {
              activities: {
                orderBy: { fecha: 'desc' }
              }
            }
          }
        },
        orderBy: {
          document_date: 'desc'
        }
      });

      // 4. Formatear y unificar
      return quotes.map(q => {
        const crm = q.sales_quotes_crm;
        const estado = crm?.estado_oferta || (q.estado_oferta || 'borrador').toLowerCase();
        const prob = crm ? Number(crm.probabilidad_exito ?? 10) : Number(q.probabilidad_exito ?? 10);
        const tipo = crm?.oferta_type || (q.oferta_type || 'proyecto').toLowerCase();
        const amt = Number(q.amount || 0);
        const valorPonderado = amt * (prob / 100);

        return {
          id: q.id,
          document_no: q.document_no,
          document_date: q.document_date,
          amount: amt,
          salesperson_code: q.salesperson_code,
          customer_no: q.customer_no,
          customer_name: q.customer?.name || '---',
          salesperson_name: q.sales_rep?.name || '---',
          
          crm_id: crm?.id || null,
          estado_oferta: estado,
          probabilidad_exito: prob,
          oferta_type: tipo,
          cierreprev_date: crm?.cierreprev_date || q.cierreprev_date || null,
          confirmacion_date: crm?.confirmacion_date || q.confirmacion_date || null,
          motivo_ganada: crm?.motivo_ganada || q.motivo_ganada || null,
          motivo_perdida: crm?.motivo_perdida || q.motivo_perdida || null,
          observaciones: crm?.observaciones || q.observaciones || null,
          contacto_nombre: crm?.contacto_nombre || null,
          contacto_email: crm?.contacto_email || null,
          contacto_telefono: crm?.contacto_telefono || null,
          proxima_accion: crm?.proxima_accion || null,
          fecha_proxima_accion: crm?.fecha_proxima_accion || null,
          valor_oferta_ponderado: Number(valorPonderado.toFixed(2)),
          
          activities: crm?.activities || []
        };
      });

    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Actualiza o crea los metadatos CRM de una oferta.
   */
  async updateCrm(quoteId: string, payload: UpdateCrmQuoteDto) {
    try {
      const quote = await this.prisma.sales_quotes.findUnique({
        where: { id: quoteId }
      });
      if (!quote) throw new NotFoundException('Oferta no encontrada');

      const docNo = quote.document_no;

      // Calcular probabilidad automática en base al estado si no se pasa explícitamente
      let probabilidad = payload.probabilidad_exito;
      const estado = payload.estado_oferta?.toLowerCase();

      if (estado && probabilidad === undefined) {
        if (estado === 'borrador') probabilidad = 10;
        else if (estado === 'enviada') probabilidad = 25;
        else if (estado === 'en negociación') probabilidad = 50;
        else if (estado === 'ganada') probabilidad = 100;
        else if (estado === 'perdida') probabilidad = 0;
      }

      let confirmacionDate = payload.confirmacion_date ? new Date(payload.confirmacion_date) : undefined;
      if (estado === 'ganada' || estado === 'perdida') {
        confirmacionDate = new Date();
      }

      const crmRecord = await this.prisma.sales_quotes_crm.findUnique({
        where: { document_no: docNo }
      });

      const updateData: any = {
        estado_oferta: estado || undefined,
        probabilidad_exito: probabilidad !== undefined ? probabilidad : undefined,
        oferta_type: payload.oferta_type?.toLowerCase() || undefined,
        cierreprev_date: payload.cierreprev_date ? new Date(payload.cierreprev_date) : undefined,
        confirmacion_date: confirmacionDate,
        motivo_ganada: payload.motivo_ganada,
        motivo_perdida: payload.motivo_perdida,
        observaciones: payload.observaciones,
        contacto_nombre: payload.contacto_nombre,
        contacto_email: payload.contacto_email,
        contacto_telefono: payload.contacto_telefono,
        proxima_accion: payload.proxima_accion,
        fecha_proxima_accion: payload.fecha_proxima_accion ? new Date(payload.fecha_proxima_accion) : undefined,
        updated_at: new Date()
      };

      // Eliminar undefined para que Prisma no los tome
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      if (crmRecord) {
        return await this.prisma.sales_quotes_crm.update({
          where: { document_no: docNo },
          data: updateData
        });
      } else {
        return await this.prisma.sales_quotes_crm.create({
          data: {
            document_no: docNo,
            estado_oferta: estado || (quote.estado_oferta || 'borrador').toLowerCase(),
            probabilidad_exito: probabilidad !== undefined ? probabilidad : Number(quote.probabilidad_exito || 10),
            oferta_type: payload.oferta_type?.toLowerCase() || (quote.oferta_type || 'proyecto').toLowerCase(),
            cierreprev_date: payload.cierreprev_date ? new Date(payload.cierreprev_date) : (quote.cierreprev_date ? new Date(quote.cierreprev_date) : null),
            confirmacion_date: confirmacionDate || (quote.confirmacion_date ? new Date(quote.confirmacion_date) : null),
            motivo_ganada: payload.motivo_ganada || quote.motivo_ganada || null,
            motivo_perdida: payload.motivo_perdida || quote.motivo_perdida || null,
            observaciones: payload.observaciones || quote.observaciones || null,
            contacto_nombre: payload.contacto_nombre || null,
            contacto_email: payload.contacto_email || null,
            contacto_telefono: payload.contacto_telefono || null,
            proxima_accion: payload.proxima_accion || null,
            fecha_proxima_accion: payload.fecha_proxima_accion ? new Date(payload.fecha_proxima_accion) : null
          }
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Obtiene las actividades de una oferta.
   */
  async getActivities(quoteId: string) {
    try {
      const quote = await this.prisma.sales_quotes.findUnique({
        where: { id: quoteId }
      });
      if (!quote) return [];

      const crm = await this.prisma.sales_quotes_crm.findUnique({
        where: { document_no: quote.document_no }
      });
      if (!crm) return [];

      return await this.prisma.sales_quote_activities.findMany({
        where: { crm_quote_id: crm.id },
        orderBy: { fecha: 'desc' }
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Crea una actividad para una oferta.
   */
  async addActivity(quoteId: string, payload: CreateActivityDto) {
    try {
      const quote = await this.prisma.sales_quotes.findUnique({
        where: { id: quoteId }
      });
      if (!quote) throw new NotFoundException('Oferta no encontrada');

      let crm = await this.prisma.sales_quotes_crm.findUnique({
        where: { document_no: quote.document_no }
      });

      // Si no existe, creamos el metadato CRM
      if (!crm) {
        crm = await this.updateCrm(quoteId, {});
      }

      return await this.prisma.sales_quote_activities.create({
        data: {
          crm_quote_id: crm.id,
          tipo: payload.tipo,
          notas: payload.notas,
          fecha: new Date(payload.fecha),
          hecho: payload.hecho || false
        }
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Actualiza una actividad de seguimiento.
   */
  async updateActivity(activityId: string, payload: UpdateActivityDto) {
    try {
      const act = await this.prisma.sales_quote_activities.findUnique({
        where: { id: activityId }
      });
      if (!act) throw new NotFoundException('Actividad no encontrada');

      return await this.prisma.sales_quote_activities.update({
        where: { id: activityId },
        data: {
          tipo: payload.tipo || undefined,
          notas: payload.notas || undefined,
          fecha: payload.fecha ? new Date(payload.fecha) : undefined,
          hecho: payload.hecho !== undefined ? payload.hecho : undefined
        }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Elimina una actividad de seguimiento.
   */
  async deleteActivity(activityId: string) {
    try {
      const act = await this.prisma.sales_quote_activities.findUnique({
        where: { id: activityId }
      });
      if (!act) throw new NotFoundException('Actividad no encontrada');

      return await this.prisma.sales_quote_activities.delete({
        where: { id: activityId }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}

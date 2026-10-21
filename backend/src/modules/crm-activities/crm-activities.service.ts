import { normalizeAttachments } from '../exchange-sync/email-attachments';
import { Injectable, InternalServerErrorException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmActivityType } from '@prisma/client';
import { ExchangeSyncService } from '../exchange-sync/exchange-sync.service';
import { ProspectsService } from '../prospects/prospects.service';

@Injectable()
export class CrmActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ExchangeSyncService))
    private readonly exchangeSyncService: ExchangeSyncService,
    private readonly prospectsService: ProspectsService,
  ) {}

  /**
   * Obtiene todas las actividades de un cliente comercial ordenadas por fecha.
   */
  async getByClient(clientId: string, userId?: string) {
    try {
      let activities = await this.prisma.crm_activities.findMany({
        where: { client_id: clientId },
        include: {
          contact: true,
        },
        orderBy: { created_at: 'desc' },
      });


      // Enriquecer con número de oferta asociada
      return await this.enrichActivitiesWithQuoteInfo(activities);
    } catch (error) {
      console.error('Error en CrmActivitiesService.getByClient:', error);
      throw new InternalServerErrorException('Error al obtener las actividades del cliente');
    }
  }

  /**
   * Obtiene todas las actividades de un contacto comercial ordenadas por fecha.
   */
  async getByContact(contactId: string, userId?: string) {
    try {
      let activities = await this.prisma.crm_activities.findMany({
        where: { contact_id: contactId },
        include: {
          customer: true,
        },
        orderBy: { created_at: 'desc' },
      });


      // Enriquecer con número de oferta asociada
      return await this.enrichActivitiesWithQuoteInfo(activities);
    } catch (error) {
      console.error('Error en CrmActivitiesService.getByContact:', error);
      throw new InternalServerErrorException('Error al obtener las actividades del contacto');
    }
  }

  /**
   * Extrae o cruza el número de oferta asociada (quote_document_no) para cada actividad.
   */
  private async enrichActivitiesWithQuoteInfo(activities: any[]) {
    if (!activities || activities.length === 0) return [];

    return activities.map((act) => {
      let quoteDocNo: string | null = null;

      // 1. Extraer desde attendees JSON si se guardó estructurado
      if (act.attendees && typeof act.attendees === 'object') {
        const att = act.attendees as any;
        const candidate = att.quoteDocumentNo || att.quote_document_no || null;
        if (candidate && !/^(OFERTA[ _]PROVEEDOR|PETICION[ _]OFERTA|REVISION[ _]OFERTA|NEGOCIACION|CIERRE_ACEPTACION)$/i.test(String(candidate).trim())) {
          quoteDocNo = candidate;
        }
      }

      // 2. Extraer desde el título si contiene una oferta real (limpiando corchetes y requiriendo números)
      if (!quoteDocNo && act.title) {
        // Ignorar corchetes iniciales de metadatos [📥 Recibido · 📦 Oferta proveedor]
        const cleanTitle = act.title.replace(/^\[.*?\]\s*/, '');
        // Buscar códigos con números obligatorios (ej. OFT-123, COT-456, OF-2024-001, OFERTA 24-012)
        const match = cleanTitle.match(/(?:OFT|COT|OFERTA|OF)[-_ ]?([0-9][A-Z0-9\-\/]*)/i);
        if (match) {
          const candidate = match[0].toUpperCase().trim();
          if (!/^(OFERTA[ _]PROVEEDOR|PETICION[ _]OFERTA|REVISION[ _]OFERTA)$/i.test(candidate)) {
            quoteDocNo = candidate;
          }
        }
      }

      return {
        ...act,
        quote_document_no: quoteDocNo,
      };
    });
  }

  /**
   * Obtiene las actividades comerciales (agenda) filtradas por usuario, tipos y/o rango de fechas.
   */
  async getAgenda(params: {
    requestingUserId: string;
    salespersonId?: string;
    startDate?: string;
    endDate?: string;
    types?: CrmActivityType[];
  }) {
    const { requestingUserId, salespersonId, startDate, endDate, types } = params;
    const whereClause: any = {};

    // 1. Obtener el rol del usuario que realiza la petición desde la base de datos
    let isAdminOrDireccion = false;
    if (requestingUserId) {
      const userProfile = await this.prisma.profiles.findUnique({
        where: { id: requestingUserId },
        include: { roles: true },
      });
      const roleName = userProfile?.roles?.name?.toUpperCase() || '';
      isAdminOrDireccion = roleName === 'ADMIN' || roleName === 'DIRECCION' || roleName === 'GERENCIA';
    }

    // 2. Filtro por creador / comercial
    if (isAdminOrDireccion) {
      // Si es administrador o gerencia, puede filtrar por un comercial específico o ver todos (consolidado)
      if (salespersonId && salespersonId.trim() !== '' && salespersonId !== 'all') {
        whereClause.created_by = salespersonId;
      }
    } else {
      // Un comercial u otro usuario solo puede ver sus propias actividades
      whereClause.created_by = requestingUserId;
    }

    // 3. Filtro por tipos de actividades
    if (types && types.length > 0) {
      whereClause.type = { in: types };
    }

    // 4. Filtro por fechas normalizadas (evitando desfases de huso horario en @db.Date)
    if (startDate || endDate) {
      whereClause.due_date = {};
      if (startDate) {
        const cleanStart = startDate.includes('T') ? startDate.split('T')[0] : startDate;
        whereClause.due_date.gte = new Date(`${cleanStart}T00:00:00.000Z`);
      }
      if (endDate) {
        const cleanEnd = endDate.includes('T') ? endDate.split('T')[0] : endDate;
        whereClause.due_date.lte = new Date(`${cleanEnd}T23:59:59.999Z`);
      }
    }

    try {
      let activities = await this.prisma.crm_activities.findMany({
        where: whereClause,
        include: {
          customer: true,
          contact: true,
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: {
          due_date: 'asc'
        }
      });


      const prospects = await this.prospectsService.agenda(requestingUserId, { salespersonId, startDate, endDate, types });
      return [...activities, ...prospects].sort((a, b) =>
        String(a.due_date?.toISOString() || '').localeCompare(String(b.due_date?.toISOString() || '')) ||
        String(a.time_scheduled || '').localeCompare(String(b.time_scheduled || '')) || a.id.localeCompare(b.id));
    } catch (error) {
      console.error('Error en CrmActivitiesService.getAgenda:', error);
      throw new InternalServerErrorException('Error al obtener la agenda de actividades');
    }
  }

  /**
   * Obtiene el resumen diario (Briefing) de actividades para el usuario logueado:
   * - Actividades del día de hoy
   * - Actividades pasadas no completadas
   * - Conteo global del equipo si es directivo/admin
   */
  async getDailyBriefing(userId?: string) {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const part = (type: string) => parts.find(value => value.type === type)!.value;
      const todayStr = `${part('year')}-${part('month')}-${part('day')}`;

      if (!userId) {
        return {
          todayStr,
          todayActivities: [],
          pendingActivities: [],
          stats: {
            todayTotal: 0,
            todayPending: 0,
            todayCompleted: 0,
            pastPendingTotal: 0,
            isAdminOrDireccion: false,
          },
        };
      }

      const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
      const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

      // 1. Actividades del día de hoy para el usuario
      let todayActivities: any[] = await this.prisma.crm_activities.findMany({
        where: {
          created_by: userId,
          type: { not: 'EMAIL' },
          due_date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          customer: true,
          contact: true,
        },
        orderBy: [
          { time_scheduled: 'asc' },
          { created_at: 'asc' },
        ],
      });

      // 2. Actividades pasadas pendientes de completar (due_date < hoy e is_completed = false)
      let pendingActivities: any[] = await this.prisma.crm_activities.findMany({
        where: {
          created_by: userId,
          type: { not: 'EMAIL' },
          is_completed: false,
          due_date: {
            lt: todayStart,
          },
        },
        include: {
          customer: true,
          contact: true,
        },
        orderBy: {
          due_date: 'desc',
        },
        take: 20,
      });

      // 3. Obtener rol para estadísticas de equipo si es Admin o Gerencia
      const userProfile = await this.prisma.profiles.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      const roleName = userProfile?.roles?.name?.toUpperCase() || '';
      const isAdminOrDireccion = roleName === 'ADMIN' || roleName === 'DIRECCION' || roleName === 'GERENCIA';

      let teamTodayTotal = 0;
      if (isAdminOrDireccion) {
        teamTodayTotal = await this.prisma.crm_activities.count({
          where: {
            type: { not: 'EMAIL' },
            due_date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });
      }

      const ownProspects = await this.prospectsService.agenda(userId, { onlyOwn: true, endDate: todayStr });
      todayActivities = [...todayActivities, ...ownProspects.filter(activity => activity.due_date?.getTime() === todayStart.getTime())]
        .sort((a, b) => String(a.time_scheduled || '').localeCompare(String(b.time_scheduled || '')) || a.id.localeCompare(b.id));
      pendingActivities = [...pendingActivities, ...ownProspects.filter(activity => !activity.is_completed && activity.due_date && activity.due_date < todayStart)]
        .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime() || a.id.localeCompare(b.id)).slice(0, 20);
      if (isAdminOrDireccion) {
        teamTodayTotal += (await this.prospectsService.agenda(userId, { startDate: todayStr, endDate: todayStr })).length;
      }
      const todayCompleted = todayActivities.filter(a => a.is_completed).length;

      return {
        todayStr,
        todayActivities,
        pendingActivities,
        stats: {
          todayTotal: todayActivities.length,
          todayPending: todayActivities.length - todayCompleted,
          todayCompleted,
          pastPendingTotal: pendingActivities.length,
          teamTodayTotal: isAdminOrDireccion ? teamTodayTotal : undefined,
          isAdminOrDireccion,
        },
      };
    } catch (error) {
      console.error('Error en CrmActivitiesService.getDailyBriefing:', error);
      throw new InternalServerErrorException('Error al obtener el briefing diario de actividades');
    }
  }

  /**
   * Crea una nueva actividad comercial en la base de datos y la sincroniza con Outlook si corresponde.
   */
  async create(data: {
    emailAttachments?: unknown;
    clientId?: string;
    contactId?: string;
    userId: string;
    type: CrmActivityType;
    title: string;
    description?: string;
    dueDate?: string;
    timeScheduled?: string;
    email?: string;
    createdAt?: string;
    conclusions?: string;
    location?: string;
  }) {
    const { clientId, contactId, userId, type, title, description, dueDate, timeScheduled, email, createdAt, conclusions, location } = data;
    
    let resolvedClientId = clientId;

    // Si viene contactId, buscar el contacto para inferir automáticamente el client_id
    if (contactId) {
      const contactObj = await this.prisma.contacts.findUnique({
        where: { id: contactId }
      });
      if (contactObj) {
        resolvedClientId = resolvedClientId || contactObj.client_id;
      }
    }

    if (!resolvedClientId) {
      throw new NotFoundException('client_id es obligatorio para registrar la actividad comercial');
    }

    // Verificar si el cliente realmente existe en la base de datos de clientes
    const customerExists = await this.prisma.customers.findUnique({
      where: { client_id: resolvedClientId }
    });

    if (!customerExists) {
      throw new NotFoundException(`El cliente con código "${resolvedClientId}" no existe en la ficha de clientes`);
    }

    console.log(`[CRM Service] Creando actividad con tipo=${type}, title="${title}", contactId=${contactId || 'null'}, resolvedClientId=${resolvedClientId}`);
    try {
      const activity = await this.prisma.crm_activities.create({
        data: {
          ...(type === 'EMAIL' && data.emailAttachments !== undefined ? { attendees: { emailAttachments: normalizeAttachments(data.emailAttachments, 'office') } } : {}),
          client_id: resolvedClientId,
          contact_id: contactId || null,
          created_by: userId,
          type,
          title,
          description: description || null,
          due_date: dueDate ? new Date(dueDate) : null,
          time_scheduled: timeScheduled || null,
          email: email || null,
          conclusions: conclusions ? conclusions.trim() : null,
          is_completed: type === 'EMAIL' || Boolean(conclusions && conclusions.trim()),
          location: location || null,
          created_at: createdAt ? new Date(createdAt) : undefined
        }
      });

      // Sincronizar con Outlook de forma asíncrona
      this.exchangeSyncService.syncActivityToOutlook(activity.id).catch((err) =>
        console.error(`[CRM Service] Error en syncActivityToOutlook para ${activity.id}:`, err)
      );

      return activity;
    } catch (error) {
      console.error('Error en CrmActivitiesService.create:', error);
      throw new InternalServerErrorException('Error al crear la actividad comercial');
    }
  }

  /**
   * Actualiza una actividad existente (p. ej., marcar tarea como completada, fecha/hora) y sincroniza con Outlook.
   */
  async update(id: string, data: {
    isCompleted?: boolean;
    title?: string;
    description?: string;
    dueDate?: string;
    timeScheduled?: string;
    conclusions?: string;
    location?: string;
    categoryTag?: string;
    quoteDocumentNo?: string;
  }) {
    try {
      // Verificar existencia
      const existing = await this.prisma.crm_activities.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Actividad no encontrada');
      }

      const prismaData: any = {};
      if (data.title !== undefined) prismaData.title = data.title;
      if (data.description !== undefined) prismaData.description = data.description;
      if (data.isCompleted !== undefined) prismaData.is_completed = data.isCompleted;
      if (data.dueDate !== undefined) prismaData.due_date = data.dueDate ? new Date(data.dueDate) : null;
      if (data.timeScheduled !== undefined) prismaData.time_scheduled = data.timeScheduled || null;
      if (data.conclusions !== undefined) {
        prismaData.conclusions = data.conclusions ? data.conclusions.trim() : null;
        // Al guardar conclusiones (no vacías), marcar automáticamente como completado
        if (prismaData.conclusions && prismaData.conclusions !== '') {
          prismaData.is_completed = true;
        }
      }
      if (data.location !== undefined) prismaData.location = data.location || null;

      // Actualizar attendees (categoryTag y/o quoteDocumentNo) si se proporcionan
      if (data.categoryTag !== undefined || data.quoteDocumentNo !== undefined) {
        prismaData.attendees = {
          ...(data.categoryTag !== undefined ? { categoryTag: data.categoryTag } : {}),
          ...(data.quoteDocumentNo !== undefined ? { quoteDocumentNo: data.quoteDocumentNo } : {}),
        };

        // Si se cambia la tipología de un correo, actualizar el prefijo del título para mantener consistencia visual
        if (data.categoryTag) {
          const tagLabels: Record<string, string> = {
            PETICION_OFERTA: '📋 Petición oferta',
            OFERTA_PROVEEDOR: '📦 Oferta proveedor',
            REVISION_OFERTA: '📝 Revisión oferta',
            NEGOCIACION: '💬 Negociación',
            CIERRE_ACEPTACION: '📄 Cierre / Aceptación',
            ACEPTACION: '📄 Cierre / Aceptación',
            TECNICA: '⚙️ Especificación Técnica',
            POSTVENTA: '⚠️ Incidencia / Postventa',
            GENERAL: '✉️ Correo Comercial',
          };
          const newTagLabel = tagLabels[data.categoryTag] || data.categoryTag;
          const baseTitle = data.title !== undefined ? data.title : existing.title;
          const match = baseTitle.match(/^\[(.*?)\s*·\s*(.*?)\]\s*(.*)$/);
          if (match) {
            const direction = match[1].trim();
            const cleanSubject = match[3].trim();
            prismaData.title = `[${direction} · ${newTagLabel}] ${cleanSubject}`;
          }
        }
      }

      if (['EVENT', 'REUNION', 'VIDEOLLAMADA', 'VISITA', 'CALL', 'TASK'].includes(existing.type)) {
        prismaData.exchange_sync_status = 'pending';
      }
      const metadataPatch = prismaData.attendees;
      delete prismaData.attendees;
      const update = (db: Pick<PrismaService, 'crm_activities'>) => db.crm_activities.update({
        where: { id }, data: { ...prismaData, updated_at: new Date() },
      });
      const updated = metadataPatch ? await this.prisma.$transaction(async db => {
        // Lock/update the row before merging the latest JSON, so a simultaneous
        // sent-draft reconciliation cannot lose its attachment snapshot.
        await update(db);
        await db.$executeRaw`UPDATE public.crm_activities
          SET attendees = COALESCE(attendees, '{}'::jsonb) || ${JSON.stringify(metadataPatch)}::jsonb
          WHERE id = ${id}::uuid`;
        return db.crm_activities.findUniqueOrThrow({ where: { id } });
      }) : await update(this.prisma);

      // Sincronizar actualización hacia Outlook
      this.exchangeSyncService.syncActivityToOutlook(updated.id).catch((err) =>
        console.error(`[CRM Service] Error al sincronizar actualización ${updated.id} a Outlook:`, err)
      );

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en CrmActivitiesService.update:', error);
      throw new InternalServerErrorException('Error al actualizar la actividad');
    }
  }

  /**
   * Elimina el registro del CRM. Los correos no se eliminan de Microsoft 365.
   */
  async delete(id: string) {
    try {
      const existing = await this.prisma.crm_activities.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Actividad no encontrada');
      }

      await this.prisma.crm_activities.delete({ where: { id } });

      if (existing.type !== 'EMAIL' && existing.exchange_item_id) {
        this.exchangeSyncService.deleteActivityFromOutlook(id, existing.exchange_item_id, existing.created_by).catch((err) =>
          console.error(`[CRM Service] Error al eliminar actividad de Outlook:`, err)
        );
      }

      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en CrmActivitiesService.delete:', error);
      throw new InternalServerErrorException('Error al eliminar la actividad');
    }
  }

  /**
   * Obtiene la lista de comerciales / creadores de actividades para filtros de reportes.
   */
  async getActivityCreators() {
    try {
      const users = await this.prisma.profiles.findMany({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          code: true,
        },
        orderBy: {
          first_name: 'asc',
        },
      });
      return users;
    } catch (error) {
      console.error('Error en CrmActivitiesService.getActivityCreators:', error);
      throw new InternalServerErrorException('Error al obtener creadores de actividades');
    }
  }
}

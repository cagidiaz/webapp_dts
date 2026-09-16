import { Injectable, InternalServerErrorException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmActivityType } from '@prisma/client';
import { ExchangeSyncService } from '../exchange-sync/exchange-sync.service';

@Injectable()
export class CrmActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ExchangeSyncService))
    private readonly exchangeSyncService: ExchangeSyncService,
  ) {}

  /**
   * Obtiene todas las actividades de un cliente comercial ordenadas por fecha.
   */
  async getByClient(clientId: string, userId?: string) {
    try {
      let activities = await this.prisma.crm_activities.findMany({
        where: { client_id: clientId },
        include: {
          contact: true
        },
        orderBy: { created_at: 'desc' }
      });

      if (userId) {
        const syncedActs = activities.filter(a => a.exchange_item_id && a.created_by === userId && a.type !== 'EMAIL');
        if (syncedActs.length > 0) {
          const deletedIds = await this.exchangeSyncService.purgeDeletedCalendarActivities(userId, syncedActs);
          if (deletedIds.length > 0) {
            activities = activities.filter(a => !deletedIds.includes(a.id));
          }
        }
      }

      return activities;
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
          customer: true
        },
        orderBy: { created_at: 'desc' }
      });

      if (userId) {
        const syncedActs = activities.filter(a => a.exchange_item_id && a.created_by === userId && a.type !== 'EMAIL');
        if (syncedActs.length > 0) {
          const deletedIds = await this.exchangeSyncService.purgeDeletedCalendarActivities(userId, syncedActs);
          if (deletedIds.length > 0) {
            activities = activities.filter(a => !deletedIds.includes(a.id));
          }
        }
      }

      return activities;
    } catch (error) {
      console.error('Error en CrmActivitiesService.getByContact:', error);
      throw new InternalServerErrorException('Error al obtener las actividades del contacto');
    }
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

      // Purga de eventos eliminados en Outlook si corresponde
      const purgeUserId = whereClause.created_by || requestingUserId;
      if (purgeUserId) {
        const syncedActs = activities.filter(a => a.exchange_item_id && a.created_by === purgeUserId && a.type !== 'EMAIL');
        if (syncedActs.length > 0) {
          const deletedIds = await this.exchangeSyncService.purgeDeletedCalendarActivities(purgeUserId, syncedActs);
          if (deletedIds.length > 0) {
            activities = activities.filter(a => !deletedIds.includes(a.id));
          }
        }
      }

      return activities;
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
  async getDailyBriefing(userId: string) {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
      const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

      // 1. Actividades del día de hoy para el usuario
      const todayActivities = await this.prisma.crm_activities.findMany({
        where: {
          created_by: userId,
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
      const pendingActivities = await this.prisma.crm_activities.findMany({
        where: {
          created_by: userId,
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
            due_date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });
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
          is_completed: Boolean(conclusions && conclusions.trim()),
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
  async update(id: string, data: { isCompleted?: boolean; title?: string; description?: string; dueDate?: string; timeScheduled?: string; conclusions?: string; location?: string }) {
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

      const updated = await this.prisma.crm_activities.update({
        where: { id },
        data: {
          ...prismaData,
          updated_at: new Date()
        }
      });

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
   * Elimina una actividad de la base de datos y la cancela en el calendario de Outlook.
   */
  async delete(id: string) {
    try {
      const existing = await this.prisma.crm_activities.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Actividad no encontrada');
      }

      await this.prisma.crm_activities.delete({ where: { id } });

      if (existing.exchange_item_id) {
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

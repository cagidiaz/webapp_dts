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
   * Obtiene las actividades comerciales (agenda) filtradas por usuario y/o rango de fechas.
   */
  async getAgenda(params: { userId?: string; startDate?: string; endDate?: string }) {
    const { userId, startDate, endDate } = params;
    const whereClause: any = {};

    if (userId) {
      whereClause.created_by = userId;
    }

    if (startDate || endDate) {
      whereClause.due_date = {};
      if (startDate) {
        whereClause.due_date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.due_date.lte = new Date(endDate);
      }
    }

    try {
      let activities = await this.prisma.crm_activities.findMany({
        where: whereClause,
        include: {
          customer: true,
          contact: true
        },
        orderBy: {
          due_date: 'asc'
        }
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
      console.error('Error en CrmActivitiesService.getAgenda:', error);
      throw new InternalServerErrorException('Error al obtener la agenda de actividades');
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
          conclusions: conclusions || null,
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
      if (data.conclusions !== undefined) prismaData.conclusions = data.conclusions || null;
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
}

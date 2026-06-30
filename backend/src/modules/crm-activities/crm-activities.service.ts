import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmActivityType } from '@prisma/client';

@Injectable()
export class CrmActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todas las actividades de un cliente comercial ordenadas por fecha.
   */
  async getByClient(clientId: string) {
    try {
      return await this.prisma.crm_activities.findMany({
        where: { client_id: clientId },
        orderBy: { created_at: 'desc' }
      });
    } catch (error) {
      console.error('Error en CrmActivitiesService.getByClient:', error);
      throw new InternalServerErrorException('Error al obtener las actividades del cliente');
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
      return await this.prisma.crm_activities.findMany({
        where: whereClause,
        include: {
          customer: true
        },
        orderBy: {
          due_date: 'asc'
        }
      });
    } catch (error) {
      console.error('Error en CrmActivitiesService.getAgenda:', error);
      throw new InternalServerErrorException('Error al obtener la agenda de actividades');
    }
  }

  /**
   * Crea una nueva actividad comercial en la base de datos.
   */
  async create(data: {
    clientId: string;
    userId: string;
    type: CrmActivityType;
    title: string;
    description?: string;
    dueDate?: string;
    timeScheduled?: string;
    email?: string;
    createdAt?: string;
  }) {
    const { clientId, userId, type, title, description, dueDate, timeScheduled, email, createdAt } = data;

    console.log(`[CRM Service] Creando actividad con tipo=${type}, title="${title}", createdAt=${createdAt || 'now()'}`);
    try {
      return await this.prisma.crm_activities.create({
        data: {
          client_id: clientId,
          created_by: userId,
          type,
          title,
          description: description || null,
          due_date: dueDate ? new Date(dueDate) : null,
          time_scheduled: timeScheduled || null,
          email: email || null,
          created_at: createdAt ? new Date(createdAt) : undefined
        }
      });
    } catch (error) {
      console.error('Error en CrmActivitiesService.create:', error);
      throw new InternalServerErrorException('Error al crear la actividad comercial');
    }
  }

  /**
   * Actualiza una actividad existente (p. ej., marcar tarea como completada).
   */
  async update(id: string, data: { isCompleted?: boolean; title?: string; description?: string; dueDate?: string; timeScheduled?: string }) {
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

      return await this.prisma.crm_activities.update({
        where: { id },
        data: {
          ...prismaData,
          updated_at: new Date()
        }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en CrmActivitiesService.update:', error);
      throw new InternalServerErrorException('Error al actualizar la actividad');
    }
  }

  /**
   * Elimina una actividad de la base de datos.
   */
  async delete(id: string) {
    try {
      const existing = await this.prisma.crm_activities.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Actividad no encontrada');
      }

      await this.prisma.crm_activities.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en CrmActivitiesService.delete:', error);
      throw new InternalServerErrorException('Error al eliminar la actividad');
    }
  }
}

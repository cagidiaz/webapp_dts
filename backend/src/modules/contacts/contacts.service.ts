import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los contactos, permitiendo filtrar por client_id o relación comercial.
   */
  async getAll(params: { clientId?: string; relation?: string } = {}) {
    const { clientId, relation } = params;
    const where: any = {};

    if (clientId) {
      where.client_id = clientId;
    }

    if (relation) {
      where.business_relation = {
        equals: relation,
        mode: 'insensitive'
      };
    }

    try {
      return await this.prisma.contacts.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error en ContactsService.getAll:', error);
      throw new InternalServerErrorException('Error al obtener los contactos');
    }
  }

  /**
   * Obtiene un contacto por su ID único (UUID).
   */
  async getById(id: string) {
    try {
      const contact = await this.prisma.contacts.findUnique({
        where: { id },
      });
      if (!contact) {
        throw new NotFoundException(`Contacto con ID ${id} no encontrado`);
      }
      return contact;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al obtener el contacto');
    }
  }

  /**
   * Actualiza únicamente el campo LinkedIn de un contacto.
   */
  async updateLinkedin(id: string, linkedin: string) {
    // Verificar si el contacto existe
    await this.getById(id);

    try {
      return await this.prisma.contacts.update({
        where: { id },
        data: { 
          linkedin,
          updated_at: new Date()
        },
      });
    } catch (error) {
      console.error('Error en ContactsService.updateLinkedin:', error);
      throw new InternalServerErrorException('Error al actualizar el perfil de LinkedIn');
    }
  }
}

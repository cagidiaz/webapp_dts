import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los contactos, permitiendo filtrar por client_id, relación comercial o búsqueda de texto.
   */
  async getAll(params: { clientId?: string; relation?: string; search?: string } = {}) {
    const { clientId, relation, search } = params;
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { client_id: { contains: search, mode: 'insensitive' } },
        { job_title: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { county: { contains: search, mode: 'insensitive' } },
        { post_code: { contains: search, mode: 'insensitive' } },
        { territory_code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      return await this.prisma.contacts.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
              client_id: true,
            }
          }
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error en ContactsService.getAll:', error);
      throw new InternalServerErrorException('Error al obtener los contactos');
    }
  }

  /**
   * Obtiene un contacto por su ID único (UUID), enriquecido con la información de su empresa padre.
   */
  async getById(id: string) {
    try {
      const contact = await this.prisma.contacts.findUnique({
        where: { id },
        include: {
          customer: true
        }
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

  /**
   * Actualiza los datos de localización física de un contacto.
   */
  async updateLocation(id: string, data: {
    address?: string | null;
    address2?: string | null;
    city?: string | null;
    post_code?: string | null;
    county?: string | null;
    territory_code?: string | null;
  }) {
    // Verificar si el contacto existe
    await this.getById(id);

    try {
      return await this.prisma.contacts.update({
        where: { id },
        data: {
          ...(data.address !== undefined && { address: data.address }),
          ...(data.address2 !== undefined && { address2: data.address2 }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.post_code !== undefined && { post_code: data.post_code }),
          ...(data.county !== undefined && { county: data.county }),
          ...(data.territory_code !== undefined && { territory_code: data.territory_code }),
          updated_at: new Date()
        },
      });
    } catch (error) {
      console.error('Error en ContactsService.updateLocation:', error);
      throw new InternalServerErrorException('Error al actualizar la localización del contacto');
    }
  }
}

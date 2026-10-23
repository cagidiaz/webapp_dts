import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';

export const CRM_MANUAL_ID = 'crm-clientes-contactos';
const FILE_NAME = 'manual-crm-clientes-contactos.pdf';

@Injectable()
export class DocumentationService {
  constructor(private readonly prisma: PrismaService) {}

  private async canReadCrm(userId: string): Promise<boolean> {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, select: { is_active: true, role_id: true } });
    if (!profile?.is_active || !profile.role_id) return false;
    const rows = await this.prisma.role_modules.findMany({
      where: { role_id: profile.role_id, module: { is_active: true, route_path: { in: ['/crm', '/crm/customers', '/crm/contacts'] } } },
      include: { module: true },
    });
    const allowed = (route: string) => rows.some(row => row.module.route_path === route && row.can_view === true);
    return allowed('/crm') && (allowed('/crm/customers') || allowed('/crm/contacts'));
  }

  private directory() {
    const candidates = [resolve(process.cwd(), 'backend/assets/user-manuals'), resolve(process.cwd(), 'assets/user-manuals')];
    const directory = candidates.find(path => existsSync(resolve(path, FILE_NAME)) && existsSync(resolve(path, 'catalog.json')));
    if (!directory) throw new NotFoundException('El manual no está incluido en esta versión. Contacta con Administración.');
    return directory;
  }

  async list(userId: string) {
    if (!await this.canReadCrm(userId)) return [];
    const directory = this.directory();
    const catalog = JSON.parse(readFileSync(resolve(directory, 'catalog.json'), 'utf8'));
    return [{ id: CRM_MANUAL_ID, title: catalog.title, version: catalog.version, updatedAt: catalog.updatedAt, description: catalog.description, sizeBytes: statSync(resolve(directory, FILE_NAME)).size }];
  }

  async file(userId: string, id: string) {
    if (!await this.canReadCrm(userId)) throw new ForbiddenException('Necesitas permiso para CRM y para Clientes o Contactos para consultar este manual.');
    if (id !== CRM_MANUAL_ID) throw new NotFoundException('Manual no encontrado.');
    const filePath = resolve(this.directory(), FILE_NAME);
    return { filePath, fileName: FILE_NAME, size: statSync(filePath).size };
  }
}

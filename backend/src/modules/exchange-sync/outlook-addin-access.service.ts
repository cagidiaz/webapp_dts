import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutlookAddinAccessService {
  constructor(private readonly prisma: PrismaService) {}
  async actor(userId: string, declaredEmail?: string) {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!profile?.is_active || !profile.role_id) throw new ForbiddenException('Perfil no disponible para el complemento.');
    if (declaredEmail && profile.email.toLowerCase() !== declaredEmail.trim().toLowerCase()) throw new ForbiddenException('Inicia sesión en el CRM con la misma cuenta que utiliza Outlook.');
    const permissions = await this.prisma.role_modules.findMany({ where: { role_id: profile.role_id, module: { is_active: true, route_path: { in: ['/crm','/crm/contacts'] } } }, include: { module: true } });
    if (!permissions.some(row => row.module.route_path === '/crm' && row.can_view)
      || permissions.some(row => row.module.route_path === '/crm/contacts' && !row.can_view)) throw new ForbiddenException('Sin permiso para consultar los contactos del CRM.');
    const all = ['ADMIN','DIRECCION','GERENCIA'].includes(profile.roles?.name?.toUpperCase() || '');
    if (!all && !profile.code?.trim()) throw new ForbiddenException('Código comercial no configurado.');
    return { profile, customerScope: all ? {} : { salesperson_code: profile.code! } };
  }
  async company(userId: string, clientId: string) {
    const actor = await this.actor(userId);
    const customer = await this.prisma.customers.findFirst({ where: { client_id: clientId, ...actor.customerScope }, select: { client_id: true } });
    if (!customer) throw new NotFoundException('Empresa fuera de tu cartera.');
    return actor;
  }
}

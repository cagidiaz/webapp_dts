import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCrmDataScope } from '../../common/crm-data-scope';
import catalog from './customer-segments.catalog.json';
import { SaveCustomerSegmentDto } from './customer-segments.dto';

type SegmentRow = { segment_code: string; potential_amount: string | null; billing_amount: null; version: number; updated_at: Date };
const columns = Prisma.sql`segment_code, potential_amount::text, billing_amount::text, version, updated_at`;

@Injectable()
export class CustomerSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async access(userId: string, clientCode: string) {
    if (!clientCode?.trim() || clientCode.length > 50) throw new BadRequestException('Código de cliente no válido.');
    const scope = await resolveCrmDataScope(this.prisma, userId);
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, select: { role_id: true, code: true, roles: { select: { name: true } } } });
    if (!profile?.role_id) throw new ForbiddenException('No tienes permiso para consultar clientes.');
    const permissions = await this.prisma.role_modules.findMany({
      where: { role_id: profile.role_id, module: { is_active: true, route_path: { in: ['/crm', '/crm/customers', '/sales/customers'] } } },
      include: { module: true },
    });
    const allowed = (route: string) => permissions.some(p => p.module.route_path === route && p.can_view === true);
    if (!allowed('/sales/customers') && !(allowed('/crm') && allowed('/crm/customers'))) throw new ForbiddenException('No tienes permiso para consultar clientes.');
    const customer = await this.prisma.customers.findFirst({ where: { client_id: clientCode, ...(scope.salespersonCode ? { salesperson_code: scope.salespersonCode } : {}) }, select: { salesperson_code: true } });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    const isAdmin = profile.roles?.name?.trim().toUpperCase() === 'ADMIN';
    return { canEdit: isAdmin || !!profile.code?.trim() && profile.code.trim() === customer.salesperson_code?.trim() };
  }

  private async storage<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010' && ['42P01', '42703'].includes(String(error.meta?.code))) {
        throw new ServiceUnavailableException('Falta crear o actualizar la tabla de segmentos con client_id. Administración debe ejecutar el SQL correspondiente.');
      }
      throw error;
    }
  }

  async list(userId: string, clientCode: string) {
    const access = await this.access(userId, clientCode);
    const items = await this.storage(() => this.prisma.$queryRaw<SegmentRow[]>(Prisma.sql`
      SELECT ${columns} FROM public.crm_customer_segments WHERE client_id = ${clientCode}::text ORDER BY segment_code
    `));
    return { items, catalog, canEdit: access.canEdit };
  }

  async save(userId: string, clientCode: string, segmentCode: string, data: SaveCustomerSegmentDto) {
    if (!catalog.some(s => s.value === segmentCode)) throw new BadRequestException('Selecciona un segmento válido; las familias con subfamilias no son seleccionables.');
    const access = await this.access(userId, clientCode);
    if (!access.canEdit) throw new ForbiddenException('Solo el comercial del cliente o Admin puede editar los segmentos.');
    const amount = data.potential_amount ?? null;
    const rows = await this.storage(() => data.version === 0
      ? this.prisma.$queryRaw<SegmentRow[]>(Prisma.sql`
          INSERT INTO public.crm_customer_segments (client_id, segment_code, potential_amount, created_by, updated_by)
          VALUES (${clientCode}::text, ${segmentCode}, ${amount}::numeric, ${userId}::uuid, ${userId}::uuid)
          ON CONFLICT (client_id, segment_code) DO NOTHING RETURNING ${columns}
        `)
      : this.prisma.$queryRaw<SegmentRow[]>(Prisma.sql`
          UPDATE public.crm_customer_segments SET potential_amount = ${amount}::numeric, updated_by = ${userId}::uuid,
            updated_at = now(), version = version + 1
          WHERE client_id = ${clientCode}::text AND segment_code = ${segmentCode} AND version = ${data.version}
          RETURNING ${columns}
        `));
    if (!rows.length) throw new ConflictException('Este segmento ya existe o ha cambiado. Recarga los segmentos antes de continuar.');
    return rows[0];
  }

  async remove(userId: string, clientCode: string, segmentCode: string, version: number) {
    if (!Number.isSafeInteger(version) || version < 1) throw new BadRequestException('Versión no válida.');
    if (!(await this.access(userId, clientCode)).canEdit) throw new ForbiddenException('Solo el comercial del cliente o Admin puede quitar segmentos.');
    const rows = await this.storage(() => this.prisma.$queryRaw<{ segment_code: string }[]>(Prisma.sql`
      DELETE FROM public.crm_customer_segments WHERE client_id = ${clientCode}::text AND segment_code = ${segmentCode} AND version = ${version}
      RETURNING segment_code
    `));
    if (!rows.length) throw new ConflictException('Este segmento ha cambiado. Recarga antes de continuar.');
    return { removed: true };
  }
}

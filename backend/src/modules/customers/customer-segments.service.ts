import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCrmDataScope } from '../../common/crm-data-scope';
import catalog from './customer-segments.catalog.json';
import { SaveCustomerSegmentDto } from './customer-segments.dto';

type SegmentRow = { segment_code: string; potential_amount: string | null; billing_amount: string | null; version: number; updated_at: Date | null };
const columns = Prisma.sql`segment_code, potential_amount::text, billing_amount::text, version, updated_at`;

@Injectable()
export class CustomerSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const scope = await resolveCrmDataScope(this.prisma, userId);
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, select: { role_id: true, roles: { select: { name: true } } } });
    if (!profile?.role_id) throw new ForbiddenException('No tienes permiso para consultar clientes.');
    const permissions = await this.prisma.role_modules.findMany({ where: { role_id: profile.role_id, can_view: true, module: { is_active: true, route_path: { in: ['/crm', '/crm/customers'] } } }, include: { module: true } });
    if (!['/crm', '/crm/customers'].every(route => permissions.some(p => p.module.route_path === route))) throw new ForbiddenException('No tienes permiso para consultar clientes.');
    const rows = await this.storage(() => this.prisma.$queryRaw<{ client_id: string; client_name: string; salesperson_code: string | null; segment_code: string; potential_amount: string | null; billing_amount: string }[]>(Prisma.sql`
      WITH visible AS (
        SELECT client_id, name, salesperson_code, business_model FROM public.customers
        WHERE (${scope.salespersonCode}::text IS NULL OR salesperson_code = ${scope.salespersonCode}::text)
      ), classified AS (
        SELECT d.customer_no AS client_id, d.posting_date, d.document_type, l.line_amount,
          CASE WHEN mapping.segment_code IS NOT NULL THEN mapping.segment_code
            WHEN pc.family_code = 'ETM' AND mapping.subfamily_code IS NOT NULL THEN
              CASE WHEN NULLIF(TRIM(c.business_model), '') IS NULL THEN NULL
                WHEN UPPER(TRIM(c.business_model)) = 'OEM' THEN 'dtstemp-oem' ELSE 'dtstemp-process' END
            ELSE NULL END AS segment_code
        FROM public.sales_documents d JOIN visible c ON c.client_id = d.customer_no
        JOIN public.sales_document_lines l ON l.document_no = d.document_no
        LEFT JOIN public.products p ON p.item_no = l.product_no
        LEFT JOIN public.product_categories pc ON pc.subfamily_code = p.subfamily_code
        LEFT JOIN public.crm_segment_subcategories mapping ON mapping.family_code = pc.family_code AND mapping.subfamily_code = pc.subfamily_code
        WHERE d.document_type IN ('Factura', 'Abono') AND lower(l.type) = 'item'
      ), billed AS (
        SELECT client_id, segment_code,
          COALESCE(SUM(CASE WHEN document_type = 'Abono' THEN -line_amount ELSE line_amount END)
            FILTER (WHERE posting_date >= date_trunc('year', CURRENT_DATE)::date AND posting_date < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date), 0) AS amount
        FROM classified WHERE segment_code IS NOT NULL GROUP BY client_id, segment_code
      ), merged AS (
        SELECT COALESCE(b.client_id, s.client_id) client_id, COALESCE(b.segment_code, s.segment_code) segment_code,
          s.potential_amount, COALESCE(b.amount, 0) billing_amount
        FROM billed b FULL JOIN (SELECT s.* FROM public.crm_customer_segments s JOIN visible v ON v.client_id = s.client_id) s
          ON s.client_id = b.client_id AND s.segment_code = b.segment_code
      ) SELECT v.client_id, v.name AS client_name, v.salesperson_code, m.segment_code,
        m.potential_amount::text, m.billing_amount::text FROM merged m JOIN visible v ON v.client_id = m.client_id
      ORDER BY v.name, v.client_id, m.segment_code
    `));
    const unclassified = await this.storage(() => this.prisma.$queryRaw<{ client_id: string; client_name: string; salesperson_code: string | null; product_no: string | null; product_name: string | null; family_code: string | null; subfamily_code: string | null; line_count: number; amount: string }[]>(Prisma.sql`
      SELECT c.client_id, c.name AS client_name, c.salesperson_code, l.product_no, p.description AS product_name,
        pc.family_code, pc.subfamily_code, COUNT(*)::int AS line_count,
        SUM(CASE WHEN d.document_type = 'Abono' THEN -l.line_amount ELSE l.line_amount END)::text AS amount
      FROM public.sales_documents d JOIN public.customers c ON c.client_id = d.customer_no
      JOIN public.sales_document_lines l ON l.document_no = d.document_no
      LEFT JOIN public.products p ON p.item_no = l.product_no
      LEFT JOIN public.product_categories pc ON pc.subfamily_code = p.subfamily_code
      LEFT JOIN public.crm_segment_subcategories mapping ON mapping.family_code = pc.family_code AND mapping.subfamily_code = pc.subfamily_code
      WHERE (${scope.salespersonCode}::text IS NULL OR c.salesperson_code = ${scope.salespersonCode}::text)
        AND d.posting_date >= date_trunc('year', CURRENT_DATE)::date AND d.posting_date < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
        AND d.document_type IN ('Factura', 'Abono') AND lower(l.type) = 'item'
        AND mapping.segment_code IS NULL AND (pc.family_code IS DISTINCT FROM 'ETM' OR mapping.subfamily_code IS NULL OR NULLIF(TRIM(c.business_model), '') IS NULL)
      GROUP BY c.client_id, c.name, c.salesperson_code, l.product_no, p.description, pc.family_code, pc.subfamily_code
      ORDER BY c.name, c.client_id, l.product_no
    `));
    return { rows, unclassified, catalog, global: scope.salespersonCode === null };
  }

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
    const isAdmin = ['ADMIN', 'DIRECCION'].includes(profile.roles?.name?.trim().toUpperCase() || '');
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
    const billed = await this.storage(() => this.prisma.$queryRaw<{ segment_code: string | null; amount: string; line_count: number }[]>(Prisma.sql`
      SELECT CASE WHEN mapping.segment_code IS NOT NULL THEN mapping.segment_code
        WHEN pc.family_code = 'ETM' AND mapping.subfamily_code IS NOT NULL THEN
        CASE WHEN NULLIF(TRIM(c.business_model), '') IS NULL THEN NULL
          WHEN UPPER(TRIM(c.business_model)) = 'OEM' THEN 'dtstemp-oem' ELSE 'dtstemp-process' END
        ELSE NULL END AS segment_code,
        SUM(CASE WHEN d.document_type = 'Abono' THEN -l.line_amount ELSE l.line_amount END)::text AS amount, COUNT(*)::int AS line_count
      FROM public.sales_documents d
      JOIN public.sales_document_lines l ON l.document_no = d.document_no
      JOIN public.customers c ON c.client_id = d.customer_no
      LEFT JOIN public.products p ON p.item_no = l.product_no
      LEFT JOIN public.product_categories pc ON pc.subfamily_code = p.subfamily_code
      LEFT JOIN public.crm_segment_subcategories mapping ON mapping.family_code = pc.family_code AND mapping.subfamily_code = pc.subfamily_code
      WHERE d.customer_no = ${clientCode} AND d.posting_date >= date_trunc('year', CURRENT_DATE)::date
        AND d.posting_date < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
        AND d.document_type IN ('Factura', 'Abono') AND lower(l.type) = 'item'
      GROUP BY 1
    `));
    const billedBySegment = new Map(billed.filter(row => row.segment_code !== null).map(row => [row.segment_code!, row.amount]));
    const combined = items.map(row => ({ ...row, billing_amount: billedBySegment.get(row.segment_code) ?? '0' }));
    for (const [segment_code, billing_amount] of billedBySegment) {
      if (!combined.some(row => row.segment_code === segment_code)) combined.push({ segment_code, billing_amount, potential_amount: null, version: 0, updated_at: null });
    }
    return { items: combined.sort((a, b) => a.segment_code.localeCompare(b.segment_code)), catalog, canEdit: access.canEdit,
      unclassified_amount: billed.find(row => row.segment_code === null)?.amount ?? '0',
      unclassified_lines: billed.find(row => row.segment_code === null)?.line_count ?? 0 };
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

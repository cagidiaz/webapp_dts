import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProspectDto, UpdateProspectDto, ProspectActivityDto, UpdateProspectActivityDto } from './prospect.dto';
import { ProspectOutlookService } from '../exchange-sync/prospect-outlook.service';
import { hasOpportunitiesAccess } from './opportunities-individual-access';

export const normalizeProspectCompany = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');

@Injectable()
export class ProspectsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly outlook: ProspectOutlookService) {}

  async access(userId: string) {
    const disabled = { enabled: false, canCreate: false, canEditAll: false, canViewAll: false, canDelete: false, userId };
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!profile || profile.is_active !== true) return disabled;
    if (!profile.role_id) return disabled;
    const permissions = await this.prisma.role_modules.findMany({ where: { role_id: profile.role_id, module: { is_active: true, route_path: { in: ['/crm', '/crm/pipeline'] } } }, include: { module: true } });
    const role = profile.roles?.name?.toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'DIRECCION';
    if (!await hasOpportunitiesAccess(this.prisma, permissions, profile.email)) return disabled;
    const canViewAll = isAdmin;
    const canCreate = true;
    return { enabled: true, canCreate, canEditAll: isAdmin, canViewAll, canDelete: role === 'ADMIN', userId, canSyncOutlook: this.outlook.enabled() && canCreate };
  }

  private async authorize(userId: string) {
    const access = await this.access(userId);
    if (!access.enabled) throw new ForbiddenException('No tienes permiso de CRM/Oportunidades.');
    return access;
  }

  async deleteProspect(userId: string, id: string, version: number) {
    const access = await this.authorize(userId);
    if (!access.canDelete) throw new ForbiddenException('Solo Admin puede eliminar prospectos.');
    return this.prisma.$transaction(async tx => {
      const prospect = await tx.crm_prospects.findUnique({ where: { id } });
      if (!prospect) throw new NotFoundException('Prospecto no encontrado.');
      if (prospect.version !== version) throw new ConflictException('El prospecto ha cambiado. Recarga la ficha antes de eliminarlo.');
      const lock = await tx.crm_prospects.updateMany({ where: { id, version }, data: { version: { increment: 1 } } });
      if (lock.count !== 1) throw new ConflictException('El prospecto ha cambiado. Recarga la ficha antes de eliminarlo.');
      await tx.crm_prospect_activities.deleteMany({ where: { prospect_id: id } });
      await tx.crm_prospect_events.deleteMany({ where: { prospect_id: id } });
      await tx.crm_prospects.delete({ where: { id } });
      return { deleted: true };
    });
  }

  async list(userId: string, status = 'active', search = '', page = 1, ownerId?: string) {
    const access = await this.authorize(userId);
    if (!['active', 'archived', 'converted', 'all'].includes(status)) throw new BadRequestException('Estado de prospección no válido.');
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Página no válida.');
    if (ownerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) throw new BadRequestException('Vendedor no válido.');
    if (ownerId && !access.canViewAll && ownerId !== userId) throw new ForbiddenException('No tienes acceso a otra cartera.');
    const scope = access.canViewAll ? (ownerId ? { owner_id: ownerId } : {}) : { owner_id: userId };
    const where: Prisma.crm_prospectsWhereInput = {
      ...scope,
      ...(status === 'active' ? { archived_at: null, converted_at: null } : status === 'archived' ? { archived_at: { not: null } } : status === 'converted' ? { converted_at: { not: null } } : {}),
      ...(search.trim() ? { OR: ['company_name', 'contact_name', 'contact_job_title', 'email', 'phone', 'notes'].map(field => ({ [field]: { contains: search.trim(), mode: 'insensitive' } })) } : {}),
    };
    const [items, counts, total, converted] = await Promise.all([
      this.prisma.crm_prospects.findMany({ where, include: { owner: { select: { first_name: true, last_name: true, email: true } }, linked_client: { select: { id: true, client_id: true, name: true } } }, orderBy: [{ updated_at: 'desc' }, { id: 'asc' }], take: 200, skip: (page - 1) * 200 }),
      this.prisma.crm_prospects.groupBy({ by: ['phase'], where: { ...scope, archived_at: null, converted_at: null }, _count: { _all: true } }),
      this.prisma.crm_prospects.count({ where }),
      this.prisma.crm_prospects.count({ where: { ...scope, converted_at: { not: null } } }),
    ]);
    return { items, total, page, limit: 200, counts: { phase0: counts.find(x => x.phase === 0)?._count._all || 0, phase1: counts.find(x => x.phase === 1)?._count._all || 0, converted } };
  }

  async detail(userId: string, id: string) {
    const access = await this.authorize(userId);
    const prospect = await this.prisma.crm_prospects.findFirst({
      where: { id, ...(access.canViewAll ? {} : { owner_id: userId }) },
      include: { owner: { select: { first_name: true, last_name: true, email: true } }, linked_client: { select: { id: true, client_id: true, name: true } }, events: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }], include: { author: { select: { first_name: true, last_name: true, email: true } } } } },
    });
    if (!prospect) throw new NotFoundException('Prospecto no encontrado.');
    return prospect;
  }

  async assignmentNotices(userId: string, salespersonCode?: string, onlyOwn = false) {
    const access = await this.authorize(userId);
    const events = await this.prisma.crm_prospect_events.findMany({
      where: { type: 'ASIGNACION_PENDIENTE', prospect: { archived_at: null, converted_at: null, ...(access.canViewAll && !onlyOwn ? {} : { owner_id: userId }), ...(access.canViewAll && !onlyOwn && salespersonCode ? { owner: { code: salespersonCode } } : {}) } },
      include: { prospect: { select: { id: true, company_name: true, contact_name: true, owner_id: true, owner: { select: { first_name: true, last_name: true, email: true } } } }, author: { select: { first_name: true, last_name: true, email: true } } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    return events.filter(event => {
      try { return JSON.parse(event.description || '{}').recipient_id === event.prospect.owner_id; } catch { return false; }
    }).map(event => ({ id: event.id, prospect_id: event.prospect.id, company_name: event.prospect.company_name, contact_name: event.prospect.contact_name, recipient: event.prospect.owner, author: event.author, created_at: event.created_at }));
  }

  async acknowledgeAssignments(userId: string, id: string) {
    const prospect = await this.detail(userId, id);
    if (prospect.owner_id !== userId) return { acknowledged: 0 };
    const ids = prospect.events.filter(event => {
      if (event.type !== 'ASIGNACION_PENDIENTE') return false;
      try { return JSON.parse(event.description || '{}').recipient_id === userId; } catch { return false; }
    }).map(event => event.id);
    if (!ids.length) return { acknowledged: 0 };
    const result = await this.prisma.crm_prospect_events.updateMany({ where: { id: { in: ids }, type: 'ASIGNACION_PENDIENTE', prospect: { owner_id: userId } }, data: { type: 'ASIGNACION_LEIDA' } });
    return { acknowledged: result.count };
  }

  private fields(data: CreateProspectDto) {
    return {
      company_name: data.company_name.trim(),
      company_normalized: normalizeProspectCompany(data.company_name),
      contact_name: data.contact_name || null,
      contact_job_title: data.contact_job_title || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      phase: data.phase,
    };
  }

  private rethrow(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Esta empresa ya existe en la cartera del propietario. Revisa los prospectos activos y archivados.');
    }
    throw error;
  }

  async create(userId: string, data: CreateProspectDto) {
    const access = await this.authorize(userId);
    if (!access.canCreate) throw new ForbiddenException('No tienes permiso para crear prospectos.');
    let targetOwnerId = userId;
    if (data.owner_id && access.canEditAll) {
      const targetProfile = await this.prisma.profiles.findUnique({ where: { id: data.owner_id } });
      if (!targetProfile || targetProfile.is_active !== true) throw new BadRequestException('El comercial asignado no es válido o está inactivo.');
      targetOwnerId = data.owner_id;
    }
    try {
      return await this.prisma.crm_prospects.create({ data: {
        ...this.fields(data), owner_id: targetOwnerId,
        events: { create: { created_by: userId, type: targetOwnerId !== userId ? 'ASIGNACION_PENDIENTE' : 'AUDIT', title: 'Prospecto creado', ...(targetOwnerId !== userId ? { description: JSON.stringify({ recipient_id: targetOwnerId }) } : {}) } },
      } });
    } catch (error) { this.rethrow(error); }
  }

  async update(userId: string, id: string, data: UpdateProspectDto) {
    const access = await this.authorize(userId);
    const current = await this.detail(userId, id);
    if ((current.owner_id !== userId && !access.canEditAll) || (!access.canCreate && !access.canEditAll)) {
      throw new ForbiddenException('Solo el propietario o Admin puede editar este prospecto.');
    }
    if (current.archived_at && current.phase !== data.phase) throw new BadRequestException('Restaura el prospecto antes de cambiar su fase.');
    if (current.converted_at && current.phase !== data.phase) throw new BadRequestException('Desvincula el cliente antes de cambiar la fase.');
    if (current.version !== data.version) throw new ConflictException('El prospecto cambió desde que abriste la ficha. Recárgala antes de guardar.');
    let targetOwnerId = current.owner_id;
    if (data.owner_id && data.owner_id !== current.owner_id) {
      if (!access.canEditAll) throw new ForbiddenException('Solo Admin puede reasignar el comercial propietario.');
      const targetProfile = await this.prisma.profiles.findUnique({ where: { id: data.owner_id } });
      if (!targetProfile || targetProfile.is_active !== true) throw new BadRequestException('El comercial asignado no es válido o está inactivo.');
      targetOwnerId = data.owner_id;
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const updateData: Prisma.crm_prospectsUpdateManyMutationInput = {
          ...this.fields(data),
          ...(targetOwnerId !== current.owner_id ? { owner_id: targetOwnerId } : {}),
          updated_at: new Date(),
          version: { increment: 1 },
        };
        const result = await tx.crm_prospects.updateMany({
          where: { id, version: data.version },
          data: updateData,
        });
        if (result.count !== 1) throw new ConflictException('El prospecto cambió desde que abriste la ficha. Recárgala antes de guardar.');
        if (targetOwnerId !== current.owner_id) await tx.crm_prospect_events.updateMany({ where: { prospect_id: id, type: 'ASIGNACION_PENDIENTE' }, data: { type: 'ASIGNACION_CANCELADA' } });
        await tx.crm_prospect_events.create({
          data: {
            prospect_id: id,
            created_by: userId,
            type: 'AUDIT',
            title: current.phase !== data.phase
              ? `Fase ${current.phase} a Fase ${data.phase}`
              : (targetOwnerId !== current.owner_id ? 'Comercial propietario reasignado' : 'Datos del prospecto actualizados'),
            description: JSON.stringify({ before: { ...this.fields(current), owner_id: current.owner_id }, after: { ...this.fields(data), owner_id: targetOwnerId } }),
          },
        });
        if (targetOwnerId !== current.owner_id && targetOwnerId !== userId) {
          await tx.crm_prospect_events.create({ data: { prospect_id: id, created_by: userId, type: 'ASIGNACION_PENDIENTE', title: 'Prospecto asignado', description: JSON.stringify({ recipient_id: targetOwnerId }) } });
        }
        return tx.crm_prospects.findUniqueOrThrow({ where: { id }, include: { linked_client: { select: { id: true, client_id: true, name: true } } } });
      });
    } catch (error) { this.rethrow(error); }
  }

  async archive(userId: string, id: string, archived: boolean, version: number) {
    const access = await this.authorize(userId);
    const current = await this.detail(userId, id);
    if (!access.canEditAll && (current.owner_id !== userId || !access.canCreate)) throw new ForbiddenException('Solo el propietario o administración puede archivar o restaurar este prospecto.');
    if (current.converted_at) throw new BadRequestException('Desvincula el cliente antes de archivar o restaurar.');
    return this.prisma.$transaction(async tx => {
      const result = await tx.crm_prospects.updateMany({ where: { id, version }, data: { archived_at: archived ? new Date() : null, updated_at: new Date(), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('El prospecto cambió. Recarga su ficha.');
      await tx.crm_prospect_events.create({ data: { prospect_id: id, created_by: userId, type: 'AUDIT', title: archived ? 'Prospecto archivado' : 'Prospecto restaurado' } });
      return tx.crm_prospects.findUniqueOrThrow({ where: { id } });
    });
  }

  private async ownerCode(userId: string, id: string) {
    const access = await this.authorize(userId);
    const prospect = await this.detail(userId, id);
    if (!access.canEditAll && (!access.canCreate || prospect.owner_id !== userId)) throw new ForbiddenException('Solo el propietario o administración puede confirmar o corregir una vinculación.');
    if (access.canEditAll) return { prospect, code: null };
    const profile = await this.prisma.profiles.findUnique({ where: { id: prospect.owner_id }, select: { code: true } });
    if (!profile?.code) throw new ForbiddenException('El propietario no tiene código comercial configurado.');
    return { prospect, code: profile.code };
  }

  async activities(userId: string, id: string) {
    await this.detail(userId, id);
    return this.prisma.crm_prospect_activities.findMany({ where: { prospect_id: id },
      include: { author: { select: { first_name: true, last_name: true, email: true } } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async agenda(userId: string, params: { salespersonId?: string; startDate?: string; endDate?: string; types?: string[]; onlyOwn?: boolean } = {}) {
    const access = await this.access(userId);
    if (!access.enabled) return [];
    const scope = access.canViewAll && !params.onlyOwn
      ? params.salespersonId && params.salespersonId !== 'all' ? { owner_id: params.salespersonId } : {}
      : { owner_id: userId };
    const civilDate = (value?: string) => {
      if (!value) return undefined;
      const day = value.split('T')[0];
      const date = new Date(`${day}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new BadRequestException('Fecha de agenda no válida.');
      return date;
    };
    const start = civilDate(params.startDate), end = civilDate(params.endDate);
    if (start && end && start > end) throw new BadRequestException('El inicio del período no puede ser posterior al fin.');
    const items = await this.prisma.crm_prospect_activities.findMany({
      where: { prospect: { ...scope, archived_at: null }, due_date: { not: null, ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) }, ...(params.types?.length ? { type: { in: params.types } } : {}) },
      include: { author: { select: { id: true, first_name: true, last_name: true, email: true } }, prospect: { select: { id: true, company_name: true, contact_name: true, owner_id: true, linked_client: { select: { id: true, client_id: true, name: true } } } } },
      orderBy: [{ due_date: 'asc' }, { time_scheduled: 'asc' }, { id: 'asc' }],
    });
    return items.map(activity => ({ ...activity, source: 'PROSPECT' as const, owner_id: activity.prospect.owner_id,
      can_edit: access.canEditAll || access.canCreate && activity.prospect.owner_id === userId,
      client_id: activity.prospect.linked_client?.id || '', contact_id: null,
      customer: activity.prospect.linked_client ? { ...activity.prospect.linked_client, company_name: activity.prospect.linked_client.name } : null,
      contact: null, creator: activity.author,
      exchange_sync_status: activity.exchange_sync_status === 'SYNCED' && activity.exchange_synced_version !== activity.version ? 'PENDING' : activity.exchange_sync_status,
    }));
  }

  async clientActivities(userId: string, clientId: string) {
    const access = await this.access(userId);
    if (!access.enabled) return [];
    const profile = access.canViewAll ? null : await this.prisma.profiles.findUnique({ where: { id: userId }, select: { code: true } });
    if (!access.canViewAll && !profile?.code) throw new ForbiddenException('Código comercial no configurado.');
    const client = await this.prisma.customers.findFirst({ where: { id: clientId, ...(access.canViewAll ? {} : { salesperson_code: profile!.code! }) }, select: { id: true } });
    if (!client) throw new NotFoundException('Cliente no encontrado en tu cartera.');
    return this.prisma.crm_prospect_activities.findMany({
      where: { prospect: { linked_client_id: clientId, converted_at: { not: null }, ...(access.canViewAll ? {} : { owner_id: userId }) } },
      include: { prospect: { select: { id: true, company_name: true } }, author: { select: { first_name: true, last_name: true, email: true } } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async saveActivity(userId: string, id: string, data: ProspectActivityDto | UpdateProspectActivityDto, activityId?: string) {
    const access = await this.authorize(userId);
    const prospect = await this.detail(userId, id);
    if (!access.canEditAll && (!access.canCreate || prospect.owner_id !== userId)) throw new ForbiddenException('Solo el propietario o Admin puede editar el seguimiento.');
    if (prospect.archived_at) throw new BadRequestException('Restaura el prospecto antes de registrar o editar actividades.');
    if (!['NOTE', 'TASK', 'CALL', 'VISITA', 'EVENT', 'VIDEOLLAMADA'].includes(data.type)) throw new BadRequestException('Tipo de actividad no disponible.');
    if (!data.title.trim()) throw new BadRequestException('El título es obligatorio.');
    if (data.type !== 'NOTE' && !data.due_date) throw new BadRequestException('La actividad requiere fecha.');
    const date = data.due_date ? new Date(`${data.due_date}T00:00:00.000Z`) : null;
    if (date && (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.due_date)) throw new BadRequestException('Fecha de actividad no válida.');
    const fields = { type: data.type, title: data.title.trim(), description: data.description || null,
      due_date: data.type === 'NOTE' ? null : date, time_scheduled: data.type === 'NOTE' ? null : data.time_scheduled || null,
      location: data.location || null, conclusions: data.conclusions || null,
      is_completed: data.is_completed || !!data.conclusions?.trim(),
    };
    const saved = await this.prisma.$transaction(async tx => {
      // Bloquear la ficha y reevaluar el archivo/versionado frente a cambios concurrentes.
      const lock = await tx.crm_prospects.updateMany({ where: { id, archived_at: null, version: prospect.version }, data: { updated_at: prospect.updated_at } });
      if (lock.count !== 1) throw new ConflictException('El prospecto cambió. Recarga su ficha.');
      let activity;
      let before: unknown = null;
      if (activityId) {
        const current = await tx.crm_prospect_activities.findFirst({ where: { id: activityId, prospect_id: id } });
        if (!current) throw new NotFoundException('Actividad no encontrada en este prospecto.');
        before = current;
        if (current.type !== data.type) throw new BadRequestException('El tipo de actividad no puede cambiarse.');
        const version = (data as UpdateProspectActivityDto).version;
        const result = await tx.crm_prospect_activities.updateMany({ where: { id: activityId, prospect_id: id, version }, data: { ...fields, updated_at: new Date(), version: { increment: 1 } } });
        if (result.count !== 1) throw new ConflictException('La actividad cambió. Recarga antes de guardar.');
        activity = await tx.crm_prospect_activities.findUniqueOrThrow({ where: { id: activityId } });
      } else {
        activity = await tx.crm_prospect_activities.create({ data: { ...fields, prospect_id: id, created_by: userId } });
      }
      await tx.crm_prospect_events.create({ data: { prospect_id: id, created_by: userId, type: 'AUDIT', title: activityId ? 'Actividad del prospecto actualizada' : 'Actividad del prospecto creada', description: JSON.stringify({ activity_id: activity.id, before, after: fields }) } });
      return activity;
    });
    await this.outlook.sync(saved.id);
    return this.prisma.crm_prospect_activities.findUniqueOrThrow({ where: { id: saved.id } });
  }

  async syncActivity(userId: string, id: string, activityId: string) {
    const access = await this.authorize(userId);
    const prospect = await this.detail(userId, id);
    if (!access.canEditAll && (!access.canCreate || prospect.owner_id !== userId)) throw new ForbiddenException('Solo el propietario o Admin puede sincronizar el seguimiento.');
    if (prospect.archived_at) throw new BadRequestException('Restaura el prospecto antes de sincronizar.');
    const activity = await this.prisma.crm_prospect_activities.findFirst({ where: { id: activityId, prospect_id: id } });
    if (!activity) throw new NotFoundException('Actividad no encontrada en este prospecto.');
    await this.outlook.sync(activityId);
    return this.prisma.crm_prospect_activities.findUniqueOrThrow({ where: { id: activityId } });
  }

  async clients(userId: string, id: string, search = '') {
    const { prospect, code } = await this.ownerCode(userId, id);
    const text = search.trim();
    if (text.length > 255) throw new BadRequestException('Búsqueda demasiado larga.');
    const select = { id: true, client_id: true, name: true, email: true, phone_no: true } as const;
    const conditions: Prisma.customersWhereInput[] = text
      ? ['name', 'client_id', 'email'].map(field => ({ [field]: { contains: text, mode: 'insensitive' } }))
      : [ { name: { equals: prospect.company_name.trim(), mode: 'insensitive' } },
          ...(prospect.email ? [{ email: { equals: prospect.email, mode: 'insensitive' as const } }] : []),
          ...(prospect.phone ? [{ phone_no: prospect.phone }] : []) ];
    return this.prisma.customers.findMany({ where: { ...(code ? { salesperson_code: code } : {}), OR: conditions }, select, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 50 });
  }

  async link(userId: string, id: string, version: number, clientId: string | null) {
    const { prospect, code } = await this.ownerCode(userId, id);
    if (prospect.version !== version) throw new ConflictException('El prospecto cambió. Recarga su ficha.');
    if (prospect.archived_at) throw new BadRequestException('Restaura el prospecto antes de vincularlo.');
    if (clientId && prospect.converted_at) throw new BadRequestException('Desvincula primero el cliente actual.');
    if (!clientId && !prospect.converted_at) throw new BadRequestException('El prospecto no tiene un cliente vinculado.');
    return this.prisma.$transaction(async tx => {
      const customer = clientId ? await tx.customers.findFirst({ where: { id: clientId, ...(code ? { salesperson_code: code } : {}) }, select: { id: true, client_id: true, name: true } }) : null;
      if (clientId && !customer) throw new NotFoundException('Cliente no encontrado en tu cartera. Espera a que se sincronice desde BC.');
      const result = await tx.crm_prospects.updateMany({ where: { id, owner_id: prospect.owner_id, version }, data: {
        linked_client_id: clientId, converted_at: clientId ? new Date() : null,
        updated_at: new Date(), version: { increment: 1 },
      } });
      if (result.count !== 1) throw new ConflictException('El prospecto cambió. Recarga su ficha.');
      await tx.crm_prospect_events.create({ data: { prospect_id: id, created_by: userId, type: 'AUDIT',
        title: clientId ? 'Prospecto vinculado a cliente BC' : 'Vinculación con cliente BC deshecha',
        description: JSON.stringify({ before: prospect.linked_client_id, after: customer, phase: prospect.phase }),
      } });
      return tx.crm_prospects.findUniqueOrThrow({ where: { id }, include: { linked_client: { select: { id: true, client_id: true, name: true } } } });
    });
  }

  async salespeople(userId: string) {
    const access = await this.authorize(userId);
    if (!access.canEditAll) throw new ForbiddenException('Solo Admin puede consultar la lista de comerciales para asignación.');
    return this.prisma.profiles.findMany({
      where: { is_active: true },
      select: { id: true, first_name: true, last_name: true, email: true, code: true, roles: { select: { name: true } } },
      orderBy: [{ first_name: 'asc' }, { email: 'asc' }],
    });
  }
}


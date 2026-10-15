import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ProspectsService } from '../prospects/prospects.service';
import { UpdateCrmQuoteDto, CreateActivityDto } from './dto/crm-quote.dto';

import { LOCAL_FIELDS, OfferSourceContext } from './offer-source-context';
import { OFFER_CLOSE_REASONS } from './offer-close-reasons';
import { pilotPhase, OFFER_PROBABILITIES } from './offer-pilot-rules';
import { loadOfferContacts } from './offer-contacts';
export { BC_FIELDS, LOCAL_FIELDS, OfferSourceContext } from './offer-source-context';
const dates = new Set(['cierreprev_date', 'confirmacion_date', 'fecha_proxima_accion']);

@Injectable()
export class OfferFollowupService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly prospects: ProspectsService) {}
  enabled() { return this.config.get('CRM_PROSPECTS_PILOT_ENABLED') === 'true'; }
  async context() {
    if (!this.enabled()) return null;
    const rows = await this.prisma.crm_offer_followups.findMany({ where: { source: 'APP' }, include: { activities: { where: { tipo: { not: 'Auditoría' } }, orderBy: { fecha: 'desc' } } } });
    return new OfferSourceContext(await loadOfferContacts(this.prisma, rows));
  }
  private async pilot(allowAdminEditingWithoutPilotAccess = false) {
    const email = this.config.get<string>('CRM_PROSPECTS_PILOT_EMAIL') || 'aciurans@dtsinstruments.com';
    const profile = await this.prisma.profiles.findUnique({ where: { email }, include: { roles: true } });
    if (!profile?.is_active || profile.roles?.name?.toUpperCase() !== 'TESTER' || !profile.code?.trim()) throw new ConflictException('Antoni debe tener rol TESTER activo y código comercial configurado.');
    if (!allowAdminEditingWithoutPilotAccess && !(await this.prospects.access(profile.id)).enabled) throw new ForbiddenException('El propietario del piloto no tiene permiso CRM/Oportunidades.');
    return profile;
  }
  async scope(userId: string) {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!profile?.is_active) throw new ForbiddenException('Perfil no disponible.');
    if (['ADMIN', 'DIRECCION', 'TESTER'].includes(profile.roles?.name?.toUpperCase() || '')) {
      if (!profile.role_id) throw new ForbiddenException('Sin rol configurado.');
      const permissions = await this.prisma.role_modules.findMany({ where: { role_id: profile.role_id, module: { is_active: true, route_path: { in: ['/crm', '/crm/pipeline'] } } }, include: { module: true } });
      if (!['/crm', '/crm/pipeline'].every(path => permissions.some(permission => permission.module.route_path === path && permission.can_view))) throw new ForbiddenException('Sin permiso CRM/Oportunidades.');
    }
    if (['ADMIN', 'DIRECCION'].includes(profile.roles?.name?.toUpperCase() || '')) return {};
    if (!profile.code) throw new ForbiddenException('Código comercial no configurado.');
    return { salesperson_code: profile.code };
  }
  private async writeAccess(userId: string) {
    const access = await this.prospects.access(userId);
    if (!access.enabled || !access.canCreate && !access.canEditAll) throw new ForbiddenException('No tienes permiso para editar ofertas del piloto.');
    return access;
  }
  async closeReasons(userId: string) {
    await this.scope(userId);
    return { ganada: [...OFFER_CLOSE_REASONS.ganada], perdida: [...OFFER_CLOSE_REASONS.perdida] };
  }
  async isManagedQuote(id: string) {
    if (!this.enabled()) return false;
    const quote = await this.prisma.sales_quotes.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Oferta no encontrada.');
    const existing = await this.prisma.crm_offer_followups.findUnique({ where: { document_no: quote.document_no } });
    if (existing && existing.source !== 'BC') return true;
    const email = this.config.get<string>('CRM_PROSPECTS_PILOT_EMAIL') || 'aciurans@dtsinstruments.com';
    const profile = await this.prisma.profiles.findUnique({ where: { email }, include: { roles: true } });
    return !!profile?.code && profile.roles?.name?.toUpperCase() === 'TESTER' && quote.salesperson_code === profile.code;
  }
  async save(userId: string, quoteId: string, data: UpdateCrmQuoteDto) {
    if (data.contact_id !== undefined) {
      if (data.contacto_id !== undefined && data.contact_id !== data.contacto_id) throw new BadRequestException('Las referencias del contacto no coinciden.');
      data = { ...data, contacto_id: data.contact_id };
    }
    const access = await this.writeAccess(userId), pilot = await this.pilot(access.canEditAll);
    const quote = await this.prisma.sales_quotes.findFirst({ where: { id: quoteId, salesperson_code: pilot.code }, select: { document_no: true, customer_no: true } });
    if (!quote) throw new NotFoundException('Oferta no encontrada en la cartera del piloto.');
    if (!access.canEditAll && pilot.id !== userId) throw new ForbiddenException('Oferta ajena.');
    if (data.motivo_ganada !== undefined || data.motivo_perdida !== undefined) {
      const reasons = await this.closeReasons(userId);
      for (const [field, allowed] of [['motivo_ganada', reasons.ganada], ['motivo_perdida', reasons.perdida]] as const) {
        if (data[field] !== undefined && !allowed.includes(data[field]?.trim() || '')) {
          throw new BadRequestException('Selecciona un motivo del catálogo aprobado. La opción Otros no está disponible en el piloto.');
        }
      }
    }
    return this.prisma.$transaction(async tx => {
      const current = await tx.crm_offer_followups.findUnique({ where: { document_no: quote.document_no } });
      if (!current) throw new ConflictException('El seguimiento de esta oferta aún no ha llegado desde n8n. Actualiza la vista cuando termine la importación.');
      if (current.source !== 'APP') throw new ConflictException('Esta oferta sigue gestionada desde BC. n8n debe habilitar su seguimiento APP para el piloto.');
      if (data.followup_version === undefined || current.version !== data.followup_version) throw new ConflictException('Recarga la oferta para obtener su versión antes de guardar.');
      if (data.contacto_id === null || data.contacto_id === '') throw new BadRequestException('El contacto de la oferta es obligatorio.');
      if (data.contacto_id !== undefined && !await tx.contacts.findFirst({ where: { contact_no: data.contacto_id, client_id: quote.customer_no }, select: { id: true } })) throw new BadRequestException('El contacto debe existir en contacts y pertenecer al cliente de la oferta.');
      const fields = Object.fromEntries(LOCAL_FIELDS.filter(field => data[field] !== undefined).map(field => [field, dates.has(field) ? data[field] ? new Date(data[field]) : null : data[field]]));
      const phase = pilotPhase(data.estado_oferta ?? current.estado_oferta);
      if (data.estado_oferta === null || data.estado_oferta === '') throw new BadRequestException('La fase no puede quedar vacía.');
      const phaseChanged = data.estado_oferta !== undefined && phase !== pilotPhase(current.estado_oferta);
      if (data.estado_oferta !== undefined) {
        if (!phase || OFFER_PROBABILITIES[phase] === undefined) throw new BadRequestException('Selecciona una fase válida.');
        if (!(data.oferta_type ?? current.oferta_type) || !(data.cierreprev_date ?? current.cierreprev_date)) throw new BadRequestException('Tipo de oferta y fecha de cierre prevista son obligatorios para confirmar la fase.');
        fields.estado_oferta = phase;
        fields.probabilidad_exito = OFFER_PROBABILITIES[phase];
      }
      if (data.probabilidad_exito !== undefined && (!phase || data.probabilidad_exito !== OFFER_PROBABILITIES[phase])) throw new BadRequestException('La probabilidad se calcula automáticamente según la fase.');
      if (data.oferta_type === null || data.oferta_type === '' || data.cierreprev_date === null || data.cierreprev_date === '') throw new BadRequestException('No puedes vaciar el tipo o la fecha de cierre prevista.');
      if (phaseChanged) {
        if (!data.transition_note?.trim()) throw new BadRequestException('Añade una nota para explicar el cambio de fase.');
        if (phase === 'ganada' || phase === 'perdida') {
          const field = phase === 'ganada' ? 'motivo_ganada' : 'motivo_perdida';
          if (!OFFER_CLOSE_REASONS[phase].includes(data[field]?.trim() || '')) throw new BadRequestException('Selecciona un motivo de cierre del catálogo aprobado.');
          fields.confirmacion_date = new Date();
        }
      }
      const result = await tx.crm_offer_followups.updateMany({ where: { id: current.id, version: current.version, source: 'APP' }, data: { ...fields, version: { increment: 1 }, updated_at: new Date() } });
      if (result.count !== 1) throw new ConflictException('La oferta cambió. Recarga su ficha.');
      if (phaseChanged) await tx.crm_offer_activities.create({ data: {
        followup_id: current.id, author_id: userId, tipo: data.transition_activity_type || 'Nota',
        notas: `Cambio de fase [${pilotPhase(current.estado_oferta) || 'Sin fase'} -> ${phase}]. ${data.transition_note!.trim()}`,
        fecha: new Date(), hecho: true,
      } });
      await tx.crm_offer_activities.create({ data: { followup_id: current.id, author_id: userId, tipo: 'Auditoría', notas: JSON.stringify({ before: Object.fromEntries(LOCAL_FIELDS.map(field => [field, current[field]])), after: fields }), fecha: new Date() } });
      return tx.crm_offer_followups.findUniqueOrThrow({ where: { id: current.id } });
    });
  }
  async activities(userId: string, quoteId: string, data?: CreateActivityDto) {
    const access = data ? await this.writeAccess(userId) : null;
    const quote = await this.prisma.sales_quotes.findFirst({ where: { id: quoteId, ...await this.scope(userId) } });
    if (!quote) throw new NotFoundException('Oferta fuera de tu cartera.');
    const row = await this.prisma.crm_offer_followups.findUnique({ where: { document_no: quote.document_no } });
    if (!row || row.source === 'BC') {
      if (data && await this.isManagedQuote(quoteId)) throw new ConflictException('El seguimiento APP de esta oferta aún no está disponible desde n8n.');
      return null;
    }
    if (data) {
      const pilot = await this.pilot(!!access?.canEditAll);
      if (quote.salesperson_code !== pilot.code || !access?.canEditAll && pilot.id !== userId) throw new ForbiddenException('La actividad pertenece a otra cartera.');
    }
    if (data) return this.prisma.crm_offer_activities.create({ data: { followup_id: row.id, author_id: userId, tipo: data.tipo, notas: data.notas, fecha: new Date(data.fecha), hecho: data.hecho || false } });
    return this.prisma.crm_offer_activities.findMany({ where: { followup_id: row.id, tipo: { not: 'Auditoría' } }, orderBy: { fecha: 'desc' } });
  }
  async editActivity(userId: string, id: string, data: any) {
    if (!this.enabled()) return null;
    const row = await this.prisma.crm_offer_activities.findUnique({ where: { id }, include: { followup: true } });
    if (!row) return null;
    const access = await this.writeAccess(userId);
    const pilot = await this.pilot(access.canEditAll);
    const quote = await this.prisma.sales_quotes.findFirst({ where: { document_no: row.followup.document_no, salesperson_code: pilot.code } });
    if (!quote || !access.canEditAll && pilot.id !== userId) throw new ForbiddenException('Actividad ajena.');
    if (row.followup.source !== 'APP') throw new ConflictException('Esta oferta sigue gestionada desde BC.');
    if (row.tipo === 'Auditoría') throw new ForbiddenException('El historial de cambios es inmutable.');
    if (data === null) throw new BadRequestException('Las actividades del piloto se conservan. Marca la actividad como realizada o corrige sus notas.');
    return this.prisma.crm_offer_activities.update({ where: { id }, data: { ...(data.tipo !== undefined ? {tipo:data.tipo}:{}), ...(data.notas !== undefined ? {notas:data.notas}:{}), ...(data.fecha ? {fecha:new Date(data.fecha)}:{}), ...(data.hecho !== undefined ? {hecho:data.hecho}:{}) } });
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService, CalendarEventPayload } from './microsoft-graph.service';

const html = (value: string | null | undefined) => (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br/>');

@Injectable()
export class ProspectOutlookService {
  constructor(private readonly prisma: PrismaService, private readonly graph: MicrosoftGraphService, private readonly config: ConfigService) {}

  enabled() { return this.config.get('CRM_PROSPECTS_OUTLOOK_ENABLED') === 'true'; }

  private async ownerAllowed(userId: string) {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!profile?.is_active || !profile.role_id || profile.roles?.name?.toUpperCase() === 'DIRECCION') return false;
    const permissions = await this.prisma.role_modules.findMany({ where: { role_id: profile.role_id, module: { is_active: true, route_path: { in: ['/crm', '/crm/pipeline'] } } }, include: { module: true } });
    return ['/crm', '/crm/pipeline'].every(path => permissions.some(permission => permission.module.route_path === path && permission.can_view === true));
  }

  async sync(id: string) {
    if (!this.enabled()) return;
    const activity = await this.prisma.crm_prospect_activities.findUnique({ where: { id }, include: { prospect: true } });
    if (!activity || activity.type === 'NOTE' || !activity.due_date || activity.prospect.archived_at || activity.exchange_sync_status === 'DELETED') return;
    if (!await this.ownerAllowed(activity.prospect.owner_id)) return;
    // Un alta con respuesta desconocida no se repite automáticamente, incluso tras reinicios.
    if (!activity.exchange_item_id && ['CREATING', 'UNCERTAIN'].includes(activity.exchange_sync_status)) {
      if (activity.exchange_sync_status === 'CREATING' && (!activity.exchange_lock_until || activity.exchange_lock_until < new Date())) {
        await this.prisma.crm_prospect_activities.updateMany({ where: { id, exchange_item_id: null, exchange_sync_status: 'CREATING' }, data: { exchange_sync_status: 'UNCERTAIN' } });
      }
      return;
    }
    const token = randomUUID(), now = new Date();
    const lock = await this.prisma.crm_prospect_activities.updateMany({ where: { id, OR: [{ exchange_lock_until: null }, { exchange_lock_until: { lt: now } }] }, data: { exchange_lock_token: token, exchange_lock_until: new Date(now.getTime() + 120000) } });
    if (lock.count !== 1) return;
    let creating = false;
    const set = (data: any) => this.prisma.crm_prospect_activities.updateMany({ where: { id, exchange_lock_token: token }, data });
    try {
      const current = await this.prisma.crm_prospect_activities.findUniqueOrThrow({ where: { id }, include: { prospect: true } });
      if (!current.exchange_item_id && ['CREATING', 'UNCERTAIN'].includes(current.exchange_sync_status)) return;
      if (current.exchange_synced_version === current.version && current.exchange_sync_status === 'SYNCED') return;
      const ownerId = current.prospect.owner_id;
      const account = await this.prisma.user_exchange_accounts.findUnique({ where: { user_id: ownerId } });
      if (!account?.calendar_sync_enabled || ['AUTH_REQUIRED', 'CONSENT_REQUIRED'].includes(account.access_token)) { await set({ exchange_sync_status: 'NO_CONNECTION' }); return; }
      const invite = current.type === 'VIDEOLLAMADA';
      if (invite && (!current.prospect.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.prospect.email))) { await set({ exchange_sync_status: 'NEEDS_EMAIL' }); return; }
      const day = current.due_date!.toISOString().slice(0, 10), time = current.time_scheduled || '09:00';
      // La fecha/hora son civiles de Madrid; el fin puede pasar al día siguiente.
      const end = new Date(`${day}T${time}:00.000Z`); end.setUTCMinutes(end.getUTCMinutes() + 60);
      const payload: CalendarEventPayload = {
        transactionId: current.id,
        title: `[${current.is_completed ? '✓ dTS CRM Prospecto - Realizado' : 'dTS CRM Prospecto'}: ${current.type}] ${current.title} (${current.prospect.company_name})`,
        description: `<p><strong>Empresa:</strong> ${html(current.prospect.company_name)}</p><p><strong>Contacto:</strong> ${html(current.prospect.contact_name)}</p><p>${html(current.description)}</p><p><strong>Conclusiones:</strong> ${html(current.conclusions)}</p>`,
        startDate: `${day}T${time}:00`, endDate: end.toISOString().slice(0, 19),
        location: current.location || '', isOnlineMeeting: invite,
        attendees: invite ? [{ email: current.prospect.email!, name: current.prospect.contact_name || undefined }] : [],
        categories: [current.is_completed ? 'dTS CRM - Completado' : 'dTS CRM'],
      };
      let result;
      if (current.exchange_item_id) {
        result = await this.graph.updateCalendarEvent(ownerId, current.exchange_item_id, payload);
      } else {
        creating = true;
        await set({ exchange_sync_status: 'CREATING', exchange_create_payload: payload });
        result = await this.graph.createCalendarEvent(ownerId, payload);
      }
      if (!result) { await set({ exchange_sync_status: 'NO_CONNECTION' }); return; }
      const fresh = await this.prisma.crm_prospect_activities.findUniqueOrThrow({ where: { id } });
      await set({ exchange_item_id: current.exchange_item_id || result.id, exchange_synced_version: current.version,
        exchange_sync_status: fresh.version === current.version ? 'SYNCED' : 'PENDING', exchange_last_synced_at: new Date() });
    } catch {
      await set({ exchange_sync_status: creating ? 'UNCERTAIN' : 'FAILED' });
    } finally {
      await set({ exchange_lock_token: null, exchange_lock_until: null });
    }
  }

  async importRemote(userId: string, event: any): Promise<boolean> {
    if (!this.enabled() || !event.id) return false;
    const allowed = await this.ownerAllowed(userId);
    const activity = await this.prisma.crm_prospect_activities.findFirst({ where: {
      prospect: { owner_id: userId },
      OR: [{ exchange_item_id: event.id }, ...(typeof event.transactionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.transactionId) ? [{ id: event.transactionId, exchange_sync_status: { in: ['CREATING', 'UNCERTAIN'] } }] : [])],
    } });
    if (!activity) return false;
    if (!allowed) return true; // Reconocer el origen sin editar ni importarlo como actividad BC.
    if (activity.exchange_lock_until && activity.exchange_lock_until > new Date()) return true;
    if (event['@removed'] || event.isCancelled) {
      await this.prisma.crm_prospect_activities.updateMany({ where: { id: activity.id, version: activity.version }, data: { exchange_sync_status: 'DELETED' } });
      return true;
    }
    // Recuperar una creación confirmada por delta sin repetir POST ni sobrescribir cambios nuevos.
    if (!activity.exchange_item_id && event.transactionId === activity.id) {
      await this.prisma.crm_prospect_activities.updateMany({ where: { id: activity.id, exchange_item_id: null }, data: { exchange_item_id: event.id, exchange_sync_status: 'PENDING' } });
      return true;
    }
    if (activity.exchange_synced_version !== activity.version) return true;
    const value = String(event.start?.dateTime || '');
    const day = value.slice(0, 10), time = value.slice(11, 16), date = new Date(`${day}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) return true;
    const location = event.location?.displayName ?? activity.location;
    if (activity.due_date?.getTime() === date.getTime() && activity.time_scheduled === time && (activity.location || '') === (location || '')) return true;
    await this.prisma.$transaction(async tx => {
      const updated = await tx.crm_prospect_activities.updateMany({ where: { id: activity.id, version: activity.version, exchange_lock_token: null }, data: {
        due_date: date, time_scheduled: time, location: location || null, version: { increment: 1 }, exchange_synced_version: activity.version + 1,
        exchange_sync_status: 'SYNCED', exchange_last_synced_at: new Date(), updated_at: new Date(),
      } });
      if (updated.count === 1) await tx.crm_prospect_events.create({ data: { prospect_id: activity.prospect_id, created_by: userId, type: 'AUDIT', title: 'Actividad reprogramada desde Outlook', description: JSON.stringify({ activity_id: activity.id, before: { due_date: activity.due_date, time_scheduled: activity.time_scheduled, location: activity.location }, after: { due_date: day, time_scheduled: time, location } }) } });
    });
    return true;
  }
}

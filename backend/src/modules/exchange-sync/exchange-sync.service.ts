import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { CrmActivityType } from '@prisma/client';
import { EmailIdentityService } from './email-identity.service';
import { ProspectOutlookService } from './prospect-outlook.service';
import { attachmentState } from './email-attachments';

@Injectable()
export class ExchangeSyncService {
  private readonly logger = new Logger(ExchangeSyncService.name);
  private readonly inFlightSyncs = new Set<string>();
  private readonly pendingSyncs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphService: MicrosoftGraphService,
    private readonly prospectOutlook: ProspectOutlookService,
    private readonly identities: EmailIdentityService,
  ) {}

  /**
   * Obtiene el estado actual de conexión de Exchange para un usuario.
   */
  async getStatus(userId: string) {
    const account = await this.prisma.user_exchange_accounts.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        email: true,
        calendar_sync_enabled: true,
        mail_sync_enabled: true,
        last_synced_at: true,
        created_at: true,
        access_token: true,
      },
    });

    const isConnected = !!account && account.access_token !== 'CONSENT_REQUIRED' && account.access_token !== 'AUTH_REQUIRED';
    const requiresConsent = !!account && (account.access_token === 'CONSENT_REQUIRED' || account.access_token === 'AUTH_REQUIRED');

    return {
      emailIdentityEnabled: await this.identities.enabledFor(userId),
      isConnected,
      requiresConsent,
      account: account ? {
        id: account.id,
        email: account.email,
        calendar_sync_enabled: account.calendar_sync_enabled,
        mail_sync_enabled: account.mail_sync_enabled,
        last_synced_at: account.last_synced_at,
        created_at: account.created_at,
      } : null,
    };
  }

  /**
   * Conecta una cuenta de Microsoft Exchange mediante el código OAuth.
   */
  async connectAccount(userId: string, code: string, redirectUri?: string) {
    const tokenInfo = await this.graphService.acquireTokenByCode(code, redirectUri);

    const account = await this.prisma.user_exchange_accounts.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        email: tokenInfo.email,
        microsoft_user_id: tokenInfo.microsoftUserId,
        access_token: tokenInfo.accessToken,
        refresh_token: tokenInfo.refreshToken,
        token_expires_at: tokenInfo.expiresAt,
        last_synced_at: new Date(),
      },
      update: {
        email: tokenInfo.email,
        microsoft_user_id: tokenInfo.microsoftUserId,
        access_token: tokenInfo.accessToken,
        refresh_token: tokenInfo.refreshToken,
        token_expires_at: tokenInfo.expiresAt,
        last_synced_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Asegurar categoría de color corporativo en Outlook
    this.graphService.ensureDtsCategory(userId).catch(() => {});

    // Iniciar sincronización inicial en segundo plano
    this.syncOutlookToCrm(userId).catch((err) =>
      this.logger.error(`Error en sincronización inicial de Exchange para ${userId}:`, err),
    );

    return {
      success: true,
      email: account.email,
      lastSyncedAt: account.last_synced_at,
    };
  }

  /**
   * Desconecta la cuenta de Microsoft Exchange de un usuario.
   */
  async disconnectAccount(userId: string) {
    const existing = await this.prisma.user_exchange_accounts.findUnique({
      where: { user_id: userId },
    });

    if (!existing) {
      return { success: true };
    }

    await this.prisma.user_exchange_accounts.delete({
      where: { user_id: userId },
    });

    return { success: true };
  }

  /**
   * Sincroniza una actividad comercial del CRM (Reunión, Visita, Evento, Llamada, Tarea) hacia el calendario de Outlook.
   */
  async syncActivityToOutlook(activityId: string) {
    if (this.inFlightSyncs.has(activityId)) {
      this.pendingSyncs.add(activityId);
      return;
    }
    this.inFlightSyncs.add(activityId);
    try {
      do {
        this.pendingSyncs.delete(activityId);
        await this.syncActivitySnapshotToOutlook(activityId);
      } while (this.pendingSyncs.has(activityId));
    } finally {
      this.pendingSyncs.delete(activityId);
      this.inFlightSyncs.delete(activityId);
    }
  }

  private async syncActivitySnapshotToOutlook(activityId: string) {
    try {
      const activity = await this.prisma.crm_activities.findUnique({
        where: { id: activityId },
        include: {
          contact: true,
          customer: true,
        },
      });

      if (!activity) return;

      const syncTypes: CrmActivityType[] = ['EVENT', 'REUNION', 'VIDEOLLAMADA', 'VISITA', 'CALL', 'TASK'];
      if (!syncTypes.includes(activity.type)) {
        return;
      }

      if (!activity.due_date) {
        return;
      }

      const userAccount = await this.prisma.user_exchange_accounts.findUnique({
        where: { user_id: activity.created_by },
      });

      if (!userAccount || !userAccount.calendar_sync_enabled) {
        await this.prisma.crm_activities.update({ where: { id: activityId }, data: { exchange_sync_status: 'no_connection' } });
        return;
      }

      const dateStr = activity.due_date.toISOString().split('T')[0];
      const attendees: { email: string; name?: string }[] = [];

      // Solo generar convocatoria/invitación de reunión por correo si es Videollamada
      // Las reuniones internas (REUNION), visitas a cliente (VISITA), visitas no programadas (EVENT), tareas (TASK) y llamadas (CALL) son apuntes en el calendario del comercial sin enviar correos al contacto
      const isMeetingWithInvite = activity.type === 'VIDEOLLAMADA';
      if (isMeetingWithInvite && activity.contact?.email) {
        attendees.push({
          email: activity.contact.email,
          name: activity.contact.name,
        });
      }

      const isCompleted = Boolean(activity.is_completed || (activity.conclusions && activity.conclusions.trim()));
      const isTeams = activity.type === 'VIDEOLLAMADA';
      const eventTypeLabel = 
        activity.type === 'EVENT' ? 'Visita No Programada' :
        activity.type === 'REUNION' ? 'Reunión Interna' :
        activity.type === 'VISITA' ? 'Visita' :
        activity.type === 'VIDEOLLAMADA' ? 'Videollamada' :
        activity.type === 'CALL' ? 'Llamada' :
        activity.type === 'TASK' ? 'Tarea' :
        activity.type;
      const eventPrefix = isCompleted 
        ? `[✓ dTS CRM - Realizado: ${eventTypeLabel}]` 
        : `[dTS CRM - ${eventTypeLabel}]`;

      // Limpiar prefijos y sufijos existentes del título para no duplicarlos
      let cleanTitle = (activity.title || '').trim();
      while (/^\[(✓\s*)?dTS CRM[^\]]*\]\s*/i.test(cleanTitle)) {
        cleanTitle = cleanTitle.replace(/^\[(✓\s*)?dTS CRM[^\]]*\]\s*/i, '').trim();
      }
      const clientOrContactName = (activity.customer?.name || activity.contact?.name || '').trim();
      if (clientOrContactName) {
        const escapedClient = clientOrContactName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const clientSuffixPattern = new RegExp(`\\s*\\(${escapedClient}\\)+$`, 'i');
        while (clientSuffixPattern.test(cleanTitle)) {
          cleanTitle = cleanTitle.replace(clientSuffixPattern, '').trim();
        }
      }

      const clientSuffix = clientOrContactName ? ` (${clientOrContactName})` : '';
      const fullTitle = `${eventPrefix} ${cleanTitle || 'Actividad Comercial'}${clientSuffix}`;

      // Categoría oficial de Outlook para colorear el evento:
      // 'dTS CRM - Completado' (preset4 - Verde) si está terminada; 'dTS CRM' (preset7 - Azul) si está abierta
      const categories = isCompleted ? ['dTS CRM - Completado'] : ['dTS CRM'];

      let locationDisplay = activity.location || '';
      if ((activity.type === 'VISITA' || activity.type === 'EVENT') && !locationDisplay && activity.customer) {
        locationDisplay = [activity.customer.address, activity.customer.city].filter(Boolean).join(', ');
      }

      let descriptionHtml = `<p><strong>Actividad de CRM dTS Instruments</strong></p>`;
      descriptionHtml += `<p><strong>Empresa:</strong> ${activity.customer?.name || 'No especificada'}</p>`;
      if (activity.contact) {
        descriptionHtml += `<p><strong>Contacto:</strong> ${activity.contact.name} (${activity.contact.email || ''} / ${activity.contact.phone_no || activity.contact.mobile_no || ''})</p>`;
      }
      if (activity.description) {
        descriptionHtml += `<hr/><p>${activity.description.replace(/\n/g, '<br/>')}</p>`;
      }
      if (activity.conclusions) {
        descriptionHtml += `<hr/><p><strong>Conclusiones:</strong> ${activity.conclusions.replace(/\n/g, '<br/>')}</p>`;
      }

      // Comprobar nuevamente el ID en BD para evitar duplicados por carreras
      let currentExchangeItemId = activity.exchange_item_id;
      if (!currentExchangeItemId) {
        const fresh = await this.prisma.crm_activities.findUnique({
          where: { id: activity.id },
          select: { exchange_item_id: true },
        });
        if (fresh?.exchange_item_id) {
          currentExchangeItemId = fresh.exchange_item_id;
        }
      }

      if (currentExchangeItemId) {
        // Actualizar evento existente en Outlook
        const updated = await this.graphService.updateCalendarEvent(activity.created_by, currentExchangeItemId, {
          title: fullTitle,
          description: descriptionHtml,
          startDate: dateStr,
          timeScheduled: activity.time_scheduled || undefined,
          location: locationDisplay || undefined,
          attendees,
          categories,
        });

        if (!updated) throw new Error('Outlook no confirmó la actualización del evento.');
        if (updated) {
          const canonicalWebLink = `https://outlook.office.com/calendar/item/${encodeURIComponent(currentExchangeItemId)}`;
          await this.prisma.crm_activities.update({
            where: { id: activity.id },
            data: {
              exchange_change_key: updated.changeKey,
              exchange_web_link: canonicalWebLink,
              exchange_sync_status: this.pendingSyncs.has(activityId) ? 'pending' : 'synced',
              exchange_last_synced_at: new Date(),
            },
          });
        }
      } else {
        // Crear nuevo evento en Outlook
        const created = await this.graphService.createCalendarEvent(activity.created_by, {
          title: fullTitle,
          description: descriptionHtml,
          startDate: dateStr,
          timeScheduled: activity.time_scheduled || undefined,
          isOnlineMeeting: isTeams,
          location: locationDisplay || undefined,
          attendees,
          categories,
        });

        if (!created) throw new Error('Outlook no confirmó la creación del evento.');
        if (created) {
          const canonicalWebLink = `https://outlook.office.com/calendar/item/${encodeURIComponent(created.id)}`;
          await this.prisma.crm_activities.update({
            where: { id: activity.id },
            data: {
              exchange_item_id: created.id,
              exchange_change_key: created.changeKey,
              exchange_web_link: canonicalWebLink,
              exchange_sync_status: this.pendingSyncs.has(activityId) ? 'pending' : 'synced',
              exchange_last_synced_at: new Date(),
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error al sincronizar actividad ${activityId} hacia Outlook:`, error);
      await this.prisma.crm_activities.update({
        where: { id: activityId },
        data: {
          exchange_sync_status: 'failed',
        },
      }).catch(() => null);
    }
  }

  /**
   * Elimina un evento de Outlook cuando se borra la actividad en el CRM.
   */
  async deleteActivityFromOutlook(activityId: string, exchangeItemId: string, userId: string) {
    if (!exchangeItemId) return;
    try {
      await this.graphService.deleteCalendarEvent(userId, exchangeItemId);
    } catch (err) {
      this.logger.warn(`No se pudo eliminar evento ${exchangeItemId} de Exchange para ${userId}:`, err);
    }
  }

  /**
   * Envía un correo real a través de la cuenta de Exchange del comercial y lo registra en crm_activities.
   */
  async sendEmailFromCrm(
    userId: string,
    params: {
      contactId?: string;
      clientId?: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    },
  ) {
    const { contactId, clientId, to, cc, bcc, subject, body, isHtml } = params;

    let resolvedClientId = clientId;
    let resolvedContact = null;

    if (contactId) {
      resolvedContact = await this.prisma.contacts.findUnique({
        where: { id: contactId },
      });
      if (resolvedContact) {
        resolvedClientId = resolvedContact.client_id;
      }
    }

    if (!resolvedClientId) {
      throw new BadRequestException('No se especificó la empresa o contacto destinatario.');
    }

    if (await this.identities.enabledFor(userId)) {
      // Persist the exact draft before sending. An uncertain send is never retried automatically.
      const prepared = await this.createDraftFromCrm(userId, params);
      await this.prisma.crm_activities.update({ where: { id: prepared.activity.id }, data: { exchange_sync_status: 'send_unconfirmed' } });
      await this.graphService.sendDraft(userId, prepared.draft.id);
      const identity = await this.identities.prepare(userId, prepared.draft.id, prepared.draft.idType);
      const activity = await this.prisma.crm_activities.update({ where: { id: prepared.activity.id }, data: {
        ...identity.patch, exchange_web_link: identity.webLink || prepared.draft.webLink,
        // New drafts finish their metadata once in the existing reconciliation pass.
        exchange_sync_status: identity.patch.exchange_resolution_status === 'resolved'
          && (prepared.activity.attendees as any)?.emailAttachments?.status !== 'pending' ? 'synced' : 'sent_pending',
        exchange_last_synced_at: new Date(),
      } });
      return { success: true, activity };
    }

    // 1. Enviar correo vía Microsoft Graph
    await this.graphService.sendMail(userId, {
      to,
      cc,
      bcc,
      subject,
      body,
      isHtml: isHtml ?? false,
      saveToSentItems: true,
    });

    // 2. Registrar actividad de correo en CRM
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const createdActivity = await this.prisma.crm_activities.create({
      data: {
        client_id: resolvedClientId,
        contact_id: contactId || null,
        created_by: userId,
        type: 'EMAIL',
        // Registro de correo: su estado de envío se controla por exchange_sync_status.
        is_completed: true,
        title: subject,
        description: body,
        email: to.join(', '),
        due_date: now,
        time_scheduled: `${hh}:${mm}`,
        exchange_sync_status: 'synced',
        exchange_last_synced_at: now,
        attendees: {
          sentDate: now.toISOString(),
        },
      },
    });

    return {
      success: true,
      activity: createdActivity,
    };
  }

  /**
   * Crea un borrador de correo en Exchange (Microsoft 365) y lo registra en crm_activities como borrador preparado en Outlook.
   */
  async createDraftFromCrm(
    userId: string,
    params: {
      contactId?: string;
      clientId?: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    },
  ) {
    const { contactId, clientId, to, cc, bcc, subject, body, isHtml } = params;

    let resolvedClientId = clientId;
    let resolvedContact = null;

    if (contactId) {
      resolvedContact = await this.prisma.contacts.findUnique({
        where: { id: contactId },
      });
      if (resolvedContact) {
        resolvedClientId = resolvedContact.client_id;
      }
    }

    if (!resolvedClientId) {
      throw new BadRequestException('No se especificó la empresa o contacto destinatario.');
    }

    // 1. Crear borrador en Microsoft Graph
    const draft = await this.graphService.createDraftMail(userId, {
      to,
      cc,
      bcc,
      subject,
      body,
      isHtml: isHtml ?? false,
    });

    const identity = await this.identities.prepare(userId, draft.id, draft.idType);

    // 2. Registrar actividad de correo en CRM como borrador pendiente
    const draftNow = new Date();
    const draftHh = String(draftNow.getHours()).padStart(2, '0');
    const draftMm = String(draftNow.getMinutes()).padStart(2, '0');
    const createdActivity = await this.prisma.crm_activities.create({
      data: {
        client_id: resolvedClientId,
        contact_id: contactId || null,
        created_by: userId,
        type: 'EMAIL',
        // Registro de correo: su estado de envío se controla por exchange_sync_status.
        is_completed: true,
        title: subject,
        description: body,
        email: to.join(', '),
        due_date: draftNow,
        time_scheduled: `${draftHh}:${draftMm}`,
        ...identity.patch,
        exchange_item_id: draft.id,
        exchange_web_link: draft.webLink,
        exchange_sync_status: 'draft',
        exchange_last_synced_at: draftNow,
        attendees: {
          sentDate: draftNow.toISOString(),
          emailAttachments: attachmentState('pending', 'crm'),
        },
      },
    });

    return {
      success: true,
      draft,
      activity: createdActivity,
    };
  }

  /**
   * Comprueba una lista de actividades con exchange_item_id y desvincula las que ya no existan en Outlook.
   * Protege eventos creados en los últimos 5 minutos para evitar condiciones de carrera por propagación de Exchange.
   * Devuelve los IDs de las actividades que fueron desvinculadas.
   */
  async purgeDeletedCalendarActivities(
    userId: string,
    activities: Array<{ id: string; exchange_item_id: string | null; title?: string; created_at?: Date | null }>,
  ): Promise<string[]> {
    const now = Date.now();
    const calendarActs = activities.filter((a) => {
      if (!a.exchange_item_id) return false;
      // Proteger eventos creados hace menos de 5 minutos
      if (a.created_at && (now - new Date(a.created_at).getTime()) < 5 * 60 * 1000) {
        return false;
      }
      return true;
    });
    if (calendarActs.length === 0) return [];

    const deletedIds: string[] = [];
    await Promise.all(
      calendarActs.map(async (act) => {
        const status = await this.graphService.checkCalendarEventExists(userId, act.exchange_item_id!);
        if (!status.exists || status.isCancelled) {
          deletedIds.push(act.id);
          // Desvincular de Outlook en lugar de borrar la actividad comercial de la base de datos
          await this.prisma.crm_activities.update({
            where: { id: act.id },
            data: {
              exchange_item_id: null,
              exchange_sync_status: 'deleted_in_outlook',
              updated_at: new Date(),
            },
          }).catch(() => null);
          this.logger.log(`Actividad ${act.id} ("${act.title || 'Evento'}") desvinculada del CRM porque ya no existe en Outlook.`);
        }
      }),
    );

    return deletedIds;
  }

  /**
   * Sincroniza eventos y correos recientes desde Outlook / Exchange hacia el CRM.
   */
  async syncOutlookToCrm(userId: string) {
    const account = await this.prisma.user_exchange_accounts.findUnique({
      where: { user_id: userId },
    });

    if (!account) return { syncedEvents: 0, syncedEmails: 0 };

    let syncedEvents = 0;
    let syncedEmails = 0;

    // 1. Sincronizar eventos de Calendario
    if (account.calendar_sync_enabled) {
      try {
        // Purgar actividades locales que fueron eliminadas directamente en Outlook
        const userCalendarActivities = await this.prisma.crm_activities.findMany({
          where: {
            created_by: userId,
            exchange_item_id: { not: null },
            type: { in: ['REUNION', 'VIDEOLLAMADA', 'VISITA', 'TASK', 'EVENT'] },
          },
          select: { id: true, exchange_item_id: true, title: true, created_at: true },
        });

        const purged = await this.purgeDeletedCalendarActivities(userId, userCalendarActivities);
        syncedEvents += purged.length;

        const deltaResult = await this.graphService.getCalendarEventsDelta(userId, account.calendar_delta_token || undefined);
        if (deltaResult && deltaResult.events) {
          for (const ev of deltaResult.events) {
            if (await this.prospectOutlook.importRemote(userId, ev)) { syncedEvents++; continue; }
            if (/^\[(?:✓\s*)?dTS CRM Prospecto/i.test(ev.subject || '')) continue;
            if (ev['@removed']) {
              // Evento eliminado en Outlook: desvincular en lugar de borrar datos del CRM
              await this.prisma.crm_activities.updateMany({
                where: { exchange_item_id: ev.id },
                data: {
                  exchange_item_id: null,
                  exchange_sync_status: 'deleted_in_outlook',
                  updated_at: new Date(),
                },
              }).catch(() => null);
              continue;
            }

            // Extraer fecha y hora exacta devuelta por Microsoft Graph (con zona Europe/Madrid solicitada)
            let dueDate: Date | null = null;
            let timeScheduled: string | null = null;

            if (ev.start?.dateTime) {
              const dtString = String(ev.start.dateTime); // Formato típico: "YYYY-MM-DDTHH:mm:ss.0000000"
              const [datePart, timePart] = dtString.split('T');
              if (datePart) {
                dueDate = new Date(`${datePart}T00:00:00.000Z`);
              }
              if (timePart) {
                const hhmm = timePart.substring(0, 5);
                if (/^\d{2}:\d{2}$/.test(hhmm)) {
                  timeScheduled = hhmm;
                }
              }
            }

            const canonicalWebLink = `https://outlook.office.com/calendar/item/${encodeURIComponent(ev.id)}`;

            // 1. PRIORIDAD: Comprobar si la actividad YA EXISTE en el CRM (creada desde la app o ya sincronizada)
            const existingActivity = await this.prisma.crm_activities.findFirst({
              where: { exchange_item_id: ev.id },
            });

            if (existingActivity) {
              // Una lectura remota no confirma el envío de cambios locales.
              if (this.inFlightSyncs.has(existingActivity.id) || ['pending', 'failed', 'no_connection'].includes(existingActivity.exchange_sync_status || '')) continue;
              const completed = Boolean(existingActivity.is_completed || existingActivity.conclusions?.trim());
              const expectedCategory = completed ? 'dTS CRM - Completado' : 'dTS CRM';
              const crmManaged = (ev.categories || []).some((name: string) => name === 'dTS CRM' || name === 'dTS CRM - Completado')
                || /^\[(?:✓\s*)?dTS CRM/i.test(ev.subject || '');
              const categoryMismatch = crmManaged && !(ev.categories || []).includes(expectedCategory);
              // Limpiar prefijo dTS del título si viene modificado desde Outlook
              let cleanTitle = existingActivity.title;
              if (ev.subject && !ev.subject.startsWith('[dTS CRM') && !ev.subject.startsWith('[✓ dTS CRM')) {
                cleanTitle = ev.subject;
              }

              // Limpiar bodyPreview de Outlook para evitar que inyecte el boilerplate del CRM o líneas divisorias
              const cleanDesc = this.cleanOutlookBody(ev.bodyPreview, existingActivity.description);

              await this.prisma.crm_activities.update({
                where: { id: existingActivity.id },
                data: {
                  title: cleanTitle,
                  description: cleanDesc,
                  due_date: dueDate || existingActivity.due_date,
                  time_scheduled: timeScheduled !== null ? timeScheduled : existingActivity.time_scheduled,
                  location: ev.location?.displayName || existingActivity.location,
                  exchange_change_key: ev.changeKey || existingActivity.exchange_change_key,
                  exchange_web_link: canonicalWebLink,
                  ...(categoryMismatch ? { exchange_sync_status: 'out_of_sync' } : {}),
                  // Conservar la fecha del último envío confirmado al calendario.
                  updated_at: new Date(),
                },
              });
              syncedEvents++;
              continue;
            }

            // 2. Si NO EXISTÍA en el CRM: se trata de un nuevo evento creado directamente en Outlook.
            // Para importarlo como actividad comercial, requiere estar vinculado a un contacto por email
            const attendeeEmails: string[] = (ev.attendees || [])
              .map((att: any) => att.emailAddress?.address?.toLowerCase().trim())
              .filter(Boolean);

            if (attendeeEmails.length === 0) continue;

            const matchedContact = await this.prisma.contacts.findFirst({
              where: {
                email: { in: attendeeEmails, mode: 'insensitive' },
              },
            });

            if (!matchedContact) continue;

            const cleanNewDesc = this.cleanOutlookBody(ev.bodyPreview, null);

            await this.prisma.crm_activities.create({
              data: {
                client_id: matchedContact.client_id,
                contact_id: matchedContact.id,
                created_by: userId,
                type: 'REUNION',
                title: ev.subject || 'Reunión con cliente',
                description: cleanNewDesc,
                due_date: dueDate,
                time_scheduled: timeScheduled,
                location: ev.location?.displayName || null,
                exchange_item_id: ev.id,
                exchange_change_key: ev.changeKey,
                exchange_web_link: canonicalWebLink,
                exchange_sync_status: 'synced',
                exchange_last_synced_at: new Date(),
              },
            });
            syncedEvents++;
          }

          // Guardar delta token
          if (deltaResult.nextDeltaLink) {
            await this.prisma.user_exchange_accounts.update({
              where: { user_id: userId },
              data: {
                calendar_delta_token: deltaResult.nextDeltaLink,
                last_synced_at: new Date(),
              },
            });
          }
        }
      } catch (calError) {
        this.logger.error(`Error al sincronizar calendario desde Outlook para ${userId}:`, calError);
      }
    }

    if (account.calendar_sync_enabled) {
      const pending = await this.prisma.crm_activities.findMany({
        where: { created_by: userId, type: { in: ['EVENT', 'REUNION', 'VIDEOLLAMADA', 'VISITA', 'CALL', 'TASK'] },
          exchange_item_id: { not: null }, exchange_sync_status: { in: ['pending', 'failed', 'no_connection'] } },
        select: { id: true }, orderBy: { updated_at: 'asc' }, take: 20,
      });
      for (const activity of pending) await this.syncActivityToOutlook(activity.id);
    }

    // 2. Sincronizar y reconciliar únicamente los borradores pendientes de la app
    if (account.mail_sync_enabled) {
      try {
        const pendingDrafts = await this.prisma.crm_activities.findMany({
          where: {
            created_by: userId,
            type: 'EMAIL',
            exchange_sync_status: { in: ['draft', 'sent_pending', 'send_unconfirmed'] },
            exchange_immutable_id: { not: null },
            exchange_mailbox_id: { not: null },
            exchange_tenant_id: { not: null },
          },
          orderBy: [{ exchange_last_synced_at: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
          take: 25,
        });

        for (const draftAct of pendingDrafts) {
          // Historic drafts lack a verified immutable reference: never guess by recipient or date.
          if (!draftAct.exchange_immutable_id || !draftAct.exchange_mailbox_id || !draftAct.exchange_tenant_id) continue;
          const snapshot = (draftAct.attendees as any)?.emailAttachments;
          const captureAttachments = snapshot?.version === 1 && snapshot?.status === 'pending';
          const identity = captureAttachments
            ? await this.identities.prepare(userId, draftAct.exchange_immutable_id, 'restImmutableEntryId', true)
            : await this.identities.prepare(userId, draftAct.exchange_immutable_id, 'restImmutableEntryId');
          if (!identity.enabled) continue;
          const sameMailbox = identity.patch.exchange_mailbox_id === draftAct.exchange_mailbox_id
            && identity.patch.exchange_tenant_id === draftAct.exchange_tenant_id;
          if (identity.isDraft !== false || identity.patch.exchange_resolution_status !== 'resolved' || !sameMailbox) {
            // Rotate bounded batches; preserve references and never rebind a reconnected account.
            await this.prisma.crm_activities.updateMany({
              where: { id: draftAct.id, created_by: userId, type: 'EMAIL', exchange_sync_status: draftAct.exchange_sync_status, exchange_immutable_id: draftAct.exchange_immutable_id },
              data: { exchange_last_synced_at: new Date(), exchange_resolution_status: identity.patch.exchange_mailbox_id && !sameMailbox ? 'access_denied' : identity.patch.exchange_resolution_status },
            });
            continue;
          }
          const finalize = async (db: Pick<PrismaService, 'crm_activities' | '$executeRaw'>) => {
            const result = await db.crm_activities.updateMany({
              where: { id: draftAct.id, created_by: userId, type: 'EMAIL', exchange_sync_status: draftAct.exchange_sync_status, exchange_immutable_id: draftAct.exchange_immutable_id },
              data: { ...identity.patch, exchange_original_id_type: draftAct.exchange_original_id_type || identity.patch.exchange_original_id_type, exchange_web_link: identity.webLink, exchange_sync_status: 'synced', exchange_last_synced_at: new Date() },
            });
            if (result.count && captureAttachments) {
              // Atomic JSON-path update preserves category, quote and concurrent edits.
              const metadata = identity.attachmentMetadata || attachmentState('unavailable', 'graph');
              await db.$executeRaw`
                UPDATE public.crm_activities
                SET attendees = jsonb_set(COALESCE(attendees, '{}'::jsonb), '{emailAttachments}', ${JSON.stringify(metadata)}::jsonb, true)
                WHERE id = ${draftAct.id}::uuid AND created_by = ${userId}::uuid
                  AND type = 'EMAIL' AND exchange_immutable_id = ${draftAct.exchange_immutable_id}
                  AND exchange_sync_status = 'synced'
                  AND attendees->'emailAttachments'->>'status' = 'pending'
                  AND attendees->'emailAttachments'->>'version' = '1'
              `;
            }
            return result.count;
          };
          syncedEmails += captureAttachments ? await this.prisma.$transaction(finalize) : await finalize(this.prisma);
        }
      } catch (mailError) {
        this.logger.error(`Error al reconciliar borradores enviados para ${userId}:`, mailError);
      }
    }

    await this.prisma.user_exchange_accounts.update({
      where: { user_id: userId },
      data: { last_synced_at: new Date() },
    });

    return {
      syncedEvents,
      syncedEmails,
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Limpia el bodyPreview de Outlook para evitar inyectar encabezados boilerplate o líneas divisorias de guiones
   */
  private cleanOutlookBody(bodyPreview?: string | null, existingDesc?: string | null): string | null {
    if (!bodyPreview) return existingDesc || null;

    let text = bodyPreview;

    // Si contiene la división clásica de nuestro CRM: "________________________________"
    if (text.includes('________________________________')) {
      const parts = text.split('________________________________');
      // La descripción real del usuario está después de la línea divisoria
      let after = parts.slice(1).join('\n').trim();
      // Quitar posibles secciones de conclusiones
      after = after.replace(/Conclusiones:\s*[\s\S]*/i, '').trim();
      if (after) {
        return after;
      }
      return existingDesc || null;
    }

    // Si contiene el encabezado de dTS CRM
    if (text.includes('Actividad de CRM dTS Instruments')) {
      text = text.replace(/Actividad de CRM dTS Instruments/gi, '');
      text = text.replace(/Empresa:\s*[^\r\n]*/gi, '');
      text = text.replace(/Contacto:\s*[^\r\n]*/gi, '');
      text = text.replace(/[_\-═]{3,}/g, '');
      text = text.replace(/Conclusiones:\s*[\s\S]*/gi, '');
      text = text.trim();
      if (text) return text;
      return existingDesc || null;
    }

    // Si es un texto plano limpio modificado en Outlook
    const trimmed = text.trim();
    return trimmed || existingDesc || null;
  }
}

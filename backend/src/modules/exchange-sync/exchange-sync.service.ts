import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { CrmActivityType } from '@prisma/client';

@Injectable()
export class ExchangeSyncService {
  private readonly logger = new Logger(ExchangeSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphService: MicrosoftGraphService,
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
      },
    });

    return {
      isConnected: !!account,
      account: account || null,
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
        return;
      }

      const dateStr = activity.due_date.toISOString().split('T')[0];
      const attendees: { email: string; name?: string }[] = [];

      // Solo generar convocatoria/invitación de reunión por correo si es Videollamada o Reunión presencial
      // Las tareas (TASK), llamadas (CALL) y otros eventos (EVENT) son solo apuntes informativos en el calendario del comercial sin enviar correos al contacto
      const isMeetingWithInvite = activity.type === 'VIDEOLLAMADA' || activity.type === 'REUNION';
      if (isMeetingWithInvite && activity.contact?.email) {
        attendees.push({
          email: activity.contact.email,
          name: activity.contact.name,
        });
      }

      const isTeams = activity.type === 'VIDEOLLAMADA';
      const eventPrefix = `[dTS CRM - ${activity.type}]`;
      const clientOrContactName = activity.customer?.name || activity.contact?.name || 'Cliente';
      const fullTitle = `${eventPrefix} ${activity.title} (${clientOrContactName})`;

      let locationDisplay = activity.location || '';
      if (activity.type === 'VISITA' && !locationDisplay && activity.customer) {
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

      if (activity.exchange_item_id) {
        // Actualizar evento existente
        const updated = await this.graphService.updateCalendarEvent(activity.created_by, activity.exchange_item_id, {
          title: fullTitle,
          description: descriptionHtml,
          startDate: dateStr,
          timeScheduled: activity.time_scheduled || undefined,
          location: locationDisplay || undefined,
          attendees,
        });

        if (updated) {
          await this.prisma.crm_activities.update({
            where: { id: activity.id },
            data: {
              exchange_change_key: updated.changeKey,
              exchange_sync_status: 'synced',
              exchange_last_synced_at: new Date(),
            },
          });
        }
      } else {
        // Crear nuevo evento
        const created = await this.graphService.createCalendarEvent(activity.created_by, {
          title: fullTitle,
          description: descriptionHtml,
          startDate: dateStr,
          timeScheduled: activity.time_scheduled || undefined,
          isOnlineMeeting: isTeams,
          location: locationDisplay || undefined,
          attendees,
        });

        if (created) {
          await this.prisma.crm_activities.update({
            where: { id: activity.id },
            data: {
              exchange_item_id: created.id,
              exchange_change_key: created.changeKey,
              exchange_web_link: created.webLink,
              exchange_sync_status: 'synced',
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
    const createdActivity = await this.prisma.crm_activities.create({
      data: {
        client_id: resolvedClientId,
        contact_id: contactId || null,
        created_by: userId,
        type: 'EMAIL',
        title: subject,
        description: body,
        email: to.join(', '),
        due_date: new Date(),
        exchange_sync_status: 'synced',
        exchange_last_synced_at: new Date(),
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

    // 2. Registrar actividad de correo en CRM como borrador pendiente
    const createdActivity = await this.prisma.crm_activities.create({
      data: {
        client_id: resolvedClientId,
        contact_id: contactId || null,
        created_by: userId,
        type: 'EMAIL',
        title: subject,
        description: body,
        email: to.join(', '),
        due_date: new Date(),
        exchange_item_id: draft.id,
        exchange_web_link: draft.webLink,
        exchange_sync_status: 'draft',
        exchange_last_synced_at: new Date(),
      },
    });

    return {
      success: true,
      draft,
      activity: createdActivity,
    };
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
        const deltaResult = await this.graphService.getCalendarEventsDelta(userId, account.calendar_delta_token || undefined);
        if (deltaResult && deltaResult.events) {
          for (const ev of deltaResult.events) {
            if (ev['@removed']) {
              // Evento eliminado en Outlook
              await this.prisma.crm_activities.deleteMany({
                where: { exchange_item_id: ev.id },
              }).catch(() => null);
              continue;
            }

            // Extraer correos de asistentes para relacionar con contactos de CRM
            const attendeeEmails: string[] = (ev.attendees || [])
              .map((att: any) => att.emailAddress?.address?.toLowerCase().trim())
              .filter(Boolean);

            if (attendeeEmails.length === 0) continue;

            // Buscar si alguno coincide con contactos existentes
            const matchedContact = await this.prisma.contacts.findFirst({
              where: {
                email: { in: attendeeEmails, mode: 'insensitive' },
              },
            });

            if (!matchedContact) continue;

            const startTime = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
            const timeScheduled = startTime ? startTime.toTimeString().substring(0, 5) : null;
            const dueDate = startTime ? new Date(startTime.toISOString().split('T')[0]) : null;

            // Comprobar si ya existe
            const existingActivity = await this.prisma.crm_activities.findFirst({
              where: { exchange_item_id: ev.id },
            });

            if (existingActivity) {
              await this.prisma.crm_activities.update({
                where: { id: existingActivity.id },
                data: {
                  title: ev.subject || existingActivity.title,
                  description: ev.bodyPreview || existingActivity.description,
                  due_date: dueDate || existingActivity.due_date,
                  time_scheduled: timeScheduled || existingActivity.time_scheduled,
                  location: ev.location?.displayName || existingActivity.location,
                  exchange_change_key: ev.changeKey,
                  exchange_sync_status: 'synced',
                  exchange_last_synced_at: new Date(),
                  updated_at: new Date(),
                },
              });
            } else {
              await this.prisma.crm_activities.create({
                data: {
                  client_id: matchedContact.client_id,
                  contact_id: matchedContact.id,
                  created_by: userId,
                  type: 'REUNION',
                  title: ev.subject || 'Reunión con cliente',
                  description: ev.bodyPreview || null,
                  due_date: dueDate,
                  time_scheduled: timeScheduled,
                  location: ev.location?.displayName || null,
                  exchange_item_id: ev.id,
                  exchange_change_key: ev.changeKey,
                  exchange_web_link: ev.webLink,
                  exchange_sync_status: 'synced',
                  exchange_last_synced_at: new Date(),
                },
              });
              syncedEvents++;
            }
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

    // 2. Sincronizar y reconciliar únicamente los borradores pendientes de la app
    if (account.mail_sync_enabled) {
      try {
        const pendingDrafts = await this.prisma.crm_activities.findMany({
          where: {
            created_by: userId,
            type: 'EMAIL',
            exchange_sync_status: 'draft',
          },
          include: { contact: true },
        });

        if (pendingDrafts.length > 0) {
          const recentSent = await this.graphService.getRecentSentMessages(userId);

          if (recentSent.length > 0) {
            for (const draftAct of pendingDrafts) {
              const targetEmail = (draftAct.contact?.email || draftAct.email || '').toLowerCase().trim();
              const draftDate = draftAct.created_at ? new Date(draftAct.created_at) : new Date();

              const matchingSent = recentSent.find((msg: any) => {
                const toRecipients = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address?.toLowerCase().trim());
                const ccRecipients = (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address?.toLowerCase().trim());
                const allRecipients = [...toRecipients, ...ccRecipients];
                const matchesRecipient = targetEmail && allRecipients.includes(targetEmail);
                const sentDate = msg.sentDateTime ? new Date(msg.sentDateTime) : null;
                const isSentAfterDraft = sentDate && (sentDate.getTime() >= draftDate.getTime() - 120000); // 2 minutos de margen

                return matchesRecipient && isSentAfterDraft;
              });

              if (matchingSent) {
                await this.prisma.crm_activities.update({
                  where: { id: draftAct.id },
                  data: {
                    title: matchingSent.subject || draftAct.title,
                    description: matchingSent.bodyPreview ? matchingSent.bodyPreview.substring(0, 1000) : draftAct.description,
                    exchange_item_id: matchingSent.id,
                    exchange_web_link: matchingSent.webLink,
                    exchange_sync_status: 'synced',
                    exchange_last_synced_at: new Date(),
                  },
                });
                syncedEmails++;
              }
            }
          }
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
}

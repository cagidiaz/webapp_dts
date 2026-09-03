import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface CalendarEventPayload {
  title: string;
  description?: string;
  startDate: string; // ISO String o YYYY-MM-DD
  endDate?: string;
  timeScheduled?: string; // HH:mm
  isAllDay?: boolean;
  location?: string;
  isOnlineMeeting?: boolean;
  attendees?: { email: string; name?: string }[];
  categories?: string[];
}

export interface SendMailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  saveToSentItems?: boolean;
}

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly defaultRedirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.clientId = this.configService.get<string>('AZURE_CLIENT_ID') || process.env.AZURE_CLIENT_ID || '';
    this.clientSecret = this.configService.get<string>('AZURE_CLIENT_SECRET') || process.env.AZURE_CLIENT_SECRET || '';
    this.tenantId = this.configService.get<string>('AZURE_TENANT_ID') || process.env.AZURE_TENANT_ID || 'common';
    this.defaultRedirectUri = this.configService.get<string>('EXCHANGE_REDIRECT_URI') || process.env.EXCHANGE_REDIRECT_URI || 'http://localhost:5173/crm?exchange_auth=callback';
  }

  /**
   * Genera la URL de autorización OAuth 2.0 para que el empleado conecte su cuenta de Microsoft 365 / Exchange.
   */
  getAuthorizationUrl(userId: string, customRedirectUri?: string): string {
    const redirectUri = customRedirectUri || this.defaultRedirectUri;
    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'User.Read',
      'Calendars.ReadWrite',
      'MailboxSettings.ReadWrite',
      'Mail.ReadWrite',
      'Mail.Send',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: scopes,
      state: userId,
      prompt: 'consent',
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Intercambia el código de autorización por tokens de acceso y actualización (OAuth 2.0 PKCE / Code Grant).
   */
  async acquireTokenByCode(code: string, customRedirectUri?: string) {
    const redirectUri = customRedirectUri || this.defaultRedirectUri;
    const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

    const bodyParams = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access User.Read Calendars.ReadWrite MailboxSettings.ReadWrite Mail.ReadWrite Mail.Send',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Error al canjear código por tokens de Microsoft: ${errorText}`);
      let detail = errorText;
      try {
        const json = JSON.parse(errorText);
        detail = json.error_description || json.error || errorText;
      } catch {}
      throw new BadRequestException(`No se pudo autenticar con Microsoft Exchange: ${detail}`);
    }

    const tokenData = await response.json();

    // Obtener información del perfil del usuario de Microsoft Graph
    const userProfileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    let msUserProfile = { id: '', mail: '', userPrincipalName: '', displayName: '' };
    if (userProfileResponse.ok) {
      msUserProfile = await userProfileResponse.json();
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    return {
      accessToken: tokenData.access_token as string,
      refreshToken: tokenData.refresh_token as string,
      expiresAt,
      email: msUserProfile.mail || msUserProfile.userPrincipalName,
      microsoftUserId: msUserProfile.id,
      displayName: msUserProfile.displayName,
    };
  }

  /**
   * Obtiene un access_token válido para el usuario, renovándolo automáticamente si ha expirado.
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    const account = await this.prisma.user_exchange_accounts.findUnique({
      where: { user_id: userId },
    });

    if (!account) {
      return null;
    }

    // Si el token expira en menos de 5 minutos, refrescarlo
    const fiveMinutes = 5 * 60 * 1000;
    const isExpired = new Date(account.token_expires_at).getTime() - Date.now() < fiveMinutes;

    if (!isExpired) {
      return account.access_token;
    }

    // Refrescar token
    try {
      this.logger.log(`Refrescando access_token de Microsoft para el usuario: ${userId}`);
      const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

      const bodyParams = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        scope: 'openid profile email offline_access User.Read Calendars.ReadWrite MailboxSettings.ReadWrite Mail.ReadWrite Mail.Send',
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error al refrescar token de Microsoft: ${errorText}`);
        return null;
      }

      const tokenData = await response.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      await this.prisma.user_exchange_accounts.update({
        where: { user_id: userId },
        data: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || account.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date(),
        },
      });

      return tokenData.access_token;
    } catch (err) {
      this.logger.error(`Excepción al refrescar token de Microsoft para ${userId}:`, err);
      return null;
    }
  }

  /**
   * Asegura que la categoría maestra "dTS CRM" esté creada en Outlook con el color corporativo (preset7 - Azul dTS)
   * para que los eventos sincronizados aparezcan coloreados y claramente diferenciados en el calendario de Outlook.
   */
  async ensureDtsCategory(userId: string): Promise<void> {
    const categoryName = 'dTS CRM';
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return;

    try {
      const listRes = await fetch('https://graph.microsoft.com/v1.0/me/outlook/masterCategories', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (listRes.ok) {
        const data = await listRes.json();
        const existing = (data.value || []).find(
          (c: any) => c.displayName?.toLowerCase().trim() === categoryName.toLowerCase().trim(),
        );

        if (!existing) {
          const createRes = await fetch('https://graph.microsoft.com/v1.0/me/outlook/masterCategories', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              displayName: categoryName,
              color: 'preset7', // Color azul corporativo dTS (#003E51)
            }),
          });
          if (createRes.ok) {
            this.logger.log(`Categoría "${categoryName}" (preset7 - Azul dTS) registrada exitosamente en Outlook para ${userId}`);
          }
        } else if (existing && existing.color !== 'preset7') {
          // Si existía con otro preset (ej. preset5), actualizar al azul corporativo dTS
          await fetch(`https://graph.microsoft.com/v1.0/me/outlook/masterCategories/${existing.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ color: 'preset7' }),
          });
          this.logger.log(`Categoría "${categoryName}" actualizada a preset7 (Azul dTS) para ${userId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`No se pudo asegurar la categoría de Outlook para ${userId}:`, error);
    }
  }

  /**
   * Crea un evento en el calendario de Outlook del usuario mediante Microsoft Graph.
   */
  async createCalendarEvent(userId: string, eventData: CalendarEventPayload) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) {
      this.logger.warn(`No hay cuenta de Exchange conectada para el usuario ${userId}`);
      return null;
    }

    // Asegurar categoría maestra de color en Outlook
    await this.ensureDtsCategory(userId);

    let startDateTime = eventData.startDate;
    let endDateTime = eventData.endDate || eventData.startDate;

    if (eventData.timeScheduled && !startDateTime.includes('T')) {
      startDateTime = `${eventData.startDate}T${eventData.timeScheduled}:00`;
      // Por defecto 1 hora de duración si no se especifica fin
      const [h, m] = eventData.timeScheduled.split(':').map(Number);
      const endHour = (h + 1).toString().padStart(2, '0');
      endDateTime = `${eventData.startDate}T${endHour}:${m.toString().padStart(2, '0')}:00`;
    } else if (!startDateTime.includes('T')) {
      startDateTime = `${eventData.startDate}T09:00:00`;
      endDateTime = `${eventData.startDate}T10:00:00`;
    }

    const payload: any = {
      subject: eventData.title,
      categories: eventData.categories && eventData.categories.length > 0 ? eventData.categories : ['dTS CRM'],
      body: {
        contentType: 'HTML',
        content: eventData.description || `<p>${eventData.title}</p>`,
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Madrid',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Europe/Madrid',
      },
      isAllDay: eventData.isAllDay || false,
    };

    if (eventData.location) {
      payload.location = {
        displayName: eventData.location,
      };
    }

    if (eventData.isOnlineMeeting) {
      payload.isOnlineMeeting = true;
      payload.onlineMeetingProvider = 'teamsForBusiness';
    }

    if (eventData.attendees && eventData.attendees.length > 0) {
      payload.attendees = eventData.attendees.map((att) => ({
        emailAddress: {
          address: att.email,
          name: att.name || att.email,
        },
        type: 'required',
      }));
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Error al crear evento en Microsoft Graph: ${errorText}`);
      throw new InternalServerErrorException(`Error de Microsoft Graph: ${errorText}`);
    }

    const createdEvent = await response.json();
    return {
      id: createdEvent.id as string,
      changeKey: createdEvent.changeKey as string,
      webLink: createdEvent.webLink as string,
      onlineMeetingUrl: createdEvent.onlineMeeting?.joinUrl as string | undefined,
    };
  }

  /**
   * Actualiza un evento existente en el calendario de Outlook.
   */
  async updateCalendarEvent(userId: string, eventId: string, eventData: Partial<CalendarEventPayload>) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return null;

    // Asegurar categoría maestra de color en Outlook
    await this.ensureDtsCategory(userId);

    const payload: any = {};
    if (eventData.categories !== undefined) {
      payload.categories = eventData.categories;
    } else {
      payload.categories = ['dTS CRM'];
    }
    if (eventData.title !== undefined) payload.subject = eventData.title;
    if (eventData.description !== undefined) {
      payload.body = {
        contentType: 'HTML',
        content: eventData.description,
      };
    }

    if (eventData.startDate) {
      let startDateTime = eventData.startDate;
      let endDateTime = eventData.endDate || eventData.startDate;

      if (eventData.timeScheduled && !startDateTime.includes('T')) {
        startDateTime = `${eventData.startDate}T${eventData.timeScheduled}:00`;
        const [h, m] = eventData.timeScheduled.split(':').map(Number);
        const endHour = (h + 1).toString().padStart(2, '0');
        endDateTime = `${eventData.startDate}T${endHour}:${m.toString().padStart(2, '0')}:00`;
      }

      payload.start = { dateTime: startDateTime, timeZone: 'Europe/Madrid' };
      payload.end = { dateTime: endDateTime, timeZone: 'Europe/Madrid' };
    }

    if (eventData.location !== undefined) {
      payload.location = { displayName: eventData.location };
    }

    if (eventData.attendees !== undefined) {
      payload.attendees = eventData.attendees.map((att) => ({
        emailAddress: { address: att.email, name: att.name || att.email },
        type: 'required',
      }));
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Error al actualizar evento ${eventId} en Microsoft Graph: ${errorText}`);
      return null;
    }

    const updatedEvent = await response.json();
    return {
      id: updatedEvent.id as string,
      changeKey: updatedEvent.changeKey as string,
      webLink: updatedEvent.webLink as string,
    };
  }

  /**
   * Elimina un evento del calendario de Outlook.
   */
  async deleteCalendarEvent(userId: string, eventId: string) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return null;

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      this.logger.error(`Error al eliminar evento ${eventId} en Microsoft Graph: ${errorText}`);
      return false;
    }

    return true;
  }

  /**
   * Comprueba si un evento específico sigue existiendo en el calendario de Outlook del usuario.
   * Devuelve { exists: false } si Microsoft Graph devuelve 404 (eliminado en Outlook).
   */
  async checkCalendarEventExists(userId: string, eventId: string): Promise<{ exists: boolean; isCancelled?: boolean }> {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return { exists: true };

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}?$select=id,isCancelled`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 404) {
        return { exists: false };
      }

      if (response.ok) {
        const data = await response.json();
        return { exists: true, isCancelled: !!data.isCancelled };
      }

      return { exists: true };
    } catch {
      return { exists: true };
    }
  }

  /**
   * Envía un correo electrónico a través de la cuenta de Exchange del usuario (quedando archivado en Enviados).
   */
  async sendMail(userId: string, mailPayload: SendMailPayload) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) {
      throw new BadRequestException('Tu cuenta de Microsoft 365 / Exchange no está conectada. Conéctala para enviar correos.');
    }

    const message: any = {
      subject: mailPayload.subject,
      body: {
        contentType: mailPayload.isHtml ? 'HTML' : 'Text',
        content: mailPayload.body,
      },
      toRecipients: mailPayload.to.map((email) => ({
        emailAddress: { address: email },
      })),
    };

    if (mailPayload.cc && mailPayload.cc.length > 0) {
      message.ccRecipients = mailPayload.cc.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    if (mailPayload.bcc && mailPayload.bcc.length > 0) {
      message.bccRecipients = mailPayload.bcc.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    const payload = {
      message,
      saveToSentItems: mailPayload.saveToSentItems !== false,
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Error al enviar correo en Microsoft Graph: ${errorText}`);
      throw new InternalServerErrorException(`No se pudo enviar el correo desde Exchange: ${errorText}`);
    }

    return { success: true };
  }

  /**
   * Crea un borrador de correo electrónico en la carpeta de Borradores de Exchange y devuelve el webLink de Outlook.
   */
  async createDraftMail(userId: string, mailPayload: SendMailPayload) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) {
      throw new BadRequestException('Tu cuenta de Microsoft 365 / Exchange no está conectada. Conéctala para preparar borradores en Outlook.');
    }

    const message: any = {
      subject: mailPayload.subject,
      body: {
        contentType: mailPayload.isHtml ? 'HTML' : 'Text',
        content: mailPayload.body,
      },
      toRecipients: mailPayload.to.map((email) => ({
        emailAddress: { address: email },
      })),
    };

    if (mailPayload.cc && mailPayload.cc.length > 0) {
      message.ccRecipients = mailPayload.cc.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    if (mailPayload.bcc && mailPayload.bcc.length > 0) {
      message.bccRecipients = mailPayload.bcc.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Error al crear borrador en Microsoft Graph: ${errorText}`);
      throw new InternalServerErrorException(`No se pudo crear el borrador en Exchange: ${errorText}`);
    }

    const createdDraft = await response.json();
    return {
      id: createdDraft.id as string,
      webLink: createdDraft.webLink as string,
      conversationId: createdDraft.conversationId as string,
      subject: createdDraft.subject as string,
    };
  }

  /**
   * Obtiene eventos recientes o deltas del calendario del usuario para sincronización hacia el CRM.
   */
  async getCalendarEventsDelta(userId: string, deltaTokenOrUrl?: string) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return null;

    let url = deltaTokenOrUrl;
    if (!url) {
      // Sincronizar desde hace 30 días hasta dentro de 90 días
      const startDateTime = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const endDateTime = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
      url = `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Madrid", odata.maxpagesize=50',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Error en delta de calendario de Microsoft Graph: ${errorText}`);
      return null;
    }

    const data = await response.json();
    return {
      events: (data.value || []) as any[],
      nextDeltaLink: (data['@odata.deltaLink'] || data['@odata.nextLink']) as string | undefined,
    };
  }

  /**
   * Obtiene mensajes recientes de las carpetas de Entrada y Enviados para sincronización con contactos del CRM.
   */
  /**
   * Obtiene mensajes recientes de las carpetas de Entrada y Enviados para sincronización con contactos del CRM.
   */
  async getRecentMessages(userId: string) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return [];

    // Consultar los últimos 40 correos recibidos y enviados
    const url = `https://graph.microsoft.com/v1.0/me/messages?$top=40&$select=id,conversationId,subject,bodyPreview,receivedDateTime,sentDateTime,from,toRecipients,ccRecipients,webLink&$orderby=receivedDateTime desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      this.logger.warn(`Error al consultar mensajes recientes de Graph para ${userId}`);
      return [];
    }

    const data = await response.json();
    return (data.value || []) as any[];
  }

  /**
   * Obtiene los mensajes enviados recientemente desde la carpeta 'sentitems' de Microsoft 365.
   */
  async getRecentSentMessages(userId: string) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) return [];

    const url = `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=30&$select=id,conversationId,subject,bodyPreview,sentDateTime,toRecipients,ccRecipients,webLink&$orderby=sentDateTime desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      this.logger.warn(`Error al consultar mensajes enviados en sentitems para ${userId}`);
      return [];
    }

    const data = await response.json();
    return (data.value || []) as any[];
  }
}

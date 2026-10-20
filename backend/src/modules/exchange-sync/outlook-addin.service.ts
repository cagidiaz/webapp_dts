import { normalizeAttachments } from './email-attachments';
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OfferSourceContext } from '../quotes/offer-source-context';
import { loadOfferContacts } from '../quotes/offer-contacts';
import { EmailIdentityService } from './email-identity.service';
import { OutlookAddinAccessService } from './outlook-addin-access.service';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsIn, IsObject } from 'class-validator';

export class EmailLookupDto {
  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @IsOptional() @IsIn(['ewsId','restId','restImmutableEntryId'])
  itemIdType?: 'ewsId' | 'restId' | 'restImmutableEntryId';

  @IsString()
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsArray()
  @IsOptional()
  toEmails?: string[];

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  itemId?: string;
}

export class LogEmailDto {
  @IsOptional() @IsObject()
  emailAttachments?: object;

  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @IsOptional() @IsIn(['ewsId','restId','restImmutableEntryId'])
  itemIdType?: 'ewsId' | 'restId' | 'restImmutableEntryId';

  @IsString()
  @IsNotEmpty()
  exchangeItemId: string;

  @IsString()
  @IsOptional()
  exchangeWebLink?: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  sentDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(['INCOMING', 'OUTGOING'])
  direction?: 'INCOMING' | 'OUTGOING';

  @IsString()
  @IsOptional()
  interlocutorEmail?: string;

  @IsString()
  @IsOptional()
  @IsIn([
    'PETICION_OFERTA',
    'OFERTA_PROVEEDOR',
    'REVISION_OFERTA',
    'NEGOCIACION',
    'CIERRE_ACEPTACION',
    'ACEPTACION',
    'TECNICA',
    'POSTVENTA',
    'GENERAL',
  ])
  categoryTag?:
    | 'PETICION_OFERTA'
    | 'OFERTA_PROVEEDOR'
    | 'REVISION_OFERTA'
    | 'NEGOCIACION'
    | 'CIERRE_ACEPTACION'
    | 'ACEPTACION'
    | 'TECNICA'
    | 'POSTVENTA'
    | 'GENERAL';

  @IsString()
  @IsOptional()
  quoteDocumentNo?: string;

  @IsBoolean()
  @IsOptional()
  cleanBody?: boolean;
}

@Injectable()
export class OutlookAddinService {
  private readonly logger = new Logger(OutlookAddinService.name);

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly identities: EmailIdentityService, private readonly access: OutlookAddinAccessService) {}

  /**
   * Limpia firmas corporativas pesadas, separadores de citas y cláusulas legales / RGPD.
   */
  cleanEmailBody(rawBody: string): string {
    if (!rawBody) return '';

    let text = rawBody;

    // Normalizar saltos de línea y entidades HTML básicas si viniesen
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = text.replace(/&nbsp;/gi, ' ');

    // 1. Cortar cláusulas legales de confidencialidad, protección de datos y RGPD (español e inglés)
    const rgpdPatterns = [
      /\n\s*(?:--\s*\n)?\s*(?:De conformidad con lo dispuesto|En cumplimiento de la normativa|En virtud de lo establecido|Aviso Legal|AVISO LEGAL|PROTECCIÓN DE DATOS|Protección de Datos|Cláusula de Confidencialidad|Información básica sobre protección de datos)[\s\S]*$/i,
      /\n\s*(?:Este mensaje y sus archivos adjuntos son confidenciales|Este correo y sus anexos pueden contener información|El contenido de este correo electrónico es confidencial|Este mensaje se dirige exclusivamente a su destinatario|La información contenida en este e-mail es confidencial)[\s\S]*$/i,
      /\n\s*(?:Si usted no es el destinatario indicado|Si ha recibido este mensaje por error|If you are not the intended recipient|This email and any attachments are confidential|The information contained in this email is confidential|Confidentiality Notice:)[\s\S]*$/i,
      /\n\s*(?:Before printing, think about environmental responsibility|Antes de imprimir este correo piense si es necesario|Por favor, considere el medio ambiente antes de imprimir)[\s\S]*$/i,
    ];

    for (const pattern of rgpdPatterns) {
      text = text.replace(pattern, '');
    }

    // 2. Cortar citas previas extensas de Outlook ("De: ... Enviado el: ...") para conservar el mensaje actual
    const replyHeaders = [
      /\n\s*_{8,}[\s\S]*$/,
      /\n\s*-{8,}[\s\S]*$/,
      /\n\s*De:\s+.+?\n(?:Enviado el|Fecha):\s+.+?\n(?:Para|Asunto):[\s\S]*$/i,
      /\n\s*From:\s+.+?\n(?:Sent|Date):\s+.+?\n(?:To|Subject):[\s\S]*$/i,
      /\n\s*El\s+.+?,\s+.+?\sescribió:[\s\S]*$/i,
      /\n\s*On\s+.+?,\s+.+?\swrote:[\s\S]*$/i,
    ];

    for (const header of replyHeaders) {
      text = text.replace(header, '');
    }

    // 3. Cortar firmas estándar tipo "-- \nNombre..." o "Atentamente,\n..." si van seguidas de datos de contacto
    const signaturePatterns = [
      /\n\s*--\s*\n[\s\S]*$/,
      /\n\s*_{3,}\s*\n[\s\S]*$/,
    ];

    for (const sig of signaturePatterns) {
      text = text.replace(sig, '');
    }

    // 4. Reducir saltos de línea consecutivos a máximo 2
    text = text.replace(/\n{3,}/g, '\n\n');

    // 5. Limpiar espacios en blanco excesivos y limitar tamaño
    text = text.trim();
    if (text.length > 4000) {
      text = text.substring(0, 4000) + '... [Texto recortado para optimizar almacenamiento en CRM]';
    }

    return text;
  }

  /**
   * Busca contactos, clientes, ofertas abiertas y estado previo de registro para el correo actual.
   */
  async lookup(params: EmailLookupDto, userId: string) {
    const { userEmail, fromEmail, toEmails, itemId } = params;

    // 1. Identificar usuario del CRM
    const actor = await this.access.actor(userId, userEmail);
    const userProfile = actor.profile;

    // 2. Verificar si este correo ya está registrado en crm_activities
    let isAlreadyLogged = false;
    let existingActivity: any = null;

    const identity = itemId ? await this.identities.prepare(userId, itemId, params.itemIdType || 'ewsId') : null;
    if (itemId) {
      existingActivity = await this.prisma.crm_activities.findFirst({
        where: { type: 'EMAIL', created_by: userId, customer: actor.customerScope, OR: [
          ...(identity?.patch.exchange_immutable_id ? [{ exchange_tenant_id: identity.patch.exchange_tenant_id, exchange_mailbox_id: identity.patch.exchange_mailbox_id, exchange_immutable_id: identity.patch.exchange_immutable_id }] : []),
          { exchange_item_id: itemId, exchange_immutable_id: null },
        ] },
        include: {
          customer: { select: { client_id: true, name: true } },
          contact: { select: { id: true, name: true, email: true } },
        },
      });
      if (existingActivity) {
        isAlreadyLogged = true;
      }
    }

    // 3. Determinar lista de correos candidatos (excluyendo al propio usuario y dominio interno si aplica)
    const normalizedUserEmail = userEmail.toLowerCase().trim();
    const candidateEmails: string[] = [];

    const safeFromEmail = (fromEmail || '').toLowerCase().trim();
    const isFromInternal = safeFromEmail === normalizedUserEmail || safeFromEmail.endsWith('@dtsinstruments.com');

    if (!isFromInternal && safeFromEmail) {
      candidateEmails.push(safeFromEmail);
    }

    for (const to of toEmails || []) {
      const cleanTo = to.toLowerCase().trim();
      if (cleanTo !== normalizedUserEmail && !cleanTo.endsWith('@dtsinstruments.com') && !candidateEmails.includes(cleanTo)) {
        candidateEmails.push(cleanTo);
      }
    }

    // Si todos eran internos, incluir el fromEmail de todos modos
    if (candidateEmails.length === 0 && fromEmail) {
      candidateEmails.push(fromEmail.toLowerCase().trim());
    }

    // 4. Buscar coincidencias en la tabla contacts
    const matchedContacts = await this.prisma.contacts.findMany({
      where: {
        email: { in: candidateEmails, mode: 'insensitive' },
        customer: actor.customerScope,
      },
      include: {
        customer: true,
      },
      take: 5,
    });

    let matchedContact: any = null;
    let matchedCustomer: any = null;

    if (matchedContacts.length > 0) {
      matchedContact = matchedContacts[0];
      matchedCustomer = matchedContact.customer;
    }

    // Si no hubo coincidencia directa en contacts, intentar buscar por dominio en customers
    if (!matchedCustomer && candidateEmails.length > 0) {
      const emailDomain = candidateEmails[0].split('@')[1];
      if (emailDomain && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es'].includes(emailDomain)) {
        matchedCustomer = await this.prisma.customers.findFirst({
          where: {
            ...actor.customerScope,
            OR: [
              { email: { contains: emailDomain, mode: 'insensitive' } },
              { home_page: { contains: emailDomain, mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    // 5. Si hay cliente identificado, buscar ofertas abiertas para vincular
    let openQuotes: any[] = [];
    if (matchedCustomer) {
      const quotes = await this.prisma.sales_quotes.findMany({
        where: {
          customer_no: matchedCustomer.client_id,
          ...actor.customerScope,
        },
        include: {
          sales_quotes_crm: true,
        },
        orderBy: { document_date: 'desc' },
        take: 8,
      });

      openQuotes = quotes.map((q) => {
        const crm = q.sales_quotes_crm;
        return {
          document_no: q.document_no,
          document_date: q.document_date,
          amount: Number(q.amount || 0),
          estado: crm?.estado_oferta || 'abierta',
          probabilidad: crm?.probabilidad_exito ? Number(crm.probabilidad_exito) : 10,
          proxima_accion: crm?.proxima_accion || null,
        };
      });
    }

    return {
      isAlreadyLogged,
      existingActivity: existingActivity
        ? {
            id: existingActivity.id,
            title: existingActivity.title,
            createdAt: existingActivity.created_at,
            clientName: existingActivity.customer?.name,
            contactName: existingActivity.contact?.name,
          }
        : null,
      matchedContact: matchedContact
        ? {
            id: matchedContact.id,
            name: matchedContact.name,
            email: matchedContact.email,
            jobTitle: matchedContact.job_title,
            clientId: matchedContact.client_id,
          }
        : null,
      matchedCustomer: matchedCustomer
        ? {
            clientId: matchedCustomer.client_id,
            name: matchedCustomer.name,
            city: matchedCustomer.city,
            salespersonCode: matchedCustomer.salesperson_code,
          }
        : null,
      openQuotes,
      detectedInterlocutors: candidateEmails,
      isOutgoing: isFromInternal,
      userFound: !!userProfile,
    };
  }

  /**
   * Registra el correo en dTS CRM (crm_activities y opcionalmente en sales_quote_activities).
   */
  async logEmail(params: LogEmailDto, userId: string) {
    const {
      userEmail,
      exchangeItemId,
      exchangeWebLink,
      contactId,
      clientId,
      subject,
      body,
      sentDate,
      direction = 'INCOMING',
      categoryTag = 'PETICION_OFERTA',
      quoteDocumentNo,
      cleanBody = true,
    } = params;

    // 1. Validar usuario creador
    const actor = await this.access.actor(userId, userEmail);
    const userProfile = actor.profile;

    if (!userProfile) {
      throw new BadRequestException(`No se encontró un perfil de usuario asociado al correo ${userEmail}`);
    }

    // 2. Resolver cliente y contacto
    let resolvedClientId = clientId;
    let resolvedContactId = contactId;

    if (resolvedContactId && !resolvedClientId) {
      const contact = await this.prisma.contacts.findUnique({
        where: { id: resolvedContactId },
      });
      if (contact) {
        resolvedClientId = contact.client_id;
      }
    }

    if (!resolvedClientId) {
      throw new BadRequestException('Se requiere asociar el correo a un cliente de dTS Instruments.');
    }

    await this.access.company(userId, resolvedClientId);
    if (resolvedContactId && !await this.prisma.contacts.findFirst({ where: { id: resolvedContactId, client_id: resolvedClientId }, select: { id: true } })) throw new BadRequestException('El contacto no pertenece a la empresa seleccionada.');
    if (quoteDocumentNo && !await this.prisma.sales_quotes.findFirst({ where: { document_no: quoteDocumentNo, customer_no: resolvedClientId, ...actor.customerScope }, select: { id: true } })) throw new BadRequestException('La oferta no pertenece a la empresa o cartera seleccionada.');
    const identity = await this.identities.prepare(userId, exchangeItemId, params.itemIdType || 'ewsId');

    // 3. Comprobar duplicidad dentro del buzón y la actividad comercial
    if (exchangeItemId) {
      const existing = await this.prisma.crm_activities.findFirst({
        where: { type: 'EMAIL', created_by: userId, client_id: resolvedClientId, contact_id: resolvedContactId || null, OR: [
          ...(identity.patch.exchange_immutable_id ? [{ exchange_tenant_id: identity.patch.exchange_tenant_id, exchange_mailbox_id: identity.patch.exchange_mailbox_id, exchange_immutable_id: identity.patch.exchange_immutable_id }] : []),
          { exchange_item_id: exchangeItemId, exchange_immutable_id: null },
        ] },
      });
      if (existing) {
        return {
          success: true,
          alreadyExisted: true,
          activity: existing,
          message: 'El correo ya se encontraba registrado en el CRM.',
        };
      }
    }

    // 4. Limpiar cuerpo si está habilitado
    const rawBody = body || '';
    const processedBody = cleanBody ? this.cleanEmailBody(rawBody) : rawBody;

    // 5. Etiqueta de tipología comercial y dirección
    const isOutgoing = direction === 'OUTGOING';
    const directionBadge = isOutgoing ? '📤 Enviado' : '📥 Recibido';

    const tagLabels: Record<string, string> = {
      PETICION_OFERTA: '📋 Petición oferta',
      OFERTA_PROVEEDOR: '📦 Oferta proveedor',
      REVISION_OFERTA: '📝 Revisión oferta',
      NEGOCIACION: '💬 Negociación',
      CIERRE_ACEPTACION: '📄 Cierre / Aceptación',
      // Retrocompatibilidad
      ACEPTACION: '📄 Cierre / Aceptación',
      TECNICA: '⚙️ Especificación Técnica',
      POSTVENTA: '⚠️ Incidencia / Postventa',
      GENERAL: '✉️ Correo Comercial',
    };

    const prefix = (categoryTag && tagLabels[categoryTag]) || '✉️ Correo';
    const formattedTitle = `[${directionBadge} · ${prefix}] ${subject || '(Sin Asunto)'}`;

    const activityDate = sentDate ? new Date(sentDate) : new Date();
    const hours = String(activityDate.getHours()).padStart(2, '0');
    const minutes = String(activityDate.getMinutes()).padStart(2, '0');
    const timeScheduled = `${hours}:${minutes}`;

    // Resolver correo del cliente (interlocutor) a guardar
    let emailToSave = params.interlocutorEmail;
    if (!emailToSave && resolvedContactId) {
      const contact = await this.prisma.contacts.findUnique({
        where: { id: resolvedContactId },
        select: { email: true },
      });
      emailToSave = contact?.email || undefined;
    }

    // 6. Insertar en crm_activities
    const createdActivity = await this.prisma.crm_activities.create({
      data: {
        client_id: resolvedClientId,
        contact_id: resolvedContactId || null,
        created_by: userProfile.id,
        type: 'EMAIL',
        title: formattedTitle,
        description: processedBody || null,
        due_date: activityDate,
        time_scheduled: timeScheduled,
        is_completed: true,
        email: emailToSave || null,
        exchange_item_id: exchangeItemId || null,
        exchange_web_link: identity.enabled ? identity.webLink || null : exchangeWebLink || null,
        ...identity.patch,
        exchange_sync_status: 'synced',
        exchange_last_synced_at: new Date(),
        attendees: {
          ...(params.emailAttachments !== undefined ? { emailAttachments: normalizeAttachments(params.emailAttachments, 'office') } : {}),
          ...(quoteDocumentNo ? { quoteDocumentNo } : {}),
          categoryTag: categoryTag || 'PETICION_OFERTA',
          sentDate: activityDate.toISOString(),
        },
        created_at: activityDate,
      },
      include: {
        customer: { select: { client_id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
      },
    });

    // 7. Si se especificó una oferta comercial, vincularla también en sales_quote_activities
    let quoteLinked = false;
    if (quoteDocumentNo) {
      try {
        const pilot = await this.prisma.crm_offer_followups.findUnique({ where: { document_no: quoteDocumentNo } });
        if (pilot) {
          await this.prisma.crm_offer_activities.upsert({ where: { id: createdActivity.id }, update: {}, create: { id: createdActivity.id, followup_id: pilot.id, tipo: 'Email', notas: `${formattedTitle}\n\n${processedBody ? processedBody.substring(0, 500) : ''}`, fecha: activityDate, hecho: true } });
          quoteLinked = true;
        } else {
        const quoteCrm = await this.prisma.sales_quotes_crm.findUnique({
          where: { document_no: quoteDocumentNo },
        });

        if (quoteCrm) {
          await this.prisma.sales_quote_activities.create({
            data: {
              crm_quote_id: quoteCrm.id,
              tipo: 'email',
              notas: `${formattedTitle}\n\n${processedBody ? processedBody.substring(0, 500) : ''}`,
              fecha: activityDate,
              hecho: true,
            },
          });
          quoteLinked = true;
        }
        }
      } catch (quoteErr) {
        this.logger.warn(`No se pudo vincular la actividad a la oferta ${quoteDocumentNo}:`, quoteErr);
      }
    }

    this.logger.log(
      `Correo registrado en CRM por el usuario ${userId}`,
    );

    return {
      success: true,
      alreadyExisted: false,
      quoteLinked,
      activity: {
        id: createdActivity.id,
        title: createdActivity.title,
        createdAt: createdActivity.created_at,
        customerName: createdActivity.customer?.name,
        contactName: createdActivity.contact?.name,
      },
      message: identity.enabled && identity.patch.exchange_resolution_status !== 'resolved' ? 'Correo registrado. Su apertura en Outlook queda pendiente de verificar la referencia de Microsoft 365.' : 'Correo registrado exitosamente en el CRM.',
      identityStatus: identity.patch.exchange_resolution_status || null,
    };
  }

  /**
   * Busca empresas clientes para el selector del panel cuando el remitente no está registrado.
   */
  async searchCompanies(query: string, userId: string) {
    const actor = await this.access.actor(userId);
    if (!query || query.trim().length < 2) return [];

    return await this.prisma.customers.findMany({
      where: {
        ...actor.customerScope,
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { client_id: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      select: {
        client_id: true,
        name: true,
        city: true,
        salesperson_code: true,
      },
      take: 10,
    });
  }

  /**
   * Obtiene la lista de contactos asociados a un cliente específico.
   */
  async getCompanyContacts(clientId: string, userId: string) {
    await this.access.company(userId, clientId);
    if (!clientId) return [];

    return await this.prisma.contacts.findMany({
      where: {
        client_id: clientId,
      },
      select: {
        id: true,
        contact_no: true,
        name: true,
        email: true,
        job_title: true,
        phone_no: true,
        mobile_no: true,
        client_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Obtiene las ofertas abiertas asociadas a un cliente específico.
   */
  async getCompanyQuotes(clientId: string, userId: string) {
    const actor = await this.access.company(userId, clientId);
    if (!clientId) return [];

    const quotes = await this.prisma.sales_quotes.findMany({
      where: {
        customer_no: clientId,
        ...actor.customerScope,
      },
      include: {
        sales_quotes_crm: true,
      },
      orderBy: { document_date: 'desc' },
      take: 10,
    });

    const source = new OfferSourceContext(await loadOfferContacts(this.prisma, await this.prisma.crm_offer_followups.findMany()));
    return quotes.map((original) => {
      const q = source ? source.overlay(original) : original;
      const crm = q.sales_quotes_crm;
      return {
        document_no: q.document_no,
        document_date: q.document_date,
        amount: Number(q.amount || 0),
        estado: crm?.estado_oferta || 'abierta',
        probabilidad: crm?.probabilidad_exito ? Number(crm.probabilidad_exito) : 10,
        proxima_accion: crm?.proxima_accion || null,
      };
    });
  }
}

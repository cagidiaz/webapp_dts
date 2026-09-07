import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsIn } from 'class-validator';

export class EmailLookupDto {
  @IsString()
  @IsNotEmpty()
  userEmail: string;

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
  @IsString()
  @IsNotEmpty()
  userEmail: string;

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
  @IsIn(['ACEPTACION', 'TECNICA', 'NEGOCIACION', 'POSTVENTA', 'GENERAL'])
  categoryTag?: 'ACEPTACION' | 'TECNICA' | 'NEGOCIACION' | 'POSTVENTA' | 'GENERAL';

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Limpia firmas corporativas pesadas, separadores de citas y cláusulas legales / RGPD.
   */
  cleanEmailBody(rawBody: string): string {
    if (!rawBody) return '';

    let text = rawBody;

    // Normalizar saltos de línea
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1. Cortar cláusulas legales de confidencialidad y RGPD comunes en España y en inglés
    const rgpdPatterns = [
      /\n\s*(?:De conformidad con lo dispuesto en el Reglamento|En cumplimiento de la normativa de Protección de Datos|En virtud de lo establecido en la Ley Orgánica|Aviso Legal:|AVISO LEGAL:?)[\s\S]*$/i,
      /\n\s*(?:Este mensaje y sus archivos adjuntos son confidenciales|Este correo y sus anexos pueden contener información confidencial|El contenido de este correo electrónico es confidencial)[\s\S]*$/i,
      /\n\s*(?:Este mensaje se dirige exclusivamente a su destinatario|La información contenida en este e-mail es confidencial)[\s\S]*$/i,
      /\n\s*(?:This email and any attachments are confidential|The information contained in this email is confidential|Confidentiality Notice:)[\s\S]*$/i,
      /\n\s*(?:Before printing, think about environmental responsibility|Antes de imprimir este correo piense si es necesario)[\s\S]*$/i,
    ];

    for (const pattern of rgpdPatterns) {
      text = text.replace(pattern, '');
    }

    // 2. Cortar citas previas extensas de Outlook ("De: ... Enviado el: ...") si solo queremos el mensaje más reciente
    const replyHeaders = [
      /\n\s*_{10,}[\s\S]*$/,
      /\n\s*-{10,}[\s\S]*$/,
      /\n\s*De:\s+.+?\nEnviado el:\s+.+?\nPara:\s+.+?\nAsunto:\s+.+?\n[\s\S]*$/i,
      /\n\s*From:\s+.+?\nSent:\s+.+?\nTo:\s+.+?\nSubject:\s+.+?\n[\s\S]*$/i,
      /\n\s*El\s+.+?,\s+.+?\sescribió:\s*[\s\S]*$/i,
    ];

    for (const header of replyHeaders) {
      text = text.replace(header, '');
    }

    // 3. Limpiar espacios en blanco excesivos y limitar tamaño
    text = text.trim();
    if (text.length > 4000) {
      text = text.substring(0, 4000) + '... [Texto recortado para optimizar almacenamiento en CRM]';
    }

    return text;
  }

  /**
   * Busca contactos, clientes, ofertas abiertas y estado previo de registro para el correo actual.
   */
  async lookup(params: EmailLookupDto) {
    const { userEmail, fromEmail, toEmails, itemId } = params;

    // 1. Identificar usuario del CRM
    const userProfile = await this.prisma.profiles.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' } },
    });

    // 2. Verificar si este correo ya está registrado en crm_activities
    let isAlreadyLogged = false;
    let existingActivity: any = null;

    if (itemId) {
      existingActivity = await this.prisma.crm_activities.findFirst({
        where: { exchange_item_id: itemId },
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
  async logEmail(params: LogEmailDto) {
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
      categoryTag = 'GENERAL',
      quoteDocumentNo,
      cleanBody = true,
    } = params;

    // 1. Validar usuario creador
    const userProfile = await this.prisma.profiles.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' } },
    });

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

    // 3. Comprobar duplicidad por exchangeItemId
    if (exchangeItemId) {
      const existing = await this.prisma.crm_activities.findFirst({
        where: { exchange_item_id: exchangeItemId },
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
      ACEPTACION: '📄 Aceptación / Cierre',
      TECNICA: '⚙️ Especificación Técnica',
      NEGOCIACION: '💬 Negociación / Precio',
      POSTVENTA: '⚠️ Incidencia / Postventa',
      GENERAL: '✉️ Correo Comercial',
    };

    const prefix = (categoryTag && tagLabels[categoryTag]) || '✉️ Correo';
    const formattedTitle = `[${directionBadge} · ${prefix}] ${subject || '(Sin Asunto)'}`;

    const activityDate = sentDate ? new Date(sentDate) : new Date();

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
        is_completed: true,
        email: emailToSave || null,
        exchange_item_id: exchangeItemId || null,
        exchange_web_link: exchangeWebLink || null,
        exchange_sync_status: 'synced',
        exchange_last_synced_at: new Date(),
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
        let quoteCrm = await this.prisma.sales_quotes_crm.findUnique({
          where: { document_no: quoteDocumentNo },
        });

        // Si aún no tiene metadatos en sales_quotes_crm, crearlo
        if (!quoteCrm) {
          quoteCrm = await this.prisma.sales_quotes_crm.create({
            data: {
              document_no: quoteDocumentNo,
              contacto_id: resolvedContactId || null,
              estado_oferta: categoryTag === 'ACEPTACION' ? 'ganada' : 'en_negociacion',
            },
          });
        }

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
      } catch (quoteErr) {
        this.logger.warn(`No se pudo vincular la actividad a la oferta ${quoteDocumentNo}:`, quoteErr);
      }
    }

    this.logger.log(
      `Correo "${subject}" registrado exitosamente en CRM para cliente ${resolvedClientId} por ${userEmail}`,
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
      message: 'Correo registrado exitosamente en el CRM.',
    };
  }

  /**
   * Busca empresas clientes para el selector del panel cuando el remitente no está registrado.
   */
  async searchCompanies(query: string) {
    if (!query || query.trim().length < 2) return [];

    return await this.prisma.customers.findMany({
      where: {
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
}

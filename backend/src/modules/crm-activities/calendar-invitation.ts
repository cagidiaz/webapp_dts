import { BadRequestException } from '@nestjs/common';

export interface CalendarInvitation {
  enabled: boolean;
  contactIds: string[];
  externalEmails: string[];
  message: string;
  durationMinutes: number;
  recipients: { email: string; name?: string }[];
}
export const validInvitationEmail = (value: string) => /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(value) && value.length <= 254;

/** Resolver direcciones en el servidor: nunca aceptar nombres/emails de contactos enviados por el navegador. */
export async function resolveCalendarInvitation(db: any, raw: unknown, type: string, clientId: string): Promise<CalendarInvitation> {
  if (!['VISITA', 'VIDEOLLAMADA'].includes(type)) throw new BadRequestException('Solo visitas y videollamadas admiten invitados.');
  const value = raw as any;
  if (!value || typeof value !== 'object' || typeof value.enabled !== 'boolean'
    || !Array.isArray(value.contactIds) || !Array.isArray(value.externalEmails)
    || value.contactIds.length + value.externalEmails.length > 100) throw new BadRequestException('Configuración de invitados no válida (máximo 100).');
  if (!value.contactIds.every((id: unknown) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id as string))) throw new BadRequestException('Selecciona contactos válidos.');
  if (!value.externalEmails.every((email: unknown) => typeof email === 'string' && validInvitationEmail(email.trim()))) throw new BadRequestException('Hay direcciones de correo no válidas.');
  if (type !== 'VIDEOLLAMADA' && value.externalEmails.length) throw new BadRequestException('Los invitados externos solo se admiten en videollamadas.');
  if (typeof value.message !== 'string' || value.message.length > 5000) throw new BadRequestException('El mensaje admite hasta 5000 caracteres.');
  const durationMinutes = value.durationMinutes ?? 60;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) throw new BadRequestException('La duración debe estar entre 15 y 480 minutos.');
  const contactIds: string[] = [...new Set<string>(value.contactIds)];
  const externalEmails: string[] = [...new Set<string>(value.externalEmails.map((email: string) => email.trim().toLowerCase()))];
  const contacts = contactIds.length ? await db.contacts.findMany({ where: { id: { in: contactIds }, client_id: clientId }, select: { id: true, name: true, email: true } }) : [];
  if (contacts.length !== contactIds.length) throw new BadRequestException('Todos los contactos invitados deben pertenecer a esta empresa.');
  if (value.enabled && contacts.some((contact: any) => !contact.email || !validInvitationEmail(contact.email.trim()))) throw new BadRequestException('Un contacto seleccionado no tiene un email válido.');
  const recipients = new Map<string, { email: string; name?: string }>();
  for (const contact of contacts) {
    if (!contact.email || !validInvitationEmail(contact.email.trim())) continue;
    const email = contact.email.trim().toLowerCase();
    recipients.set(email, { email, name: contact.name });
  }
  for (const email of externalEmails) if (!recipients.has(email)) recipients.set(email, { email });
  if (value.enabled && recipients.size === 0) throw new BadRequestException('Selecciona al menos un invitado o desactiva el envío de invitación.');
  return { enabled: value.enabled, contactIds, externalEmails, message: value.message.trim(), durationMinutes, recipients: [...recipients.values()] };
}

import { ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface AccountRow {
  user_id: string; email: string; status: string;
  mail_sync_enabled: boolean | null; calendar_sync_enabled: boolean | null; last_synced_at: Date | null;
}
interface DeviceRow {
  id: string; user_id: string; label: string; paired_at: Date; revoked_at: Date | null;
  last_seen_at: Date | null; helper_version: string | null;
}

@Injectable()
export class UsersOutlookService {
  private readonly logger = new Logger(UsersOutlookService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async requireAdmin(userId: string) {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId },
      select: { is_active: true, roles: { select: { name: true } } } });
    if (!profile?.is_active || profile.roles?.name?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador activo puede gestionar las vinculaciones de Outlook.');
    }
  }

  async list(actorId: string) {
    await this.requireAdmin(actorId);
    try {
      // Return metadata only; tokens and device keys are never selected as output.
      const [profiles, accounts, devices] = await Promise.all([
        this.prisma.profiles.findMany({ select: { id: true, email: true, first_name: true, last_name: true,
          is_active: true, roles: { select: { name: true } } }, orderBy: { email: 'asc' } }),
        this.prisma.$queryRaw<AccountRow[]>(Prisma.sql`SELECT user_id,email,mail_sync_enabled,calendar_sync_enabled,last_synced_at,
          CASE WHEN access_token='CONSENT_REQUIRED' THEN 'CONSENT_REQUIRED'
            WHEN access_token='AUTH_REQUIRED' OR NULLIF(btrim(access_token),'') IS NULL THEN 'RECONNECT_REQUIRED'
            ELSE 'REGISTERED' END AS status FROM public.user_exchange_accounts`),
        this.prisma.$queryRaw<DeviceRow[]>(Prisma.sql`SELECT id,user_id,label,paired_at,revoked_at,last_seen_at,helper_version
          FROM public.crm_outlook_devices WHERE user_id IS NOT NULL AND paired_at IS NOT NULL ORDER BY paired_at DESC`),
      ]);
      const byAccount = new Map(accounts.map(account => [account.user_id, account]));
      const byDevice = new Map<string, DeviceRow[]>();
      for (const device of devices) {
        const owned = byDevice.get(device.user_id) || [];
        owned.push(device); byDevice.set(device.user_id, owned);
      }
      return profiles.map(profile => {
        const account = byAccount.get(profile.id);
        return {
          id: profile.id, email: profile.email, firstName: profile.first_name, lastName: profile.last_name,
          isActive: profile.is_active, role: profile.roles?.name || null,
          microsoft365: account ? { status: account.status, email: account.email,
            mailSyncEnabled: account.mail_sync_enabled === true, calendarSyncEnabled: account.calendar_sync_enabled === true,
            lastSyncedAt: account.last_synced_at } : { status: 'NOT_CONNECTED', email: null,
            mailSyncEnabled: false, calendarSyncEnabled: false, lastSyncedAt: null },
          devices: (byDevice.get(profile.id) || []).map(device => ({
            id: device.id, label: device.label, status: device.revoked_at ? 'REVOKED' : 'PAIRED',
            pairedAt: device.paired_at, revokedAt: device.revoked_at, lastSeenAt: device.last_seen_at, version: device.helper_version,
          })),
        };
      });
    } catch {
      throw new ServiceUnavailableException('No se pudieron consultar las vinculaciones. Revisa el esquema de Outlook y los permisos de la conexión del backend.');
    }
  }

  async revoke(actorId: string, deviceId: string) {
    await this.requireAdmin(actorId);
    let rows: { id: string; user_id: string; revoked_at: Date }[];
    try {
      rows = await this.prisma.$queryRaw<typeof rows>(Prisma.sql`UPDATE public.crm_outlook_devices
        SET revoked_at=COALESCE(revoked_at,now())
        WHERE id=${deviceId}::uuid AND user_id IS NOT NULL AND paired_at IS NOT NULL
        RETURNING id,user_id,revoked_at`);
    } catch {
      throw new ServiceUnavailableException('No se pudo revocar la vinculación del equipo.');
    }
    if (!rows.length) throw new NotFoundException('No se encontró ese equipo vinculado. Actualiza el listado.');
    this.logger.log(`Administrador ${actorId}: vinculación revocada del dispositivo ${deviceId}.`);
    return { id: rows[0].id, status: 'REVOKED', revokedAt: rows[0].revoked_at };
  }
}

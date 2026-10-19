import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailIdentityService } from './email-identity.service';
import { OutlookClassicService } from './outlook-classic.service';

describe('Outlook general deployment uses role permissions, not pilot allowlists', () => {
  it.each([{}, { CRM_EMAIL_IDENTITY_ENABLED: 'false', CRM_EMAIL_IDENTITY_EMAILS: 'another@test.invalid' }])('enables any active profile regardless of old settings %p', async settings => {
    const db: any = { profiles: { findUnique: jest.fn().mockResolvedValue({ is_active: true, email: 'user@test.invalid' }) } };
    const service = new EmailIdentityService(db, {} as any, new ConfigService(settings));
    expect(await service.enabledFor('user')).toBe(true);
    db.profiles.findUnique.mockResolvedValue({ is_active: false });
    expect(await service.enabledFor('user')).toBe(false);
    db.profiles.findUnique.mockResolvedValue(null);
    expect(await service.enabledFor('user')).toBe(false);
  });
  it('enables Classic by default but checks role permissions on every device query', async () => {
    const config = new ConfigService({ CRM_OUTLOOK_CLASSIC_ENABLED: 'false', CRM_EMAIL_REPLY_ENABLED: 'false' });
    const db: any = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const access: any = { actor: jest.fn().mockResolvedValue({}) };
    const service = new OutlookClassicService(db, config, { enabledFor: async () => true } as any, access, {} as any, {} as any);
    expect(service.enabled()).toBe(true);
    expect(await service.devices('user')).toMatchObject({ enabled: true, devices: [] });
    access.actor.mockRejectedValue(new ForbiddenException('Permiso CRM revocado'));
    await expect(service.devices('user')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });
});

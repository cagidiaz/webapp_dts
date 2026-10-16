import { ConfigService } from '@nestjs/config';
import { emailIdentityEnabled } from './email-identity-settings';
describe('General email identity release', () => {
  it('supports all users only with the explicit global switch and wildcard', () => {
    expect(emailIdentityEnabled(new ConfigService({CRM_EMAIL_IDENTITY_ENABLED:'true',CRM_EMAIL_IDENTITY_EMAILS:'*'}),'user@test.invalid')).toBe(true);
    expect(emailIdentityEnabled(new ConfigService({CRM_EMAIL_IDENTITY_ENABLED:'false',CRM_EMAIL_IDENTITY_EMAILS:'*'}),'user@test.invalid')).toBe(false);
  });
  it('keeps an explicit list scoped and a missing list disabled', () => {
    const config=new ConfigService({CRM_EMAIL_IDENTITY_ENABLED:'true',CRM_EMAIL_IDENTITY_EMAILS:' Owner@Test.invalid '});
    expect(emailIdentityEnabled(config,'owner@test.invalid')).toBe(true);
    expect(emailIdentityEnabled(config,'other@test.invalid')).toBe(false);
    expect(emailIdentityEnabled(new ConfigService({CRM_EMAIL_IDENTITY_ENABLED:'true'}),'any@test.invalid')).toBe(false);
  });
});

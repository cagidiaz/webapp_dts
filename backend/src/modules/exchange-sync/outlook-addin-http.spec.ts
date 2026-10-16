import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { JwtStrategy } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { OutlookAddinController } from './outlook-addin.controller';
import { OutlookAddinService } from './outlook-addin.service';
import { OutlookAddinAccessService } from './outlook-addin-access.service';
import { EmailIdentityService } from './email-identity.service';

describe('authenticated Outlook addin HTTP boundary', () => {
  let app: INestApplication;
  let prisma: any;
  const secret = 'isolated-outlook-http-test-secret';
  const jwt = new JwtService({ secret });
  const token = () => jwt.sign({ sub: 'user', email: 'tester@test.invalid' }, { expiresIn: '5m' });
  beforeAll(async () => {
    prisma = { profiles: { findUnique: jest.fn().mockResolvedValue({ id: 'user', email: 'tester@test.invalid', is_active: true, role_id: 'role', code: 'COM', roles: { name: 'COMERCIAL' } }) },
      role_modules: { findMany: jest.fn().mockResolvedValue([{ module: { route_path: '/crm' }, can_view: true }]) },
      customers: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) } };
    const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [OutlookAddinController], providers: [JwtStrategy, OutlookAddinService, OutlookAddinAccessService,
      { provide: ConfigService, useValue: { get: (key: string) => key === 'JWT_SECRET' ? secret : undefined } },
      { provide: PrismaService, useValue: prisma }, { provide: EmailIdentityService, useValue: {} }] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  it.each(['/outlook-addin/search-companies?q=abc', '/outlook-addin/company-contacts?clientId=outside', '/outlook-addin/company-quotes?clientId=outside'])('rejects anonymous GET %s', async path => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
  it.each(['/outlook-addin/lookup', '/outlook-addin/log-email'])('rejects anonymous POST %s', async path => {
    await request(app.getHttpServer()).post(path).send({ userEmail: 'tester@test.invalid', subject: 'test' }).expect(401);
  });
  it('rejects spoofing the Outlook email even with a valid CRM session', async () => {
    await request(app.getHttpServer()).post('/outlook-addin/lookup').set('Authorization', `Bearer ${token()}`).send({ userEmail: 'other@test.invalid' }).expect(403);
  });
  it('scopes an authenticated company search to the commercial', async () => {
    await request(app.getHttpServer()).get('/outlook-addin/search-companies?q=abc').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(prisma.customers.findMany.mock.calls.at(-1)[0].where.salesperson_code).toBe('COM');
  });
  it('does not expose another commercial company contacts', async () => {
    await request(app.getHttpServer()).get('/outlook-addin/company-contacts?clientId=outside').set('Authorization', `Bearer ${token()}`).expect(404);
  });
  it('enforces permission revocation on the next request', async () => {
    prisma.role_modules.findMany.mockResolvedValueOnce([]);
    await request(app.getHttpServer()).get('/outlook-addin/search-companies?q=abc').set('Authorization', `Bearer ${token()}`).expect(403);
  });
  it('accepts optional metadata for new clients, remains compatible without it, rejects arrays', async () => {
    const spy = jest.spyOn(app.get(OutlookAddinService), 'logEmail').mockResolvedValue({ success: true } as any);
    const payload = { userEmail: 'tester@test.invalid', exchangeItemId: 'exact', clientId: 'client', subject: 'Test' };
    try {
      await request(app.getHttpServer()).post('/outlook-addin/log-email').set('Authorization', `Bearer ${token()}`).send(payload).expect(201);
      const emailAttachments = { version: 1, status: 'complete', files: [{ name: 'Oferta.pdf' }] };
      await request(app.getHttpServer()).post('/outlook-addin/log-email').set('Authorization', `Bearer ${token()}`).send({ ...payload, emailAttachments }).expect(201);
      expect(spy.mock.calls.at(-1)?.[0].emailAttachments).toEqual(emailAttachments);
      await request(app.getHttpServer()).post('/outlook-addin/log-email').set('Authorization', `Bearer ${token()}`).send({ ...payload, emailAttachments: [] }).expect(400);
    } finally { spy.mockRestore(); }
  });
});

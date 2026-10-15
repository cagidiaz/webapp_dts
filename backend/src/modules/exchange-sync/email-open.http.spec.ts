import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { JwtStrategy } from '../../auth/jwt.strategy';
import { EmailOpenController } from './email-open.controller';
import { EmailOpenService } from './email-open.service';

describe('email resolver HTTP authentication and input boundary', () => {
  let app: INestApplication;
  const emails = { resolve: jest.fn().mockResolvedValue({ status: 'resolved', webLink: 'https://outlook.office.com/mail/item/exact', message: 'Verified' }) };
  const secret = 'isolated-email-resolver-http-test-secret';
  const jwt = new JwtService({ secret });
  const path = '/exchange-sync/emails/00000000-0000-4000-8000-000000000001/resolve';
  const token = () => jwt.sign({ sub: 'authenticated-user' }, { expiresIn: '5m' });
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [EmailOpenController], providers: [JwtStrategy,
      { provide: ConfigService, useValue: { get: (key: string) => key === 'JWT_SECRET' ? secret : undefined } }, { provide: EmailOpenService, useValue: emails }] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  beforeEach(() => emails.resolve.mockClear());
  afterAll(async () => { await app?.close(); });
  it('rejects anonymous resolution', async () => { await request(app.getHttpServer()).post(path).send({}).expect(401); expect(emails.resolve).not.toHaveBeenCalled(); });
  it('rejects expired sessions', async () => {
    await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${jwt.sign({ sub: 'user' }, { expiresIn: -1 })}`).send({}).expect(401);
    expect(emails.resolve).not.toHaveBeenCalled();
  });
  it('rejects a non-UUID activity', async () => {
    await request(app.getHttpServer()).post('/exchange-sync/emails/invalid/resolve').set('Authorization', `Bearer ${token()}`).send({}).expect(400);
    expect(emails.resolve).not.toHaveBeenCalled();
  });
  it.each([{ mailboxId: 'another' }, { userId: 'admin' }, { webLink: 'https://evil.invalid' }, { candidateId: 1 }])('rejects untrusted routing data %p', async body => {
    await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token()}`).send(body).expect(400);
    expect(emails.resolve).not.toHaveBeenCalled();
  });
  it('uses the authenticated actor and only an explicit candidate selection', async () => {
    await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token()}`).send({ candidateId: 'CaseSensitive' }).expect(201);
    expect(emails.resolve).toHaveBeenCalledWith('authenticated-user', '00000000-0000-4000-8000-000000000001', 'CaseSensitive');
  });
});

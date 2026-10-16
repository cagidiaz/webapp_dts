import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { JwtStrategy } from '../../auth/jwt.strategy';
import { OutlookClassicController } from './outlook-classic.controller';
import { OutlookClassicService } from './outlook-classic.service';

describe('Classic HTTP boundary', () => {
  let app: INestApplication;
  const id = '00000000-0000-4000-8000-000000000001';
  const secret = 'isolated-classic-http-secret';
  const jwt = new JwtService({ secret });
  const classic = { devices: jest.fn().mockResolvedValue({ enabled: false, devices: [] }), create: jest.fn(), revoke: jest.fn(), status: jest.fn(), approvePair: jest.fn(), startPair: jest.fn(), pairStatus: jest.fn(), result: jest.fn(), claim: jest.fn().mockRejectedValue(new UnauthorizedException('signature')) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [OutlookClassicController], providers: [JwtStrategy,
      { provide: ConfigService, useValue: { get: (key: string) => key === 'JWT_SECRET' ? secret : undefined } }, { provide: OutlookClassicService, useValue: classic }] }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); await app.init();
  });
  afterAll(async () => { await app?.close(); });
  it.each(['/exchange-sync/classic/devices', `/exchange-sync/classic/requests/${id}`])('requires CRM authentication for GET %s', async path => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
  it.each(['/exchange-sync/classic/requests', '/exchange-sync/classic/pair/approve', `/exchange-sync/classic/devices/${id}/revoke`])('requires CRM authentication for POST %s', async path => {
    await request(app.getHttpServer()).post(path).send({}).expect(401);
  });
  it('does not let an authenticated browser inject another user or server action', async () => {
    await request(app.getHttpServer()).post('/exchange-sync/classic/requests').set('Authorization', `Bearer ${jwt.sign({ sub: 'actor' })}`).send({ activityId: id, deviceId: id, userId: 'another', action: 'send' }).expect(400);
    expect(classic.create).not.toHaveBeenCalled();
  });
  it('requires valid device proof input even though the native route does not use a CRM JWT', async () => {
    await request(app.getHttpServer()).post(`/exchange-sync/classic/requests/${id}/claim`).send({ token: 'invalid' }).expect(400);
    expect(classic.claim).not.toHaveBeenCalled();
  });
  it('cannot exchange a browser JWT for missing device proof', async () => {
    await request(app.getHttpServer()).post(`/exchange-sync/classic/requests/${id}/result`).set('Authorization', `Bearer ${jwt.sign({ sub: 'actor' })}`).send({ outcome: 'opened' }).expect(400);
    expect(classic.result).not.toHaveBeenCalled();
  });
  it('keeps the disabled flow available without access to the new storage', async () => {
    await request(app.getHttpServer()).get('/exchange-sync/classic/devices').set('Authorization', `Bearer ${jwt.sign({ sub: 'actor' })}`).expect(200, { enabled: false, devices: [] });
    expect(classic.devices).toHaveBeenCalledWith('actor');
  });
});

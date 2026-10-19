import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtStrategy } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersOutlookService } from './users-outlook.service';
import { UsersOutlookController } from './users-outlook.controller';

describe('administración de vinculaciones Outlook', () => {
  const actorId = '10000000-0000-4000-8000-000000000003';
  const deviceId = '20000000-0000-4000-8000-000000000001';
  const secret = 'isolated-outlook-admin-test-secret';
  const jwt = new JwtService({ secret });
  const token = () => jwt.sign({ sub: actorId }, { expiresIn: '5m' });
  const now = new Date('2026-10-19T10:00:00Z');
  let app: INestApplication, db: any;
  let role = 'ADMIN', active = true;
  const api = () => request(app.getHttpServer());
  beforeAll(async () => {
    db = { profiles: { findUnique: jest.fn(async () => ({ is_active: active, roles: { name: role } })), findMany: jest.fn() }, $queryRaw: jest.fn() };
    const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [UsersOutlookController], providers: [UsersOutlookService, JwtStrategy,
      { provide: ConfigService, useValue: new ConfigService({ JWT_SECRET: secret }) }, { provide: PrismaService, useValue: db }] }).compile();
    app = module.createNestApplication(); await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    jest.clearAllMocks(); role = 'ADMIN'; active = true;
    db.profiles.findMany.mockResolvedValue([
      { id: 'seller', email: 'seller@test.invalid', first_name: 'Comercial', last_name: 'Uno', is_active: true, roles: { name: 'VENTAS' } },
      { id: 'none', email: 'none@test.invalid', first_name: null, last_name: null, is_active: false, roles: null },
    ]);
    db.$queryRaw.mockImplementation(async (sql: any) => {
      if (sql.text.includes('FROM public.user_exchange_accounts')) return [{ user_id: 'seller', email: 'mailbox@test.invalid', status: 'RECONNECT_REQUIRED', last_synced_at: now, mail_sync_enabled: true, calendar_sync_enabled: false, access_token: 'private-token', refresh_token: 'private-refresh' }];
      if (sql.text.startsWith('UPDATE')) return [{ id: deviceId, user_id: 'seller', revoked_at: now }];
      return [{ id: deviceId, user_id: 'seller', label: 'Equipo comercial', paired_at: now, last_seen_at: null, helper_version: '1.1.0', revoked_at: null, public_key_pem: 'private-key' },
        { id: 'revoked', user_id: 'seller', label: 'Anterior', paired_at: now, last_seen_at: now, helper_version: '1.0.0', revoked_at: now }];
    });
  });
  it.each(['get', 'post'])('rechaza solicitudes anónimas %s', async method => {
    const endpoint = method === 'get' ? '/users/outlook' : `/users/outlook/devices/${deviceId}/revoke`;
    await (method === 'get' ? api().get(endpoint) : api().post(endpoint)).expect(401);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it.each(['VENTAS', 'DIRECCION', 'TESTER'])('rechaza el rol %s incluso con JWT válido', async value => {
    role = value;
    await api().get('/users/outlook').auth(token(), { type: 'bearer' }).expect(403);
    await api().post(`/users/outlook/devices/${deviceId}/revoke`).auth(token(), { type: 'bearer' }).expect(403);
    expect(db.$queryRaw).not.toHaveBeenCalled(); expect(db.profiles.findMany).not.toHaveBeenCalled();
  });
  it('rechaza administradores inactivos', async () => {
    active = false;
    await api().get('/users/outlook').auth(token(), { type: 'bearer' }).expect(403);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it('incluye usuarios sin conexión, equipos revocados y solo metadatos permitidos', async () => {
    const result = await api().get('/users/outlook').auth(token(), { type: 'bearer' }).expect(200);
    expect(result.body).toHaveLength(2);
    expect(result.body[0]).toMatchObject({ email: 'seller@test.invalid', microsoft365: { status: 'RECONNECT_REQUIRED' }, devices: [{ status: 'PAIRED', lastSeenAt: null }, { status: 'REVOKED' }] });
    expect(result.body[1]).toMatchObject({ microsoft365: { status: 'NOT_CONNECTED', email: null }, devices: [] });
    expect(JSON.stringify(result.body)).not.toMatch(/private-token|private-refresh|private-key|access_token|refresh_token|public_key/);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('revalida el rol antes de revocar y no confía en el permiso de la consulta anterior', async () => {
    await api().get('/users/outlook').auth(token(), { type: 'bearer' }).expect(200);
    role = 'VENTAS';
    await api().post(`/users/outlook/devices/${deviceId}/revoke`).auth(token(), { type: 'bearer' }).expect(403);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('revoca un equipo ajeno con SQL parametrizado e idempotente sin desconectar el buzón', async () => {
    const result = await api().post(`/users/outlook/devices/${deviceId}/revoke`).auth(token(), { type: 'bearer' }).expect(201);
    expect(result.body).toMatchObject({ id: deviceId, status: 'REVOKED' });
    const sql = db.$queryRaw.mock.calls[0][0];
    expect(sql.values).toEqual([deviceId]); expect(sql.text).toContain('COALESCE(revoked_at,now())');
    expect(sql.text).not.toContain('user_exchange_accounts');
  });
  it('rechaza IDs no válidos, equipos inexistentes y comunica errores de esquema', async () => {
    await api().post('/users/outlook/devices/not-a-uuid/revoke').auth(token(), { type: 'bearer' }).expect(400);
    expect(db.$queryRaw).not.toHaveBeenCalled();
    db.$queryRaw.mockResolvedValueOnce([]);
    await api().post(`/users/outlook/devices/${deviceId}/revoke`).auth(token(), { type: 'bearer' }).expect(404);
    db.$queryRaw.mockRejectedValueOnce(new Error('database unavailable'));
    await api().get('/users/outlook').auth(token(), { type: 'bearer' }).expect(503);
  });
});

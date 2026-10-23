import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../../auth/roles.guard';
import { DocumentationModule } from './documentation.module';
import { DocumentationService } from './documentation.service';

describe('Manuales de usuario: acceso autenticado y permisos actuales', () => {
  let app: INestApplication;
  let token: string;
  let active = true;
  let paths: string[] = [];
  const db = {
    profiles: { findUnique: jest.fn(async () => ({ is_active: active, role_id: 'role' })) },
    role_modules: { findMany: jest.fn(async () => paths.map(route_path => ({ can_view: true, module: { route_path } }))) },
  };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: 'manual-test-secret-local-only' })] }), DocumentationModule] })
      .overrideProvider(PrismaService).useValue(db)
      .overrideProvider(RolesGuard).useValue({ canActivate: () => true }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = new JwtService().sign({ sub: 'reader' }, { secret: 'manual-test-secret-local-only' });
  });
  beforeEach(() => { active = true; paths = ['/crm', '/crm/contacts']; });
  afterAll(async () => { await app?.close(); });

  it('rechaza lista y PDF sin sesión', async () => {
    await request(app.getHttpServer()).get('/api/documentation/manuals').expect(401);
    await request(app.getHttpServer()).get('/api/documentation/manuals/crm-clientes-contactos/pdf').expect(401);
  });
  it.each([[], ['/crm'], ['/crm/contacts'], ['/crm', '/crm/pipeline']])('no concede el manual por permisos incompletos: %j', async (...values) => {
    paths = values.flat() as string[];
    const list = await request(app.getHttpServer()).get('/api/documentation/manuals').auth(token, { type: 'bearer' }).expect(200);
    expect(list.body).toEqual([]);
    await request(app.getHttpServer()).get('/api/documentation/manuals/crm-clientes-contactos/pdf').auth(token, { type: 'bearer' }).expect(403);
  });
  it('exige perfil activo incluso con JWT válido', async () => {
    active = false;
    await request(app.getHttpServer()).get('/api/documentation/manuals/crm-clientes-contactos/pdf').auth(token, { type: 'bearer' }).expect(403);
  });
  it.each(['/crm/contacts', '/crm/customers'])('permite el catálogo a usuarios con acceso a %s', async path => {
    paths = ['/crm', path];
    const res = await request(app.getHttpServer()).get('/api/documentation/manuals').auth(token, { type: 'bearer' }).expect(200);
    expect(res.body[0]).toMatchObject({ id: 'crm-clientes-contactos', version: '1.1', updatedAt: '2026-10-22' });
    expect(res.body[0].sizeBytes).toBeGreaterThan(1000);
  });
  it.each([['', 'inline'], ['?download=1', 'attachment']])('entrega el PDF privado con disposición %s', async (query, disposition) => {
    const res = await request(app.getHttpServer()).get(`/api/documentation/manuals/crm-clientes-contactos/pdf${query}`).auth(token, { type: 'bearer' }).expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(disposition);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const file = await app.get(DocumentationService).file('reader', 'crm-clientes-contactos');
    expect(Buffer.from(res.body)).toEqual(readFileSync(file.filePath));
  });
  it('vuelve a comprobar los permisos después de revocarlos', async () => {
    await request(app.getHttpServer()).get('/api/documentation/manuals').auth(token, { type: 'bearer' }).expect(200);
    paths = [];
    await request(app.getHttpServer()).get('/api/documentation/manuals/crm-clientes-contactos/pdf').auth(token, { type: 'bearer' }).expect(403);
  });
  it('no resuelve nombres de archivo enviados por el usuario', async () => {
    await request(app.getHttpServer()).get('/api/documentation/manuals/otro/pdf').auth(token, { type: 'bearer' }).expect(404);
  });
});

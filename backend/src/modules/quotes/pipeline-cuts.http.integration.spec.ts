import { createHmac } from 'crypto';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { QuotesModule } from './quotes.module';

const reviewUrl = process.env.DATABASE_URL || '';
let safeReviewDb = false;
try {
  const url = new URL(reviewUrl);
  safeReviewDb = process.env.DTS_REVIEW_API_INTEGRATION === '1'
    && url.protocol === 'postgresql:'
    && url.hostname === '127.0.0.1'
    && url.port === '55436'
    && url.username === 'crm_review'
    && url.password === 'local_review_only'
    && url.pathname === '/dts_crm_api_review';
} catch { /* Sin URL aislada, la suite queda omitida. */ }

const integration = safeReviewDb ? describe : describe.skip;
const pilotId = '10000000-0000-4000-8000-000000000001';
const sellerId = '10000000-0000-4000-8000-000000000002';
const adminId = '10000000-0000-4000-8000-000000000003';

function tokenFor(userId: string, email: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('La prueba HTTP requiere el secreto efímero local.');
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, email, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

integration('API HTTP de cortes con PostgreSQL aislado y esquema Prisma', () => {
  jest.setTimeout(120_000);
  let app: any;
  let prisma: PrismaService;
  let baselineId: string;
  let finalId: string;
  const api = () => request(app.getHttpServer());
  const auth = (userId: string, email: string) => ({ Authorization: `Bearer ${tokenFor(userId, email)}` });
  const pilotAuth = () => auth(pilotId, 'aciurans@dtsinstruments.com');
  const sellerAuth = () => auth(sellerId, 'vendedor@example.invalid');
  const adminAuth = () => auth(adminId, 'admin@example.invalid');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        AuthModule,
        QuotesModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => { if (app) await app.close(); });

  it('verifica JWT, permiso de vista y quién puede crear cortes manuales', async () => {
    const linked = await api().get('/api/quotes/crm').query({ contactId: '60000000-0000-4000-8000-000000000001' }).set(pilotAuth()).expect(200);
    expect(linked.body).toEqual([expect.objectContaining({ document_no: 'OF-ACI', contacto_nombre: 'Comprador inicial', contacto_email: 'comprador@example.invalid' })]);
    await api().post('/api/quotes/crm/pilot/initialize').set(adminAuth()).expect(404);
    await api().get('/api/quotes/crm/pilot/status').set(adminAuth()).expect(404);
    expect(await prisma.crm_offer_followups.findUnique({ where: { document_no: 'OF-BOB' } })).toEqual(expect.objectContaining({ source: 'BC', version: 1, oferta_type: null }));
    await api().get('/api/crm-pipeline-cuts/access').expect(401);
    const pilot = await api().get('/api/crm-pipeline-cuts/access').set(pilotAuth()).expect(200);
    expect(pilot.body).toMatchObject({ enabled: true, canCreate: false, canViewAll: false });
    await api().post('/api/crm-pipeline-cuts').set(pilotAuth()).send({ request_id: '50000000-0000-4000-8000-000000000001', reason: 'Inicio del piloto' }).expect(403);
    await api().post('/api/crm-pipeline-cuts').set(sellerAuth()).send({ request_id: '50000000-0000-4000-8000-000000000002', reason: 'Inicio del piloto' }).expect(403);
  });

  it('guarda códigos de contacto desde HTTP sin owner_id y rechaza referencias inválidas', async () => {
    const quote = await prisma.sales_quotes.findUniqueOrThrow({ where: { document_no: 'OF-ACI' } });
    await api().patch(`/api/quotes/crm/${quote.id}`).set(adminAuth())
      .send({ followup_version: 1, contact_id: 'CONTACT-ACI' }).expect(200);
    const saved = await prisma.crm_offer_followups.findUniqueOrThrow({ where: { document_no: 'OF-ACI' } });
    expect(saved.contacto_id).toBe('CONTACT-ACI');
    expect(saved).not.toHaveProperty('owner_id');
    await api().patch(`/api/quotes/crm/${quote.id}`).set(pilotAuth())
      .send({ followup_version: saved.version, contact_id: 'CONTACT-INEXISTENTE' }).expect(400);
    await api().patch(`/api/quotes/crm/${quote.id}`).set(adminAuth())
      .send({ followup_version: saved.version, contacto_id: null }).expect(400);
    await expect(prisma.crm_offer_followups.update({ where: { id: saved.id }, data: { contacto_id: 'CONTACT-INEXISTENTE' } })).rejects.toMatchObject({ code: 'P2003' });
    await expect(prisma.sales_quotes.delete({ where: { id: quote.id } })).rejects.toMatchObject({ code: 'P2003' });
    await expect(prisma.contacts.delete({ where: { contact_no: 'CONTACT-ACI' } })).rejects.toMatchObject({ code: 'P2003' });
    expect(await prisma.sales_quotes.findUnique({ where: { id: quote.id } })).toEqual(quote);
  });

  it('publica un corte desde HTTP y responde detalle, informes y exportación', async () => {
    const created = await api().post('/api/crm-pipeline-cuts').set(adminAuth())
      .send({ request_id: '50000000-0000-4000-8000-000000000003', reason: 'Primer corte del piloto' })
      .expect(201);
    expect(created.body).toMatchObject({ kind: 'MANUAL', status: 'PUBLISHED', reason: 'Primer corte del piloto', row_count: 4 });
    baselineId = created.body.id;

    const list = await api().get('/api/crm-pipeline-cuts').set(adminAuth()).expect(200);
    expect(list.body.map((cut: any) => cut.id)).toContain(baselineId);
    const detail = await api().get(`/api/crm-pipeline-cuts/${baselineId}`).set(adminAuth()).expect(200);
    expect(detail.body.total).toBe(4);
    expect(detail.body.rows.find((row: any) => row.entity_key === 'OF-ACI')).toMatchObject({ phase: 'negociación', source: 'APP', amount: '1234.5678', probability: '55' });

    const reports = await api().get(`/api/crm-pipeline-cuts/${baselineId}/reports`).set(adminAuth()).expect(200);
    expect(reports.body.summary.offers).toBe(2);
    expect(reports.body.prospection).toMatchObject({ total: 2, phase0: 1, phase1: 1 });
    const csv = await api().get(`/api/crm-pipeline-cuts/${baselineId}/export`).set(adminAuth()).expect(200);
    expect(csv.text).toContain('Importe sin IVA');
    expect(csv.headers['content-disposition']).toContain(`corte-${baselineId}.csv`);
  });

  it('filtra cabeceras y filas al ámbito comercial efectivo', async () => {
    const pilotList = await api().get('/api/crm-pipeline-cuts').set(pilotAuth()).expect(200);
    expect(pilotList.body).toHaveLength(1);
    expect(pilotList.body[0]).not.toHaveProperty('row_count');
    const pilotDetail = await api().get(`/api/crm-pipeline-cuts/${baselineId}`).set(pilotAuth()).expect(200);
    expect(pilotDetail.body.rows.map((row: any) => row.entity_key).sort()).toEqual(['40000000-0000-4000-8000-000000000001', 'OF-ACI']);

    const sellerDetail = await api().get(`/api/crm-pipeline-cuts/${baselineId}`).set(sellerAuth()).expect(200);
    expect(sellerDetail.body.rows.map((row: any) => row.entity_key).sort()).toEqual(['40000000-0000-4000-8000-000000000002', 'OF-BOB']);
    await api().get(`/api/crm-pipeline-cuts/${baselineId}`).expect(401);
  });

  it('observa cambios entre cortes y no permite reintentar uno publicado', async () => {
    await prisma.contacts.update({ where: { id: '60000000-0000-4000-8000-000000000001' }, data: { name: 'Comprador actualizado' } });
    const historic = await api().get(`/api/crm-pipeline-cuts/${baselineId}`).set(pilotAuth()).expect(200);
    expect(historic.body.rows.find((row: any) => row.entity_key === 'OF-ACI').payload.contacto_nombre).toBe('Comprador inicial');
    const current = await api().get('/api/quotes/crm').set(pilotAuth()).expect(200);
    expect(current.body.find((row: any) => row.document_no === 'OF-ACI').contacto_nombre).toBe('Comprador actualizado');
    await prisma.crm_offer_followups.update({ where: { document_no: 'OF-ACI' }, data: { estado_oferta: 'aceptada', probabilidad_exito: 90, version: 2 } });
    await new Promise(resolve => setTimeout(resolve, 30));
    const created = await api().post('/api/crm-pipeline-cuts').set(adminAuth())
      .send({ request_id: '50000000-0000-4000-8000-000000000004', reason: 'Revisión de avance' })
      .expect(201);
    finalId = created.body.id;
    expect(created.body.status).toBe('PUBLISHED');
    const compared = await api().get(`/api/crm-pipeline-cuts/${finalId}/compare/${baselineId}`).set(pilotAuth()).expect(200);
    expect(compared.body.movements).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: 'OF-ACI', beforePhase: 'negociación', afterPhase: 'aceptada', fields: expect.arrayContaining(['phase', 'probability']) }),
    ]));
    await api().post(`/api/crm-pipeline-cuts/${finalId}/retry`).set(adminAuth()).expect(400);
  });
});

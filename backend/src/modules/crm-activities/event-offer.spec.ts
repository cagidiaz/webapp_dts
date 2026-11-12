import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CrmActivitiesService } from './crm-activities.service';

describe('Vínculo de eventos con ofertas', () => {
  let db: any; let service: CrmActivitiesService;
  beforeEach(() => {
    db = {
      profiles: { findUnique: jest.fn().mockResolvedValue({ is_active: true, code: 'ACI', roles: { name: 'VENTAS' } }) },
      customers: { findUnique: jest.fn().mockResolvedValue({ client_id: 'CL1' }), findFirst: jest.fn().mockResolvedValue({ client_id: 'CL1' }) },
      contacts: { findUnique: jest.fn().mockResolvedValue({ client_id: 'CL1' }), findFirst: jest.fn().mockResolvedValue({ id: 'contact' }) },
      sales_quotes: { findFirst: jest.fn().mockResolvedValue({ document_no: 'OF1', estado_oferta: 'enviada' }) },
      crm_offer_followups: { findUnique: jest.fn().mockResolvedValue({ source: 'APP', estado_oferta: 'presentada' }) },
      crm_activities: { create: jest.fn(async ({ data }) => ({ ...data, id: 'event' })), findUnique: jest.fn(), update: jest.fn(async ({ data }) => ({ ...data, id: 'event' })) },
    };
    service = new CrmActivitiesService(db, { syncActivityToOutlook: jest.fn().mockResolvedValue(null) } as any, {} as any);
  });
  const input: any = { userId: 'u1', clientId: 'CL1', contactId: 'contact', type: 'CALL', title: 'Llamar', ofertaVinculada: 'OF1' };
  it('guarda una referencia de una oferta abierta de la empresa', async () => {
    await service.create(input);
    expect(db.crm_activities.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ oferta_vinculada: 'OF1' }) }));
  });
  it('rechaza una oferta de otra empresa o una oferta cerrada', async () => {
    db.sales_quotes.findFirst.mockResolvedValueOnce(null);
    await expect(service.create(input)).rejects.toBeInstanceOf(BadRequestException);
    db.crm_offer_followups.findUnique.mockResolvedValueOnce({ source: 'APP', estado_oferta: 'ganada' });
    await expect(service.create(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.crm_activities.create).not.toHaveBeenCalled();
  });
  it('requiere contacto y no permite vincular un correo mediante este campo', async () => {
    await expect(service.create({ ...input, contactId: undefined })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ ...input, type: 'EMAIL' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('impide cambiar el vínculo de un evento de otro usuario', async () => {
    db.crm_activities.findUnique.mockResolvedValue({ id: 'e', created_by: 'otro', client_id: 'CL1', contact_id: 'contact', type: 'CALL', oferta_vinculada: null });
    await expect(service.update('e', { ofertaVinculada: 'OF1' }, 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_activities.update).not.toHaveBeenCalled();
  });
});

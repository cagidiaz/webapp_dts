import { NotFoundException } from '@nestjs/common';
import { CrmActivitiesService } from './crm-activities.service';

describe('borrado de registros de correo del CRM', () => {
  let db: any, sync: any, service: CrmActivitiesService;
  beforeEach(() => {
    db = { crm_activities: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({}) } };
    sync = { deleteActivityFromOutlook: jest.fn().mockResolvedValue(undefined) };
    service = new CrmActivitiesService(db, sync, {} as any);
  });
  it.each(['ews-id', null])('borra el registro EMAIL sin ninguna operación Outlook (referencia %s)', async exchange_item_id => {
    db.crm_activities.findUnique.mockResolvedValue({ id: 'email', type: 'EMAIL', exchange_item_id, created_by: 'user' });
    expect(await service.delete('email')).toEqual({ success: true });
    expect(db.crm_activities.delete).toHaveBeenCalledWith({ where: { id: 'email' } });
    expect(sync.deleteActivityFromOutlook).not.toHaveBeenCalled();
  });
  it('mantiene la cancelación de calendario de las demás actividades vinculadas', async () => {
    db.crm_activities.findUnique.mockResolvedValue({ id: 'meeting', type: 'REUNION', exchange_item_id: 'event-id', created_by: 'user' });
    await service.delete('meeting');
    expect(sync.deleteActivityFromOutlook).toHaveBeenCalledWith('meeting', 'event-id', 'user');
  });
  it('no cancela eventos ni borra nada si no existe el registro', async () => {
    db.crm_activities.findUnique.mockResolvedValue(null);
    await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_activities.delete).not.toHaveBeenCalled();
    expect(sync.deleteActivityFromOutlook).not.toHaveBeenCalled();
  });
});

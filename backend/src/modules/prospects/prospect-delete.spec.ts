import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ProspectsService } from './prospects.service';

describe('Eliminación de prospectos', () => {
  const setup = (role: string, version = 3) => {
    const db: any = {
      profiles: { findUnique: jest.fn().mockResolvedValue({ is_active: true, role_id: 'role', roles: { name: role } }) },
      role_modules: { findMany: jest.fn().mockResolvedValue(['/crm', '/crm/pipeline'].map(route_path => ({ can_view: true, module: { route_path } }))) },
      crm_prospects: { findUnique: jest.fn().mockResolvedValue({ id: 'prospect', version }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), delete: jest.fn() },
      crm_prospect_activities: { deleteMany: jest.fn() }, crm_prospect_events: { deleteMany: jest.fn() },
      $transaction: jest.fn().mockImplementation(fn => fn(db)),
    };
    return { db, service: new ProspectsService(db, {} as any, { enabled: () => false } as any) };
  };
  it.each(['VENTAS', 'DIRECCION'])('rechaza el borrado por %s', async role => {
    const { db, service } = setup(role);
    await expect(service.deleteProspect('user', 'prospect', 3)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('rechaza una versión antigua sin eliminar registros', async () => {
    const { db, service } = setup('ADMIN');
    await expect(service.deleteProspect('user', 'prospect', 2)).rejects.toBeInstanceOf(ConflictException);
    expect(db.crm_prospects.delete).not.toHaveBeenCalled();
  });
  it('elimina el prospecto y su historial local dentro de una transacción', async () => {
    const { db, service } = setup('ADMIN');
    await service.deleteProspect('user', 'prospect', 3);
    expect(db.crm_prospect_activities.deleteMany).toHaveBeenCalledWith({ where: { prospect_id: 'prospect' } });
    expect(db.crm_prospect_events.deleteMany).toHaveBeenCalledWith({ where: { prospect_id: 'prospect' } });
    expect(db.crm_prospects.delete).toHaveBeenCalledWith({ where: { id: 'prospect' } });
  });
});

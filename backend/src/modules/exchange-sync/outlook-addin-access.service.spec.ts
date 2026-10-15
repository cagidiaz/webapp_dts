import { OutlookAddinAccessService } from './outlook-addin-access.service';
describe('Outlook addin access', () => {
  let prisma: any;
  let access: OutlookAddinAccessService;
  beforeEach(() => {
    prisma = { profiles: { findUnique: jest.fn().mockResolvedValue({ id: 'user', email: 'tester@test.invalid', role_id: 'role', is_active: true, code: 'COM', roles: { name: 'COMERCIAL' } }) },
      role_modules: { findMany: jest.fn().mockResolvedValue([{ module: { route_path: '/crm' }, can_view: true }]) },
      customers: { findFirst: jest.fn().mockResolvedValue({ client_id: 'client' }) } };
    access = new OutlookAddinAccessService(prisma);
  });
  it('takes identity from the session and scopes companies to the salesperson', async () => {
    expect((await access.actor('user', 'TESTER@test.invalid')).customerScope).toEqual({ salesperson_code: 'COM' });
    await access.company('user', 'client');
    expect(prisma.customers.findFirst).toHaveBeenCalledWith({ where: { client_id: 'client', salesperson_code: 'COM' }, select: { client_id: true } });
  });
  it('rejects another declared email', async () => { await expect(access.actor('user', 'other@test.invalid')).rejects.toMatchObject({ status: 403 }); });
  it('honors revoked view permissions even for an admin', async () => {
    prisma.profiles.findUnique.mockResolvedValue({ email: 'admin@test.invalid', role_id: 'role', is_active: true, roles: { name: 'ADMIN' } });
    prisma.role_modules.findMany.mockResolvedValue([]);
    await expect(access.actor('user')).rejects.toMatchObject({ status: 403 });
  });
  it('honors a denied contacts subview', async () => {
    prisma.role_modules.findMany.mockResolvedValue([{ module: { route_path: '/crm' }, can_view: true }, { module: { route_path: '/crm/contacts' }, can_view: false }]);
    await expect(access.actor('user')).rejects.toMatchObject({ status: 403 });
  });
  it('allows admin all CRM companies without granting mailbox delegation', async () => {
    prisma.profiles.findUnique.mockResolvedValue({ email: 'admin@test.invalid', role_id: 'role', is_active: true, roles: { name: 'ADMIN' } });
    expect((await access.actor('user')).customerScope).toEqual({});
  });
  it('rejects another salesperson company', async () => {
    prisma.customers.findFirst.mockResolvedValue(null);
    await expect(access.company('user', 'outside')).rejects.toMatchObject({ status: 404 });
  });
});

import { UsersController } from '../users/users.controller';
import { hasOpportunitiesAccess } from './opportunities-individual-access';

describe('Permiso individual de Oportunidades', () => {
  const crm = { can_view: true, module: { route_path: '/crm' } };
  const denied = { can_view: false, module: { route_path: '/crm/pipeline' } };
  const prisma = { modules: { findFirst: jest.fn().mockResolvedValue({ id: 'pipeline' }) } };

  it('autoriza a Antoni con CRM y módulo activo, pero no a otro vendedor', async () => {
    expect(await hasOpportunitiesAccess(prisma, [crm, denied], 'ACIURANS@dtsinstruments.com')).toBe(true);
    expect(await hasOpportunitiesAccess(prisma, [crm, denied], 'otro@example.com')).toBe(false);
    expect(await hasOpportunitiesAccess(prisma, [denied], 'aciurans@dtsinstruments.com')).toBe(false);
    prisma.modules.findFirst.mockResolvedValueOnce(null);
    expect(await hasOpportunitiesAccess(prisma, [crm, denied], 'aciurans@dtsinstruments.com')).toBe(false);
  });

  it('devuelve el permiso efectivo al menú y al guard de la vista', async () => {
    const service = {
      getUserStatus: jest.fn().mockResolvedValue({ existsInProfiles: true, rawProfile: { role_id: 'ventas', is_active: true, email: 'aciurans@dtsinstruments.com' } }),
      getRolePermissions: jest.fn().mockResolvedValue([{ moduleId: 'crm', routePath: '/crm', canView: true }, { moduleId: 'pipeline', routePath: '/crm/pipeline', canView: false }]),
      getModules: jest.fn().mockResolvedValue([{ id: 'pipeline', name: 'Oportunidades', route_path: '/crm/pipeline', is_active: true }]),
    };
    const permissions = await new UsersController(service as any).getMyPermissions({ user: { userId: 'antoni' } });
    expect(permissions.find(p => p.routePath === '/crm/pipeline')?.canView).toBe(true);
  });
});

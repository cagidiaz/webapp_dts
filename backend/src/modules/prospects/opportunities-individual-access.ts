// Permiso individual explícito para Oportunidades; no amplía permisos de otros módulos.
export const hasIndividualOpportunitiesAccess = (email?: string | null) =>
  email?.trim().toLowerCase() === 'aciurans@dtsinstruments.com';

export async function hasOpportunitiesAccess(prisma: any, permissions: any[], email?: string | null) {
  const allowed = (path: string) => permissions.some(p => p.module.route_path === path && p.can_view === true);
  if (!allowed('/crm')) return false;
  if (allowed('/crm/pipeline')) return true;
  if (!hasIndividualOpportunitiesAccess(email)) return false;
  return !!await prisma.modules.findFirst({ where: { route_path: '/crm/pipeline', is_active: true }, select: { id: true } });
}

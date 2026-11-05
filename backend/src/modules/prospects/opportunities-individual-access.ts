// Permiso individual explícito para Oportunidades; no amplía permisos de otros módulos.
export const hasIndividualOpportunitiesAccess = (email?: string | null) =>
  email?.trim().toLowerCase() === 'aciurans@dtsinstruments.com';

export async function hasOpportunitiesAccess(_prisma: any, permissions: any[], _email?: string | null) {
  const allowed = (path: string) => permissions.some(p => p.module.route_path === path && p.can_view === true);
  if (!allowed('/crm')) return false;
  return allowed('/crm/pipeline');
}

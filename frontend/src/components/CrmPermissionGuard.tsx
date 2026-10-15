import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';

type Permission = { routePath: string; canView: boolean };
export function CrmPermissionGuard() {
  const profile = useAuthStore(state => state.profile);
  const { pathname } = useLocation();
  const permissions = useQuery({ queryKey: ['view-permissions', profile?.id, profile?.roleId], queryFn: async () => (await apiClient.get<Permission[]>('/users/permissions/me')).data, enabled: !!profile?.id, retry: false, staleTime: 0, refetchInterval: 30000 });
  if (!profile || permissions.isPending) return <p className="p-6 text-xs text-gray-500">Comprobando permisos…</p>;
  if (permissions.isError) return <p role="alert" className="p-6 text-xs text-rose-500">No se pudieron comprobar los permisos. Recarga la página.</p>;
  const child = pathname === '/crm' || pathname === '/crm/' ? null : '/crm/' + pathname.split('/')[2];
  const allowed = ['/crm', ...(child ? [child] : [])].every(path => permissions.data?.some(permission => permission.routePath === path && permission.canView));
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

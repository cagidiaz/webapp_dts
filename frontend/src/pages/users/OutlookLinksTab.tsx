import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Laptop, Mail, RefreshCw, Search, ShieldOff } from 'lucide-react';
import { getUsersOutlook, revokeUserOutlookDevice, type ManagedOutlookUser } from '../../api/usersOutlook';
import { useAuthStore } from '../../store/authStore';

const queryKey = ['usersOutlookLinks'];
const connectionLabels = { REGISTERED: 'Conexión registrada', NOT_CONNECTED: 'Sin conexión registrada',
  CONSENT_REQUIRED: 'Requiere consentimiento', RECONNECT_REQUIRED: 'Requiere reconexión' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('es-ES') : 'Sin uso registrado';

export function OutlookLinksTab() {
  const actorId = useAuthStore(state => state.profile?.id);
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: [...queryKey, actorId], queryFn: getUsersOutlook, enabled: !!actorId,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === actorId ? keepPreviousData(previous) : undefined });
  const revoke = useMutation({ mutationFn: revokeUserOutlookDevice,
    onSuccess: async () => { setNotice('Vinculación revocada. El equipo ya no puede preparar nuevas aperturas con ese vínculo.'); await client.invalidateQueries({ queryKey }); await client.invalidateQueries({ queryKey: ['outlookClassicDevices'] }); },
    onError: () => setNotice('No se pudo revocar la vinculación. Actualiza el listado y vuelve a comprobarla.'),
  });
  const users = query.data || [];
  const filtered = useMemo(() => users.filter(user => {
    const text = `${user.firstName || ''} ${user.lastName || ''} ${user.email} ${user.role || ''} ${user.microsoft365.email || ''} ${user.devices.map(device => device.label).join(' ')}`.toLocaleLowerCase();
    if (search.trim() && !text.includes(search.trim().toLocaleLowerCase())) return false;
    if (connectionFilter !== 'ALL' && user.microsoft365.status !== connectionFilter) return false;
    if (deviceFilter === 'NONE') return user.devices.length === 0;
    if (deviceFilter !== 'ALL') return user.devices.some(device => device.status === deviceFilter);
    return true;
  }), [users, search, connectionFilter, deviceFilter]);
  const inputClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-dts-secondary dark:border-gray-700 dark:bg-surface-card-dark dark:text-gray-200';
  const hasError = !!query.error;
  function confirmRevoke(user: ManagedOutlookUser, id: string, label: string) {
    if (window.confirm(`¿Revocar la vinculación de «${label}» de ${user.email}? Impedirá nuevas aperturas desde ese equipo. No elimina correos ni desconecta su cuenta de Microsoft 365.`)) {
      setNotice(''); revoke.mutate(id);
    }
  }
  return <section className="space-y-5" aria-label="Vinculaciones Outlook de usuarios">
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/5 dark:bg-surface-card-dark space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-bold text-dts-primary dark:text-white">Vinculaciones Outlook</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{users.length} usuarios · {users.reduce((count, user) => count + user.devices.filter(device => device.status === 'PAIRED').length, 0)} vinculaciones vigentes</p></div>
        <button type="button" onClick={() => { void query.refetch(); }} disabled={query.isFetching} className="flex items-center gap-2 rounded-xl bg-dts-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} />Actualizar</button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Una vinculación vigente no indica que el ordenador esté encendido. La conexión Microsoft 365 refleja el registro guardado, sin comprobar ahora el acceso al buzón. Un usuario inactivo o sin permisos CRM no puede utilizar su vínculo.</p>
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-[210px] flex-1"><Search size={14} className="absolute left-3 top-2.5 text-gray-400" /><span className="sr-only">Buscar usuario o equipo</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar usuario, correo o equipo…" className={`${inputClass} w-full pl-9`} /></label>
        <label><span className="sr-only">Estado de Microsoft 365</span><select value={connectionFilter} onChange={event => setConnectionFilter(event.target.value)} className={inputClass}><option value="ALL">Microsoft 365: todos</option>{Object.entries(connectionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><span className="sr-only">Estado de vinculación</span><select value={deviceFilter} onChange={event => setDeviceFilter(event.target.value)} className={inputClass}><option value="ALL">Equipos: todos</option><option value="PAIRED">Vinculación vigente</option><option value="REVOKED">Vinculación revocada</option><option value="NONE">Sin equipos vinculados</option></select></label>
      </div>
    </div>
    {notice && <p role="status" className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-dts-primary dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">{notice}</p>}
    {hasError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 p-4 text-xs text-rose-600 dark:border-rose-900 dark:text-rose-400"><AlertCircle size={16} />No se pudieron consultar las vinculaciones. Comprueba tu permiso de administrador y la disponibilidad del backend.</div>}
    {query.isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando vinculaciones…</p>}
    {!query.isLoading && !hasError && filtered.length === 0 && <p className="p-5 text-center text-sm text-gray-500 dark:text-gray-400">No hay usuarios que coincidan con los filtros.</p>}
    {!hasError && filtered.map(user => <article key={user.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-surface-card-dark">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-white/5">
        <div className="min-w-0"><h3 className="font-bold text-dts-primary dark:text-white break-words">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</h3><p className="text-xs text-gray-500 dark:text-gray-400 break-all">{user.email} · {user.role || 'Sin rol'} · {user.isActive ? 'Usuario activo' : 'Usuario inactivo'}</p></div>
        <div className="text-xs text-gray-600 dark:text-gray-300"><p className="flex items-center gap-1.5 font-semibold"><Mail size={13} />{connectionLabels[user.microsoft365.status]}</p>{user.microsoft365.email && <p className="mt-1 break-all">Buzón: {user.microsoft365.email}</p>}<p className="mt-1 text-gray-500 dark:text-gray-400">Última sincronización: {date(user.microsoft365.lastSyncedAt)}</p></div>
      </header>
      {user.devices.length === 0 ? <p className="p-5 text-xs text-gray-500 dark:text-gray-400">Sin equipos vinculados. Outlook Web no necesita un componente Windows.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400"><tr>{['Equipo', 'Estado', 'Versión', 'Vinculado', 'Último uso', 'Gestión'].map(label => <th key={label} className="px-5 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/5">{user.devices.filter(device => !['PAIRED', 'REVOKED'].includes(deviceFilter) || device.status === deviceFilter).map(device => <tr key={device.id} className="text-gray-700 dark:text-gray-200">
        <td className="px-5 py-4"><span className="flex items-center gap-2"><Laptop size={14} /><span className="max-w-[220px] break-words">{device.label}</span></span></td>
        <td className="px-5 py-4"><span className={device.status === 'PAIRED' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>{device.status === 'PAIRED' ? 'Vigente' : 'Revocada'}</span>{device.revokedAt && <p className="mt-1 whitespace-nowrap text-[10px] text-gray-400">{date(device.revokedAt)}</p>}</td>
        <td className="px-5 py-4">{device.version || 'Sin versión registrada'}</td><td className="whitespace-nowrap px-5 py-4">{date(device.pairedAt)}</td><td className="whitespace-nowrap px-5 py-4">{date(device.lastSeenAt)}</td>
        <td className="px-5 py-4">{device.status === 'PAIRED' && <button type="button" disabled={revoke.isPending} onClick={() => confirmRevoke(user, device.id, device.label)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950"><ShieldOff size={13} />{revoke.isPending && revoke.variables === device.id ? 'Revocando…' : 'Revocar'}</button>}</td>
      </tr>)}</tbody></table></div>}
    </article>)}
  </section>;
}

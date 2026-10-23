import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { BookOpen, Download, ExternalLink, Loader2 } from 'lucide-react';
import { getUserManuals, openUserManual, type UserManual } from '../../api/userManuals';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export function ManualsPage() {
  const profile = useAuthStore(state => state.profile);
  const setPageInfo = useUIStore(state => state.setPageInfo);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const manuals = useQuery({ queryKey: ['user-manuals', profile?.id, profile?.roleId], queryFn: getUserManuals, enabled: !!profile?.id, staleTime: 0, refetchInterval: 30000, retry: false });
  useEffect(() => {
    setPageInfo({ title: 'Manuales de usuario', subtitle: 'Guías de uso de la aplicación', icon: <BookOpen size={20} /> });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  const open = async (manual: UserManual, download: boolean) => {
    setError(''); setBusy(manual.id);
    try { await openUserManual(manual, download); }
    catch (err) { setError(isAxiosError(err) ? err.response?.status === 403 ? 'Tu rol ya no tiene acceso a este manual. Contacta con Administración.' : 'No se pudo cargar el manual. Comprueba la conexión y vuelve a intentarlo.' : err instanceof Error ? err.message : 'No se pudo cargar el manual.'); }
    finally { setBusy(null); }
  };

  return <div className="space-y-5 animate-in fade-in duration-300">
    <p className="text-sm text-gray-600 dark:text-gray-400">Consulta las guías en el navegador o descarga el PDF para leerlo sin conexión.</p>
    {error && <p role="alert" className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    {manuals.isPending ? <p role="status" className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={15} className="animate-spin" />Cargando manuales…</p>
      : manuals.isError ? <div role="alert" className="text-sm text-rose-600 dark:text-rose-400">No se pudieron consultar los manuales. <button type="button" className="underline cursor-pointer" onClick={() => void manuals.refetch()}>Reintentar</button></div>
      : manuals.data?.length === 0 ? <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-card-dark p-6 text-sm text-gray-600 dark:text-gray-400">No hay manuales disponibles con tus permisos actuales. Administración puede revisar el acceso a las vistas del CRM desde los ajustes de rol.</div>
      : <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{manuals.data?.map(manual => <article key={manual.id} id={manual.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-card-dark p-5 shadow-card space-y-4">
        <div className="flex items-start gap-3"><BookOpen size={23} className="mt-0.5 shrink-0 text-dts-secondary" /><div className="min-w-0"><h2 className="text-sm font-bold text-dts-primary dark:text-white">{manual.title}</h2><p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{manual.description}</p></div></div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">Versión {manual.version} · Actualizado el {new Date(`${manual.updatedAt}T12:00:00`).toLocaleDateString('es-ES')} · PDF · {(manual.sizeBytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy !== null} onClick={() => void open(manual, false)} className="inline-flex items-center gap-2 rounded-lg bg-dts-primary px-4 py-2 text-xs font-bold text-white dark:bg-dts-secondary dark:text-dts-primary-dark cursor-pointer disabled:opacity-50">{busy === manual.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}Ver PDF</button>
          <button type="button" disabled={busy !== null} onClick={() => void open(manual, true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"><Download size={14} />Descargar PDF</button>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">Uso interno de dTS Instruments. Conserva la fecha de edición al compartir una copia.</p>
      </article>)}</div>}
  </div>;
}

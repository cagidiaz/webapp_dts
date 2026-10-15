import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../api/supabase';

/** Outlook can isolate storage from the main browser; authenticate inside the panel. */
export function OutlookAddinSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let active = true;
    const apply = (value: Session | null) => {
      if (!active) return;
      if (value) localStorage.setItem('access_token', value.access_token);
      setSession(value); setLoading(false);
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, value) => apply(value));
    const expired = () => { setSession(null); setError('La sesión ha caducado. Vuelve a iniciar sesión.'); };
    window.addEventListener('dts:outlook-session-expired', expired);
    return () => { active = false; data.subscription.unsubscribe(); window.removeEventListener('dts:outlook-session-expired', expired); };
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) setError('No se pudo iniciar sesión. Revisa tus credenciales del CRM.');
      else setPassword('');
    } catch { setError('No se pudo conectar con el servicio de acceso.'); }
    finally { setSubmitting(false); }
  }
  if (loading) return <div className="p-4 text-xs text-slate-500">Comprobando sesión del CRM…</div>;
  if (session) return <>
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs bg-gray-50 dark:bg-[#071318] text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-white/10">
      <span className="truncate">{session.user.email}</span>
      <button className="shrink-0 text-dts-primary dark:text-sky-400" onClick={() => { void supabase.auth.signOut({ scope: 'local' }); }}>Cambiar cuenta</button>
    </div>
    {children}
  </>;
  return <div className="min-h-screen bg-gray-50 dark:bg-[#071318] text-gray-800 dark:text-gray-100 p-4 text-xs">
    <form onSubmit={login} className="space-y-3 max-w-sm mx-auto">
      <h1 className="text-sm font-semibold">Acceder a dTS CRM</h1>
      <p>Usa tu cuenta del CRM asociada a la cuenta de Outlook.</p>
      <label className="block">Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 bg-transparent p-2" /></label>
      <label className="block">Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 bg-transparent p-2" /></label>
      {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
      <button disabled={submitting} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{submitting ? 'Accediendo…' : 'Iniciar sesión'}</button>
    </form>
  </div>;
}

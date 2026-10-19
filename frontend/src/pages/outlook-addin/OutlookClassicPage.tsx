import { useEffect, useState, type FormEvent } from 'react';
import { OutlookAddinSession } from './OutlookAddinSession';
import { approveClassicPair, classicDeviceKey, getClassicDevices, revokeClassicDevice, type ClassicDevice } from '../../api/outlookClassic';

function ClassicSetup() {
  const pairingId = new URLSearchParams(window.location.search).get('pair');
  const [code, setCode] = useState('');
  const [devices, setDevices] = useState<ClassicDevice[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('Comprobando configuración…');
  const [busy, setBusy] = useState(false);
  const [packageAvailable, setPackageAvailable] = useState(false);
  async function refresh() {
    try { const result = await getClassicDevices(); setDevices(result.devices); setEnabled(result.enabled); setMessage(result.enabled ? '' : 'La apertura en Classic todavía no está habilitada para tu cuenta.'); }
    catch { setMessage('No se pudo consultar la configuración de Classic. Contacta con el administrador.'); }
  }
  useEffect(() => {
    void refresh();
    void fetch('/downloads/outlook-classic/package.json').then(async response => {
      if (!response.ok) return; const value = await response.json(); setPackageAvailable(['1.0.0','1.1.0','1.1.1','1.1.2'].includes(value.version) && value.file === 'dTS.OutlookClassic.exe');
    }).catch(() => {});
  }, []);
  async function approve(event: FormEvent) {
    event.preventDefault(); if (!pairingId) return;
    setBusy(true);
    try { const result = await approveClassicPair(pairingId, code); localStorage.setItem(classicDeviceKey, result.deviceId); setCode(''); setMessage(`Equipo ${result.label} vinculado. Vuelve al componente Windows y pulsa «Ya he confirmado en el CRM».`); const updated = await getClassicDevices(); setDevices(updated.devices); }
    catch { setMessage('No se pudo vincular: comprueba el código, su caducidad y los permisos de tu cuenta.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-gray-50 dark:bg-[#071318] text-gray-800 dark:text-gray-100 p-5 text-xs"><div className="max-w-xl mx-auto space-y-5">
    <h1 className="text-base font-semibold">Outlook Classic · Equipos vinculados</h1>
    <p>El componente abre el correo exacto en el buzón de Outlook configurado en este usuario de Windows.</p>
    {message && <p role="status" className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">{message}</p>}
    {enabled && pairingId && <form onSubmit={approve} className="space-y-3 rounded-xl border border-gray-200 dark:border-white/10 p-4">
      <label className="block">Código mostrado por el componente de este equipo<input required maxLength={32} autoComplete="off" value={code} onChange={event => setCode(event.target.value)} className="block mt-2 w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-base tracking-widest" /></label>
      <p>Introduce el código que ves en tu componente Windows. No utilices un código enviado por otra persona.</p>
      <button disabled={busy} className="rounded bg-dts-primary text-white px-4 py-2 disabled:opacity-50">{busy ? 'Vinculando…' : 'Vincular este equipo a mi cuenta'}</button>
    </form>}
    {enabled && <section className="space-y-3"><h2 className="font-semibold">Instalación en Windows</h2>
      {packageAvailable ? <a className="inline-block rounded bg-dts-primary text-white px-4 py-2" href="/downloads/outlook-classic/OutlookClassic.zip">Descargar instalador de Outlook Classic</a> : <p>El instalador todavía no está publicado. Puedes seguir abriendo los correos en Outlook Web.</p>}
      <p>Extrae el paquete y ejecuta Instalar_Outlook_dTS.bat desde tu usuario habitual, sin ejecutar como administrador. Completa la vinculación que mostrará el componente.</p>
    </section>}
    <section className="space-y-3"><h2 className="font-semibold">Mis equipos</h2>
      {!devices.length && <p>No hay equipos vinculados.</p>}
      {devices.map(device => <div key={device.id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 flex items-center justify-between gap-3">
        <div><p className="font-semibold">{device.label}</p><p className="text-gray-500 dark:text-gray-400">{device.helper_version ? `Versión ${device.helper_version}` : 'Pendiente de primera apertura confirmada'}</p></div>
        <button disabled={busy} className="text-rose-600 dark:text-rose-400" onClick={async () => { setBusy(true); try { await revokeClassicDevice(device.id); if (localStorage.getItem(classicDeviceKey) === device.id) localStorage.removeItem(classicDeviceKey); await refresh(); } catch { setMessage('No se pudo revocar el equipo.'); } finally { setBusy(false); } }}>Revocar</button>
      </div>)}
    </section>
    <a href="/crm/contacts" className="inline-block text-dts-primary dark:text-sky-400">Volver al CRM</a>
  </div></main>;
}
export function OutlookClassicPage() { return <OutlookAddinSession><ClassicSetup /></OutlookAddinSession>; }

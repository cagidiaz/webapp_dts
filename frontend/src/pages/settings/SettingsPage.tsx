import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { 
  getExchangeStatus, 
  getExchangeConnectUrl, 
  handleExchangeCallback, 
  disconnectExchange, 
  syncExchangeNow,
  getPreferredOutlookClient,
  setPreferredOutlookClient
} from '../../api/exchangeSync';
import { 
  Settings, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Laptop, 
  Globe, 
  ShieldCheck, 
  User, 
  LogOut, 
  Check, 
  Info,
  Sparkles,
  Download,
  Terminal
} from 'lucide-react';


export const SettingsPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setPageInfo({
      title: 'Ajustes Generales',
      subtitle: 'Configuración del sistema y preferencias del CRM',
      icon: <Settings size={20} />,
      infoProps: {
        title: 'Ajustes Generales',
        description: 'Centro de configuración para la integración con Microsoft 365 y selección de cliente predeterminado de Outlook.',
        objective: 'Permitir a cada usuario conectar su buzón de correo corporativo para preparar y enviar emails desde el CRM.',
        source: 'Microsoft Graph API y almacenamiento local de preferencias.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Preferencia local de cliente Outlook
  const [preferredOutlook, setPreferredOutlook] = useState<'desktop' | 'web'>(getPreferredOutlookClient());
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  const [classicPackageAvailable, setClassicPackageAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch('/downloads/outlook-classic/package.json').then(async response => {
      if (!response.ok) return;
      const value = await response.json();
      if (active) setClassicPackageAvailable(value.version === '1.1.2' && value.file === 'dTS.OutlookClassic.exe');
    }).catch(() => {});
    return () => { active = false; };
  }, []);


  // Consulta de estado de Exchange / Microsoft Graph
  const { data: exchangeStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['exchangeStatus'],
    queryFn: getExchangeStatus,
  });

  // Mutación para conectar con Microsoft 365
  const connectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/settings`;
      const { authUrl } = await getExchangeConnectUrl(redirectUri);
      window.location.href = authUrl;
    },
  });

  // Mutación para desconectar cuenta
  const disconnectMutation = useMutation({
    mutationFn: disconnectExchange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
    },
  });

  // Mutación para sincronización manual inmediata
  const syncMutation = useMutation({
    mutationFn: syncExchangeNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
    },
  });

  // Procesar retorno de OAuth de Microsoft si viene con el código en la URL
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const redirectUri = `${window.location.origin}/settings`;
      handleExchangeCallback(code, redirectUri)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
          // Limpiar parámetros de la URL
          setSearchParams({}, { replace: true });
        })
        .catch((err) => {
          console.error('Error al completar vinculación con Microsoft:', err);
          setSearchParams({}, { replace: true });
        });
    }
  }, [searchParams, queryClient, setSearchParams]);

  const handleSelectOutlookClient = (client: 'desktop' | 'web') => {
    setPreferredOutlook(client);
    setPreferredOutlookClient(client);
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2500);
  };

  const handleTestOutlookOpening = () => {
    if (preferredOutlook === 'desktop') {
      const link = document.createElement('a');
      link.href = 'dts-outlook://v1/launch';
      link.style.display = 'none';
      document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); }
      return;
    }
    window.open('https://outlook.office.com/mail/inbox', '_blank', 'noopener,noreferrer');
  };

  const isConnected = exchangeStatus?.isConnected;
  const account = exchangeStatus?.account;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Feedback flotante al cambiar preferencia */}
      {showSaveFeedback && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <Check size={14} className="stroke-3" />
          <span>Preferencia de Outlook guardada en este equipo</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Principal (2 Cols): Microsoft 365 & Preferencia de Outlook */}
        <div className="lg:col-span-2 space-y-8">

          {/* TARJETA 1: Preferencia de Cliente de Outlook */}
          <section className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/10 text-dts-secondary">
                    <Mail className="w-5 h-5" />
                  </span>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Cliente de Outlook Predeterminado
                  </h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 pl-9">
                  Selecciona la aplicación con la que deseas que la WebApp abra tus correos y borradores al trabajar en el CRM.
                </p>
              </div>
            </div>

            {/* Selector Visual Dual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Opción A: Outlook Escritorio */}
              <button
                type="button"
                onClick={() => handleSelectOutlookClient('desktop')}
                className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-4 cursor-pointer ${
                  preferredOutlook === 'desktop'
                    ? 'border-dts-secondary bg-dts-secondary/5 dark:bg-dts-secondary/10 shadow-xs ring-2 ring-dts-secondary/30'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-800/20 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Laptop className="w-6 h-6" />
                  </div>
                  {preferredOutlook === 'desktop' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-dts-secondary text-white">
                      <Check size={11} className="stroke-3" /> Activo
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Outlook de Escritorio (Classic / App)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Abre los mensajes exactos y prepara respuestas en Outlook Classic mediante el componente verificado y la vinculación de este equipo.
                  </p>
                </div>
              </button>

              {/* Opción B: Outlook Web */}
              <button
                type="button"
                onClick={() => handleSelectOutlookClient('web')}
                className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-4 cursor-pointer ${
                  preferredOutlook === 'web'
                    ? 'border-dts-secondary bg-dts-secondary/5 dark:bg-dts-secondary/10 shadow-xs ring-2 ring-dts-secondary/30'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-800/20 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-dts-secondary">
                    <Globe className="w-6 h-6" />
                  </div>
                  {preferredOutlook === 'web' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-dts-secondary text-white">
                      <Check size={11} className="stroke-3" /> Activo
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Outlook Online (Web / M365)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Abre tus correos y redacción directamente en el navegador en Microsoft 365 (outlook.office.com).
                  </p>
                </div>
              </button>
            </div>

            {/* Instalación y vinculación del componente Classic verificado */}
            {preferredOutlook === 'desktop' && (
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 dark:border-blue-400/20 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><Terminal size={16} />Outlook Classic: instalar y vincular este equipo</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Descarga el paquete completo, extráelo y ejecuta Instalar_Outlook_dTS.bat con tu usuario Windows, sin administrador. Después vincula el equipo con tu cuenta del CRM. Si ya estaba instalado pero se perdió la vinculación, utiliza Vincular_Outlook_dTS.bat.</p>
                <div className="flex flex-wrap gap-2">
                  {classicPackageAvailable && <a href="/downloads/outlook-classic/OutlookClassic.zip" className="inline-flex items-center gap-2 rounded-xl bg-dts-primary px-3.5 py-2 text-xs font-bold text-white"><Download size={14} />Descargar instalador de Outlook Classic</a>}
                  <Link to="/outlook-classic" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-dts-secondary dark:border-gray-700">Vincular y gestionar mis equipos</Link>
                </div>
                {!classicPackageAvailable && <p className="text-xs text-gray-500 dark:text-gray-400">El paquete de Classic no está disponible. Puedes utilizar Outlook Web o consultar al administrador.</p>}
                <p className="text-[11px] text-gray-500 dark:text-gray-400">La conexión con Microsoft 365 y la vinculación del equipo son pasos distintos. Descargar el ZIP no confirma la instalación.</p>
              </div>
            )}

            {/* Pie de tarjeta con botón de prueba */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Info size={14} />
                <span>Esta preferencia se memoriza de forma segura en este navegador.</span>
              </div>

              <button
                type="button"
                onClick={handleTestOutlookOpening}
                className="px-3.5 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Probar Apertura en Outlook</span>
              </button>
            </div>
          </section>

          {(
            <p className="text-xs text-gray-500 dark:text-gray-400">La prueba abre Classic o la bandeja de entrada de Outlook Web sin crear borradores. Classic requiere el componente 1.1.1. No comprueba la vinculación ni la apertura de un correo concreto.</p>
          )}
          {/* TARJETA 2: Conexión con Microsoft 365 (Graph API) */}
          <section className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Cuenta de Microsoft 365 (Graph API)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Conexión OAuth 2.0 segura con tu buzón corporativo de dTS Instruments.
                  </p>
                </div>
              </div>

              {/* Badge de Estado */}
              <div>
                {isLoadingStatus ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 animate-pulse">
                    Comprobando estado...
                  </span>
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={13} /> Conectado a Microsoft 365
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle size={13} /> No Conectado
                  </span>
                )}
              </div>
            </div>

            {/* Contenido según el estado */}
            {isConnected ? (
              <div className="space-y-4 bg-gray-50/50 dark:bg-zinc-800/20 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 block mb-0.5">
                      Buzón Conectado
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                      {account?.email || profile?.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 block mb-0.5">
                      Última Sincronización
                    </span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                      {account?.last_synced_at
                        ? new Date(account.last_synced_at).toLocaleString('es-ES')
                        : 'Recién conectada'}
                    </span>
                  </div>
                </div>

                {/* Lista de Permisos Activos */}
                <div className="pt-3 border-t border-gray-200/60 dark:border-white/5 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 block">
                    Servicios Sincronizados
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-2xs">
                      <Calendar size={13} className="text-dts-secondary" />
                      <span>Calendario y Eventos</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-2xs">
                      <Mail size={13} className="text-blue-500" />
                      <span>Preparación de Borradores en Outlook</span>
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200/60 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl border border-gray-200 dark:border-gray-700 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin text-dts-secondary' : ''} />
                    <span>{syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas desconectar tu cuenta de Microsoft 365 de dTS Instruments?')) {
                        disconnectMutation.mutate();
                      }
                    }}
                    disabled={disconnectMutation.isPending}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <LogOut size={13} />
                    <span>Desconectar Cuenta</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-linear-to-br from-gray-50 to-cyan-50/30 dark:from-zinc-800/20 dark:to-cyan-950/20 rounded-xl p-6 border border-gray-100 dark:border-gray-800 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-dts-primary/10 dark:bg-dts-secondary/20 text-dts-primary dark:text-dts-secondary flex items-center justify-center mx-auto">
                  <Sparkles size={24} />
                </div>

                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Conecta tu cuenta de dTS Instruments
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Al vincular tu cuenta de Microsoft 365 podrás preparar borradores de correo directamente desde el CRM y sincronizar tus reuniones y eventos comerciales.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  className="px-5 py-2.5 bg-dts-primary hover:bg-dts-primary/90 text-white font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck size={15} />
                  <span>{connectMutation.isPending ? 'Conectando con Microsoft...' : 'Conectar con Microsoft 365'}</span>
                </button>
              </div>
            )}
          </section>

        </div>

        {/* Columna Lateral (1 Col): Perfil del Usuario & Ayuda */}
        <div className="space-y-6">
          {/* Tarjeta de Perfil del Usuario */}
          <section className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-dts-primary text-white font-black text-base flex items-center justify-center shadow-xs">
                {profile?.firstName ? profile.firstName.charAt(0).toUpperCase() : <User size={20} />}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Usuario dTS' : 'Usuario dTS'}
                </h3>
                <span className="text-xs text-gray-400 font-mono truncate block">
                  {profile?.email}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Rol del Sistema:</span>
                <span className="font-bold px-2 py-0.5 rounded-md bg-dts-primary/10 text-dts-primary dark:bg-dts-secondary/15 dark:text-dts-secondary uppercase tracking-wider text-[10px]">
                  {profile?.roles?.name || 'Comercial'}
                </span>
              </div>
            </div>
          </section>

          {/* Tarjeta de Guía Rápida */}
          <section className="bg-linear-to-br from-dts-primary/5 to-dts-secondary/10 dark:from-zinc-800/40 dark:to-dts-secondary/5 rounded-2xl border border-dts-primary/10 dark:border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-dts-primary dark:text-dts-secondary font-bold text-xs">
              <Info size={15} />
              <span>¿Cómo funciona la integración?</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Al preparar un correo en la ficha de un contacto comercial, la WebApp creará el borrador en tu buzón de Microsoft 365 y abrirá tu cliente de Outlook seleccionado para que puedas revisarlo y enviarlo con un clic.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;

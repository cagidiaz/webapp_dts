import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  getExchangeStatus, 
  getExchangeConnectUrl, 
  handleExchangeCallback, 
  disconnectExchange, 
  syncExchangeNow 
} from '../../../api';
import { RefreshCw, CheckCircle2, AlertCircle, Link2, Unlink, Mail } from 'lucide-react';

export const ExchangeStatusBanner: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['exchangeStatus'],
    queryFn: getExchangeStatus,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  const isConnected = statusData?.isConnected;
  const account = statusData?.account;

  // Mutación para conectar (abrir URL de Microsoft)
  const connectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/crm`;
      const { authUrl } = await getExchangeConnectUrl(redirectUri);
      return authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (_err: any) => {
      setAuthError('No se pudo iniciar la conexión con Microsoft. Verifica la configuración de Azure.');
    }
  });

  // Mutación para procesar callback de Microsoft
  const callbackMutation = useMutation({
    mutationFn: async (code: string) => {
      const redirectUri = `${window.location.origin}/crm`;
      return await handleExchangeCallback(code, redirectUri);
    },
    onSuccess: (data) => {
      setAuthSuccess(`¡Cuenta de Microsoft 365 (${data.email}) conectada exitosamente con el CRM!`);
      // Limpiar parámetros de la URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('code');
      newParams.delete('state');
      newParams.delete('session_state');
      setSearchParams(newParams);
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivities'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact'] });
      setTimeout(() => setAuthSuccess(null), 6000);
    },
    onError: (err: any) => {
      const serverMsg = err?.response?.data?.message || err?.message || 'Error al vincular la cuenta de Microsoft Exchange.';
      setAuthError(serverMsg);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('code');
      setSearchParams(newParams);
    }
  });

  // Detectar si venimos de la redirección de Microsoft con ?code=...
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !callbackMutation.isPending && !callbackMutation.isSuccess) {
      callbackMutation.mutate(code);
    }
  }, [searchParams]);

  // Mutación para sincronizar ahora
  const syncMutation = useMutation({
    mutationFn: syncExchangeNow,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivities'] });
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact'] });
      setAuthSuccess(`Sincronización completada: ${data.syncedEvents} eventos y ${data.syncedEmails} correos actualizados.`);
      setTimeout(() => setAuthSuccess(null), 5000);
    },
    onError: (err: any) => {
      const serverMsg = err?.response?.data?.message || err?.message || 'Error al sincronizar con Exchange. Comprueba tu conexión.';
      setAuthError(serverMsg);
      setTimeout(() => setAuthError(null), 5000);
    }
  });

  // Mutación para desconectar
  const disconnectMutation = useMutation({
    mutationFn: disconnectExchange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
      setAuthSuccess('Cuenta de Microsoft 365 desconectada.');
      setTimeout(() => setAuthSuccess(null), 4000);
    }
  });

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      {/* Indicador de proceso de vinculación */}
      {callbackMutation.isPending && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 rounded-xl text-xs text-cyan-800 dark:text-cyan-200 animate-pulse shadow-sm">
          <RefreshCw size={16} className="animate-spin text-[#00B0B9] shrink-0" />
          <span className="font-semibold flex-1">Completando vinculación con Microsoft 365 / Outlook...</span>
        </div>
      )}

      {/* Toast de Éxito / Error */}
      {authSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium flex-1">{authSuccess}</span>
        </div>
      )}

      {authError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-200 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-medium flex-1">{authError}</span>
        </div>
      )}

      {/* Banner Principal de Integración */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Lado Izquierdo: Icono e Info */}
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
            isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-[#00B0B9] border border-[#00B0B9]/30'
          }`}>
            <Mail size={20} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white tracking-wide">
                Integración Microsoft Exchange / Outlook 365
              </h4>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sin conectar
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-0.5">
              {isConnected ? (
                <span>
                  Buzón: <strong className="text-white">{account?.email}</strong> • Calendario y correos sincronizados automáticamente
                  {account?.last_synced_at && (
                    <span className="text-slate-400 text-[11px] ml-1.5">
                      (Última sync: {new Date(account.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  Conecta tu cuenta de correo Exchange para crear eventos en tu calendario y enviar emails directamente desde el CRM.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Botones de Acción */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {isConnected ? (
            <>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="px-3 py-1.5 bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-600 disabled:opacity-50"
                title="Sincronizar eventos y correos recientes ahora"
              >
                <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin text-[#00B0B9]' : ''} />
                {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Deseas desconectar tu cuenta de Microsoft 365 del CRM?')) {
                    disconnectMutation.mutate();
                  }
                }}
                disabled={disconnectMutation.isPending}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all border border-transparent hover:border-rose-900/40"
                title="Desconectar cuenta de Microsoft 365"
              >
                <Unlink size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="px-4 py-2 bg-[#00B0B9] hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Link2 size={15} />
              {connectMutation.isPending ? 'Conectando...' : 'Conectar con Microsoft 365'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

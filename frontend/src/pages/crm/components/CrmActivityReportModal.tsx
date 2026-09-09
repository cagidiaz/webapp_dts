import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  X, FileText, Download, Calendar, Users, Video, MapPin, 
  Filter, Sparkles, Building2, User, Clock, Loader2 
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getCrmActivitiesAgenda, getCrmActivityCreators } from '../../../api/crmActivities';
import { printActivityReport, exportActivityReportToExcel } from '../../../utils/pdfActivityReport';

interface CrmActivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSalespersonId?: string;
}

type PeriodType = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export const CrmActivityReportModal: React.FC<CrmActivityReportModalProps> = ({
  isOpen,
  onClose,
  initialSalespersonId,
}) => {
  const { profile } = useAuthStore();
  const userRole = (profile?.roles?.name || '').toUpperCase();
  const isAdminOrDireccion = userRole === 'ADMIN' || userRole === 'DIRECCION';

  // Período de fechas
  const [periodType, setPeriodType] = useState<PeriodType>('this_week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Filtro de Comercial (solo modificable si es Admin o Dirección)
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>(
    initialSalespersonId || (!isAdminOrDireccion && profile?.id ? profile.id : '')
  );

  // Tipos de eventos seleccionados (por defecto reuniones, videollamadas y visitas)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['REUNION', 'VIDEOLLAMADA', 'VISITA']);

  // Cargar lista de comerciales para el selector
  const { data: creators = [] } = useQuery({
    queryKey: ['crm-activity-creators'],
    queryFn: getCrmActivityCreators,
    enabled: isOpen && isAdminOrDireccion,
  });

  // Calcular fechas de inicio y fin según el período seleccionado
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let label = '';

    if (periodType === 'this_week') {
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      start.setDate(now.getDate() + distanceToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      label = `Esta Semana (${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodType === 'last_week') {
      const currentDay = now.getDay();
      const distanceToMonday = (currentDay === 0 ? -6 : 1 - currentDay) - 7;
      start.setDate(now.getDate() + distanceToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      label = `Semana Anterior (${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodType === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `Este Mes (${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`;
    } else if (periodType === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = `Mes Anterior (${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`;
    } else {
      label = customStartDate && customEndDate
        ? `Personalizado (${customStartDate} a ${customEndDate})`
        : 'Período Personalizado';
      return {
        startDateStr: customStartDate ? `${customStartDate}T00:00:00.000Z` : undefined,
        endDateStr: customEndDate ? `${customEndDate}T23:59:59.999Z` : undefined,
        periodLabel: label,
      };
    }

    return {
      startDateStr: start.toISOString(),
      endDateStr: end.toISOString(),
      periodLabel: label,
    };
  }, [periodType, customStartDate, customEndDate]);

  // Consulta de actividades según los filtros seleccionados
  const { data: activities = [], isLoading, isFetching } = useQuery({
    queryKey: ['crm-activities-report', startDateStr, endDateStr, selectedSalespersonId, selectedTypes],
    queryFn: () =>
      getCrmActivitiesAgenda({
        startDate: startDateStr,
        endDate: endDateStr,
        salespersonId: isAdminOrDireccion ? (selectedSalespersonId || undefined) : profile?.id,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
      }),
    enabled: isOpen && (periodType !== 'custom' || (!!customStartDate && !!customEndDate)),
  });

  // Toggle de tipos
  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        // Evitar desmarcar todos si solo queda uno
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  // Nombre del comercial seleccionado para el encabezado
  const selectedSalespersonName = useMemo(() => {
    if (!isAdminOrDireccion) {
      return `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.email || 'Comercial';
    }
    if (!selectedSalespersonId) {
      return 'Equipo Comercial Completo (Consolidado)';
    }
    const found = creators.find(c => c.id === selectedSalespersonId);
    if (found) {
      return `${found.first_name || ''} ${found.last_name || ''}`.trim() || found.email;
    }
    return 'Comercial Seleccionado';
  }, [isAdminOrDireccion, selectedSalespersonId, creators, profile]);

  // Contadores y métricas rápidas
  const stats = useMemo(() => {
    const total = activities.length;
    const presenciales = activities.filter(a => a.type === 'REUNION' || a.type === 'VISITA').length;
    const videollamadas = activities.filter(a => a.type === 'VIDEOLLAMADA').length;
    const uniqueClients = new Set(activities.map(a => a.customer?.name || a.client_id).filter(Boolean)).size;
    const uniqueContacts = new Set(activities.map(a => a.contact?.id).filter(Boolean)).size;
    const withConclusions = activities.filter(a => !!a.conclusions?.trim()).length;

    return { total, presenciales, videollamadas, uniqueClients, uniqueContacts, withConclusions };
  }, [activities]);

  // Acción: Imprimir PDF
  const handlePrintPdf = () => {
    if (activities.length === 0) return;
    printActivityReport(activities, {
      periodLabel,
      startDate: startDateStr,
      endDate: endDateStr,
      salespersonName: selectedSalespersonName,
    });
  };

  // Acción: Exportar Excel
  const handleExportExcel = () => {
    if (activities.length === 0) return;
    exportActivityReportToExcel(activities, {
      periodLabel,
      startDate: startDateStr,
      endDate: endDateStr,
      salespersonName: selectedSalespersonName,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-surface-card-dark rounded-2xl shadow-2xl border border-gray-150 dark:border-white/10 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-gray-900 dark:text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-dts-primary/5 via-transparent to-dts-secondary/5 dark:from-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dts-primary/10 dark:bg-dts-secondary/10 flex items-center justify-center text-dts-primary dark:text-dts-secondary shadow-inner">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dts-primary dark:text-white tracking-tight flex items-center gap-2">
                Informe Histórico de Eventos y Reuniones
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-dts-secondary/15 text-dts-secondary border border-dts-secondary/30">
                  PDF & Excel
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exporta y analiza el historial de reuniones presenciales y videollamadas con contactos y clientes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel de Filtros y Configuración */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] space-y-4 shrink-0">
          {/* Selector de Período */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Calendar size={13} className="text-dts-secondary" />
              Período de Análisis
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setPeriodType('this_week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  periodType === 'this_week'
                    ? 'bg-dts-primary text-white shadow-dts-primary/20'
                    : 'bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                Esta Semana
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('last_week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  periodType === 'last_week'
                    ? 'bg-dts-primary text-white shadow-dts-primary/20'
                    : 'bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                Semana Anterior
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('this_month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  periodType === 'this_month'
                    ? 'bg-dts-primary text-white shadow-dts-primary/20'
                    : 'bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('last_month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  periodType === 'last_month'
                    ? 'bg-dts-primary text-white shadow-dts-primary/20'
                    : 'bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                Mes Anterior
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  periodType === 'custom'
                    ? 'bg-dts-primary text-white shadow-dts-primary/20'
                    : 'bg-white dark:bg-surface-card-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                Personalizado...
              </button>

              {/* Rango de fechas si es personalizado */}
              {periodType === 'custom' && (
                <div className="flex items-center gap-2 mt-1 sm:mt-0 animate-in fade-in">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-card-dark text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  />
                  <span className="text-xs text-gray-400">a</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-card-dark text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Filtro de Comercial y Tipos de Eventos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Selector de Comercial (solo para Admin / Dirección) */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-dts-secondary" />
                Comercial / Responsable
              </label>
              {isAdminOrDireccion ? (
                <select
                  value={selectedSalespersonId}
                  onChange={e => setSelectedSalespersonId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-card-dark text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-dts-secondary/40"
                >
                  <option value="">Todos los comerciales (Consolidado)</option>
                  {creators.map(c => {
                    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email;
                    return (
                      <option key={c.id} value={c.id}>
                        {name} ({c.email})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold flex items-center justify-between">
                  <span>{selectedSalespersonName}</span>
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Solo mis eventos</span>
                </div>
              )}
            </div>

            {/* Tipos de Eventos */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Filter size={13} className="text-dts-secondary" />
                Tipos de Eventos a Incluir
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleType('REUNION')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    selectedTypes.includes('REUNION')
                      ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60 shadow-sm'
                      : 'bg-transparent text-gray-400 border-dashed border-gray-300 dark:border-white/10 opacity-60'
                  }`}
                >
                  <Users size={13} />
                  Reunión Presencial
                </button>
                <button
                  type="button"
                  onClick={() => toggleType('VIDEOLLAMADA')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    selectedTypes.includes('VIDEOLLAMADA')
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 shadow-sm'
                      : 'bg-transparent text-gray-400 border-dashed border-gray-300 dark:border-white/10 opacity-60'
                  }`}
                >
                  <Video size={13} />
                  Videollamada
                </button>
                <button
                  type="button"
                  onClick={() => toggleType('VISITA')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    selectedTypes.includes('VISITA')
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60 shadow-sm'
                      : 'bg-transparent text-gray-400 border-dashed border-gray-300 dark:border-white/10 opacity-60'
                  }`}
                >
                  <MapPin size={13} />
                  Visita a Cliente
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Resumen / KPIs */}
        <div className="px-6 py-3 bg-white dark:bg-surface-card-dark border-b border-gray-100 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Eventos</span>
            <div className="text-xl font-black font-mono text-dts-primary dark:text-white mt-0.5">
              {stats.total}
            </div>
            <span className="text-[10px] text-gray-500 font-medium">en el período</span>
          </div>

          <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">Presenciales</span>
            <div className="text-xl font-black font-mono text-teal-700 dark:text-teal-300 mt-0.5">
              {stats.presenciales}
            </div>
            <span className="text-[10px] text-teal-600/70 dark:text-teal-400/70 font-medium">Reuniones y visitas</span>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Videollamadas</span>
            <div className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 mt-0.5">
              {stats.videollamadas}
            </div>
            <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 font-medium">Teams / Online</span>
          </div>

          <div className="p-2.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30">
            <span className="text-[10px] font-bold text-dts-secondary uppercase tracking-wider block">Conclusiones</span>
            <div className="text-xl font-black font-mono text-dts-secondary mt-0.5">
              {stats.withConclusions} <span className="text-xs text-gray-400 font-normal">/ {stats.total}</span>
            </div>
            <span className="text-[10px] text-gray-500 font-medium">{stats.uniqueClients} empresas</span>
          </div>
        </div>

        {/* Vista Previa de Actividades (Scrollable List) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/30 dark:bg-black/10">
          {isLoading || isFetching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="animate-spin text-dts-secondary" size={32} />
              <p className="text-xs font-medium">Consultando eventos del período seleccionado...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/[0.01]">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 mx-auto flex items-center justify-center text-gray-400 mb-3">
                <Calendar size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                No se encontraron eventos para los filtros aplicados
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Prueba a seleccionar otro período de fechas o añade más tipos de eventos (reuniones, videollamadas, visitas).
              </p>
            </div>
          ) : (
            activities.map(act => {
              const dateObj = act.due_date ? new Date(act.due_date) : new Date();
              const formattedDate = act.due_date ? dateObj.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }) : 'Sin fecha';

              const typeLabel = act.type === 'VIDEOLLAMADA' 
                ? 'Videollamada' 
                : act.type === 'VISITA' 
                ? 'Visita Cliente' 
                : 'Reunión Presencial';

              const creatorName = act.creator
                ? `${act.creator.first_name || ''} ${act.creator.last_name || ''}`.trim() || act.creator.email
                : null;

              return (
                <div
                  key={act.id}
                  className="bg-white dark:bg-surface-card-dark border border-gray-150 dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-dts-secondary/40 transition-all space-y-2.5"
                >
                  {/* Encabezado del evento */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                          act.type === 'VIDEOLLAMADA'
                            ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                            : act.type === 'VISITA'
                            ? 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60'
                            : 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60'
                        }`}
                      >
                        {act.type === 'VIDEOLLAMADA' ? (
                          <Video size={11} />
                        ) : act.type === 'VISITA' ? (
                          <MapPin size={11} />
                        ) : (
                          <Users size={11} />
                        )}
                        {typeLabel}
                      </span>

                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        {formattedDate} {act.time_scheduled ? `a las ${act.time_scheduled}` : ''}
                      </span>
                    </div>

                    {creatorName && (
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-md border border-gray-150 dark:border-white/5">
                        <User size={11} className="text-dts-secondary" />
                        {creatorName}
                      </span>
                    )}
                  </div>

                  {/* Contacto y Empresa */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1 text-dts-primary dark:text-white font-bold">
                      <Building2 size={13} className="text-dts-primary dark:text-dts-secondary" />
                      {act.customer?.name || 'Empresa no asignada'}
                    </span>
                    {act.contact && (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <User size={13} className="text-gray-400" />
                        {act.contact.first_name} {act.contact.last_name || ''}
                        {act.contact.job_title && (
                          <span className="text-gray-400 font-normal">({act.contact.job_title})</span>
                        )}
                      </span>
                    )}
                    {act.location && (
                      <span className="flex items-center gap-1 text-gray-500 text-[11px]">
                        <MapPin size={12} className="text-gray-400" />
                        {act.location}
                      </span>
                    )}
                  </div>

                  {/* Concepto / Título */}
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {act.title}
                  </div>

                  {/* Detalle / Descripción */}
                  {act.description && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50/70 dark:bg-white/[0.02] p-2.5 rounded-lg border border-gray-150 dark:border-white/5 leading-relaxed">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                        Detalle / Temas tratados:
                      </span>
                      {act.description}
                    </div>
                  )}

                  {/* Conclusiones / Acuerdos */}
                  {act.conclusions && (
                    <div className="text-xs text-dts-primary dark:text-teal-200 bg-teal-50/60 dark:bg-teal-950/20 p-2.5 rounded-lg border border-teal-200 dark:border-teal-800/40 leading-relaxed">
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                        <Sparkles size={11} /> Conclusiones y Acuerdos:
                      </span>
                      {act.conclusions}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Barra de Acciones / Pie de Modal */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-surface-card-dark flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Mostrando <strong className="text-gray-800 dark:text-white">{activities.length}</strong> eventos listos para exportar.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={activities.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download size={14} />
              Exportar en Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={activities.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-dts-primary hover:bg-dts-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-dts-primary/20 transition-all active:scale-[0.98]"
            >
              <FileText size={15} />
              Generar e Imprimir PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

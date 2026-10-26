import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  getAllCrmQuotes, 
  getOfferCloseReasons,
  updateCrmQuote, 
  getQuoteActivities, 
  addQuoteActivity, 
  updateQuoteActivity, 
  deleteQuoteActivity, 
  type CRMQuote
} from '../../../api/quotes';
import { getContacts } from '../../../api/contacts';
import { getCustomerSalespersons } from '../../../api/customers';
import { formatCurrency, formatNumber, offerDateInputValue } from '../../../api/formatters';
import { 
  Briefcase, Euro, Percent, Sparkles, AlertTriangle, 
  Search, Calendar, User, Mail, Phone, Plus, Trash2,
  Table, LayoutGrid, ArrowRight, X, Info
} from 'lucide-react';
import { KPISkeleton, InfoPopover } from '../../../components/ui';
import { Drawer } from '../../../components/shared';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { useAuthStore } from '../../../store/authStore';

const LEGACY_STAGES = [
  { id: 'borrador', label: 'Borrador', color: 'border-t-slate-400 bg-slate-500/5' },
  { id: 'enviada', label: 'Enviada', color: 'border-t-blue-400 bg-blue-500/5' },
  { id: 'en negociación', label: 'En Negociación', color: 'border-t-amber-400 bg-amber-500/5' },
  { id: 'ganada', label: 'Ganada', color: 'border-t-emerald-400 bg-emerald-500/5' },
  { id: 'perdida', label: 'Perdida', color: 'border-t-rose-400 bg-rose-500/5' }
];

const PILOT_STAGES = [
  { id: 'preliminar', label: 'Preliminar', color: 'border-t-slate-400 bg-slate-500/5' },
  { id: 'presentada', label: 'Presentada', color: 'border-t-blue-400 bg-blue-500/5' },
  { id: 'evaluación', label: 'Evaluación', color: 'border-t-cyan-400 bg-cyan-500/5' },
  { id: 'negociación', label: 'Negociación', color: 'border-t-amber-400 bg-amber-500/5' },
  { id: 'aprobación', label: 'Aprobación', color: 'border-t-violet-400 bg-violet-500/5' },
  { id: 'aceptada', label: 'Aceptada', color: 'border-t-emerald-400 bg-emerald-500/5' },
];
const PILOT_PROB: Record<string, number> = { preliminar: 5, presentada: 20, evaluación: 35, negociación: 55, aprobación: 75, aceptada: 90, ganada: 100, perdida: 0 };
const PILOT_STAGE_DESC: Record<string, string> = {
  preliminar: 'Oferta en elaboración inicial o alcance exploratorio. Probabilidad baja de cierre.',
  presentada: 'Oferta enviada formalmente al cliente para su estudio y consideración.',
  evaluación: 'Evaluación técnica activa, comparativas de producto o pruebas en curso por parte del cliente.',
  negociación: 'Negociación activa de condiciones económicas, plazos de entrega o términos contractuales.',
  aprobación: 'Pendiente de aprobación presupuestaria o firma formal por parte del cliente.',
  aceptada: 'Conformidad verbal o pre-adjudicación recibida. La oferta permanece viva en el embudo hasta formalización.',
};
const displayPhase = (phase: string | null | undefined) => ({borrador:'preliminar', enviada:'presentada', 'en negociación':'negociación'}[phase?.toLowerCase().trim() || ''] || phase?.toLowerCase().trim() || 'preliminar');
export const CrmPipeline: React.FC<{ pilotMode?: boolean; canEditPilot?: boolean; contactId?: string }> = ({ pilotMode = false, canEditPilot = false, contactId }) => {
  const STAGES = pilotMode ? PILOT_STAGES : LEGACY_STAGES;
  const [closedFilter, setClosedFilter] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionType, setTransitionType] = useState('');
  const [transitionDate, setTransitionDate] = useState('');
  const canEdit = (quote: CRMQuote) => !pilotMode || canEditPilot && quote.followup_source === 'APP';
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<CRMQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // State Change Modal States
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [pendingDropQuote, setPendingDropQuote] = useState<CRMQuote | null>(null);
  const [targetStage, setTargetStage] = useState<string>('');
  const [stateChangeNotes, setStateChangeNotes] = useState<string>('');
  const [stateChangeActivityType, setStateChangeActivityType] = useState<string>('Nota');
  const { data: closeReasons } = useQuery({
    queryKey: ['offer-close-reasons', profile?.id, profile?.roleId],
    queryFn: getOfferCloseReasons,
    enabled: selectedQuote?.followup_source === 'APP' || pendingDropQuote?.followup_source === 'APP',
  });

  // Activity Form State
  const [newActivityType, setNewActivityType] = useState('Llamada');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [newActivityDate, setNewActivityDate] = useState(new Date().toISOString().split('T')[0]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Salespersons
  const { data: salespersons } = useQuery({
    queryKey: ['customer-salespersons', profile?.id],
    queryFn: getCustomerSalespersons,
    enabled: !!profile?.id,
  });

  // Automatically restrict filter to user salesperson code if role is VENTAS/OPERACIONES/PRODUCCION
  const userRole = (profile?.roles?.name || '').toUpperCase();
  const isCommercial = userRole === 'VENTAS' || userRole === 'OPERACIONES' || userRole === 'PRODUCCION' || userRole === 'TESTER';

  useEffect(() => {
    if (isCommercial && profile?.code) {
      setSalespersonFilter(profile.code);
    }
  }, [isCommercial, profile]);

  // View Mode & Year Filter States
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= 2022; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Fetch CRM Quotes
  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-quotes', debouncedSearch, isCommercial ? profile?.code : salespersonFilter, typeFilter, yearFilter, contactId],
    queryFn: () => getAllCrmQuotes({
      search: debouncedSearch,
      contactId,
      salespersonCode: (isCommercial ? profile?.code : salespersonFilter) || undefined,
      ofertaType: typeFilter || undefined,
      year: yearFilter ? Number(yearFilter) : undefined
    }),
    placeholderData: keepPreviousData,
    enabled: !!profile && (!isCommercial || !!profile.code),
  });

  // Fetch Activities
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ['crm-quote-activities', selectedQuote?.id],
    queryFn: () => getQuoteActivities(selectedQuote!.id),
    enabled: !!selectedQuote,
  });

  // Fetch contacts for the selected quote's customer
  const { data: contacts = [] } = useQuery({
    queryKey: ['quoteCustomerContacts', selectedQuote?.customer_no],
    queryFn: () => getContacts({ clientId: selectedQuote!.customer_no }),
    enabled: !!selectedQuote?.customer_no,
  });

  const assignedContact = useMemo(() => {
    if (!selectedQuote || !contacts || contacts.length === 0) return null;
    return contacts.find(c => c.contact_no === selectedQuote.contacto_id) || 
           contacts.find(c => c.id === selectedQuote.contacto_id) || 
           contacts.find(c => c.name === selectedQuote.contacto_nombre) || 
           contacts[0];
  }, [contacts, selectedQuote]);

  // Mutación: Actualizar metadatos de oferta
  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      // La versión es la de la ficha/arrastre abiertos, no la de una lista refrescada en segundo plano.
      const loaded = pendingDropQuote?.id === id ? pendingDropQuote : selectedQuote?.id === id ? selectedQuote : quotes.find(quote => quote.id === id);
      return updateCrmQuote(id, { ...data, ...(loaded?.followup_version ? { followup_version: loaded.followup_version } : {}) });
    },
    onSuccess: (saved, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
      refetch();
      if (selectedQuote && selectedQuote.id === variables.id) {
        setSelectedQuote(prev => prev ? { ...prev, ...variables.data, ...(saved.source === 'APP' ? { followup_version: saved.version, valor_oferta_ponderado: prev.amount * Number(saved.probabilidad_exito ?? prev.probabilidad_exito) / 100 } : {}) } : null);
      }
    }
  });

  // Mutaciones de Actividades
  const addActivityMutation = useMutation({
    mutationFn: (actData: any) => addQuoteActivity(selectedQuote!.id, actData),
    onSuccess: () => {
      setNewActivityNotes('');
      refetchActivities();
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
      refetch();
    }
  });

  const toggleActivityMutation = useMutation({
    mutationFn: ({ actId, hecho }: { actId: string, hecho: boolean }) => 
      updateQuoteActivity(actId, { hecho }),
    onSuccess: () => {
      refetchActivities();
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (actId: string) => deleteQuoteActivity(actId),
    onSuccess: () => {
      refetchActivities();
    }
  });

  // Calcular KPIs
  const kpis = useMemo(() => {
    let activePipeline = 0;
    let weightedForecast = 0;
    let wonAmount = 0;
    let lostAmount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let overdueCount = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    quotes.forEach(q => {
      const state = q.estado_oferta ? q.estado_oferta.toLowerCase().trim() : '';
      const amt = q.amount;
      
      const isWon = state === 'ganada';
      const isLost = state === 'perdida';

      if (!isWon && !isLost) {
        activePipeline += amt;
        weightedForecast += q.valor_oferta_ponderado;
      }

      if (isWon) {
        wonAmount += amt;
        wonCount++;
      } else if (isLost) {
        lostAmount += amt;
        lostCount++;
      }

      if (q.fecha_proxima_accion && !isWon && !isLost) {
        const nextActionDate = new Date(q.fecha_proxima_accion);
        nextActionDate.setHours(0,0,0,0);
        if (nextActionDate < today) {
          overdueCount++;
        }
      }
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;

    return {
      activePipeline,
      weightedForecast,
      winRate,
      overdueCount,
      wonAmount,
      lostAmount
    };
  }, [quotes]);

  // Agrupar ofertas por columna
  const groupedQuotes = useMemo(() => {
    const groups: Record<string, CRMQuote[]> = Object.fromEntries(STAGES.map(stage => [stage.id, []]));
    quotes.forEach(q => {
      const stage = pilotMode ? displayPhase(q.estado_oferta) : (q.estado_oferta || 'borrador').toLowerCase().trim();
      if (groups[stage]) groups[stage].push(q);
      else if (!pilotMode) groups.borrador.push(q);
    });
    return groups;
  }, [quotes, pilotMode]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => {
      setDraggingId(id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    setDraggingId(null);

    const quote = quotes.find(q => q.id === id);
    if (!quote || !canEdit(quote)) return;

    const currentStage = (quote.estado_oferta || '').toLowerCase().trim();
    const targetStageLower = targetStage.toLowerCase().trim();

    if (currentStage === targetStageLower) return;

    setPendingDropQuote(quote);
    setTargetStage(targetStageLower);
    setStateChangeNotes('');
    setTransitionReason('');
    setTransitionType(quote.oferta_type || '');
    setTransitionDate(quote.cierreprev_date?.split('T')[0] || '');
    setStateChangeActivityType('Nota');
    setIsStateModalOpen(true);
  };

  const handleConfirmStateChange = async (onlyChange = false) => {
    if (!pendingDropQuote || !canEdit(pendingDropQuote)) return;
    if (pilotMode) {
      if (!stateChangeNotes.trim() || !transitionType || !transitionDate || (['ganada','perdida'].includes(targetStage) && !transitionReason)) return;
      updateQuoteMutation.mutate({ id: pendingDropQuote.id, data: {
        estado_oferta: targetStage, probabilidad_exito: PILOT_PROB[targetStage],
        oferta_type: transitionType, cierreprev_date: transitionDate,
        transition_note: stateChangeNotes.trim(), transition_activity_type: stateChangeActivityType,
        ...(targetStage === 'ganada' ? {motivo_ganada: transitionReason} : targetStage === 'perdida' ? {motivo_perdida: transitionReason} : {}),
      } }, { onSuccess: () => {
        queryClient.invalidateQueries({queryKey:['crm-quote-activities',pendingDropQuote.id]});
        setIsStateModalOpen(false); setPendingDropQuote(null);
      } });
      return;
    }

    let prob = pendingDropQuote.probabilidad_exito;
    const stage = targetStage.toLowerCase();
    if (stage === 'borrador') prob = 10;
    else if (stage === 'enviada') prob = 25;
    else if (stage === 'en negociación') prob = 50;
    else if (stage === 'ganada') prob = 100;
    else if (stage === 'perdida') prob = 0;

    const updateData: any = {
      estado_oferta: targetStage,
      probabilidad_exito: prob
    };

    if (!onlyChange && stateChangeNotes.trim()) {
      if (targetStage === 'ganada') {
        updateData.motivo_ganada = stateChangeNotes;
      } else if (targetStage === 'perdida') {
        updateData.motivo_perdida = stateChangeNotes;
      }
    }

    updateQuoteMutation.mutate({
      id: pendingDropQuote.id,
      data: updateData
    }, {
      onSuccess: async () => {
        try {
          const fromStage = (pendingDropQuote.estado_oferta || 'borrador').toUpperCase();
          const toStage = targetStage.toUpperCase();
          
          if (!onlyChange && stateChangeNotes.trim()) {
            await addQuoteActivity(pendingDropQuote.id, {
              tipo: stateChangeActivityType,
              notas: `Cambio de estado [${fromStage} -> ${toStage}]. Motivo: ${stateChangeNotes}`,
              fecha: new Date().toISOString(),
              hecho: true
            });
          } else {
            await addQuoteActivity(pendingDropQuote.id, {
              tipo: 'Sistema',
              notas: `Cambio de estado automático [${fromStage} -> ${toStage}]`,
              fecha: new Date().toISOString(),
              hecho: true
            });
          }
        } catch (err) {
          console.error("Error al registrar actividad del cambio de estado:", err);
        }

        setIsStateModalOpen(false);
        setPendingDropQuote(null);
        queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
        queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', pendingDropQuote.id] });
        refetch();
      }
    });
  };

  const openDrawer = (quote: CRMQuote) => {
    setSelectedQuote(quote);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (newStage: string) => {
    if (!selectedQuote || !canEdit(selectedQuote)) return;
    if (pilotMode) {
      setPendingDropQuote(selectedQuote); setTargetStage(newStage); setStateChangeNotes('');
      setTransitionReason(''); setTransitionType(selectedQuote.oferta_type || '');
      setTransitionDate(selectedQuote.cierreprev_date?.split('T')[0] || '');
      setIsStateModalOpen(true); return;
    }

    let prob = selectedQuote.probabilidad_exito;
    const stage = newStage.toLowerCase();
    if (stage === 'borrador') prob = 10;
    else if (stage === 'enviada') prob = 25;
    else if (stage === 'en negociación') prob = 50;
    else if (stage === 'ganada') prob = 100;
    else if (stage === 'perdida') prob = 0;

    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      data: { 
        estado_oferta: newStage,
        probabilidad_exito: prob 
      }
    });
  };

  const handleFieldsChange = (fields: Record<string, any>) => {
    if (!selectedQuote || !canEdit(selectedQuote)) return;
    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      data: fields
    });
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    handleFieldsChange({ [fieldName]: value });
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityNotes.trim() || !selectedQuote || !canEdit(selectedQuote)) return;

    addActivityMutation.mutate({
      tipo: newActivityType,
      notas: newActivityNotes,
      fecha: new Date(newActivityDate).toISOString()
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const actionDate = new Date(dateStr);
    actionDate.setHours(0,0,0,0);
    return actionDate < today;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton />
        </div>
        <div className="grid grid-cols-5 gap-4 h-[600px]">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white dark:bg-surface-card-dark rounded-xl p-4 border border-gray-100 dark:border-gray-800 animate-pulse space-y-4">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pipeline Activo</span>
            <Euro size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
          </div>
          <div className="text-2xl font-black font-mono text-dts-primary dark:text-white">
            {formatCurrency(kpis.activePipeline, 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            {pilotMode ? 'Ofertas abiertas, desde Preliminar hasta Aceptada' : 'Ofertas en borrador, enviadas y negociación'}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Previsión Ponderada <InfoPopover title="Valor Ponderado (Forecast)" description="Suma de Importes multiplicados por su Probabilidad de Éxito en ofertas abiertas." formulas="Sumatorio(Importe * Probabilidad / 100)" iconSize={10} />
            </span>
            <Sparkles size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
          </div>
          <div className="text-2xl font-black font-mono text-dts-secondary">
            {formatCurrency(kpis.weightedForecast, 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Ingresos previstos según probabilidades
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tasa de Cierre</span>
            <Percent size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-500">
            {formatNumber(kpis.winRate, 1)}%
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Porcentaje de éxito (Ganadas vs Total Cerrado)
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Seguimiento Vencido</span>
            <AlertTriangle size={18} className="text-gray-400 group-hover:text-rose-500 transition-colors" />
          </div>
          <div className={`text-2xl font-black font-mono ${kpis.overdueCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            {kpis.overdueCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Ofertas con acción de seguimiento retrasada
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:max-w-xs relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por Nº Oferta, cliente..." 
            className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">Año:</span>
            <select 
              className="block pl-2 pr-8 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {!isCommercial && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Comercial:</span>
              <select 
                className="block pl-2 pr-8 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
                value={salespersonFilter}
                onChange={(e) => setSalespersonFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {salespersons?.map(sp => (
                  <option key={sp.code} value={sp.code}>{sp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">Tipo:</span>
            <select 
              className="block pl-2 pr-8 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="proyecto">Proyecto</option>
              <option value="cliente nuevo">Cliente Nuevo</option>
              <option value="cliente existente">Cliente Existente</option>
            </select>
          </div>

          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-dts-primary-dark">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-dts-primary text-white dark:bg-dts-secondary' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
              title="Vista Tablero"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Tablero</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-dts-primary text-white dark:bg-dts-secondary' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
              title="Vista Tabla"
            >
              <Table size={14} />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {pilotMode && <div className="flex gap-2 text-xs">
        <button onClick={() => {setClosedFilter(''); setViewMode('kanban');}} className="px-3 py-2 rounded-lg border dark:border-white/10">Ofertas abiertas</button>
        <button onClick={() => {setClosedFilter('ganada'); setViewMode('table');}} className="px-3 py-2 rounded-lg border dark:border-white/10">Ganadas · {formatCurrency(kpis.wonAmount)}</button>
        <button onClick={() => {setClosedFilter('perdida'); setViewMode('table');}} className="px-3 py-2 rounded-lg border dark:border-white/10">Perdidas · {formatCurrency(kpis.lostAmount)}</button>
        <button onClick={() => {setClosedFilter(''); setViewMode('table');}} className="px-3 py-2 rounded-lg border dark:border-white/10">Todas en tabla</button>
      </div>}
      {/* Kanban / Table View Conditional Rendering */}
      {viewMode === 'kanban' ? (
        <div className={pilotMode ? "grid grid-cols-6 gap-0 min-w-0 h-[calc(100vh-390px)] min-h-[450px] pb-3" : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-[calc(100vh-390px)] min-h-[450px]"}>
          {STAGES.map(stage => {
            const stageQuotes = groupedQuotes[stage.id] || [];
            
            return (
              <div 
                key={stage.id}
                style={pilotMode ? { minWidth: 0 } : undefined}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="bg-gray-50/50 dark:bg-white/1 rounded-xl border border-gray-200/50 dark:border-white/5 flex flex-col h-full overflow-hidden"
              >
                <div className={`${pilotMode ? 'px-2 py-4 gap-1 flex-wrap' : 'p-4'} border-t-4 ${stage.color} border-b border-b-gray-200/60 dark:border-b-white/5 bg-white dark:bg-surface-card-dark flex justify-between items-center`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
                      {stage.label}
                    </span>
                    {pilotMode && PILOT_PROB[stage.id] !== undefined && (
                      <span className="text-[10px] font-bold text-dts-secondary whitespace-nowrap">
                        {PILOT_PROB[stage.id]}%
                      </span>
                    )}
                    {pilotMode && PILOT_STAGE_DESC[stage.id] && (
                      <div className="relative group/info">
                        <Info size={13} className="text-gray-400 hover:text-dts-secondary transition-colors cursor-help flex-shrink-0" />
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-3 bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50 pointer-events-none">
                          <span className="font-bold text-gray-800 dark:text-white block mb-1">{stage.label} · {PILOT_PROB[stage.id]}%</span>
                          {PILOT_STAGE_DESC[stage.id]}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">
                    {stageQuotes.length}
                  </span>
                </div>

                <div className={`flex-1 min-w-0 ${pilotMode ? 'px-1 py-3' : 'p-3'} overflow-y-auto custom-scrollbar space-y-3`}>
                  {stageQuotes.length === 0 ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl py-10">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Soltar aquí</span>
                    </div>
                  ) : (
                    stageQuotes.map(quote => {
                      const isTaskOverdue = isOverdue(quote.fecha_proxima_accion);
                      
                      return (
                        <div
                           key={quote.id}
                           draggable={canEdit(quote)}
                           onDragStart={(e) => handleDragStart(e, quote.id)}
                           onDragEnd={handleDragEnd}
                           onClick={() => openDrawer(quote)}
                           className={`bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-200/60 dark:border-white/5 shadow-sm hover:shadow-md hover:border-dts-secondary/50 dark:hover:border-dts-secondary/40 cursor-pointer transition-all duration-200 relative group ${
                             draggingId === quote.id ? 'opacity-30 border-dashed scale-95' : 'opacity-100'
                           }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold font-mono text-dts-primary dark:text-dts-secondary">
                              <span className="whitespace-nowrap">{quote.document_no}</span>
                              {quote.followup_source && <span className="block text-[9px] font-normal text-gray-400">Seguimiento {quote.followup_source === 'APP' ? 'app' : 'BC'}</span>}
                            </span>
                            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold">
                              {quote.oferta_type}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate mb-4">
                            {quote.customer_name}
                          </h4>

                          <div className="flex justify-between items-end border-t border-gray-50 dark:border-white/5 pt-3">
                            <div>
                              <span className="text-[9px] text-gray-400 font-medium block">Importe</span>
                              <span className="text-xs font-mono font-black text-gray-900 dark:text-white">
                                {formatCurrency(quote.amount, 0)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-gray-400 font-medium block">Ponderado</span>
                              <span className="text-xs font-mono font-black text-dts-secondary">
                                {formatCurrency(quote.valor_oferta_ponderado, 0)}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-50 dark:border-white/5 text-[9px] font-medium text-gray-500">
                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              <Percent size={8} /> {quote.probabilidad_exito}%
                            </span>

                            {quote.fecha_proxima_accion ? (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                isTaskOverdue 
                                  ? 'bg-rose-500/10 text-rose-500 font-bold animate-pulse' 
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                <Calendar size={8} />
                                {new Date(quote.fecha_proxima_accion).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'})}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">Sin seguimiento</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-200/60 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                <tr className="text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Nº Oferta</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Comercial</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-right">Probabilidad</th>
                  <th className="px-4 py-3 text-right">Ponderado</th>
                  <th className="px-4 py-3">Próxima Acción</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-xs text-gray-400 font-medium">
                      No se encontraron ofertas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  quotes.filter(q => !pilotMode || !closedFilter || q.estado_oferta === closedFilter).map(quote => {
                    const isTaskOverdue = isOverdue(quote.fecha_proxima_accion);
                    const stateLower = (quote.estado_oferta || '').toLowerCase();
                    let stageBadgeColor = 'bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400 border border-slate-100 dark:border-slate-900/30';
                    if (stateLower === 'enviada') {
                      stageBadgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
                    } else if (stateLower === 'en negociación') {
                      stageBadgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
                    } else if (stateLower === 'ganada') {
                      stageBadgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
                    } else if (stateLower === 'perdida') {
                      stageBadgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
                    }
                    
                    return (
                      <tr 
                        key={quote.id}
                        onClick={() => openDrawer(quote)}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-bold font-mono text-xs text-dts-primary dark:text-dts-secondary whitespace-nowrap">
                          {quote.document_no}
                          {quote.followup_source && <span className="ml-2 text-[9px] font-normal text-gray-400">Seguimiento {quote.followup_source === 'APP' ? 'app' : 'BC'}</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {quote.document_date ? new Date(quote.document_date).toLocaleDateString() : '---'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 dark:text-white text-xs">{quote.customer_name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{quote.customer_no}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                          {quote.salesperson_name}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold">
                            {quote.oferta_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-xs text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(quote.amount, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {quote.probabilidad_exito}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-xs text-dts-secondary whitespace-nowrap">
                          {formatCurrency(quote.valor_oferta_ponderado, 0)}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {quote.fecha_proxima_accion ? (
                            <div className="flex flex-col">
                              <span className={`font-medium text-[11px] truncate max-w-[150px] ${isTaskOverdue ? 'text-rose-500 font-bold' : 'text-gray-900 dark:text-white'}`}>
                                {quote.proxima_accion || 'Seguimiento'}
                              </span>
                              <span className={`text-[10px] flex items-center gap-1 ${isTaskOverdue ? 'text-rose-500 font-bold' : 'text-gray-500'}`}>
                                <Calendar size={10} />
                                {new Date(quote.fecha_proxima_accion).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">Sin seguimiento</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${stageBadgeColor}`}>
                            {quote.estado_oferta}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Quote Details & Activities */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Oportunidad: ${selectedQuote?.document_no || ''}`}
        size="2xl"
      >
        {selectedQuote && (
          <fieldset disabled={pilotMode && !canEdit(selectedQuote)} className="space-y-6 pb-12 min-w-0">
            {updateQuoteMutation.isError && <p role="alert" className="text-xs text-rose-500">No se pudo guardar. Revisa los datos y recarga la oferta si su versión ha cambiado.</p>}
            <div className="bg-slate-50 dark:bg-white/2 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-4">
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Cliente</span>
                <span className="text-sm font-normal text-gray-900 dark:text-white block mt-0.5">{selectedQuote.customer_name}</span>
                <span className="text-xs text-gray-500 font-mono mt-0.5 block">{selectedQuote.customer_no}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Importe Original</span>
                  <span className="text-base font-black text-gray-900 dark:text-white font-mono block mt-0.5">
                    {formatCurrency(selectedQuote.amount, 2)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Previsión Ponderada</span>
                  <span className="text-base font-black text-dts-secondary font-mono block mt-0.5">
                    {formatCurrency(selectedQuote.valor_oferta_ponderado, 2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Fields Form */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/10 pb-2">Parámetros Comerciales</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Estado de la Oferta</label>
                  <select 
                    disabled={!canEdit(selectedQuote)}
                    value={pilotMode ? displayPhase(selectedQuote.estado_oferta) : (selectedQuote.estado_oferta || 'borrador').toLowerCase().trim()}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  >
                    {(pilotMode ? [...STAGES, ...LEGACY_STAGES.filter(s => ['ganada','perdida'].includes(s.id))] : STAGES).map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Probabilidad de Éxito</label>
                  <select 
                    disabled={pilotMode}
                    value={selectedQuote.probabilidad_exito} 
                    onChange={(e) => handleFieldChange('probabilidad_exito', Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  >
                    {pilotMode && <option value={selectedQuote.probabilidad_exito}>{selectedQuote.probabilidad_exito}% · según fase</option>}
                    <option value={10}>10% - Inicial</option>
                    <option value={25}>25% - Revisiones</option>
                    <option value={50}>50% - Entregada Pesimista</option>
                    <option value={75}>75% - Entregada Optimista</option>
                    <option value={100}>100% - Pedido Confirmado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Oferta</label>
                  <select 
                    value={selectedQuote.oferta_type} 
                    onChange={(e) => handleFieldChange('oferta_type', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  >
                    <option value="proyecto">Proyecto</option>
                    <option value="cliente nuevo">Cliente Nuevo</option>
                    <option value="cliente existente">Cliente Existente</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cierre Previsto</label>
                    <input 
                      type="date" 
                      value={selectedQuote.cierreprev_date ? selectedQuote.cierreprev_date.split('T')[0] : ''}
                      onChange={(e) => handleFieldChange('cierreprev_date', e.target.value || null)}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Finalización Oferta</label>
                    <input 
                      type="date" 
                      disabled
                      value={offerDateInputValue(selectedQuote.confirmacion_date)}
                      className="w-full bg-slate-50/50 dark:bg-slate-800/10 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-lg p-2 cursor-not-allowed"
                    />
                  </div>
                </div>

                {selectedQuote.estado_oferta?.toLowerCase().trim() === 'ganada' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Motivo de Ganada</label>
                    {selectedQuote.followup_source === 'APP' ? <select
                      value={selectedQuote.motivo_ganada || ''}
                      onChange={(e) => handleFieldChange('motivo_ganada', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    >
                      <option value="" disabled>Selecciona un motivo</option>
                      {(closeReasons?.ganada || []).map(reason => <option key={reason} value={reason}>{reason}</option>)}
                    </select> : <textarea
                      placeholder="Indica las razones del éxito..."
                      value={selectedQuote.motivo_ganada || ''}
                      onChange={(e) => handleFieldChange('motivo_ganada', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    />}
                  </div>
                )}

                {selectedQuote.estado_oferta?.toLowerCase().trim() === 'perdida' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-rose-500 uppercase mb-1">Motivo de Perdida</label>
                    {selectedQuote.followup_source === 'APP' ? <select
                      value={selectedQuote.motivo_perdida || ''}
                      onChange={(e) => handleFieldChange('motivo_perdida', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    >
                      <option value="" disabled>Selecciona un motivo</option>
                      {(closeReasons?.perdida || []).map(reason => <option key={reason} value={reason}>{reason}</option>)}
                    </select> : <textarea
                      placeholder="¿Por qué se ha descartado la oferta? (Precio, Competencia, Plazo...)"
                      value={selectedQuote.motivo_perdida || ''}
                      onChange={(e) => handleFieldChange('motivo_perdida', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    />}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/10 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary">Información del Comprador</h4>
                {assignedContact && (
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-955/35 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    Contacto vinculado
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={14} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Nombre del contacto"
                    value={assignedContact?.name || selectedQuote.contacto_nombre || 'Sin contacto asignado'}
                    readOnly
                    className="block w-full pl-10 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none opacity-80 cursor-not-allowed select-none"
                  />
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={14} />
                  </span>
                  <input 
                    type="email" 
                    placeholder="Email del contacto"
                    value={assignedContact?.email || selectedQuote.contacto_email || ''}
                    readOnly
                    className="block w-full pl-10 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none opacity-80 cursor-not-allowed select-none"
                  />
                </div>
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={14} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Teléfono del contacto"
                    value={assignedContact?.phone_no || assignedContact?.mobile_no || selectedQuote.contacto_telefono || ''}
                    readOnly
                    className="block w-full pl-10 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none opacity-80 cursor-not-allowed select-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/10 pb-2">Planificación de Seguimiento</h4>
              <div className="space-y-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Próxima Acción Pendiente</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Llamar para negociar plazos de entrega..."
                    value={selectedQuote.proxima_accion || ''}
                    onChange={(e) => handleFieldChange('proxima_accion', e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Límite</label>
                  <input 
                    type="date" 
                    value={selectedQuote.fecha_proxima_accion ? selectedQuote.fecha_proxima_accion.split('T')[0] : ''}
                    onChange={(e) => handleFieldChange('fecha_proxima_accion', e.target.value || null)}
                    className="block w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Observaciones del Comercial</label>
              <textarea 
                placeholder="Escribe comentarios generales o notas adicionales sobre la negociación..."
                value={selectedQuote.observaciones || ''}
                onChange={(e) => handleFieldChange('observaciones', e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/10 pb-2">Historial de Interacciones</h4>
              
              <form onSubmit={handleAddActivity} className="space-y-3 bg-slate-50 dark:bg-white/1 p-3 rounded-lg border border-gray-200/50 dark:border-white/5">
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={newActivityType} 
                    onChange={(e) => setNewActivityType(e.target.value)}
                    className="bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-[11px] rounded p-1.5 focus:outline-none"
                  >
                    <option value="Llamada">📞 Llamada</option>
                    <option value="Email">📧 Email</option>
                    <option value="Reunión">🤝 Reunión</option>
                    <option value="Nota">📝 Nota</option>
                    <option value="Tarea">✅ Tarea</option>
                  </select>
                  <input 
                    type="date" 
                    value={newActivityDate}
                    onChange={(e) => setNewActivityDate(e.target.value)}
                    className="bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-[11px] rounded p-1.5 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Detalles de la interacción..."
                    value={newActivityNotes}
                    onChange={(e) => setNewActivityNotes(e.target.value)}
                    className="flex-1 bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-[11px] rounded p-1.5 focus:outline-none"
                  />
                  <button 
                    type="submit" 
                    className="bg-dts-secondary hover:bg-dts-secondary-dark text-white p-1.5 rounded transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </form>

              <div className="space-y-4 mt-4 relative pl-4 border-l border-gray-100 dark:border-white/10">
                {activities.length === 0 ? (
                  <span className="text-[10px] text-gray-400 italic block py-2">No se han registrado interacciones aún.</span>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="relative group/act text-xs">
                      <span className="absolute -left-[21px] top-1 bg-white dark:bg-dts-primary-dark border border-dts-secondary p-0.5 rounded-full z-10">
                        <span className="block w-1.5 h-1.5 bg-dts-secondary rounded-full" />
                      </span>
                      
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {act.tipo === 'Llamada' ? '📞' : act.tipo === 'Email' ? '📧' : act.tipo === 'Reunión' ? '🤝' : act.tipo === 'Tarea' ? '✅' : '📝'} {act.tipo}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(act.fecha).toLocaleDateString()}
                          </span>
                          <button 
                            hidden={selectedQuote.followup_source === 'APP' || !canEdit(selectedQuote)}
                            onClick={() => deleteActivityMutation.mutate(act.id)}
                            className="text-gray-400 hover:text-rose-500 opacity-0 group-hover/act:opacity-100 transition-opacity"
                            title="Eliminar interacción"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap pr-4">
                        {act.notas}
                      </p>

                      {act.tipo === 'Tarea' && (
                        <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={act.hecho} 
                            onChange={(e) => toggleActivityMutation.mutate({ actId: act.id, hecho: e.target.checked })}
                            className="rounded border-gray-300 text-dts-secondary focus:ring-dts-secondary/50 w-3 h-3" 
                          />
                          <span className={`text-[10px] ${act.hecho ? 'line-through text-gray-400' : 'text-gray-500 font-medium'}`}>
                            Completada
                          </span>
                        </label>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </fieldset>
        )}
      </Drawer>

      <Transition show={isStateModalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-[120]" onClose={() => { setIsStateModalOpen(false); setPendingDropQuote(null); }}>
          <TransitionChild
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-[120] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-surface-card-dark text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-gray-100 dark:border-white/5 p-6 space-y-6">
                  <button
                    onClick={() => { setIsStateModalOpen(false); setPendingDropQuote(null); }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <X size={18} />
                  </button>

                  <div className="space-y-4">
                    <DialogTitle as="h3" className="text-base font-bold text-dts-primary dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="text-dts-secondary" size={18} />
                      Registrar Cambio de Estado
                    </DialogTitle>
                    <p className="text-xs text-gray-400">
                      ¿Quieres registrar un motivo o actividad en el historial para esta transición de estado?
                    </p>
                  </div>

                  {pendingDropQuote && (
                    <div className="bg-gray-50 dark:bg-dts-primary-dark/40 p-4 rounded-xl border border-gray-200/50 dark:border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold font-mono text-dts-secondary">{pendingDropQuote.document_no}</span>
                        <span className="text-gray-400 font-medium truncate max-w-[200px]">{pendingDropQuote.customer_name}</span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-4 py-2 border-t border-gray-200/50 dark:border-white/5 mt-2">
                        <span className="px-3 py-1 bg-gray-200/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-[10px] rounded-lg border border-gray-200 dark:border-white/5">
                          {pendingDropQuote.estado_oferta || 'Borrador'}
                        </span>
                        <ArrowRight className="text-dts-secondary animate-pulse" size={16} />
                        <span className="px-3 py-1 bg-dts-secondary/15 text-dts-secondary font-bold uppercase tracking-wider text-[10px] rounded-lg border border-dts-secondary/20">
                          {targetStage}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Tipo de Actividad</label>
                      <select
                        value={stateChangeActivityType}
                        onChange={(e) => setStateChangeActivityType(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                      >
                        <option value="Nota">📝 Nota de Estado</option>
                        <option value="Llamada">📞 Llamada de Seguimiento</option>
                        <option value="Email">📧 Email de Negociación</option>
                        <option value="Reunión">🤝 Reunión con Cliente</option>
                        <option value="Tarea">✅ Tarea Realizada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
                        {pilotMode ? 'Nota del cambio *' : targetStage === 'ganada' ? 'Motivo de Éxito / Ganada' : targetStage === 'perdida' ? 'Motivo de Pérdida / Descarte' : 'Notas del Cambio / Motivo'}
                      </label>
                      {!pilotMode && pendingDropQuote?.followup_source === 'APP' && ['ganada', 'perdida'].includes(targetStage) ? <select
                        value={stateChangeNotes}
                        onChange={(e) => setStateChangeNotes(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                      >
                        <option value="" disabled>Selecciona un motivo</option>
                        {(targetStage === 'ganada' ? closeReasons?.ganada : closeReasons?.perdida)?.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                      </select> : <textarea
                        rows={3}
                        value={stateChangeNotes}
                        onChange={(e) => setStateChangeNotes(e.target.value)}
                        placeholder={
                          targetStage === 'ganada' 
                            ? "Ej. El cliente aprobó el presupuesto final por mejoras de entrega..." 
                            : targetStage === 'perdida' 
                              ? "Ej. Perdido por precio frente a la competencia..." 
                              : "Detalles del cambio de estado o notas de seguimiento..."
                        }
                        className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                      />}
                    </div>
                  </div>

                  {pilotMode && <div className="space-y-3 text-xs">
                    <label className="block">Tipo de oferta *<select className="w-full rounded-lg p-2 border dark:bg-dts-primary-dark dark:border-gray-800" value={transitionType} onChange={e => setTransitionType(e.target.value)}><option value="">Selecciona</option><option value="proyecto">Proyecto</option><option value="cliente nuevo">Cliente nuevo</option><option value="cliente existente">Cliente existente</option></select></label>
                    <label className="block">Cierre previsto *<input className="w-full rounded-lg p-2 border dark:bg-dts-primary-dark dark:border-gray-800" type="date" value={transitionDate} onChange={e => setTransitionDate(e.target.value)} /></label>
                    {['ganada','perdida'].includes(targetStage) && <label className="block">Motivo de cierre *<select className="w-full rounded-lg p-2 border dark:bg-dts-primary-dark dark:border-gray-800" value={transitionReason} onChange={e => setTransitionReason(e.target.value)}><option value="">Selecciona</option>{(targetStage === 'ganada' ? closeReasons?.ganada : closeReasons?.perdida)?.map(reason => <option key={reason}>{reason}</option>)}</select></label>}
                    {updateQuoteMutation.isError && <p role="alert" className="text-rose-500">No se pudo guardar. Revisa los datos y recarga la oferta si otra persona la ha modificado.</p>}
                  </div>}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={() => { setIsStateModalOpen(false); setPendingDropQuote(null); }}
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl transition-all border border-gray-200 dark:border-white/5 text-xs text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      hidden={pilotMode}
                      onClick={() => handleConfirmStateChange(true)}
                      className="flex-1 py-2.5 bg-gray-200/50 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold rounded-xl transition-all text-xs text-center"
                    >
                      Solo Cambiar Estado
                    </button>
                    <button
                      onClick={() => handleConfirmStateChange(false)}
                      disabled={updateQuoteMutation.isPending || !stateChangeNotes.trim() || (pilotMode && (!transitionType || !transitionDate || (['ganada','perdida'].includes(targetStage) && !transitionReason)))}
                      className="flex-1 py-2.5 bg-linear-to-r from-dts-secondary-dark to-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 text-xs text-center"
                    >
                      Guardar con Motivo
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
};

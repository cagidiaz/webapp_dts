import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCustomerByClientId, getContacts, updateContactLinkedin,
  getCrmActivities, createCrmActivity, updateCrmActivity, deleteCrmActivity,
  getAllCrmQuotes, updateCrmQuote, addQuoteActivity, type CRMQuote,
  getQuoteActivities, updateQuoteActivity, deleteQuoteActivity
} from '../../../api';
import { formatCurrency } from '../../../api/formatters';
import { 
  ArrowLeft, Phone, Mail, MapPin, 
  Linkedin, Edit2, Check, X, Plus, Calendar as CalendarIcon, 
  Clock, Briefcase, FileText, CheckSquare, Send, User, Activity, Trash2
} from 'lucide-react';
import { Drawer } from '../../../components/shared';

const STAGES = [
  { id: 'borrador', label: 'Borrador', color: 'border-t-slate-400 bg-slate-500/5' },
  { id: 'enviada', label: 'Enviada', color: 'border-t-blue-400 bg-blue-500/5' },
  { id: 'en negociación', label: 'En Negociación', color: 'border-t-amber-400 bg-amber-500/5' },
  { id: 'ganada', label: 'Ganada', color: 'border-t-emerald-400 bg-emerald-500/5' },
  { id: 'perdida', label: 'Perdida', color: 'border-t-rose-400 bg-rose-500/5' }
];

interface CrmCustomerDetailProps {
  clientId: string;
  onBack: () => void;
}

export const CrmCustomerDetail: React.FC<CrmCustomerDetailProps> = ({ clientId, onBack }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'quotes' | 'tasks' | 'notes' | 'emails' | 'calendar' | 'timeline'>('info');

  // Inline Linkedin editing states
  const [editingLinkedinId, setEditingLinkedinId] = useState<string | null>(null);
  const [linkedinValue, setLinkedinValue] = useState<string>('');
  const [isSavingLinkedin, setIsSavingLinkedin] = useState<boolean>(false);

  // Modal show states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newEmailSubject, setNewEmailSubject] = useState('');
  const [newEmailBody, setNewEmailBody] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');

  // Edit states
  const [editActivityId, setEditActivityId] = useState<string | null>(null);
  const [editActivityType, setEditActivityType] = useState<'TASK' | 'NOTE' | 'EMAIL' | 'EVENT' | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Query CRM activities from Postgres database
  const { data: dbActivities = [] } = useQuery({
    queryKey: ['crmActivities', clientId],
    queryFn: () => getCrmActivities(clientId),
  });

  // Query CRM quotes
  const { data: crmQuotes = [] } = useQuery({
    queryKey: ['customerCrmQuotes', clientId],
    queryFn: () => getAllCrmQuotes(),
  });

  const filteredCrmQuotes = useMemo(() => {
    return crmQuotes.filter(q => q.customer_no === clientId);
  }, [crmQuotes, clientId]);

  // Mutations
  const createActivityMutation = useMutation({
    mutationFn: createCrmActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivities', clientId] });
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { isCompleted?: boolean; title?: string; description?: string; dueDate?: string; timeScheduled?: string } }) =>
      updateCrmActivity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivities', clientId] });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: deleteCrmActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivities', clientId] });
    }
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, data, fromStage, toStage, documentNo }: { id: string; data: any; fromStage: string; toStage: string; documentNo: string }) => {
      // 1. Actualizar el estado de la oferta
      const result = await updateCrmQuote(id, data);

      // 2. Registrar actividad a nivel de oferta (fault-tolerant)
      try {
        await addQuoteActivity(id, {
          tipo: 'Sistema',
          notas: `Cambio de estado automático [${fromStage} -> ${toStage}]`,
          fecha: new Date().toISOString(),
          hecho: true
        });
      } catch (err) {
        console.error("Error al registrar actividad del cambio de estado en la oferta:", err);
      }

      // 3. Registrar actividad a nivel de línea de tiempo del cliente (fault-tolerant)
      try {
        await createCrmActivity({
          clientId,
          type: 'NOTE',
          title: `Cambio de estado: Oferta ${documentNo}`,
          description: `Se ha cambiado el estado de la oferta de [${fromStage}] a [${toStage}]`
        });
      } catch (err) {
        console.error("Error al registrar actividad del cambio de estado en el cliente:", err);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerCrmQuotes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['crmActivities', clientId] });
    }
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => {
      setDraggingId(id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    setDraggingId(null);

    const quote = filteredCrmQuotes.find(q => q.id === id);
    if (!quote) return;

    const currentStage = (quote.estado_oferta || '').toLowerCase().trim();
    const targetStageLower = targetStage.toLowerCase().trim();

    if (currentStage === targetStageLower) return;

    let prob = quote.probabilidad_exito;
    if (targetStageLower === 'borrador') prob = 10;
    else if (targetStageLower === 'enviada') prob = 25;
    else if (targetStageLower === 'en negociación') prob = 50;
    else if (targetStageLower === 'ganada') prob = 100;
    else if (targetStageLower === 'perdida') prob = 0;

    updateQuoteMutation.mutate({
      id: quote.id,
      data: {
        estado_oferta: targetStageLower,
        probabilidad_exito: prob
      },
      fromStage: (quote.estado_oferta || 'borrador').toUpperCase(),
      toStage: targetStageLower.toUpperCase(),
      documentNo: quote.document_no
    });
  };

  // Estados para el Drawer de detalle de Oferta CRM
  const [selectedQuote, setSelectedQuote] = useState<CRMQuote | null>(null);
  const [isQuoteDrawerOpen, setIsQuoteDrawerOpen] = useState(false);
  const [newQuoteActivityType, setNewQuoteActivityType] = useState('Llamada');
  const [newQuoteActivityDate, setNewQuoteActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [newQuoteActivityNotes, setNewQuoteActivityNotes] = useState('');

  // Consulta de actividades específicas de la oferta seleccionada
  const { data: quoteActivities = [] } = useQuery({
    queryKey: ['crm-quote-activities', selectedQuote?.id],
    queryFn: () => getQuoteActivities(selectedQuote!.id),
    enabled: !!selectedQuote,
  });

  // Mutación para campos editables individuales de la oferta
  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCrmQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerCrmQuotes', clientId] });
    }
  });

  // Mutación para añadir interacciones a la oferta
  const addQuoteActivityMutation = useMutation({
    mutationFn: (actData: any) => addQuoteActivity(selectedQuote!.id, actData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', selectedQuote?.id] });
    }
  });

  // Mutación para borrar interacciones de la oferta
  const deleteQuoteActivityMutation = useMutation({
    mutationFn: deleteQuoteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', selectedQuote?.id] });
    }
  });

  // Mutación para alternar estado de tareas de la oferta
  const updateQuoteActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: any }) => updateQuoteActivity(activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', selectedQuote?.id] });
    }
  });

  // Handlers para el Drawer
  const openQuoteDrawer = (quote: CRMQuote) => {
    setSelectedQuote(quote);
    setIsQuoteDrawerOpen(true);
  };

  const handleStageChange = (newStage: string) => {
    if (!selectedQuote) return;

    let prob = selectedQuote.probabilidad_exito;
    const stage = newStage.toLowerCase();
    if (stage === 'borrador') prob = 10;
    else if (stage === 'enviada') prob = 25;
    else if (stage === 'en negociación') prob = 50;
    else if (stage === 'ganada') prob = 100;
    else if (stage === 'perdida') prob = 0;

    const fromStage = (selectedQuote.estado_oferta || 'borrador').toUpperCase();
    const toStage = newStage.toUpperCase();

    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      data: { 
        estado_oferta: newStage,
        probabilidad_exito: prob 
      },
      fromStage,
      toStage,
      documentNo: selectedQuote.document_no
    }, {
      onSuccess: () => {
        setSelectedQuote(prev => prev ? { ...prev, estado_oferta: newStage, probabilidad_exito: prob } : null);
      }
    });
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    if (!selectedQuote) return;
    updateFieldMutation.mutate({
      id: selectedQuote.id,
      data: { [fieldName]: value }
    }, {
      onSuccess: () => {
        setSelectedQuote(prev => prev ? { ...prev, [fieldName]: value } : null);
      }
    });
  };

  const handleAddQuoteActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteActivityNotes.trim() || !selectedQuote) return;

    addQuoteActivityMutation.mutate({
      tipo: newQuoteActivityType,
      notas: newQuoteActivityNotes,
      fecha: new Date(newQuoteActivityDate).toISOString(),
      hecho: newQuoteActivityType === 'Tarea' ? false : true
    }, {
      onSuccess: () => {
        setNewQuoteActivityNotes('');
      }
    });
  };

  // Derived tasks, notes, emails, and events lists to maintain UI compatibility
  const tasks = useMemo(() => {
    return dbActivities
      .filter(act => act.type === 'TASK')
      .map(act => ({
        id: act.id,
        title: act.title,
        date: act.due_date ? act.due_date.split('T')[0] : '',
        done: act.is_completed
      }));
  }, [dbActivities]);

  const notes = useMemo(() => {
    return dbActivities
      .filter(act => act.type === 'NOTE')
      .map(act => ({
        id: act.id,
        text: act.description || act.title,
        date: act.created_at
      }));
  }, [dbActivities]);

  const emails = useMemo(() => {
    return dbActivities
      .filter(act => act.type === 'EMAIL')
      .map(act => ({
        id: act.id,
        subject: act.title,
        body: act.description || '',
        date: act.created_at,
        email: act.email
      }));
  }, [dbActivities]);

  const events = useMemo(() => {
    return dbActivities
      .filter(act => act.type === 'EVENT')
      .map(act => ({
        id: act.id,
        title: act.title,
        date: act.due_date ? act.due_date.split('T')[0] : '',
        time: act.time_scheduled || '10:00'
      }));
  }, [dbActivities]);

  // Compile all activities for timeline
  const timelineActivities = useMemo(() => {
    const list: {
      id: string;
      type: 'note' | 'task' | 'email' | 'event';
      title: string;
      description?: string;
      date: string;
      icon: any;
      iconBg: string;
      iconColor: string;
      showTime?: boolean;
      email?: string;
    }[] = [];

    notes.forEach(n => {
      list.push({
        id: `note-${n.id}`,
        type: 'note',
        title: 'Nota Comercial Registrada',
        description: n.text,
        date: n.date,
        icon: FileText,
        iconBg: 'bg-amber-100 dark:bg-amber-955/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        showTime: true
      });
    });

    tasks.forEach(t => {
      list.push({
        id: `task-${t.id}`,
        type: 'task',
        title: `Tarea comercial: ${t.title}`,
        description: t.done ? 'Completada' : 'Pendiente',
        date: t.date + 'T00:00:00Z',
        icon: CheckSquare,
        iconBg: t.done ? 'bg-emerald-100 dark:bg-emerald-955/20' : 'bg-blue-100 dark:bg-blue-955/20',
        iconColor: t.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400',
        showTime: false
      });
    });

    emails.forEach(e => {
      list.push({
        id: `email-${e.id}`,
        type: 'email',
        title: `Email Registrado: ${e.subject}`,
        description: e.body,
        date: e.date,
        icon: Send,
        iconBg: 'bg-purple-100 dark:bg-purple-955/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        showTime: true,
        email: e.email
      });
    });

    events.forEach(ev => {
      list.push({
        id: `event-${ev.id}`,
        type: 'event',
        title: `Reunión / Cita: ${ev.title}`,
        description: `Fecha: ${ev.date} a las ${ev.time}h`,
        date: ev.date + 'T' + ev.time + ':00Z',
        icon: CalendarIcon,
        iconBg: 'bg-rose-100 dark:bg-rose-955/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        showTime: true
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, tasks, emails, events]);

  // Queries
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customerDetail', clientId],
    queryFn: () => getCustomerByClientId(clientId),
  });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['customerContacts', clientId],
    queryFn: () => getContacts({ clientId }),
  });

  const handleSaveLinkedin = async (contactId: string) => {
    setIsSavingLinkedin(true);
    try {
      await updateContactLinkedin(contactId, linkedinValue);
      queryClient.invalidateQueries({ queryKey: ['customerContacts', clientId] });
      setEditingLinkedinId(null);
    } catch (error) {
      console.error('Error saving linkedin:', error);
    } finally {
      setIsSavingLinkedin(false);
    }
  };

  // Actions handlers
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createActivityMutation.mutate({
      clientId,
      type: 'TASK',
      title: newTaskTitle,
      dueDate: newTaskDate
    });
    setNewTaskTitle('');
    setShowTaskModal(false);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    createActivityMutation.mutate({
      clientId,
      type: 'NOTE',
      title: 'Nota Comercial Registrada',
      description: newNoteText
    });
    setNewNoteText('');
    setShowNoteModal(false);
  };

  const handleCreateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailSubject.trim() || !newEmailBody.trim()) return;
    createActivityMutation.mutate({
      clientId,
      type: 'EMAIL',
      title: newEmailSubject,
      description: newEmailBody,
      email: newEmailAddress
    });
    setNewEmailSubject('');
    setNewEmailBody('');
    setNewEmailAddress('');
    setShowEmailModal(false);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    createActivityMutation.mutate({
      clientId,
      type: 'EVENT',
      title: newEventTitle,
      dueDate: newEventDate,
      timeScheduled: newEventTime
    });
    setNewEventTitle('');
    setShowEventModal(false);
  };

  const toggleTask = (id: string) => {
    const task = dbActivities.find(act => act.id === id);
    if (task) {
      updateActivityMutation.mutate({
        id,
        payload: { isCompleted: !task.is_completed }
      });
    }
  };

  const deleteTask = (id: string) => {
    deleteActivityMutation.mutate(id);
  };

  const startEditActivity = (act: any) => {
    const originalAct = dbActivities.find(a => a.id === act.id);
    if (!originalAct) return;

    setEditActivityId(originalAct.id);
    setEditActivityType(originalAct.type as any);
    setEditTitle(originalAct.title);
    setEditDescription(originalAct.description || '');
    setEditDate(originalAct.due_date ? originalAct.due_date.split('T')[0] : '');
    setEditTime(originalAct.time_scheduled || '10:00');
    setShowEditModal(true);
  };

  const handleSaveEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editActivityId || !editActivityType) return;

    const payload: any = {
      title: editTitle,
      description: editDescription
    };

    if (editActivityType === 'TASK' || editActivityType === 'EVENT') {
      payload.dueDate = editDate ? new Date(editDate).toISOString() : undefined;
    }
    if (editActivityType === 'EVENT') {
      payload.timeScheduled = editTime;
    }

    updateActivityMutation.mutate({
      id: editActivityId,
      payload
    }, {
      onSuccess: () => {
        setShowEditModal(false);
        setEditActivityId(null);
        setEditActivityType(null);
      }
    });
  };

  if (isLoadingCustomer) {
    return <div className="text-center py-20 text-xs text-gray-400 uppercase font-medium">Cargando ficha de cliente...</div>;
  }

  if (!customer) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="italic">No se pudo encontrar el cliente comercial.</p>
        <button onClick={onBack} className="mt-4 text-xs font-bold text-dts-secondary hover:underline flex items-center gap-1.5 mx-auto">
          <ArrowLeft size={14} /> Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <button 
          onClick={onBack} 
          className="text-xs font-bold text-gray-400 hover:text-dts-secondary flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Volver al Directorio de Empresas
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-dts-primary/10 dark:bg-white/5 text-dts-primary dark:text-dts-secondary flex items-center justify-center font-bold text-lg">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-dts-primary dark:text-white flex items-center gap-2">
                {customer.name}
              </h2>
              <span className="text-xs font-mono font-bold text-dts-secondary bg-dts-secondary/5 px-2 py-0.5 rounded block mt-0.5 w-max">
                Código ERP: {customer.client_id}
              </span>
            </div>
          </div>

          <div className="flex gap-6 border-t md:border-t-0 border-gray-100 dark:border-white/5 pt-3 md:pt-0 w-full md:w-auto">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ventas Totales</span>
              <span className="text-lg font-black font-mono text-dts-primary dark:text-white block">
                {formatCurrency(customer.total_sales, 0)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Saldo Vencido</span>
              <span className="text-lg font-black font-mono text-rose-500 block">
                {formatCurrency(customer.balance_due_lcy, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified panel with screen-viewport height */}
      <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-340px)] min-h-[450px]">
        
        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-800/20 p-1 shrink-0">
          {[
            { id: 'info', label: 'Información y Contactos', icon: User },
            { id: 'timeline', label: 'Historial / Timeline', icon: Activity },
            { id: 'quotes', label: 'Oportunidades', icon: Briefcase },
            { id: 'tasks', label: 'Tareas', icon: CheckSquare },
            { id: 'notes', label: 'Notas', icon: FileText },
            { id: 'emails', label: 'Emails', icon: Send },
            { id: 'calendar', label: 'Calendario', icon: CalendarIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-dts-primary text-white dark:bg-dts-secondary shadow-xs' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents (scrollable container) */}
        <div className="p-6 overflow-y-auto flex-1">
        
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* General Info */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                Datos Generales
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="text-dts-secondary shrink-0" size={18} />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Localización</span>
                    <p className="text-sm text-gray-900 dark:text-gray-200 mt-0.5">{customer.address}</p>
                    {customer.address_2 && <p className="text-sm text-gray-600 dark:text-gray-400">{customer.address_2}</p>}
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">{customer.post_code} {customer.city}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">{customer.county}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400">
                      <Mail size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Email Principal</span>
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="text-xs font-semibold text-dts-primary dark:text-dts-secondary hover:underline">
                          {customer.email}
                        </a>
                      ) : <span className="text-xs text-gray-400 italic">No disponible</span>}
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400">
                      <Phone size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Teléfono Fijo</span>
                      {customer.phone_no ? (
                        <a href={`tel:${customer.phone_no}`} className="text-xs font-semibold text-dts-primary dark:text-dts-secondary hover:underline">
                          {customer.phone_no}
                        </a>
                      ) : <span className="text-xs text-gray-400 italic">No disponible</span>}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-white/1 rounded-xl border border-gray-100 dark:border-white/5 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Segmento de Mercado</span>
                    <span className="font-semibold text-dts-primary dark:text-white mt-0.5 block">{customer.market_segment || 'No definido'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Modelo de Negocio</span>
                    <span className="font-semibold text-dts-primary dark:text-white mt-0.5 block">{customer.business_model || 'No definido'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Comercial Asignado</span>
                    <span className="font-semibold text-dts-secondary mt-0.5 block">{customer.salesperson_code || 'No asignado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Condiciones Pago</span>
                    <span className="font-semibold text-dts-primary dark:text-white mt-0.5 block">{customer.payment_terms_code || 'Estándar'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contacts list */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                Personas de Contacto
              </h3>

              {isLoadingContacts ? (
                <div className="text-xs text-gray-400 italic py-4">Cargando personas de contacto...</div>
              ) : !contacts || contacts.length === 0 ? (
                <div className="text-xs text-gray-400 italic py-4 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                  No hay personas de contacto asociadas a esta empresa.
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="p-4 bg-gray-50 dark:bg-white/2 rounded-xl border border-gray-200/50 dark:border-white/5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <User size={14} className="text-dts-secondary shrink-0" />
                            <span>{contact.name}</span>
                            {contact.org_level_code && (
                              <span className="text-[9px] text-gray-400 font-mono">
                                ({contact.org_level_code.replace(/\.+$/, '')})
                              </span>
                            )}
                          </h4>
                          {contact.job_title && (
                            <span className="text-[9px] bg-dts-secondary/15 text-dts-secondary px-2 py-0.5 rounded font-bold uppercase tracking-wider mt-1 inline-block">
                              {contact.job_title}
                            </span>
                          )}
                        </div>

                        {/* Editable LinkedIn icon */}
                        {editingLinkedinId === contact.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="text"
                              className="text-[10px] border border-gray-200 dark:border-white/15 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded w-24 focus:outline-none text-dts-primary dark:text-white"
                              value={linkedinValue}
                              onChange={(e) => setLinkedinValue(e.target.value)}
                              disabled={isSavingLinkedin}
                            />
                            <button onClick={() => handleSaveLinkedin(contact.id)} disabled={isSavingLinkedin} className="text-emerald-500"><Check size={12} /></button>
                            <button onClick={() => setEditingLinkedinId(null)} disabled={isSavingLinkedin} className="text-rose-500"><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            {contact.linkedin ? (
                              <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-dts-secondary dark:text-dts-secondary hover:brightness-110 flex items-center gap-1 text-[10px] font-semibold">
                                <Linkedin size={16} className="text-dts-secondary dark:text-dts-secondary" />
                                <span>Ver perfil</span>
                              </a>
                            ) : (
                              <button 
                                onClick={() => { setEditingLinkedinId(contact.id); setLinkedinValue(contact.linkedin || ''); }}
                                className="text-gray-400 dark:text-gray-400 hover:text-dts-secondary dark:hover:text-dts-secondary flex items-center gap-1.5 text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Añadir LinkedIn"
                              >
                                <Linkedin size={16} className="text-dts-secondary dark:text-dts-secondary" />
                                <span className="underline decoration-dotted">Vincular LinkedIn</span>
                              </button>
                            )}
                            <button 
                              onClick={() => { setEditingLinkedinId(contact.id); setLinkedinValue(contact.linkedin || ''); }} 
                              className="text-gray-400 hover:text-dts-secondary p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Editar LinkedIn"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-white/5 pt-2">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-dts-secondary truncate">
                            <Mail size={10} /> {contact.email}
                          </a>
                        )}
                        {contact.phone_no && (
                          <a href={`tel:${contact.phone_no}`} className="flex items-center gap-1 hover:text-dts-secondary whitespace-nowrap">
                            <Phone size={10} /> {contact.phone_no}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Embudo de Oportunidades CRM
              </h3>
            </div>

            {filteredCrmQuotes.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay ofertas comerciales registradas en el CRM para este cliente.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pb-4 overflow-x-auto flex-1 min-h-[350px]">
                {STAGES.map(stage => {
                  const stageQuotes = filteredCrmQuotes.filter(
                    q => (q.estado_oferta || '').toLowerCase().trim() === stage.id
                  );
                  return (
                    <div 
                      key={stage.id} 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, stage.id)}
                      className="bg-gray-50/50 dark:bg-white/1 rounded-xl border border-gray-200/50 dark:border-white/5 flex flex-col min-w-[150px] h-full overflow-hidden"
                    >
                      <div className={`p-2.5 border-t-4 ${stage.color} border-b border-b-gray-200/60 dark:border-b-white/5 bg-white dark:bg-surface-card-dark flex justify-between items-center`}>
                        <span className="font-bold text-[9px] uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          {stage.label}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">
                          {stageQuotes.length}
                        </span>
                      </div>
                      <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
                        {stageQuotes.length === 0 ? (
                          <div className="h-full flex items-center justify-center border border-dashed border-gray-200 dark:border-white/5 rounded-xl py-6">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Soltar aquí</span>
                          </div>
                        ) : (
                          stageQuotes.map(quote => (
                            <div 
                              key={quote.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, quote.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => openQuoteDrawer(quote)}
                              className={`bg-white dark:bg-surface-card-dark p-2.5 rounded-lg border border-gray-200/60 dark:border-white/5 shadow-xs hover:border-dts-secondary/50 hover:shadow-md transition-all cursor-pointer relative group ${
                                draggingId === quote.id ? 'opacity-30 border-dashed scale-95' : 'opacity-100'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold font-mono text-dts-primary dark:text-dts-secondary">
                                  {quote.document_no}
                                </span>
                                <span className="text-[8px] uppercase px-1 rounded bg-gray-100 dark:bg-white/5 text-gray-400 font-bold">
                                  {quote.oferta_type}
                                </span>
                              </div>
                              <h4 className="text-[10px] font-bold text-gray-900 dark:text-white truncate">
                                {quote.customer_name}
                              </h4>
                              <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-50 dark:border-white/5">
                                <div>
                                  <span className="text-[8px] text-gray-400 block">Importe</span>
                                  <span className="text-[10px] font-mono font-black text-gray-900 dark:text-white">
                                    {formatCurrency(quote.amount, 0)}
                                  </span>
                                </div>
                                <span className="text-[8px] bg-slate-50 dark:bg-white/5 px-1 rounded text-gray-500 font-bold">
                                  {quote.probabilidad_exito}%
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Tareas Pendientes de Seguimiento
              </h3>
              <button 
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-1.5 py-1 px-3 bg-dts-primary hover:brightness-110 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                <Plus size={14} /> Nueva Tarea
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay tareas agendadas. ¡Todo al día!
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(t => (
                  <div key={t.id} className="p-3 bg-gray-50 dark:bg-white/2 rounded-xl border border-gray-200/50 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={t.done} 
                        onChange={() => toggleTask(t.id)}
                        className="rounded border-gray-300 text-dts-secondary focus:ring-dts-secondary/50 w-4 h-4" 
                      />
                      <div>
                        <p className={`font-semibold ${t.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {t.title}
                        </p>
                        <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                          !t.done && new Date(t.date) < new Date() ? 'text-rose-500 font-bold' : 'text-gray-400'
                        }`}>
                          <CalendarIcon size={10} /> Límite: {new Date(t.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => startEditActivity(t)} 
                        className="text-gray-400 hover:text-dts-secondary transition-colors cursor-pointer"
                        title="Editar Tarea"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => deleteTask(t.id)} 
                        className="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Eliminar Tarea"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Notas Comerciales
              </h3>
              <button 
                onClick={() => setShowNoteModal(true)}
                className="flex items-center gap-1.5 py-1 px-3 bg-dts-primary hover:brightness-110 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                <Plus size={14} /> Nueva Nota
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay notas registradas para este cliente.
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map(n => (
                  <div key={n.id} className="p-4 bg-yellow-50/30 dark:bg-yellow-950/10 border border-yellow-200/50 dark:border-yellow-900/30 rounded-xl relative group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(n.date).toLocaleString()}</span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditActivity(n)} 
                          className="text-gray-400 hover:text-dts-secondary transition-colors cursor-pointer"
                          title="Editar Nota"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => deleteActivityMutation.mutate(n.id)} 
                          className="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Eliminar Nota"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {n.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-3">
              Línea de Tiempo de Actividades
            </h3>

            {timelineActivities.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay actividades registradas en el historial.
              </div>
            ) : (
              <div className="relative space-y-4">
                {/* Vertical timeline connector line */}
                <div className="absolute left-[16px] md:left-[144px] top-2 bottom-4 w-0.5 bg-gray-150 dark:bg-white/10"></div>
                
                {timelineActivities.map(act => {
                  const IconComponent = act.icon;
                  return (
                    <div key={act.id} className="flex md:flex-row flex-col gap-2 md:gap-4 relative pl-10 md:pl-0 text-xs">
                      
                      {/* Left: Date section */}
                      <div className="w-full md:w-28 shrink-0 md:text-right pt-0.5 flex md:flex-col items-center md:items-end gap-2 md:gap-0.5">
                        <span className="font-black text-[11px] md:text-[12px] text-dts-secondary uppercase tracking-wider">
                          {new Date(act.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                        {act.showTime && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-300 font-mono font-bold">
                            {new Date(act.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Middle: Icon */}
                      <div className="absolute left-0 md:relative md:left-auto flex flex-col items-center w-8 shrink-0">
                        <span className={`p-1.5 rounded-xl ${act.iconBg} ${act.iconColor} z-10 border-2 border-white dark:border-surface-card-dark shadow-xs flex items-center justify-center`}>
                          <IconComponent size={13} />
                        </span>
                      </div>

                      {/* Right: Content details */}
                      <div className="flex-1 pb-4">
                        <div className="bg-gray-50/50 dark:bg-white/2 p-3.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:border-dts-secondary/35 transition-all duration-200 shadow-xs">
                          <span className="font-bold text-gray-900 dark:text-white text-xs block mb-1">{act.title}</span>
                          {act.type === 'email' && act.email && (
                            <span className="inline-block text-[10px] bg-dts-secondary/10 dark:bg-dts-secondary/5 text-dts-secondary px-1.5 py-0.5 rounded font-bold border border-dts-secondary/20 mb-1">
                              Para/De: {act.email}
                            </span>
                          )}
                          {act.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed text-[11px] whitespace-pre-wrap">
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Seguimiento de Correspondencia
              </h3>
              <button 
                onClick={() => {
                  setNewEmailAddress(customer?.email || '');
                  setShowEmailModal(true);
                }}
                className="flex items-center gap-1.5 py-1 px-3 bg-dts-primary hover:brightness-110 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                <Plus size={14} /> Registrar Email
              </button>
            </div>

            {emails.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay correos registrados.
              </div>
            ) : (
              <div className="space-y-4">
                {emails.map(e => (
                  <div key={e.id} className="p-4 bg-gray-50 dark:bg-white/2 rounded-xl border border-gray-200/50 dark:border-white/5 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Mail size={12} className="text-dts-secondary" />
                          {e.subject}
                        </h4>
                        {e.email && (
                          <span className="inline-block text-[10px] text-dts-secondary font-bold">
                            Enviado a/recibido de: {e.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(e.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => startEditActivity(e)} 
                            className="text-gray-400 hover:text-dts-secondary transition-colors cursor-pointer"
                            title="Editar Email"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => deleteActivityMutation.mutate(e.id)} 
                            className="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Eliminar Email"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed pr-2">
                      {e.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Reuniones y Eventos Agendados
              </h3>
              <button 
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-1.5 py-1 px-3 bg-dts-primary hover:brightness-110 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                <Plus size={14} /> Nuevo Evento
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay eventos planificados.
              </div>
            ) : (
              <div className="space-y-4">
                {events.map(ev => (
                  <div key={ev.id} className="p-4 bg-gray-50 dark:bg-white/2 rounded-xl border border-gray-200/50 dark:border-white/5 flex items-start justify-between gap-2 text-xs">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-dts-primary dark:text-white">{ev.title}</h4>
                      <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          <CalendarIcon size={10} /> {new Date(ev.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          <Clock size={10} /> {ev.time}h
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => startEditActivity(ev)} 
                        className="text-gray-400 hover:text-dts-secondary transition-colors cursor-pointer"
                        title="Editar Evento"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => deleteActivityMutation.mutate(ev.id)} 
                        className="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Eliminar Evento"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateTask} className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 max-w-sm w-full relative space-y-4 text-xs">
            <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">Nueva Tarea Comercial</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título de la Tarea</label>
                <input type="text" required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Ej: Enviar propuesta corregida..." className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Límite</label>
                <input type="date" required value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white font-bold rounded-xl text-center">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl text-center">Crear Tarea</button>
            </div>
          </form>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateNote} className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 max-w-sm w-full relative space-y-4 text-xs">
            <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">Nueva Nota de Seguimiento</h3>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Detalle / Minuta de Reunión</label>
              <textarea required rows={4} value={newNoteText} onChange={e => setNewNoteText(e.target.value)} placeholder="Escribe aquí las observaciones acordadas con el cliente..." className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowNoteModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white font-bold rounded-xl text-center">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl text-center">Guardar Nota</button>
            </div>
          </form>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateEmail} className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 max-w-md w-full relative space-y-4 text-xs">
            <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">Registrar Email de Seguimiento</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Destinatario / Remitente (Email)</label>
                <input type="email" required value={newEmailAddress} onChange={e => setNewEmailAddress(e.target.value)} placeholder="Ej: cliente@correo.com" className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Asunto</label>
                <input type="text" required value={newEmailSubject} onChange={e => setNewEmailSubject(e.target.value)} placeholder="Ej: Confirmación de propuesta técnica dTS..." className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cuerpo del Mensaje</label>
                <textarea required rows={5} value={newEmailBody} onChange={e => setNewEmailBody(e.target.value)} placeholder="Escribe el contenido del correo electrónico enviado..." className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white font-bold rounded-xl text-center">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl text-center">Registrar Email</button>
            </div>
          </form>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateEvent} className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 max-w-sm w-full relative space-y-4 text-xs">
            <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">Agendar Evento / Cita</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título del Evento</label>
                <input type="text" required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Ej: Demostración técnica de equipos dTS..." className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label>
                  <input type="date" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hora</label>
                  <input type="time" required value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white font-bold rounded-xl text-center">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl text-center">Agendar Evento</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleSaveEditActivity} className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 max-w-sm w-full relative space-y-4 text-xs">
            <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
              Editar {editActivityType === 'TASK' ? 'Tarea' : editActivityType === 'NOTE' ? 'Nota' : editActivityType === 'EMAIL' ? 'Email' : 'Evento'}
            </h3>
            
            <div className="space-y-3">
              {editActivityType !== 'NOTE' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {editActivityType === 'EMAIL' ? 'Asunto' : 'Título'}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" 
                  />
                </div>
              )}

              {editActivityType !== 'TASK' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {editActivityType === 'NOTE' ? 'Contenido' : 'Mensaje / Detalles'}
                  </label>
                  <textarea 
                    required 
                    rows={4} 
                    value={editDescription} 
                    onChange={e => setEditDescription(e.target.value)} 
                    className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" 
                  />
                </div>
              )}

              {(editActivityType === 'TASK' || editActivityType === 'EVENT') && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Límite</label>
                  <input 
                    type="date" 
                    required 
                    value={editDate} 
                    onChange={e => setEditDate(e.target.value)} 
                    className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" 
                  />
                </div>
              )}

              {editActivityType === 'EVENT' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hora</label>
                  <input 
                    type="time" 
                    required 
                    value={editTime} 
                    onChange={e => setEditTime(e.target.value)} 
                    className="block w-full border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-slate-50 dark:bg-dts-primary-dark text-gray-955 dark:text-white text-xs" 
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => { setShowEditModal(false); setEditActivityId(null); setEditActivityType(null); }} 
                className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white font-bold rounded-xl text-center"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl text-center"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slide-over Drawer for Quote Details & Activities */}
      <Drawer
        isOpen={isQuoteDrawerOpen}
        onClose={() => setIsQuoteDrawerOpen(false)}
        title={`Oportunidad: ${selectedQuote?.document_no || ''}`}
        size="2xl"
      >
        {selectedQuote && (
          <div className="space-y-6 pb-12">
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
                    value={selectedQuote.estado_oferta || ''} 
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Probabilidad de Éxito</label>
                  <select 
                    value={selectedQuote.probabilidad_exito} 
                    onChange={(e) => handleFieldChange('probabilidad_exito', Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  >
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
                    value={selectedQuote.oferta_type || ''} 
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
                      value={selectedQuote.confirmacion_date ? selectedQuote.confirmacion_date.split('T')[0] : ''}
                      className="w-full bg-slate-50/50 dark:bg-slate-800/10 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-lg p-2 cursor-not-allowed"
                    />
                  </div>
                </div>

                {selectedQuote.estado_oferta?.toLowerCase().trim() === 'ganada' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Motivo de Ganada</label>
                    <textarea 
                      placeholder="Indica las razones del éxito..."
                      value={selectedQuote.motivo_ganada || ''}
                      onChange={(e) => handleFieldChange('motivo_ganada', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    />
                  </div>
                )}

                {selectedQuote.estado_oferta?.toLowerCase().trim() === 'perdida' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-rose-500 uppercase mb-1">Motivo de Perdida</label>
                    <textarea 
                      placeholder="¿Por qué se ha descartado la oferta? (Precio, Competencia, Plazo...)"
                      value={selectedQuote.motivo_perdida || ''}
                      onChange={(e) => handleFieldChange('motivo_perdida', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/10 pb-2">Información del Comprador</h4>
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={14} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Nombre del contacto"
                    value={selectedQuote.contacto_nombre || ''}
                    onChange={(e) => handleFieldChange('contacto_nombre', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  />
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={14} />
                  </span>
                  <input 
                    type="email" 
                    placeholder="Email del contacto"
                    value={selectedQuote.contacto_email || ''}
                    onChange={(e) => handleFieldChange('contacto_email', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-dts-secondary"
                  />
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={14} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Teléfono del contacto"
                    value={selectedQuote.contacto_telefono || ''}
                    onChange={(e) => handleFieldChange('contacto_telefono', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-dts-secondary"
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
              
              <form onSubmit={handleAddQuoteActivity} className="space-y-3 bg-slate-50 dark:bg-white/1 p-3 rounded-lg border border-gray-200/50 dark:border-white/5">
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={newQuoteActivityType} 
                    onChange={(e) => setNewQuoteActivityType(e.target.value)}
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
                    value={newQuoteActivityDate}
                    onChange={(e) => setNewQuoteActivityDate(e.target.value)}
                    className="bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-[11px] rounded p-1.5 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Detalles de la interacción..."
                    value={newQuoteActivityNotes}
                    onChange={(e) => setNewQuoteActivityNotes(e.target.value)}
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
                {quoteActivities.length === 0 ? (
                  <span className="text-[10px] text-gray-400 italic block py-2">No se han registrado interacciones aún.</span>
                ) : (
                  quoteActivities.map((act) => (
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
                            onClick={() => deleteQuoteActivityMutation.mutate(act.id)}
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
                            onChange={(e) => updateQuoteActivityMutation.mutate({ activityId: act.id, data: { hecho: e.target.checked } })}
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

          </div>
        )}
      </Drawer>
    </div>
  );
};

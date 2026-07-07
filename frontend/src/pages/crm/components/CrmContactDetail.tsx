import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { 
  updateContactLinkedin,
  getCrmActivitiesByContact, createCrmActivity, updateCrmActivity, deleteCrmActivity,
  getAllCrmQuotes, updateCrmQuote, addQuoteActivity, type CRMQuote,
  getQuoteActivities, updateQuoteActivity, deleteQuoteActivity
} from '../../../api';
import { formatCurrency } from '../../../api/formatters';
import { 
  ArrowLeft, Phone, Mail, MapPin, Smartphone,
  Linkedin, Edit2, Check, X, Plus, Calendar as CalendarIcon, 
  Briefcase, FileText, CheckSquare, Send, User, Activity, Trash2, Video, Users
} from 'lucide-react';
import { Drawer } from '../../../components/shared';

// For local endpoint fetching since contact lookup is on contacts API
import apiClient from '../../../api/apiClient';
const getContactById = async (id: string): Promise<any> => {
  const { data } = await apiClient.get(`/contacts/${id}`);
  return data;
};

const STAGES = [
  { id: 'borrador', label: 'Borrador', color: 'border-t-slate-400 bg-slate-500/5' },
  { id: 'enviada', label: 'Enviada', color: 'border-t-blue-400 bg-blue-500/5' },
  { id: 'en negociación', label: 'En Negociación', color: 'border-t-amber-400 bg-amber-500/5' },
  { id: 'ganada', label: 'Ganada', color: 'border-t-emerald-400 bg-emerald-500/5' },
  { id: 'perdida', label: 'Perdida', color: 'border-t-rose-400 bg-rose-500/5' }
];

const EMAIL_TEMPLATES = [
  {
    id: 'free',
    label: 'Texto libre (sin plantilla)',
    subject: '',
    body: ''
  },
  {
    id: 'presentation',
    label: 'Presentación comercial dTS',
    subject: 'Presentación de dTS Instruments — [Nombre Empresa]',
    body: 'Estimado/a [Contacto],\n\nLe escribo de dTS Instruments. Nos especializamos en la comercialización de equipamiento de laboratorio y soluciones analíticas de alta precisión.\n\nAdjunto a este correo nuestro catálogo general de soluciones. Estaremos encantados de poder colaborar con ustedes y asesorarles en sus futuros proyectos.\n\nQuedo a su entera disposición para agendar una breve llamada de presentación.\n\nAtentamente,\n[Vendedor]\ndTS Instruments'
  },
  {
    id: 'followup',
    label: 'Seguimiento de oferta pendiente',
    subject: 'Seguimiento de propuesta comercial — dTS Instruments',
    body: 'Estimado/a [Contacto],\n\nEspero que se encuentre muy bien.\n\nLe escribo para hacer seguimiento a la propuesta comercial que le enviamos recientemente. ¿Ha tenido oportunidad de revisarla con su equipo? Si tiene cualquier duda técnica o comercial, estaré encantado de resolverla.\n\nQuedamos a su disposición para comentar los detalles cuando le sea conveniente.\n\nAtentamente,\n[Vendedor]\ndTS Instruments'
  },
  {
    id: 'thankyou',
    label: 'Agradecimiento por su tiempo (Reunión)',
    subject: 'Agradecimiento por su tiempo — dTS Instruments',
    body: 'Estimado/a [Contacto],\n\nHa sido un placer conversar con usted el día de hoy.\n\nLe agradezco mucho el tiempo dedicado a nuestra reunión para comentar sus necesidades de equipamiento de laboratorio. Ya estamos trabajando en las propuestas analizadas y esperamos enviárselas a la brevedad.\n\nQuedo a su disposición para lo que necesite.\n\nAtentamente,\n[Vendedor]\ndTS Instruments'
  }
];

interface CrmContactDetailProps {
  contactId: string;
  onBack: () => void;
}

export const CrmContactDetail: React.FC<CrmContactDetailProps> = ({ contactId, onBack }) => {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'ofertas' | 'eventos' | 'emails'>('info');

  // LinkedIn editing states
  const [editingLinkedinId, setEditingLinkedinId] = useState<string | null>(null);
  const [linkedinValue, setLinkedinValue] = useState<string>('');
  const [isSavingLinkedin, setIsSavingLinkedin] = useState<boolean>(false);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Form states (Unified Event Modal)
  const [activityType, setActivityType] = useState<'TASK' | 'NOTE' | 'REUNION' | 'VIDEOLLAMADA' | 'VISITA' | 'CALL' | 'EVENT'>('TASK');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newConclusions, setNewConclusions] = useState('');

  // Form states (Emails)
  const [newEmailSubject, setNewEmailSubject] = useState('');
  const [newEmailBody, setNewEmailBody] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState(''); // ← NUEVO
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState('');

  // Edit states
  const [editActivityId, setEditActivityId] = useState<string | null>(null);
  const [editActivityType, setEditActivityType] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editConclusions, setEditConclusions] = useState('');

  // Filter chips in Eventos Tab
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  // Queries
  const { data: contact, isLoading: isLoadingContact } = useQuery({
    queryKey: ['crmContactDetail', contactId],
    queryFn: () => getContactById(contactId),
  });

  const { data: dbActivities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['crmActivitiesByContact', contactId],
    queryFn: () => getCrmActivitiesByContact(contactId),
  });

  const { data: crmQuotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['contactCrmQuotes', contactId],
    queryFn: () => getAllCrmQuotes({ contactId }),
  });

  // Mutations
  const createActivityMutation = useMutation({
    mutationFn: createCrmActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateCrmActivity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: deleteCrmActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
    }
  });

  // CRM Quotes pipeline mutations
  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, data, fromStage, toStage, documentNo }: { id: string; data: any; fromStage: string; toStage: string; documentNo: string }) => {
      const result = await updateCrmQuote(id, data);
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
      try {
        await createCrmActivity({
          contactId,
          clientId: contact?.client_id,
          type: 'NOTE',
          title: `Cambio de estado: Oferta ${documentNo}`,
          description: `Se ha cambiado el estado de la oferta de [${fromStage}] a [${toStage}]`
        });
      } catch (err) {
        console.error("Error al registrar actividad del cambio de estado en el contacto:", err);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactCrmQuotes', contactId] });
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
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

    const quote = crmQuotes.find(q => q.id === id);
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

  // Drawer detail CRM Quote
  const [selectedQuote, setSelectedQuote] = useState<CRMQuote | null>(null);
  const [isQuoteDrawerOpen, setIsQuoteDrawerOpen] = useState(false);
  const [formProximaAccion, setFormProximaAccion] = useState('');
  const [formFechaProximaAccion, setFormFechaProximaAccion] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [isSavingPlanning, setIsSavingPlanning] = useState(false);

  const [newQuoteActivityType, setNewQuoteActivityType] = useState('Llamada');
  const [newQuoteActivityDate, setNewQuoteActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [newQuoteActivityNotes, setNewQuoteActivityNotes] = useState('');

  const { data: quoteActivities = [] } = useQuery({
    queryKey: ['crm-quote-activities', selectedQuote?.id],
    queryFn: () => getQuoteActivities(selectedQuote!.id),
    enabled: !!selectedQuote,
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCrmQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactCrmQuotes', contactId] });
    }
  });

  const addQuoteActivityMutation = useMutation({
    mutationFn: (actData: any) => addQuoteActivity(selectedQuote!.id, actData),
    onSuccess: (newAct) => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', selectedQuote?.id] });
      queryClient.invalidateQueries({ queryKey: ['contactCrmQuotes', contactId] });

      if (selectedQuote && newAct.tipo === 'Tarea' && !newAct.hecho) {
        const currentNextDate = selectedQuote.fecha_proxima_accion;
        if (!selectedQuote.proxima_accion || !currentNextDate || new Date(newAct.fecha) < new Date(currentNextDate)) {
          updateFieldMutation.mutate({
            id: selectedQuote.id,
            data: {
              proxima_accion: newAct.notas,
              fecha_proxima_accion: newAct.fecha
            }
          }, {
            onSuccess: () => {
              setSelectedQuote(prev => prev ? {
                ...prev,
                proxima_accion: newAct.notas,
                fecha_proxima_accion: newAct.fecha
              } : null);
            }
          });
        }
      }
    }
  });

  const deleteQuoteActivityMutation = useMutation({
    mutationFn: deleteQuoteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', selectedQuote?.id] });
      queryClient.invalidateQueries({ queryKey: ['contactCrmQuotes', contactId] });
    }
  });

  const updateQuoteActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: any }) => updateQuoteActivity(activityId, data),
    onSuccess: (updatedAct) => {
      queryClient.invalidateQueries({ queryKey: ['crm-quote-activities', selectedQuote?.id] });
      queryClient.invalidateQueries({ queryKey: ['contactCrmQuotes', contactId] });
      
      if (selectedQuote && updatedAct.tipo === 'Tarea' && updatedAct.hecho) {
        const remainingPending = quoteActivities.find((act: any) => act.tipo === 'Tarea' && !act.hecho && act.id !== updatedAct.id);
        updateFieldMutation.mutate({
          id: selectedQuote.id,
          data: {
            proxima_accion: remainingPending ? remainingPending.notas : null,
            fecha_proxima_accion: remainingPending ? remainingPending.fecha : null
          }
        }, {
          onSuccess: () => {
            setSelectedQuote(prev => prev ? {
              ...prev,
              proxima_accion: remainingPending ? remainingPending.notas : null,
              fecha_proxima_accion: remainingPending ? remainingPending.fecha : null
            } : null);
          }
        });
      }
    }
  });

  const openQuoteDrawer = (quote: CRMQuote) => {
    setSelectedQuote(quote);
    setFormProximaAccion(quote.proxima_accion || '');
    setFormFechaProximaAccion(quote.fecha_proxima_accion ? quote.fecha_proxima_accion.split('T')[0] : '');
    setFormObservaciones(quote.observaciones || '');
    setIsQuoteDrawerOpen(true);
  };

  const handleSavePlanning = () => {
    if (!selectedQuote) return;
    setIsSavingPlanning(true);
    updateFieldMutation.mutate({
      id: selectedQuote.id,
      data: {
        proxima_accion: formProximaAccion || null,
        fecha_proxima_accion: formFechaProximaAccion ? new Date(formFechaProximaAccion).toISOString() : null,
        observaciones: formObservaciones || null
      }
    }, {
      onSuccess: () => {
        setSelectedQuote(prev => prev ? {
          ...prev,
          proxima_accion: formProximaAccion || null,
          fecha_proxima_accion: formFechaProximaAccion ? new Date(formFechaProximaAccion).toISOString() : null,
          observaciones: formObservaciones || null
        } : null);
        setIsSavingPlanning(false);
      },
      onError: () => {
        setIsSavingPlanning(false);
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

  // Compile all activities for timeline (notes, tasks, events, calls, etc.)
  const timelineActivities = useMemo(() => {
    const list: {
      id: string;
      type: 'note' | 'task' | 'email' | 'event' | 'call' | 'reunion' | 'videollamada' | 'visita';
      title: string;
      description?: string;
      date: string;
      icon: any;
      iconBg: string;
      done?: boolean;
      conclusions?: string | null;
      email?: string;
      time?: string;
    }[] = [];

    dbActivities.forEach(act => {
      let icon = CalendarIcon;
      let iconBg = 'bg-indigo-500';
      let type: any = 'event';

      if (act.type === 'NOTE') {
        icon = FileText;
        iconBg = 'bg-amber-500';
        type = 'note';
      } else if (act.type === 'TASK') {
        icon = CheckSquare;
        iconBg = 'bg-blue-500';
        type = 'task';
      } else if (act.type === 'EMAIL') {
        icon = Send;
        iconBg = 'bg-indigo-500';
        type = 'email';
      } else if (act.type === 'CALL') {
        icon = Phone;
        iconBg = 'bg-cyan-500';
        type = 'call';
      } else if (act.type === 'REUNION') {
        icon = Users;
        iconBg = 'bg-emerald-500';
        type = 'reunion';
      } else if (act.type === 'VIDEOLLAMADA') {
        icon = Video;
        iconBg = 'bg-violet-500';
        type = 'videollamada';
      } else if (act.type === 'VISITA') {
        icon = MapPin;
        iconBg = 'bg-rose-500';
        type = 'visita';
      }

      list.push({
        id: act.id,
        type,
        title: act.title,
        description: act.description || '',
        date: act.due_date || act.created_at,
        icon,
        iconBg,
        done: act.is_completed,
        conclusions: act.conclusions,
        email: act.email || undefined,
        time: act.time_scheduled || undefined
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dbActivities]);

  // List of events (unifying tasks, notes, meetings, calls, events)
  const filteredEventsList = useMemo(() => {
    return timelineActivities.filter(act => {
      if (act.type === 'email') return false; // Emails have their own tab
      if (eventFilter === 'ALL') return true;
      if (eventFilter === 'TASK') return act.type === 'task';
      if (eventFilter === 'NOTE') return act.type === 'note';
      if (eventFilter === 'REUNION') return act.type === 'reunion';
      if (eventFilter === 'VIDEO') return act.type === 'videollamada';
      if (eventFilter === 'VISIT') return act.type === 'visita';
      if (eventFilter === 'CALL') return act.type === 'call';
      if (eventFilter === 'EVENT') return act.type === 'event';
      return true;
    });
  }, [timelineActivities, eventFilter]);

  // Save linkedin profile link inline
  const handleSaveLinkedin = async (contactId: string) => {
    setIsSavingLinkedin(true);
    try {
      await updateContactLinkedin(contactId, linkedinValue);
      queryClient.invalidateQueries({ queryKey: ['crmContactDetail', contactId] });
      setEditingLinkedinId(null);
    } catch (error) {
      console.error('Error saving linkedin:', error);
    } finally {
      setIsSavingLinkedin(false);
    }
  };

  // Event creation handler
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && activityType !== 'NOTE') return;
    if (activityType === 'NOTE' && !newDescription.trim()) return;

    const payload: any = {
      contactId,
      clientId: contact?.client_id,
      type: activityType,
      title: activityType === 'NOTE' ? 'Nota Comercial Registrada' : newTitle,
      description: newDescription || undefined,
      dueDate: activityType !== 'NOTE' ? newDate : undefined,
    };

    if (activityType !== 'NOTE' && activityType !== 'TASK') {
      payload.timeScheduled = newTime;
      payload.conclusions = newConclusions || undefined;
    }

    createActivityMutation.mutate(payload);

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewTime('10:00');
    setNewConclusions('');
    setShowEventModal(false);
  };

  // Edit activity handler
  const handleEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() && editActivityType !== 'NOTE') return;

    const payload: any = {
      title: editActivityType === 'NOTE' ? 'Nota Comercial Registrada' : editTitle,
      description: editDescription || null,
      conclusions: editConclusions || null
    };

    if (editActivityType === 'TASK' || editActivityType === 'EVENT' || editActivityType === 'REUNION' || editActivityType === 'VIDEOLLAMADA' || editActivityType === 'VISITA' || editActivityType === 'CALL') {
      payload.dueDate = editDate ? new Date(editDate).toISOString() : null;
    }
    if (editActivityType !== 'NOTE' && editActivityType !== 'TASK') {
      payload.timeScheduled = editTime || null;
    }

    updateActivityMutation.mutate({
      id: editActivityId!,
      payload
    }, {
      onSuccess: () => {
        setShowEditModal(false);
        setEditActivityId(null);
        setEditActivityType(null);
      }
    });
  };

  // Send email mockup handler
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailSubject.trim() || !newEmailBody.trim()) return;

    createActivityMutation.mutate({
      contactId,
      clientId: contact?.client_id,
      type: 'EMAIL',
      title: newEmailSubject,
      description: newEmailBody,
      email: contact?.email || undefined
    });

    setNewEmailSubject('');
    setNewEmailBody('');
    setSelectedEmailTemplate('');
    setShowEmailModal(false);
  };

  const applyTemplateBody = (templateId: string) => {
    if (!templateId || templateId === 'free') {
      setNewEmailSubject('');
      setNewEmailBody('');
      return;
    }
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const salespersonName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Comercial dTS';
    const companyName = contact?.customer?.name || '';
    const contactName = contact?.name || '';

    const subject = template.subject.replace('[Nombre Empresa]', companyName);
    const body = template.body
      .replace('[Contacto]', contactName)
      .replace('[Vendedor]', salespersonName);

    setNewEmailSubject(subject);
    setNewEmailBody(body);
  };

  if (isLoadingContact) {
    return <div className="text-center py-20 text-xs text-gray-400 uppercase font-medium">Cargando ficha de contacto...</div>;
  }

  if (!contact) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="italic">No se pudo encontrar el contacto comercial.</p>
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
          <ArrowLeft size={14} /> Volver al Directorio de Contactos
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-dts-secondary/10 dark:bg-white/5 text-dts-secondary flex items-center justify-center font-bold text-lg">
              {contact.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-dts-primary dark:text-white flex items-center gap-2">
                {contact.name}
                {contact.job_title && (
                  <span className="text-[9px] font-semibold text-dts-secondary bg-dts-secondary/10 dark:bg-dts-secondary/20 px-2 py-0.5 rounded uppercase tracking-wider font-sans shrink-0">
                    {contact.job_title}
                  </span>
                )}
              </h2>
              {contact.customer && (
                <div className="mt-1.5">
                  <a 
                    href={`/crm/customers?clientId=${contact.client_id}`} 
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-dts-secondary transition-colors font-semibold flex items-center gap-1.5 w-max"
                  >
                    <span className="text-base">🏢</span>
                    <span className="hover:underline">{contact.customer.name}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-2 md:pt-0">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" title={contact.email}>
                <Mail size={16} className="text-gray-400" />
              </a>
            )}
            {contact.phone_no && (
              <a href={`tel:${contact.phone_no}`} className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" title={contact.phone_no}>
                <Phone size={16} className="text-gray-400" />
              </a>
            )}
            {contact.mobile_no && (
              <a href={`tel:${contact.mobile_no}`} className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" title={contact.mobile_no}>
                <Smartphone size={16} className="text-gray-400" />
              </a>
            )}
            <div className="flex items-center gap-1 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-1.5 bg-gray-50/50 dark:bg-zinc-800/10">
              {editingLinkedinId === contact.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    className="text-[10px] border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded w-32 focus:outline-none"
                    value={linkedinValue}
                    onChange={(e) => setLinkedinValue(e.target.value)}
                    disabled={isSavingLinkedin}
                  />
                  <button onClick={() => handleSaveLinkedin(contact.id)} disabled={isSavingLinkedin} className="text-emerald-500"><Check size={12} /></button>
                  <button onClick={() => setEditingLinkedinId(null)} disabled={isSavingLinkedin} className="text-rose-500"><X size={12} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {contact.linkedin ? (
                    <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[10px]">
                      <Linkedin size={14} />
                      LinkedIn
                    </a>
                  ) : (
                    <button 
                      onClick={() => { setEditingLinkedinId(contact.id); setLinkedinValue(contact.linkedin || ''); }}
                      className="text-gray-400 hover:text-dts-secondary flex items-center gap-1 font-semibold text-[10px] cursor-pointer"
                    >
                      <Linkedin size={14} />
                      Añadir LinkedIn
                    </button>
                  )}
                  <button onClick={() => { setEditingLinkedinId(contact.id); setLinkedinValue(contact.linkedin || ''); }} className="text-gray-400 hover:text-dts-secondary cursor-pointer">
                    <Edit2 size={10} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Tabbed Panel */}
      <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-340px)] min-h-[450px]">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-800/20 p-1 shrink-0">
          {[
            { id: 'info', label: 'Información', icon: User },
            { id: 'timeline', label: 'Timeline', icon: Activity },
            { id: 'ofertas', label: 'Ofertas', icon: Briefcase },
            { id: 'eventos', label: 'Eventos', icon: CalendarIcon },
            { id: 'emails', label: 'Emails', icon: Send }
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

        {/* Tab contents (scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-medium">Nombre completo</span>
                      <span className="block font-bold text-gray-900 dark:text-white mt-1">{contact.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Cargo</span>
                      <span className="block font-bold text-gray-900 dark:text-white mt-1">{contact.job_title || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Email</span>
                      <span className="block font-bold text-gray-900 dark:text-white mt-1 break-all">{contact.email || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Teléfono / Móvil</span>
                      <span className="block font-bold text-gray-900 dark:text-white mt-1">
                        {contact.phone_no || contact.mobile_no || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Nivel Organizacional</span>
                      <span className="block font-bold text-gray-900 dark:text-white mt-1">
                        {contact.org_level_code ? contact.org_level_code.replace(/\.+$/, '') : 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Relación Comercial</span>
                      <span className="block font-bold text-gray-900 dark:text-white mt-1">{contact.business_relation}</span>
                    </div>
                  </div>
                </div>

                {contact.customer && (
                  <div className="space-y-6 pt-4">
                    <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                      Datos de Empresa
                    </h3>
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex gap-3">
                          <MapPin className="text-dts-secondary shrink-0" size={18} />
                          <div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">Localización</span>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-200 mt-0.5">{contact.customer.address}</p>
                            {contact.customer.address_2 && <p className="text-sm text-gray-600 dark:text-gray-400">{contact.customer.address_2}</p>}
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">{contact.customer.post_code} {contact.customer.city}</p>
                            {contact.customer.county && <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">{contact.customer.county}</p>}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                              <Mail size={16} />
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block">Email Principal</span>
                              {contact.customer.email ? (
                                <a href={`mailto:${contact.customer.email}`} className="text-xs font-semibold text-dts-primary dark:text-dts-secondary hover:underline break-all">
                                  {contact.customer.email}
                                </a>
                              ) : <span className="text-xs text-gray-400 italic">No disponible</span>}
                            </div>
                          </div>

                          <div className="flex gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                              <Phone size={16} />
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block">Teléfono Fijo</span>
                              {contact.customer.phone_no ? (
                                <a href={`tel:${contact.customer.phone_no}`} className="text-xs font-semibold text-dts-primary dark:text-dts-secondary hover:underline">
                                  {contact.customer.phone_no}
                                </a>
                              ) : <span className="text-xs text-gray-400 italic">No disponible</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-white/1 rounded-xl border border-gray-100 dark:border-white/5 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Razón Social</span>
                          <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block truncate" title={contact.customer.name}>
                            {contact.customer.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Código ERP</span>
                          <span className="font-semibold font-mono text-gray-900 dark:text-white mt-0.5 block">{contact.customer.client_id}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Segmento de Mercado</span>
                          <span className="font-semibold text-dts-primary dark:text-white mt-0.5 block">{contact.customer.market_segment || 'No definido'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Modelo de Negocio</span>
                          <span className="font-semibold text-dts-primary dark:text-white mt-0.5 block">{contact.customer.business_model || 'No definido'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Comercial Asignado</span>
                          <span className="font-semibold text-dts-secondary mt-0.5 block">{contact.customer.salesperson_code || 'No asignado'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Condiciones Pago</span>
                          <span className="font-semibold text-dts-primary dark:text-white mt-0.5 block">{contact.customer.payment_terms_code || 'Estándar'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Ventas Totales (Real)</span>
                          <span className="font-semibold font-mono text-emerald-500 mt-0.5 block">
                            {formatCurrency(contact.customer.total_sales, 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Saldo Vencido</span>
                          <span className="font-semibold font-mono text-rose-500 mt-0.5 block">
                            {formatCurrency(contact.customer.balance_due_lcy, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CRM Quotes Pipeline embedded right inside the Info Tab */}
              <div className="flex flex-col h-full border-l border-gray-100 dark:border-white/5 pl-0 lg:pl-8 space-y-4">
                <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                  Pipeline de Ofertas
                </h3>
                {isLoadingQuotes ? (
                  <div className="text-center py-10 text-xs text-gray-400 uppercase font-medium">Cargando pipeline...</div>
                ) : crmQuotes.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic text-xs">No hay ofertas CRM asociadas a este contacto.</div>
                ) : (
                  <div className="grid grid-cols-5 gap-2 h-full overflow-y-auto max-h-[380px] min-h-[300px]">
                    {STAGES.map(stage => {
                      const stageQuotes = crmQuotes.filter(q => (q.estado_oferta || 'borrador').toLowerCase() === stage.id);
                      return (
                        <div 
                          key={stage.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, stage.id)}
                          className={`rounded-lg border p-1.5 flex flex-col space-y-2 bg-gray-50/20 dark:bg-zinc-800/5 transition-all ${stage.color} border-t-2 ${
                            draggingId ? 'border-dashed border-dts-secondary/50 bg-dts-secondary/5' : 'border-gray-100 dark:border-gray-800/40'
                          }`}
                        >
                          <div className="flex justify-between items-center pb-0.5 border-b border-gray-100 dark:border-white/5">
                            <span className="text-[7.5px] font-extrabold text-gray-500 uppercase tracking-tight truncate" title={stage.label}>{stage.label}</span>
                            <span className="text-[8px] font-bold font-mono px-1 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                              {stageQuotes.length}
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-0.5">
                            {stageQuotes.map(quote => (
                              <div 
                                key={quote.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, quote.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => openQuoteDrawer(quote)}
                                className="bg-white dark:bg-surface-card-dark p-2 rounded-md border border-gray-150 dark:border-gray-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer hover:border-dts-secondary/55 transition-all text-[10px]"
                              >
                                <div className="flex justify-between items-center gap-1 mb-0.5">
                                  <span className="text-[8px] font-bold font-mono text-dts-secondary truncate w-14">{quote.document_no}</span>
                                  <span className="text-[8px] font-bold font-mono text-emerald-500">{quote.probabilidad_exito}%</span>
                                </div>
                                <div className="font-bold text-gray-800 dark:text-white truncate text-[9px] mb-0.5">{quote.customer_name}</div>
                                <div className="font-mono text-gray-900 dark:text-white font-black text-[9.5px]">{formatCurrency(quote.amount, 0)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="relative border-l border-gray-100 dark:border-white/5 ml-3 space-y-6">
              {timelineActivities.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-4">No hay historial registrado para este contacto.</p>
              ) : (
                timelineActivities.map(act => (
                  <div key={act.id} className="relative pl-6 animate-in slide-in-from-left duration-300">
                    <div className={`absolute -left-3 top-1.5 w-6 h-6 rounded-full ${act.iconBg} text-white flex items-center justify-center`}>
                      <act.icon size={12} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{act.title}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(act.date).toLocaleDateString('es-ES')} {act.time || ''}
                        </span>
                      </div>
                      {act.email && (
                        <span className="text-[10px] text-gray-400 block font-mono">Para/De: {act.email}</span>
                      )}
                      {act.description && (
                        <p className="text-xs text-gray-500 leading-relaxed bg-gray-50/50 dark:bg-zinc-800/10 p-2 rounded-lg border border-gray-100/50 dark:border-white/5 w-full whitespace-pre-wrap">{act.description}</p>
                      )}
                      {act.conclusions && (
                        <div className="text-[11px] border-l-2 border-emerald-500 pl-2 bg-emerald-50/20 dark:bg-emerald-950/5 py-1 text-emerald-700 dark:text-emerald-300">
                          <strong>Conclusiones:</strong> {act.conclusions}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Ofertas Tab (Pipeline) */}
          {activeTab === 'ofertas' && (
            <div className="flex flex-col h-full space-y-4">
              {isLoadingQuotes ? (
                <div className="text-center py-10 text-xs text-gray-400 uppercase font-medium">Cargando ofertas comerciales...</div>
              ) : crmQuotes.length === 0 ? (
                <div className="text-center py-20 text-gray-400 italic text-xs">Este contacto no tiene ofertas CRM asociadas actualmente.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-full min-h-[350px]">
                  {STAGES.map(stage => {
                    const stageQuotes = crmQuotes.filter(q => (q.estado_oferta || 'borrador').toLowerCase() === stage.id);
                    return (
                      <div 
                        key={stage.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, stage.id)}
                        className={`rounded-xl border p-3 flex flex-col space-y-3 h-full bg-gray-50/30 dark:bg-zinc-800/5 transition-all ${stage.color} border-t-2 ${
                          draggingId ? 'border-dashed border-dts-secondary/60 bg-dts-secondary/5' : 'border-gray-100 dark:border-gray-800/55'
                        }`}
                      >
                        <div className="flex justify-between items-center pb-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stage.label}</span>
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                            {stageQuotes.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
                          {stageQuotes.map(quote => (
                            <div 
                              key={quote.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, quote.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => openQuoteDrawer(quote)}
                              className="bg-white dark:bg-surface-card-dark p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-xs cursor-pointer hover:border-dts-secondary/50 hover:shadow-xs transition-all active:scale-[0.98]"
                            >
                              <div className="flex justify-between items-start mb-1.5">
                                <span className="text-[10px] font-bold font-mono text-dts-secondary">{quote.document_no}</span>
                                <span className="text-[9px] font-bold font-mono text-emerald-500">{quote.probabilidad_exito}%</span>
                              </div>
                              <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate mb-1">{quote.customer_name}</h4>
                              <p className="text-[11px] font-mono text-gray-900 dark:text-white font-black">{formatCurrency(quote.amount, 0)}</p>
                              {quote.proxima_accion && (
                                <div className="mt-2 text-[9px] border-t border-gray-50 dark:border-white/5 pt-1.5 text-amber-600 dark:text-amber-400 font-semibold truncate" title={quote.proxima_accion}>
                                  ➔ {quote.proxima_accion}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Eventos Tab (Unificada: Tareas, Notas, Calendario) */}
          {activeTab === 'eventos' && (
            <div className="space-y-6">
              {/* Header con filtros y botón nueva actividad */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-gray-100 dark:border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: 'Todas' },
                    { id: 'TASK', label: 'Tareas' },
                    { id: 'NOTE', label: 'Notas' },
                    { id: 'REUNION', label: 'Reuniones' },
                    { id: 'VIDEO', label: 'Videollamadas' },
                    { id: 'VISIT', label: 'Visitas' },
                    { id: 'CALL', label: 'Llamadas' },
                    { id: 'EVENT', label: 'Eventos' }
                  ].map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => setEventFilter(chip.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-colors cursor-pointer ${
                        eventFilter === chip.id
                          ? 'bg-dts-secondary text-white'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowEventModal(true)}
                  className="px-3 py-1.5 bg-dts-secondary hover:brightness-110 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Nueva Actividad
                </button>
              </div>

              {/* Listado de eventos */}
              <div className="space-y-3">
                {isLoadingActivities ? (
                  <div className="text-center py-10 text-xs text-gray-400 uppercase font-medium">Cargando actividades...</div>
                ) : filteredEventsList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic text-xs">No se encontraron actividades del tipo seleccionado.</div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredEventsList.map(act => (
                      <div key={act.id} className="py-4 flex gap-4 items-start hover:bg-gray-50/20 dark:hover:bg-white/2 transition-colors px-2 rounded-xl">
                        {act.type === 'task' && (
                          <input 
                            type="checkbox" 
                            checked={act.done || false}
                            onChange={() => updateActivityMutation.mutate({ id: act.id, payload: { isCompleted: !act.done } })}
                            className="mt-0.5 w-4 h-4 text-dts-secondary border-gray-300 rounded focus:ring-dts-secondary focus:ring-2 cursor-pointer"
                          />
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Badge del tipo de actividad */}
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              act.type === 'task' ? 'bg-blue-500/10 text-blue-600' :
                              act.type === 'note' ? 'bg-amber-500/10 text-amber-600' :
                              act.type === 'reunion' ? 'bg-emerald-500/10 text-emerald-600' :
                              act.type === 'videollamada' ? 'bg-violet-500/10 text-violet-600' :
                              act.type === 'visita' ? 'bg-rose-500/10 text-rose-600' :
                              act.type === 'call' ? 'bg-cyan-500/10 text-cyan-600' :
                              'bg-indigo-500/10 text-indigo-600'
                            }`}>
                              {act.type}
                            </span>
                            <h4 className={`text-xs font-bold ${act.done && act.type === 'task' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {act.title}
                            </h4>
                            <span className="text-[10px] text-gray-400 font-mono ml-auto">
                              {new Date(act.date).toLocaleDateString('es-ES')} {act.time || ''}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-xs text-gray-500 whitespace-pre-wrap">{act.description}</p>
                          )}
                          {act.conclusions && (
                            <div className="text-[10px] border-l-2 border-emerald-500 pl-2 bg-emerald-50/10 dark:bg-emerald-950/5 py-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                              <strong>Conclusiones:</strong> {act.conclusions}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditActivityId(act.id);
                              setEditActivityType(act.type.toUpperCase() === 'TASK' ? 'TASK' : act.type.toUpperCase() === 'NOTE' ? 'NOTE' : 'EVENT');
                              setEditTitle(act.title);
                              setEditDescription(act.description || '');
                              setEditDate(act.date ? act.date.split('T')[0] : '');
                              setEditTime(act.time || '10:00');
                              setEditConclusions(act.conclusions || '');
                              setShowEditModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-dts-secondary cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
                                deleteActivityMutation.mutate(act.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-400">Correos electrónicos registrados y plantillas</span>
                <button
                  onClick={() => {
                    setNewEmailAddress(contact.email || '');
                    setShowEmailModal(true);
                  }}
                  className="px-3 py-1.5 bg-dts-secondary hover:brightness-110 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Registrar Email Enviado
                </button>
              </div>

              {/* List of registered emails */}
              <div className="space-y-4">
                {isLoadingActivities ? (
                  <div className="text-center py-10 text-xs text-gray-400 uppercase font-medium">Cargando emails...</div>
                ) : timelineActivities.filter(a => a.type === 'email').length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic text-xs">No hay correos registrados para este contacto.</div>
                ) : (
                  <div className="space-y-3">
                    {timelineActivities.filter(a => a.type === 'email').map(mail => (
                      <div key={mail.id} className="bg-gray-50/50 dark:bg-zinc-800/10 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">{mail.title}</h4>
                            <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Destinatario: {mail.email}</span>
                          </div>
                          <span className="text-[9px] font-mono text-gray-400">
                            {new Date(mail.date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed pt-1 bg-white/40 dark:bg-black/5 p-2 rounded-lg font-mono text-[11px] border border-gray-50/50 dark:border-white/2">
                          {mail.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Nueva Actividad Unificada */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">Nueva Actividad</h3>
              <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipo de Actividad</label>
                <select
                  value={activityType}
                  onChange={(e: any) => setActivityType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                >
                  <option value="TASK">Tarea (Completar)</option>
                  <option value="NOTE">Nota Comercial</option>
                  <option value="REUNION">Reunión Presencial</option>
                  <option value="VIDEOLLAMADA">Videollamada</option>
                  <option value="VISITA">Visita a Cliente</option>
                  <option value="CALL">Llamada Telefónica</option>
                  <option value="EVENT">Otro Evento</option>
                </select>
              </div>

              {activityType !== 'NOTE' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título / Concepto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Enviar propuesta, Demo técnica, Presentación..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  />
                </div>
              )}

              {activityType !== 'NOTE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                    />
                  </div>
                  {activityType !== 'TASK' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hora</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {activityType === 'NOTE' ? 'Texto de la Nota' : 'Descripción / Detalles'}
                </label>
                <textarea
                  required={activityType === 'NOTE'}
                  placeholder={activityType === 'NOTE' ? 'Escribe aquí los comentarios de seguimiento...' : 'Notas opcionales sobre la actividad...'}
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none"
                />
              </div>

              {activityType !== 'NOTE' && activityType !== 'TASK' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conclusiones (si ya finalizó)</label>
                  <textarea
                    placeholder="Conclusiones o acuerdos alcanzados..."
                    rows={2}
                    value={newConclusions}
                    onChange={(e) => setNewConclusions(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Email Enviado */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">Registrar Email Enviado</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cargar Plantilla Corporativa</label>
                <select
                  value={selectedEmailTemplate}
                  onChange={(e) => {
                    setSelectedEmailTemplate(e.target.value);
                    applyTemplateBody(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                >
                  {EMAIL_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destinatario</label>
                <input
                  type="email"
                  required
                  disabled
                  value={newEmailAddress}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asunto</label>
                <input
                  type="text"
                  required
                  placeholder="Asunto del correo..."
                  value={newEmailSubject}
                  onChange={(e) => setNewEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cuerpo del Email</label>
                <textarea
                  required
                  placeholder="Escribe el cuerpo del correo registrado..."
                  rows={6}
                  value={newEmailBody}
                  onChange={(e) => setNewEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-mono text-[11px]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Registrar Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Actividad */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">Editar Actividad</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <form onSubmit={handleEditActivity} className="space-y-4 text-xs">
              {editActivityType !== 'NOTE' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título / Concepto</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  />
                </div>
              )}

              {editActivityType !== 'NOTE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha</label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                    />
                  </div>
                  {editActivityType !== 'TASK' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hora</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                <textarea
                  required={editActivityType === 'NOTE'}
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none"
                />
              </div>

              {editActivityType !== 'NOTE' && editActivityType !== 'TASK' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conclusiones</label>
                  <textarea
                    placeholder="Escribe conclusiones o acuerdos..."
                    rows={2}
                    value={editConclusions}
                    onChange={(e) => setEditConclusions(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Detalle de Oferta CRM */}
      <Drawer isOpen={isQuoteDrawerOpen} onClose={() => setIsQuoteDrawerOpen(false)} title={`Detalle de Oferta - ${selectedQuote?.document_no || ''}`}>
        {selectedQuote && (
          <div className="space-y-6 text-xs max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
            
            {/* Cabecera del Drawer */}
            <div className="bg-gray-50 dark:bg-zinc-800/10 p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase">Oferta CRM</span>
                <span className="text-xs font-bold font-mono text-emerald-500">{formatCurrency(selectedQuote.amount, 0)}</span>
              </div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">{selectedQuote.customer_name}</h4>
              <div className="grid grid-cols-2 gap-4 pt-2 text-[11px] text-gray-500">
                <div>
                  <span className="block font-bold">Estado actual:</span>
                  <span className="uppercase font-extrabold text-dts-secondary">{selectedQuote.estado_oferta}</span>
                </div>
                <div>
                  <span className="block font-bold">Probabilidad:</span>
                  <span className="font-mono font-extrabold">{selectedQuote.probabilidad_exito}%</span>
                </div>
              </div>
            </div>

            {/* Selector de estado del pipeline */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cambiar Estado de la Oferta</label>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      let prob = 10;
                      if (s.id === 'borrador') prob = 10;
                      else if (s.id === 'enviada') prob = 25;
                      else if (s.id === 'en negociación') prob = 50;
                      else if (s.id === 'ganada') prob = 100;
                      else if (s.id === 'perdida') prob = 0;

                      updateQuoteMutation.mutate({
                        id: selectedQuote.id,
                        data: { estado_oferta: s.id, probabilidad_exito: prob },
                        fromStage: (selectedQuote.estado_oferta || 'borrador').toUpperCase(),
                        toStage: s.id.toUpperCase(),
                        documentNo: selectedQuote.document_no
                      }, {
                        onSuccess: () => {
                          setSelectedQuote(prev => prev ? { ...prev, estado_oferta: s.id, probabilidad_exito: prob } : null);
                        }
                      });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      selectedQuote.estado_oferta.toLowerCase() === s.id
                        ? 'bg-dts-primary text-white dark:bg-dts-secondary'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Planificación / Seguimiento */}
            <div className="space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
              <h5 className="font-bold text-dts-primary dark:text-white uppercase tracking-wider">Planificación de Seguimiento</h5>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Próxima Acción</label>
                    <input
                      type="text"
                      placeholder="Llamar, enviar demo, etc..."
                      value={formProximaAccion}
                      onChange={(e) => setFormProximaAccion(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha Planificada</label>
                    <input
                      type="date"
                      value={formFechaProximaAccion}
                      onChange={(e) => setFormFechaProximaAccion(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Observaciones internas</label>
                  <textarea
                    placeholder="Añade observaciones generales..."
                    rows={3}
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleSavePlanning}
                  disabled={isSavingPlanning}
                  className="w-full py-2 bg-dts-secondary text-white font-bold rounded-lg hover:brightness-110 transition-all cursor-pointer text-xs"
                >
                  {isSavingPlanning ? 'Guardando...' : 'Guardar Planificación'}
                </button>
              </div>
            </div>

            {/* Listado de interacciones de la oferta */}
            <div className="space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
              <h5 className="font-bold text-dts-primary dark:text-white uppercase tracking-wider">Historial de la Oferta</h5>
              
              <form onSubmit={handleAddQuoteActivity} className="space-y-2 bg-gray-50/50 dark:bg-zinc-800/10 p-3 rounded-lg border border-gray-100 dark:border-white/5">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newQuoteActivityType}
                    onChange={(e) => setNewQuoteActivityType(e.target.value)}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white"
                  >
                    <option value="Llamada">Llamada</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Nota">Nota</option>
                    <option value="Email">Email</option>
                    <option value="Tarea">Tarea</option>
                  </select>
                  <input
                    type="date"
                    value={newQuoteActivityDate}
                    onChange={(e) => setNewQuoteActivityDate(e.target.value)}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Notas de la interacción..."
                  value={newQuoteActivityNotes}
                  onChange={(e) => setNewQuoteActivityNotes(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white"
                />
                <button type="submit" className="w-full py-1 bg-dts-primary text-white font-bold rounded-lg hover:brightness-110 text-[10px]">
                  Registrar Interacción
                </button>
              </form>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {quoteActivities.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">Sin interacciones registradas.</p>
                ) : (
                  quoteActivities.map((act: any) => (
                    <div key={act.id} className="p-2 rounded-lg border border-gray-50 dark:border-white/2 bg-white/40 dark:bg-black/5 flex gap-2 items-start">
                      {act.tipo === 'Tarea' && (
                        <input
                          type="checkbox"
                          checked={act.hecho}
                          onChange={() => updateQuoteActivityMutation.mutate({ activityId: act.id, data: { hecho: !act.hecho } })}
                          className="mt-0.5"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-dts-secondary text-[9px] uppercase">{act.tipo}</span>
                          <span className="text-[8px] text-gray-400 font-mono">{new Date(act.fecha).toLocaleDateString('es-ES')}</span>
                        </div>
                        <p className={`text-[10px] mt-0.5 ${act.hecho && act.tipo === 'Tarea' ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>{act.notes || act.notas}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar interacción?')) {
                            deleteQuoteActivityMutation.mutate(act.id);
                          }
                        }}
                        className="text-gray-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={10} />
                      </button>
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

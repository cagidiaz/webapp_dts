import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { 
  updateContactLinkedin,
  getCrmActivitiesByContact, createCrmActivity, updateCrmActivity, deleteCrmActivity,
  getAllCrmQuotes, updateCrmQuote, addQuoteActivity, type CRMQuote,
  getQuoteActivities, updateQuoteActivity, deleteQuoteActivity,
  createExchangeDraft, openInOutlook, getExchangeStatus, syncExchangeNow,
  getPreferredOutlookClient, setPreferredOutlookClient, openExistingEmailInOutlook
} from '../../../api';
import { formatCurrency } from '../../../api/formatters';
import { 
  ArrowLeft, Phone, Mail, MapPin, Smartphone,
  Linkedin, Edit2, Check, X, Plus, Calendar, Clock, Percent,
  Briefcase, FileText, CheckSquare, Send, User, Activity, Trash2, Video, Users, ExternalLink,
  Copy, CheckCheck, Laptop, Globe, RefreshCw
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
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get('tab') as 'info' | 'timeline' | 'ofertas' | 'eventos' | 'emails' | null;
  const validTabs = ['info', 'timeline', 'ofertas', 'eventos', 'emails'];
  const initialTab = urlTab && validTabs.includes(urlTab) ? urlTab : 'info';
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'ofertas' | 'eventos' | 'emails'>(initialTab);

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabId: 'info' | 'timeline' | 'ofertas' | 'eventos' | 'emails') => {
    setActiveTab(tabId);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (tabId === 'info') {
        newParams.delete('tab');
      } else {
        newParams.set('tab', tabId);
      }
      return newParams;
    }, { replace: true });
  };

  // LinkedIn editing states
  const [editingLinkedinId, setEditingLinkedinId] = useState<string | null>(null);
  const [linkedinValue, setLinkedinValue] = useState<string>('');
  const [isSavingLinkedin, setIsSavingLinkedin] = useState<boolean>(false);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Form states (Unified Event Modal)
  const [activityType, setActivityType] = useState<'TASK' | 'NOTE' | 'REUNION' | 'VIDEOLLAMADA' | 'CALL' | 'EVENT'>('TASK');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newConclusions, setNewConclusions] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Form states (Emails)
  const [newEmailSubject, setNewEmailSubject] = useState('');
  const [newEmailBody, setNewEmailBody] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState('');
  const [outlookTarget, setOutlookTarget] = useState<'desktop' | 'web'>(getPreferredOutlookClient());
  const [isCopied, setIsCopied] = useState(false);

  // Edit states
  const [editActivityId, setEditActivityId] = useState<string | null>(null);
  const [editActivityType, setEditActivityType] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editConclusions, setEditConclusions] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Filter chips in Eventos Tab
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  // Queries
  const { data: exchangeStatus } = useQuery({
    queryKey: ['exchangeStatus'],
    queryFn: getExchangeStatus,
  });
  const isExchangeConnected = !!exchangeStatus?.isConnected;

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

  // Helper para obtener la dirección completa de la empresa del contacto
  const getCompanyAddress = (): string => {
    if (!contact?.customer) return '';
    const street = [contact.customer.address, contact.customer.address_2].filter(Boolean).join(', ');
    const locality = [contact.customer.post_code, contact.customer.city].filter(Boolean).join(' ');
    const showCounty = contact.customer.county && 
      contact.customer.county.trim().toLowerCase() !== (contact.customer.city || '').trim().toLowerCase();
    const parts = [street, locality, showCounty ? contact.customer.county : null].filter(Boolean);
    return parts.join(', ').trim();
  };

  const handleOpenEventModal = () => {
    if (activityType === 'REUNION' && !newLocation.trim()) {
      const addr = getCompanyAddress();
      if (addr) setNewLocation(addr);
    }
    setShowEventModal(true);
  };

  // Mutations
  const createActivityMutation = useMutation({
    mutationFn: createCrmActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
    }
  });

  const prepareEmailMutation = useMutation({
    mutationFn: async (payload: { to: string[]; subject: string; body: string; target: 'desktop' | 'web' }) => {
      const recipient = payload.to[0] || '';
      
      if (payload.target === 'web' && isExchangeConnected) {
        // Crear borrador en Microsoft Graph y abrir su webLink en Outlook Web
        const result = await createExchangeDraft({
          contactId,
          clientId: contact?.client_id,
          to: payload.to,
          subject: payload.subject,
          body: payload.body,
        });

        openInOutlook({
          to: recipient,
          subject: payload.subject,
          body: payload.body,
          target: 'web',
          webLink: result.draft?.webLink,
        });
        return result;
      } else {
        // Registrar actividad de preparación en el CRM y lanzar Outlook Escritorio o Web
        const activity = await createCrmActivity({
          contactId,
          clientId: contact?.client_id,
          type: 'EMAIL',
          title: payload.subject,
          description: payload.body,
          email: recipient,
        });

        openInOutlook({
          to: recipient,
          subject: payload.subject,
          body: payload.body,
          target: payload.target,
        });
        return { activity };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
      setNewEmailSubject('');
      setNewEmailBody('');
      setSelectedEmailTemplate('');
      setShowEmailModal(false);
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateCrmActivity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: deleteCrmActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
    }
  });

  const syncExchangeMutation = useMutation({
    mutationFn: syncExchangeNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmActivitiesByContact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['exchangeStatus'] });
    }
  });

  // Auto-sincronización silenciosa en segundo plano si hay borradores pendientes en la ficha
  const hasPendingDrafts = useMemo(() => {
    return (dbActivities || []).some((act: any) => act.type === 'EMAIL' && act.exchange_sync_status === 'draft');
  }, [dbActivities]);

  const autoSyncedRef = useRef(false);

  useEffect(() => {
    if (isExchangeConnected && hasPendingDrafts && !autoSyncedRef.current && !syncExchangeMutation.isPending) {
      autoSyncedRef.current = true;
      syncExchangeMutation.mutate(undefined, {
        onSettled: () => {
          // Permitir re-comprobación tras 20 segundos
          setTimeout(() => {
            autoSyncedRef.current = false;
          }, 20000);
        }
      });
    }
  }, [isExchangeConnected, hasPendingDrafts, activeTab]);

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
      queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['crm-quotes-kpis'] });
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

  const handleStageChange = (newStage: string) => {
    if (!selectedQuote) return;

    let prob = selectedQuote.probabilidad_exito;
    const stage = newStage.toLowerCase();
    if (stage === 'borrador') prob = 10;
    else if (stage === 'enviada') prob = 25;
    else if (stage === 'en negociación') prob = 50;
    else if (stage === 'ganada') prob = 100;
    else if (stage === 'perdida') prob = 0;

    const newWeighted = ((selectedQuote.amount || 0) * prob) / 100;

    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      data: { 
        estado_oferta: newStage,
        probabilidad_exito: prob 
      },
      fromStage: (selectedQuote.estado_oferta || 'borrador').toUpperCase(),
      toStage: newStage.toUpperCase(),
      documentNo: selectedQuote.document_no
    }, {
      onSuccess: () => {
        setSelectedQuote(prev => prev ? {
          ...prev,
          estado_oferta: newStage,
          probabilidad_exito: prob,
          valor_oferta_ponderado: newWeighted
        } : null);
      }
    });
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    if (!selectedQuote) return;
    const updateData: any = { [fieldName]: value };

    let newWeighted = selectedQuote.valor_oferta_ponderado;
    if (fieldName === 'probabilidad_exito') {
      newWeighted = ((selectedQuote.amount || 0) * Number(value)) / 100;
      updateData.probabilidad_exito = Number(value);
    }

    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      data: updateData,
      fromStage: (selectedQuote.estado_oferta || 'borrador').toUpperCase(),
      toStage: (selectedQuote.estado_oferta || 'borrador').toUpperCase(),
      documentNo: selectedQuote.document_no
    }, {
      onSuccess: () => {
        setSelectedQuote(prev => prev ? {
          ...prev,
          [fieldName]: value,
          valor_oferta_ponderado: newWeighted
        } : null);
      }
    });
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
      location?: string | null;
      exchangeSyncStatus?: string | null;
      exchangeWebLink?: string | null;
    }[] = [];

    dbActivities.forEach((act: any) => {
      let icon = Calendar;
      let iconBg = 'bg-indigo-500';
      let type: 'note' | 'task' | 'email' | 'event' | 'call' | 'reunion' | 'videollamada' | 'visita' = 'event';

      if (act.type === 'NOTE') {
        icon = FileText;
        iconBg = 'bg-amber-500 dark:bg-amber-600/90';
        type = 'note';
      } else if (act.type === 'TASK') {
        icon = CheckSquare;
        iconBg = 'bg-blue-500 dark:bg-blue-600/90';
        type = 'task';
      } else if (act.type === 'EMAIL') {
        icon = Mail;
        iconBg = 'bg-indigo-500 dark:bg-indigo-600/90';
        type = 'email';
      } else if (act.type === 'CALL') {
        icon = Phone;
        iconBg = 'bg-emerald-500 dark:bg-emerald-600/90';
        type = 'call';
      } else if (act.type === 'REUNION') {
        icon = Users;
        iconBg = 'bg-purple-500 dark:bg-purple-600/90';
        type = 'reunion';
      } else if (act.type === 'VIDEOLLAMADA') {
        icon = Video;
        iconBg = 'bg-cyan-500 dark:bg-cyan-600/90';
        type = 'videollamada';
      } else if (act.type === 'VISITA') {
        icon = MapPin;
        iconBg = 'bg-rose-500 dark:bg-rose-600/90';
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
        time: act.time_scheduled || undefined,
        location: act.location || undefined,
        exchangeSyncStatus: act.exchange_sync_status || null,
        exchangeWebLink: act.exchange_web_link || null,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dbActivities]);

  // KPIs de ofertas para este contacto específico
  const contactQuoteKpis = useMemo(() => {
    const totalCount = crmQuotes.length;
    let totalAmount = 0;
    let wonCount = 0;
    let wonAmount = 0;
    let activeCount = 0;
    let activeAmount = 0;
    let closedCount = 0;

    crmQuotes.forEach(q => {
      const state = (q.estado_oferta || '').toLowerCase().trim();
      const amt = Number(q.amount || 0);
      totalAmount += amt;

      if (state === 'ganada') {
        wonCount++;
        wonAmount += amt;
        closedCount++;
      } else if (state === 'perdida') {
        closedCount++;
      } else {
        activeCount++;
        activeAmount += amt;
      }
    });

    const successRate = closedCount > 0 
      ? Math.round((wonCount / closedCount) * 100) 
      : 0;

    return {
      totalCount,
      totalAmount,
      wonCount,
      wonAmount,
      activeCount,
      activeAmount,
      successRate
    };
  }, [crmQuotes]);

  // List of events (unifying tasks, notes, meetings, calls, events)
  const filteredEventsList = useMemo(() => {
    return timelineActivities.filter(act => {
      if (act.type === 'email') return false; // Emails have their own tab
      if (eventFilter === 'ALL') return true;
      if (eventFilter === 'TASK') return act.type === 'task';
      if (eventFilter === 'NOTE') return act.type === 'note';
      if (eventFilter === 'REUNION') return act.type === 'reunion' || act.type === 'visita';
      if (eventFilter === 'VIDEO') return act.type === 'videollamada';
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
      location: newLocation || undefined,
    };

    if (activityType !== 'NOTE') {
      payload.timeScheduled = newTime || undefined;
    }
    if (activityType !== 'NOTE' && activityType !== 'TASK') {
      payload.conclusions = newConclusions || undefined;
    }

    createActivityMutation.mutate(payload);

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewTime('10:00');
    setNewConclusions('');
    setNewLocation('');
    setShowEventModal(false);
  };

  // Edit activity handler
  const handleEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() && editActivityType !== 'NOTE') return;

    const payload: any = {
      title: editActivityType === 'NOTE' ? 'Nota Comercial Registrada' : editTitle,
      description: editDescription || null,
      conclusions: editConclusions || null,
      location: editLocation || null,
    };

    if (editActivityType !== 'NOTE') {
      payload.dueDate = editDate ? new Date(editDate).toISOString() : null;
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

  // Prepare and open email in Outlook handler
  const handlePrepareEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailSubject.trim() || !newEmailBody.trim()) return;

    const recipient = newEmailAddress || contact?.email;
    if (!recipient) {
      alert('Por favor especifica una dirección de correo de destino.');
      return;
    }

    prepareEmailMutation.mutate({
      to: [recipient],
      subject: newEmailSubject,
      body: newEmailBody,
      target: outlookTarget,
    });
  };

  const handleCopyContent = () => {
    const fullText = `Asunto: ${newEmailSubject}\n\n${newEmailBody}`;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
              <button 
                onClick={() => openExistingEmailInOutlook({ email: contact.email, target: outlookTarget })} 
                className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 hover:border-cyan-200 dark:hover:border-cyan-800/40 text-gray-400 hover:text-[#00B0B9] transition-all cursor-pointer" 
                title={`Abrir conversación en Outlook (${contact.email})`}
              >
                <Mail size={16} />
              </button>
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
            { id: 'eventos', label: 'Eventos', icon: Calendar },
            { id: 'emails', label: 'Emails', icon: Send }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
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

              {/* Resumen Comercial (KPIs y Actividades Recientes) */}
              <div className="flex flex-col h-full border-l border-gray-100 dark:border-white/5 pl-0 lg:pl-8 space-y-6">
                {/* KPIs de Ofertas */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                    Resumen de Ofertas
                  </h3>
                  {isLoadingQuotes ? (
                    <div className="text-center py-4 text-xs text-gray-400 uppercase font-medium">Cargando KPIs...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50/50 dark:bg-zinc-800/10 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Valor Total Ofertas</span>
                        <span className="text-sm font-black font-mono text-dts-primary dark:text-white mt-1 block">
                          {formatCurrency(contactQuoteKpis.totalAmount, 0)}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5 block">{contactQuoteKpis.totalCount} ofertas emitidas</span>
                      </div>

                      <div className="bg-gray-50/50 dark:bg-zinc-800/10 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Cartera en Curso</span>
                        <span className="text-sm font-black font-mono text-dts-secondary mt-1 block">
                          {formatCurrency(contactQuoteKpis.activeAmount, 0)}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5 block">{contactQuoteKpis.activeCount} ofertas activas</span>
                      </div>

                      <div className="bg-gray-50/50 dark:bg-zinc-800/10 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Ofertas Ganadas</span>
                        <span className="text-sm font-black font-mono text-emerald-500 mt-1 block">
                          {formatCurrency(contactQuoteKpis.wonAmount, 0)}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5 block">{contactQuoteKpis.wonCount} ofertas cerradas con éxito</span>
                      </div>

                      <div className="bg-gray-50/50 dark:bg-zinc-800/10 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Tasa de Éxito</span>
                        <span className="text-sm font-black font-mono text-indigo-500 mt-1 block">
                          {contactQuoteKpis.successRate}%
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5 block">Ganadas / Cerradas</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline de Actividades Recientes */}
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                    Últimas Actividades
                  </h3>
                  {isLoadingActivities ? (
                    <div className="text-center py-4 text-xs text-gray-400 uppercase font-medium">Cargando actividades...</div>
                  ) : timelineActivities.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 italic text-xs">No hay actividades registradas.</div>
                  ) : (
                    <div className="relative pl-6 ml-2.5 space-y-4 overflow-y-auto max-h-[190px] pr-1 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-gray-150 dark:before:bg-zinc-800/60">
                      {timelineActivities.slice(0, 3).map(act => (
                        <div key={act.id} className="relative animate-in slide-in-from-left duration-300">
                          {/* Icon Outside Card */}
                          <div className={`absolute -left-[24px] top-1.5 w-4.5 h-4.5 rounded-full ${act.iconBg} text-white flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm`} title={act.type}>
                            <act.icon size={9} />
                          </div>
                          
                          {/* Card */}
                          <div className="p-2.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/20 dark:bg-zinc-800/5 hover:border-dts-secondary/30 transition-all duration-150 flex flex-col space-y-1.5">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-zinc-100 truncate text-[10px]">{act.title}</span>
                              <span className="text-[8px] text-gray-400 dark:text-zinc-400 font-mono shrink-0">{new Date(act.date).toLocaleDateString('es-ES')}</span>
                            </div>
                            {act.description && (
                              <p className="text-[9.5px] text-gray-450 dark:text-zinc-300 line-clamp-2 leading-relaxed">{act.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="relative ml-3 space-y-6 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-gray-150 dark:before:bg-zinc-800">
              {timelineActivities.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-2">No hay historial registrado para este contacto.</p>
              ) : (
                timelineActivities.map(act => (
                  <div key={act.id} className="relative pl-8 animate-in slide-in-from-left duration-300">
                    {/* Activity Icon Indicator on Timeline */}
                    <div className={`absolute -left-4 top-1.5 w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 ${act.iconBg} flex items-center justify-center shadow-md text-white transition-transform hover:scale-110 duration-200`}>
                      <act.icon size={13} />
                    </div>
                    
                    {/* Activity Card */}
                    <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-white/5 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-dts-secondary/40 transition-all duration-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 dark:border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100">{act.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-[9.5px] text-gray-400 dark:text-zinc-400 font-mono">
                            <Calendar size={11} className="text-gray-400 dark:text-zinc-450" />
                            <span>{new Date(act.date).toLocaleDateString('es-ES')}</span>
                            {act.time && (
                              <>
                                <Clock size={11} className="text-gray-400 dark:text-zinc-450 ml-1" />
                                <span>{act.time}</span>
                              </>
                            )}
                          </div>
                          {act.type === 'email' && (
                            <button
                              type="button"
                              onClick={() => openExistingEmailInOutlook({
                                webLink: act.exchangeWebLink,
                                email: act.email || contact?.email,
                                subject: act.title,
                                target: outlookTarget,
                                exchangeSyncStatus: act.exchangeSyncStatus,
                              })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-bold text-[#00B0B9] hover:bg-[#00B0B9]/10 rounded-md transition-colors cursor-pointer border border-[#00B0B9]/20"
                              title={`Abrir en Outlook (${outlookTarget === 'web' ? 'Web' : 'Escritorio'})`}
                            >
                              <ExternalLink size={9} />
                              <span>Abrir en Outlook</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {act.email && (
                        <div className="text-[10px] text-gray-450 dark:text-zinc-400 flex items-center gap-1.5 font-mono pl-0.5">
                          <Mail size={10} className="text-gray-400 dark:text-zinc-450" />
                          <span>Para/De: {act.email}</span>
                        </div>
                      )}

                      {act.description && (
                        <div className="text-xs text-gray-600 dark:text-zinc-200 leading-relaxed bg-gray-50/50 dark:bg-zinc-800/10 p-3 rounded-lg border border-gray-100/50 dark:border-white/5 w-full whitespace-pre-wrap font-sans">
                          {act.description}
                        </div>
                      )}

                      {act.conclusions && (
                        <div className="text-[11px] border-l-2 border-emerald-500 pl-3 bg-emerald-50/15 dark:bg-emerald-950/20 py-1.5 text-emerald-700 dark:text-emerald-300 rounded-r-md">
                          <strong className="block text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-0.5">Conclusiones</strong>
                          {act.conclusions}
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
                        className={`rounded-xl border-l border-r border-b border-gray-100 dark:border-white/5 border-t-4 p-3 flex flex-col space-y-3 h-full bg-gray-50/30 dark:bg-zinc-800/5 transition-all ${stage.color} ${
                          draggingId ? 'border-dashed border-dts-secondary/60 bg-dts-secondary/5' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center pb-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stage.label}</span>
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                            {stageQuotes.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1">
                          {stageQuotes.map(quote => {
                            const isTaskOverdue = quote.fecha_proxima_accion 
                              ? new Date(quote.fecha_proxima_accion).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) 
                              : false;

                            return (
                              <div 
                                key={quote.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, quote.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => openQuoteDrawer(quote)}
                                className={`bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-150 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-dts-secondary/50 dark:hover:border-dts-secondary/40 cursor-pointer transition-all duration-200 relative group ${
                                  draggingId === quote.id ? 'opacity-30 border-dashed scale-95' : 'opacity-100'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold font-mono text-dts-primary dark:text-dts-secondary">
                                    {quote.document_no}
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
                                    <span className="text-[9px] text-gray-450 dark:text-zinc-400 font-medium block">Importe</span>
                                    <span className="text-xs font-mono font-black text-gray-900 dark:text-white">
                                      {formatCurrency(quote.amount, 0)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] text-gray-450 dark:text-zinc-400 font-medium block">Ponderado</span>
                                    <span className="text-xs font-mono font-black text-dts-secondary">
                                      {formatCurrency(quote.valor_oferta_ponderado, 0)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-50 dark:border-white/5 text-[9px] font-medium text-gray-500">
                                  <span className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded dark:text-zinc-300">
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
                          })}
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
                  onClick={handleOpenEventModal}
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
                              {act.type === 'task' ? 'Tarea' :
                               act.type === 'note' ? 'Nota' :
                               act.type === 'reunion' ? 'Reunión' :
                               act.type === 'videollamada' ? 'Videollamada' :
                               act.type === 'visita' ? 'Visita' :
                               act.type === 'call' ? 'Llamada' : 'Evento'}
                            </span>

                            {act.exchangeSyncStatus === 'synced' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Sincronizado con Outlook">
                                <Check size={10} /> Outlook
                              </span>
                            )}

                            <h4 className={`text-xs font-bold ${act.done && act.type === 'task' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {act.title}
                            </h4>

                            {act.location && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin size={10} className="text-gray-400" />
                                {act.location}
                              </span>
                            )}

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
                        <div className="flex items-center gap-2">
                          {act.exchangeWebLink && (
                            <a
                              href={act.exchangeWebLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-gray-400 hover:text-[#00B0B9] hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="Abrir en Outlook Web / Microsoft Teams"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setEditActivityId(act.id);
                              setEditActivityType(
                                act.type === 'task' ? 'TASK' :
                                act.type === 'note' ? 'NOTE' :
                                act.type === 'reunion' ? 'REUNION' :
                                act.type === 'videollamada' ? 'VIDEOLLAMADA' :
                                act.type === 'visita' ? 'VISITA' :
                                act.type === 'call' ? 'CALL' : 'EVENT'
                              );
                              setEditTitle(act.title);
                              setEditDescription(act.description || '');
                              setEditDate(act.date ? act.date.split('T')[0] : '');
                              setEditTime(act.time || '10:00');
                              setEditConclusions(act.conclusions || '');
                              setEditLocation(act.location || '');
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
              <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-400">Correos electrónicos registrados y plantillas</span>
                
                <div className="flex items-center gap-2">
                  {isExchangeConnected && (
                    <button
                      type="button"
                      onClick={() => syncExchangeMutation.mutate()}
                      disabled={syncExchangeMutation.isPending}
                      className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Sincroniza y actualiza los borradores que ya hayan sido enviados desde Outlook"
                    >
                      <RefreshCw size={12} className={syncExchangeMutation.isPending ? 'animate-spin text-dts-secondary' : ''} />
                      <span>{syncExchangeMutation.isPending ? 'Sincronizando...' : 'Sincronizar Cambios'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setNewEmailAddress(contact.email || '');
                      setShowEmailModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#00B0B9] hover:brightness-110 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail size={13} /> Redactar Correo en Outlook
                  </button>
                </div>
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
                      <div key={mail.id} className="bg-gray-50/50 dark:bg-zinc-800/10 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 space-y-2.5">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white">{mail.title}</h4>
                              {mail.exchangeSyncStatus === 'draft' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                  Borrador en Outlook
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-[#00B0B9] border border-[#00B0B9]/20">
                                  Sincronizado
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono block">Destinatario: {mail.email || contact?.email}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-mono text-gray-400">
                              {new Date(mail.date).toLocaleDateString('es-ES')}
                            </span>
                            <button
                              type="button"
                              onClick={() => openExistingEmailInOutlook({
                                webLink: mail.exchangeWebLink,
                                email: mail.email || contact?.email,
                                subject: mail.title,
                                target: outlookTarget,
                                exchangeSyncStatus: mail.exchangeSyncStatus,
                              })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-[#00B0B9] hover:bg-[#00B0B9]/10 rounded-lg transition-colors cursor-pointer border border-[#00B0B9]/25 shadow-2xs"
                              title={mail.exchangeSyncStatus === 'draft' ? 'Abrir bandeja de borradores en Outlook' : `Abrir en Outlook (${outlookTarget === 'web' ? 'Web' : 'Escritorio'})`}
                            >
                              <ExternalLink size={10} />
                              <span>{mail.exchangeSyncStatus === 'draft' ? 'Ver Borradores' : 'Abrir en Outlook'}</span>
                            </button>
                          </div>
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
                  onChange={(e) => {
                    const nextType = e.target.value as any;
                    setActivityType(nextType);
                    if (nextType === 'REUNION' && !newLocation.trim()) {
                      const addr = getCompanyAddress();
                      if (addr) setNewLocation(addr);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-dts-secondary/50"
                >
                  <option value="TASK">Tarea</option>
                  <option value="NOTE">Nota Interna</option>
                  <option value="REUNION">Reunión Presencial</option>
                  <option value="VIDEOLLAMADA">Videollamada Teams / Online</option>
                  <option value="CALL">Llamada Telefónica</option>
                  <option value="EVENT">Evento / Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título / Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Seguimiento comercial..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                />
              </div>

              {activityType !== 'NOTE' && (
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hora</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                    />
                  </div>
                </div>
              )}

              {activityType === 'REUNION' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubicación / Lugar</label>
                    {getCompanyAddress() && (
                      <button
                        type="button"
                        onClick={() => setNewLocation(getCompanyAddress())}
                        className="text-[10px] font-semibold text-dts-secondary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                        title="Rellenar con la dirección de la empresa del contacto"
                      >
                        <MapPin size={11} />
                        <span>Usar dirección de la empresa</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Sede del cliente / Oficinas dTS..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Detalles / Descripción</label>
                <textarea
                  placeholder="Detalla los puntos a tratar..."
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conclusiones / Resultado (Opcional)</label>
                <textarea
                  placeholder="Acuerdos alcanzados..."
                  rows={2}
                  value={newConclusions}
                  onChange={(e) => setNewConclusions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none"
                />
              </div>

              {activityType !== 'NOTE' && (
                <div className="p-2.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/10 border border-cyan-100 dark:border-cyan-900/30 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-dts-primary dark:text-cyan-400 font-semibold">
                    <Calendar size={13} className="text-[#00B0B9]" />
                    <span>Sincronizar en Outlook</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {isExchangeConnected ? (
                      <span className="text-emerald-500 font-bold">● Conectado a Exchange</span>
                    ) : (
                      <span className="text-amber-500 font-bold">● Modo Local</span>
                    )}
                  </div>
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
                  disabled={createActivityMutation.isPending}
                  className="px-4 py-2 bg-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createActivityMutation.isPending ? 'Guardando...' : 'Guardar y Sincronizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Preparar y Abrir Correo en Outlook */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-dts-secondary/15 flex items-center justify-center text-dts-secondary">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-dts-primary dark:text-white">
                    Preparar Correo en Outlook
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Se abrirá en Outlook con los datos precargados para revisar, adjuntar archivos y pulsar Enviar.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <form onSubmit={handlePrepareEmail} className="space-y-3.5 text-xs">
              
              {/* SELECTOR DE DESTINO: OUTLOOK APP (WINDOWS) VS OUTLOOK WEB (M365) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Abrir en:</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/70 dark:bg-zinc-800/40 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setOutlookTarget('desktop');
                      setPreferredOutlookClient('desktop');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                      outlookTarget === 'desktop'
                        ? 'bg-white dark:bg-dts-primary text-dts-primary dark:text-white shadow-xs border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Laptop size={13} />
                    <span>Outlook Escritorio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOutlookTarget('web');
                      setPreferredOutlookClient('web');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                      outlookTarget === 'web'
                        ? 'bg-white dark:bg-dts-primary text-dts-primary dark:text-white shadow-xs border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Globe size={13} />
                    <span>Outlook Web (M365)</span>
                  </button>
                </div>
              </div>

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
                  value={newEmailAddress}
                  onChange={(e) => setNewEmailAddress(e.target.value)}
                  placeholder="destinatario@cliente.com"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
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
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 font-medium"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cuerpo del Email</label>
                  <button
                    type="button"
                    onClick={handleCopyContent}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-dts-secondary hover:underline cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <CheckCheck size={11} className="text-emerald-500" />
                        <span className="text-emerald-500">¡Copiado al portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copiar texto</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  required
                  placeholder="Escribe el cuerpo del correo..."
                  rows={6}
                  value={newEmailBody}
                  onChange={(e) => setNewEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50 resize-none font-mono text-[11px]"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={prepareEmailMutation.isPending}
                  className="px-4 py-2 bg-[#00B0B9] hover:brightness-110 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  <ExternalLink size={13} className={prepareEmailMutation.isPending ? 'animate-spin' : ''} />
                  {prepareEmailMutation.isPending ? 'Preparando en Outlook...' : 'Abrir y Preparar en Outlook'}
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
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hora</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                    />
                  </div>
                </div>
              )}

              {editActivityType !== 'NOTE' && editActivityType !== 'TASK' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubicación / Lugar</label>
                    {getCompanyAddress() && (
                      <button
                        type="button"
                        onClick={() => setEditLocation(getCompanyAddress())}
                        className="text-[10px] font-semibold text-dts-secondary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                        title="Rellenar con la dirección de la empresa del contacto"
                      >
                        <MapPin size={11} />
                        <span>Usar dirección de la empresa</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-dts-secondary/50"
                  />
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
      <Drawer isOpen={isQuoteDrawerOpen} onClose={() => setIsQuoteDrawerOpen(false)} title={`Oportunidad: ${selectedQuote?.document_no || ''}`} size="2xl">
        {selectedQuote && (
          <div className="space-y-6 text-xs max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
            
            {/* Cabecera del Drawer */}
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

            {/* Parámetros Comerciales */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-dts-primary dark:text-dts-secondary border-b border-gray-100 dark:border-white/10 pb-2">Parámetros Comerciales</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Estado de la Oferta</label>
                  <select 
                    value={(selectedQuote.estado_oferta || '').toLowerCase().trim() === 'preliminar' ? 'borrador' : (selectedQuote.estado_oferta || 'borrador').toLowerCase().trim()} 
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
                    <option value={0}>0% - Descartada / Perdida</option>
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

            {/* Información del Comprador */}
            <div className="space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
              <div className="flex justify-between items-center pb-1">
                <h5 className="font-bold text-dts-primary dark:text-white uppercase tracking-wider">Información del Comprador</h5>
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-955/35 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                  Contacto vinculado
                </span>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={14} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Nombre del contacto"
                    value={contact.name || ''}
                    readOnly
                    className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none opacity-80 cursor-not-allowed select-none"
                  />
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={14} />
                  </span>
                  <input 
                    type="email" 
                    placeholder="Email del contacto"
                    value={contact.email || ''}
                    readOnly
                    className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none opacity-80 cursor-not-allowed select-none"
                  />
                </div>
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={14} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Teléfono del contacto"
                    value={contact.phone_no || contact.mobile_no || ''}
                    readOnly
                    className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none opacity-80 cursor-not-allowed select-none"
                  />
                </div>
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

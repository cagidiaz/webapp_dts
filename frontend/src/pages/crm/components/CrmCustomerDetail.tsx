import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getCustomerByClientId, getContacts, getAllQuotes, updateContactLinkedin
} from '../../../api';
import { formatCurrency } from '../../../api/formatters';
import { 
  ArrowLeft, Phone, Mail, MapPin, 
  Linkedin, Edit2, Check, X, Plus, Calendar as CalendarIcon, 
  Clock, Briefcase, FileText, CheckSquare, Send, User
} from 'lucide-react';

interface CrmCustomerDetailProps {
  clientId: string;
  onBack: () => void;
}

export const CrmCustomerDetail: React.FC<CrmCustomerDetailProps> = ({ clientId, onBack }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'quotes' | 'tasks' | 'notes' | 'emails' | 'calendar'>('info');

  // Inline Linkedin editing states
  const [editingLinkedinId, setEditingLinkedinId] = useState<string | null>(null);
  const [linkedinValue, setLinkedinValue] = useState<string>('');
  const [isSavingLinkedin, setIsSavingLinkedin] = useState<boolean>(false);

  // Local storage states for CRM data
  const [tasks, setTasks] = useState<{ id: string; title: string; date: string; done: boolean }[]>([]);
  const [notes, setNotes] = useState<{ id: string; text: string; date: string }[]>([]);
  const [emails, setEmails] = useState<{ id: string; subject: string; body: string; date: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; date: string; time: string }[]>([]);

  // Modal show states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newEmailSubject, setNewEmailSubject] = useState('');
  const [newEmailBody, setNewEmailBody] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');

  // Load local data
  useEffect(() => {
    const loadedTasks = localStorage.getItem(`crm_tasks_${clientId}`);
    const loadedNotes = localStorage.getItem(`crm_notes_${clientId}`);
    const loadedEmails = localStorage.getItem(`crm_emails_${clientId}`);
    const loadedEvents = localStorage.getItem(`crm_events_${clientId}`);

    if (loadedTasks) setTasks(JSON.parse(loadedTasks));
    else setTasks([
      { id: '1', title: 'Enviar catálogo de instrumentación actualizado', date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], done: false },
      { id: '2', title: 'Llamar para concretar visita comercial técnica', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], done: true }
    ]);

    if (loadedNotes) setNotes(JSON.parse(loadedNotes));
    else setNotes([
      { id: '1', text: 'El cliente muestra gran interés en los transductores de presión de alta temperatura. Solicita precios de volumen para proyectos del segundo semestre.', date: new Date(Date.now() - 86400000 * 3).toISOString() }
    ]);

    if (loadedEmails) setEmails(JSON.parse(loadedEmails));
    else setEmails([
      { id: '1', subject: 'Confirmación de Reunión Técnica dTS Instruments', body: 'Hola,\n\nConfirmamos la cita para el próximo martes a las 10:00h en sus oficinas para revisar las especificaciones de caudalímetros.\n\nSaludos.', date: new Date(Date.now() - 86400000 * 4).toISOString() }
    ]);

    if (loadedEvents) setEvents(JSON.parse(loadedEvents));
    else setEvents([
      { id: '1', title: 'Presentación de Portafolio Técnico', date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], time: '11:30' }
    ]);
  }, [clientId]);

  // Persist local data
  const saveTasks = (newTasks: typeof tasks) => {
    setTasks(newTasks);
    localStorage.setItem(`crm_tasks_${clientId}`, JSON.stringify(newTasks));
  };
  const saveNotes = (newNotes: typeof notes) => {
    setNotes(newNotes);
    localStorage.setItem(`crm_notes_${clientId}`, JSON.stringify(newNotes));
  };
  const saveEmails = (newEmails: typeof emails) => {
    setEmails(newEmails);
    localStorage.setItem(`crm_emails_${clientId}`, JSON.stringify(newEmails));
  };
  const saveEvents = (newEvents: typeof events) => {
    setEvents(newEvents);
    localStorage.setItem(`crm_events_${clientId}`, JSON.stringify(newEvents));
  };

  // Queries
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customerDetail', clientId],
    queryFn: () => getCustomerByClientId(clientId),
  });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['customerContacts', clientId],
    queryFn: () => getContacts({ clientId }),
  });

  const { data: quotesData, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['customerQuotes', clientId],
    queryFn: () => getAllQuotes({ customerCode: clientId }),
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
    const newTasks = [...tasks, { id: Date.now().toString(), title: newTaskTitle, date: newTaskDate, done: false }];
    saveTasks(newTasks);
    setNewTaskTitle('');
    setShowTaskModal(false);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNotes = [{ id: Date.now().toString(), text: newNoteText, date: new Date().toISOString() }, ...notes];
    saveNotes(newNotes);
    setNewNoteText('');
    setShowNoteModal(false);
  };

  const handleCreateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailSubject.trim() || !newEmailBody.trim()) return;
    const newEmails = [{ id: Date.now().toString(), subject: newEmailSubject, body: newEmailBody, date: new Date().toISOString() }, ...emails];
    saveEmails(newEmails);
    setNewEmailSubject('');
    setNewEmailBody('');
    setShowEmailModal(false);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const newEvents = [...events, { id: Date.now().toString(), title: newEventTitle, date: newEventDate, time: newEventTime }];
    saveEvents(newEvents);
    setNewEventTitle('');
    setShowEventModal(false);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter(t => t.id !== id));
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
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

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-white/5 bg-white dark:bg-surface-card-dark rounded-xl p-1 shadow-xs">
        {[
          { id: 'info', label: 'Información y Contactos', icon: User },
          { id: 'quotes', label: 'Oportunidades', icon: Briefcase },
          { id: 'tasks', label: 'Tareas', icon: CheckSquare },
          { id: 'notes', label: 'Notas / Timeline', icon: FileText },
          { id: 'emails', label: 'Emails', icon: Send },
          { id: 'calendar', label: 'Calendario', icon: CalendarIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-dts-primary text-white dark:bg-dts-secondary shadow-xs' 
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden lg:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 min-h-[350px]">
        
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
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <User size={14} className="text-dts-secondary shrink-0" />
                            {contact.name}
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
                          <div className="flex items-center gap-1.5">
                            {contact.linkedin ? (
                              <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077B5]">
                                <Linkedin size={14} />
                              </a>
                            ) : <span className="text-[8px] text-gray-400 italic">Sin LinkedIn</span>}
                            <button onClick={() => { setEditingLinkedinId(contact.id); setLinkedinValue(contact.linkedin || ''); }} className="text-gray-400 hover:text-dts-secondary">
                              <Edit2 size={10} />
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
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                Historial de Ofertas / Oportunidades
              </h3>
              <button 
                onClick={() => alert('Para crear una oferta comercial, proceda al módulo de "CRM Ofertas" (Pestaña Oportunidades) para registrarla sobre los números oficiales del ERP.')}
                className="flex items-center gap-1.5 py-1 px-3 bg-dts-primary hover:brightness-110 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                <Plus size={14} /> Nueva Oportunidad
              </button>
            </div>

            {isLoadingQuotes ? (
              <div className="text-xs text-gray-400 italic py-4">Cargando oportunidades...</div>
            ) : !quotesData || quotesData.data.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-10 bg-gray-50 dark:bg-white/1 border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center">
                No hay ofertas comerciales registradas para este cliente en el ERP.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 dark:border-white/5 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200/60 dark:border-white/5 bg-gray-50/50 dark:bg-white/1 font-bold text-gray-500">
                      <th className="px-4 py-2.5">Nº Documento</th>
                      <th className="px-4 py-2.5">Fecha</th>
                      <th className="px-4 py-2.5 text-right">Importe</th>
                      <th className="px-4 py-2.5 text-center">Estado ERP</th>
                      <th className="px-4 py-2.5">Ref. Cliente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {quotesData.data.map(q => (
                      <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 font-bold font-mono text-dts-primary dark:text-dts-secondary">{q.document_no}</td>
                        <td className="px-4 py-2.5">{q.document_date ? new Date(q.document_date).toLocaleDateString() : '---'}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold">{formatCurrency(q.amount || 0, 2)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            q.cerrado 
                              ? 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>
                            {q.cerrado ? 'Cerrada' : 'Abierta'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 truncate max-w-[150px]">{q.your_reference || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-rose-500">
                      <X size={14} />
                    </button>
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
                Historial Comercial (Timeline)
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
                Aún no hay notas comerciales cargadas.
              </div>
            ) : (
              <div className="relative pl-4 border-l border-gray-200 dark:border-white/10 space-y-6">
                {notes.map(n => (
                  <div key={n.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 bg-white dark:bg-surface-card-dark border border-dts-secondary p-0.5 rounded-full z-10">
                      <span className="block w-1.5 h-1.5 bg-dts-secondary rounded-full" />
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-500 text-[10px]">{new Date(n.date).toLocaleString()}</span>
                      <button onClick={() => saveNotes(notes.filter(note => note.id !== n.id))} className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 leading-relaxed bg-gray-50 dark:bg-white/1 p-3 rounded-lg border border-gray-100 dark:border-white/5">
                      {n.text}
                    </p>
                  </div>
                ))}
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
                onClick={() => setShowEmailModal(true)}
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
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Mail size={12} className="text-dts-secondary" />
                        {e.subject}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(e.date).toLocaleDateString()}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <button onClick={() => saveEvents(events.filter(event => event.id !== ev.id))} className="text-gray-400 hover:text-rose-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

    </div>
  );
};

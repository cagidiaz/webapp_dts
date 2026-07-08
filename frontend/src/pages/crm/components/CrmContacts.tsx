import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContacts, updateContactLinkedin } from '../../../api';
import { 
  Search, User, Linkedin, Edit2, Check, X, 
  Mail, Phone, Smartphone, Users
} from 'lucide-react';

interface CrmContactsProps {
  onSelectContact?: (contactId: string) => void;
}

export const CrmContacts: React.FC<CrmContactsProps> = ({ onSelectContact }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(50);
  const observerTarget = React.useRef<HTMLTableRowElement>(null);

  // LinkedIn editing states
  const [editingLinkedinId, setEditingLinkedinId] = useState<string | null>(null);
  const [linkedinValue, setLinkedinValue] = useState<string>('');
  const [isSavingLinkedin, setIsSavingLinkedin] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset visible count when search term changes
  useEffect(() => {
    setVisibleCount(50);
  }, [debouncedSearch]);

  // Fetch all contacts
  const { data: allContacts = [], isLoading } = useQuery({
    queryKey: ['crm-contacts-all'],
    queryFn: () => getContacts(),
  });

  // Mutación para guardar LinkedIn inline
  const updateLinkedinMutation = useMutation({
    mutationFn: ({ id, linkedin }: { id: string; linkedin: string }) => 
      updateContactLinkedin(id, linkedin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts-all'] });
      setEditingLinkedinId(null);
    }
  });

  const handleSaveLinkedin = async (contactId: string) => {
    setIsSavingLinkedin(true);
    try {
      await updateLinkedinMutation.mutateAsync({ id: contactId, linkedin: linkedinValue });
    } catch (error) {
      console.error('Error saving linkedin:', error);
    } finally {
      setIsSavingLinkedin(false);
    }
  };

  // Filtered and searched contacts
  const filteredContacts = useMemo(() => {
    return allContacts.filter(c => {
      const searchLower = debouncedSearch.toLowerCase().trim();
      if (!searchLower) return true;
      return (
        c.name.toLowerCase().includes(searchLower) ||
        (c.job_title || '').toLowerCase().includes(searchLower) ||
        (c.org_level_code || '').toLowerCase().includes(searchLower) ||
        c.client_id.toLowerCase().includes(searchLower) ||
        (c.email || '').toLowerCase().includes(searchLower) ||
        (c.phone_no || '').toLowerCase().includes(searchLower) ||
        (c.mobile_no || '').toLowerCase().includes(searchLower)
      );
    });
  }, [allContacts, debouncedSearch]);

  // Slice contacts for infinite scroll
  const displayedContacts = useMemo(() => {
    return filteredContacts.slice(0, visibleCount);
  }, [filteredContacts, visibleCount]);

  // Intersection Observer for client-side Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCount < filteredContacts.length) {
          setVisibleCount(prev => prev + 50);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [visibleCount, filteredContacts.length]);

  // KPIs calculations
  const kpis = useMemo(() => {
    const total = allContacts.length;
    const withLinkedin = allContacts.filter(c => !!c.linkedin).length;
    const withEmail = allContacts.filter(c => !!c.email).length;
    const withPhone = allContacts.filter(c => !!c.phone_no || !!c.mobile_no).length;

    return {
      total,
      withLinkedin,
      withEmail,
      withPhone,
      linkedinPct: total > 0 ? Math.round((withLinkedin / total) * 100) : 0,
      emailPct: total > 0 ? Math.round((withEmail / total) * 100) : 0,
      phonePct: total > 0 ? Math.round((withPhone / total) * 100) : 0,
    };
  }, [allContacts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total de Contactos</span>
            <Users size={18} className="text-dts-secondary" />
          </div>
          <div className="text-2xl font-black font-mono text-dts-primary dark:text-white">
            {kpis.total}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            Personas vinculadas a clientes
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LinkedIn Vinculado</span>
            <Linkedin size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-500">
            {kpis.withLinkedin}
          </div>
          <div className="text-[10px] text-emerald-500 mt-1 font-semibold flex items-center gap-1">
            {kpis.linkedinPct}% de cobertura en la red social
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Con Correo Válido</span>
            <Mail size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-500">
            {kpis.withEmail}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            {kpis.emailPct}% de contactos con canal de email
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teléfono / Móvil</span>
            <Phone size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-500">
            {kpis.withPhone}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            {kpis.phonePct}% localizables telefónicamente
          </div>
        </div>
      </div>

      {/* Contacts Table (Adjusted to screen viewport) */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
        {/* Integrated Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between gap-4 shrink-0 bg-gray-50/20 dark:bg-surface-card-dark">
          <div className="w-full sm:max-w-md relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Buscar por nombre, cargo, código de cliente, email..." 
              className="block w-full pl-10 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-xs font-bold text-gray-400 hover:text-dts-secondary flex items-center gap-1 cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-xs text-gray-400 uppercase font-medium">Cargando directorio de contactos...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic text-sm">No se encontraron contactos que coincidan con la búsqueda.</div>
        ) : (
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Nombre</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Cliente / Empresa</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Cargo</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Nivel Org.</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">LinkedIn</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Email</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {displayedContacts.map(contact => (
                  <tr 
                    key={contact.id} 
                    onClick={() => onSelectContact && onSelectContact(contact.id)}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <User size={14} className="text-dts-secondary shrink-0" />
                      {contact.name}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-bold text-gray-600 dark:text-gray-300">
                          {contact.client_id}
                        </span>
                        {contact.customer?.name && (
                          <span 
                            className="text-[12px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[180px] block" 
                            title={contact.customer.name}
                          >
                            {contact.customer.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contact.job_title ? (
                        <span className="px-2 py-0.5 rounded bg-dts-secondary/10 text-dts-secondary font-semibold uppercase text-[9px] tracking-wider">
                          {contact.job_title}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No especificado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-500">
                      {contact.org_level_code ? contact.org_level_code.replace(/\.+$/, '') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {editingLinkedinId === contact.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="text"
                            className="text-[10px] border border-gray-200 dark:border-white/15 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded w-32 focus:outline-none text-dts-primary dark:text-white"
                            placeholder="linkedin.com/in/..."
                            value={linkedinValue}
                            onChange={(e) => setLinkedinValue(e.target.value)}
                            disabled={isSavingLinkedin}
                          />
                          <button onClick={() => handleSaveLinkedin(contact.id)} disabled={isSavingLinkedin} className="text-emerald-500 hover:scale-110 transition-transform"><Check size={12} /></button>
                          <button onClick={() => setEditingLinkedinId(null)} disabled={isSavingLinkedin} className="text-rose-500 hover:scale-110 transition-transform"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          {contact.linkedin ? (
                            <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-dts-secondary dark:text-dts-secondary hover:brightness-110 flex items-center gap-1 font-semibold">
                              <Linkedin size={16} className="text-dts-secondary dark:text-dts-secondary" />
                              <span>Ver perfil</span>
                            </a>
                          ) : (
                            <button 
                              onClick={() => { setEditingLinkedinId(contact.id); setLinkedinValue(contact.linkedin || ''); }}
                              className="text-gray-400 dark:text-gray-400 hover:text-dts-secondary dark:hover:text-dts-secondary flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
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
                    </td>
                    <td className="px-6 py-4">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-gray-600 dark:text-gray-300 hover:text-dts-secondary transition-colors flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">No disponible</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {contact.phone_no && (
                          <a href={`tel:${contact.phone_no}`} className="text-gray-600 dark:text-gray-300 hover:text-dts-secondary transition-colors flex items-center gap-1">
                            <Phone size={12} className="text-gray-400" />
                            {contact.phone_no}
                          </a>
                        )}
                        {contact.mobile_no && (
                          <a href={`tel:${contact.mobile_no}`} className="text-gray-600 dark:text-gray-300 hover:text-dts-secondary transition-colors flex items-center gap-1">
                            <Smartphone size={12} className="text-gray-400" />
                            {contact.mobile_no}
                          </a>
                        )}
                        {!contact.phone_no && !contact.mobile_no && (
                          <span className="text-gray-400 italic">No disponible</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleCount < filteredContacts.length && (
                  <tr ref={observerTarget}>
                    <td colSpan={7} className="py-4 text-center text-xs text-gray-400 font-semibold uppercase tracking-wider bg-gray-50/10 dark:bg-white/1">
                      Cargando más contactos...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

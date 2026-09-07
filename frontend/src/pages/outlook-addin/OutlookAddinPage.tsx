import React, { useEffect, useState, useMemo } from 'react';
import {
  Mail,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  Inbox,
  Briefcase
} from 'lucide-react';
import {
  lookupEmailInAddin,
  logEmailToAddin,
  searchCompaniesForAddin,
  type LookupResult,
  type CompanyCandidate,
} from '../../api/outlookAddin';

declare const Office: any;

export const OutlookAddinPage: React.FC = () => {
  const [isInsideOutlook, setIsInsideOutlook] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email item data from Outlook
  const [userEmail, setUserEmail] = useState<string>('');
  const [itemId, setItemId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [fromEmail, setFromEmail] = useState<string>('');
  const [fromName, setFromName] = useState<string>('');
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [sentDate, setSentDate] = useState<string>('');

  // Lookup results
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);

  // Form options
  const [selectedCategory, setSelectedCategory] = useState<
    'ACEPTACION' | 'TECNICA' | 'NEGOCIACION' | 'POSTVENTA' | 'GENERAL'
  >('GENERAL');
  const [selectedQuoteDocNo, setSelectedQuoteDocNo] = useState<string>('');
  const [cleanBody, setCleanBody] = useState<boolean>(true);

  // Company association state (when sender is not in contacts or to link manually)
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companyResults, setCompanyResults] = useState<CompanyCandidate[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyCandidate | null>(null);

  // Action state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Inicializar Office.js exclusivamente para este componente sin afectar al resto de la aplicación
  useEffect(() => {
    let isMounted = true;

    const initOffice = async () => {
      // 1. Cargar script de Office.js si no existe
      if (typeof (window as any).Office === 'undefined') {
        try {
          await new Promise<void>((resolve) => {
            const existing = document.querySelector('script[src*="office.js"]') as HTMLScriptElement;
            if (existing) {
              if ((window as any).Office) {
                resolve();
                return;
              }
              existing.addEventListener('load', () => resolve());
              existing.addEventListener('error', () => resolve());
              setTimeout(resolve, 1500);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => resolve();
            document.head.appendChild(script);
          });
        } catch (e) {
          console.warn('No se pudo cargar Office.js:', e);
        }
      }

      // 2. Comprobar si estamos en entorno de Outlook (por URL query, postMessage o mailbox)
      const searchStr = window.location.search.toLowerCase();
      const isOutlookEnvironment =
        searchStr.includes('_host_info') ||
        searchStr.includes('outlook') ||
        window.name.includes('Office') ||
        Boolean((window as any).Office?.context?.mailbox);

      const handleHostReady = (info?: any) => {
        if (!isMounted) return;
        const hostName = String(info?.host || '').toLowerCase();
        const hasMailbox = Boolean((window as any).Office?.context?.mailbox);
        const isOutlook = hostName === 'outlook' || hasMailbox || isOutlookEnvironment;

        if (isOutlook) {
          setIsInsideOutlook(true);
          extractOutlookItemData();
        } else {
          // Fuera de Outlook (entorno de pruebas en navegador web directo)
          setIsInsideOutlook(false);
          setupMockDataForTesting();
        }
      };

      const OfficeObj = (window as any).Office;
      if (OfficeObj && typeof OfficeObj.onReady === 'function') {
        OfficeObj.onReady((info: any) => {
          handleHostReady(info);
        });
      } else if (isOutlookEnvironment) {
        // En Outlook pero Office.js aún se está configurando internamente
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const OfficeNow = (window as any).Office;
          if (OfficeNow?.context?.mailbox?.item || OfficeNow?.onReady || attempts > 15) {
            clearInterval(interval);
            if (!isMounted) return;
            if (OfficeNow?.onReady) {
              OfficeNow.onReady(handleHostReady);
            } else {
              handleHostReady();
            }
          }
        }, 200);
      } else {
        if (isMounted) {
          setIsInsideOutlook(false);
          setupMockDataForTesting();
        }
      }
    };

    initOffice();

    return () => {
      isMounted = false;
    };
  }, []);

  // Extraer datos del correo actual desde Office.js (con reintentos si el item aún está enlazando)
  const extractOutlookItemData = (attempt = 1) => {
    try {
      const OfficeObj = (window as any).Office;
      const mailbox = OfficeObj?.context?.mailbox;
      const item = mailbox?.item;

      if (!item) {
        if (attempt <= 10) {
          setTimeout(() => extractOutlookItemData(attempt + 1), 250);
          return;
        }
        setError('No se pudo acceder al mensaje seleccionado en Outlook. Asegúrate de tener un correo abierto.');
        setIsLoading(false);
        return;
      }

      // Email del usuario que tiene abierto Outlook
      const currentMailboxUser = mailbox.userProfile?.emailAddress || '';
      setUserEmail(currentMailboxUser);

      // Metadatos del mensaje
      const mailItemId = item.itemId || '';
      const mailDate = item.dateTimeCreated ? new Date(item.dateTimeCreated).toISOString() : new Date().toISOString();

      setItemId(mailItemId);
      setSentDate(mailDate);

      // Remitente (en modo lectura o enviado)
      const fromObj = item.from || item.sender;
      const fromAddr = fromObj?.emailAddress || fromObj?.address || '';
      const fromDisplay = fromObj?.displayName || fromAddr || 'Remitente desconocido';
      setFromEmail(fromAddr);
      setFromName(fromDisplay);

      // Destinatarios
      const toList: string[] = Array.isArray(item.to)
        ? item.to.map((t: any) => t?.emailAddress || t?.address).filter(Boolean)
        : [];
      setToEmails(toList);

      // Continuar con la consulta al backend
      const proceedWithLookup = (finalSubject: string, bodyContent: string) => {
        setSubject(finalSubject);
        setBodyText(bodyContent);

        const activeUser = currentMailboxUser || 'gdiaz@dtsinstruments.com';
        setUserEmail(activeUser);

        performLookup({
          userEmail: activeUser,
          fromEmail: fromAddr,
          fromName: fromDisplay,
          toEmails: toList,
          subject: finalSubject,
          itemId: mailItemId,
        });
      };

      // Obtener Asunto de forma robusta
      const resolveSubject = (cb: (subj: string) => void) => {
        if (typeof item.subject === 'string') {
          cb(item.subject || '(Sin Asunto)');
        } else if (item.subject && typeof item.subject.getAsync === 'function') {
          item.subject.getAsync((res: any) => {
            cb(res?.value || '(Sin Asunto)');
          });
        } else {
          cb('(Sin Asunto)');
        }
      };

      // Obtener cuerpo del correo
      resolveSubject((finalSubject) => {
        if (item.body && typeof item.body.getAsync === 'function') {
          item.body.getAsync('text', (result: any) => {
            const bodyVal = result && (result.status === 'succeeded' || result.status === OfficeObj?.AsyncResultStatus?.Succeeded)
              ? (result.value || '')
              : '';
            proceedWithLookup(finalSubject, bodyVal);
          });
        } else {
          proceedWithLookup(finalSubject, '');
        }
      });
    } catch (err: any) {
      console.error('Error al extraer datos de Outlook:', err);
      setError('Error al leer los datos de Outlook: ' + (err.message || String(err)));
      setIsLoading(false);
    }
  };

  // Datos mock para pruebas en navegador local
  const setupMockDataForTesting = () => {
    const mockUser = 'gdiaz@dtsinstruments.com';
    const mockFrom = 'juan.perez@cliente-ejemplo.es';
    const mockFromName = 'Juan Pérez';
    const mockTo = ['gdiaz@dtsinstruments.com'];
    const mockSubject = 'Re: Propuesta técnica para sistema de pesaje continuo';
    const mockBody = `Estimado Gabriel,\n\nHemos revisado la propuesta económica enviada y nos parece adecuada. Quedamos a la espera de las condiciones de entrega definitivas para proceder con la orden de compra.\n\nAtentamente,\nJuan Pérez\nDirector de Planta\nCliente Ejemplo S.A.\n\nAVISO LEGAL: Este mensaje es confidencial y para uso exclusivo de su destinatario...`;
    const mockItemId = 'MOCK_EXCHANGE_ITEM_12345';

    setUserEmail(mockUser);
    setFromEmail(mockFrom);
    setFromName(mockFromName);
    setToEmails(mockTo);
    setSubject(mockSubject);
    setBodyText(mockBody);
    setItemId(mockItemId);
    setSentDate(new Date().toISOString());

    performLookup({
      userEmail: mockUser,
      fromEmail: mockFrom,
      fromName: mockFromName,
      toEmails: mockTo,
      subject: mockSubject,
      itemId: mockItemId,
    });
  };

  // Ejecutar búsqueda contextual en backend
  const performLookup = async (params: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await lookupEmailInAddin(params);
      setLookupData(data);
      if (data.openQuotes && data.openQuotes.length > 0) {
        setSelectedQuoteDocNo(data.openQuotes[0].document_no);
      }
    } catch (err: any) {
      console.error('Error en lookupEmailInAddin:', err);
      const serverMsg = err.response?.data?.message;
      const detail = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
      setError(detail || 'No se pudo consultar el CRM. Verifica que el backend esté en ejecución.');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar empresas si el contacto no existe
  const handleCompanySearch = async (val: string) => {
    setCompanySearchQuery(val);
    if (val.trim().length >= 2) {
      try {
        const results = await searchCompaniesForAddin(val);
        setCompanyResults(results);
      } catch (err) {
        console.error('Error al buscar empresas:', err);
      }
    } else {
      setCompanyResults([]);
    }
  };

  // Determinar con certeza si el correo es saliente (enviado por nosotros) o entrante (recibido del cliente)
  const isOutgoingEmail = useMemo(() => {
    if (lookupData && typeof lookupData.isOutgoing === 'boolean') {
      return lookupData.isOutgoing;
    }
    const cleanFrom = (fromEmail || '').toLowerCase().trim();
    const cleanUser = (userEmail || '').toLowerCase().trim();
    if (cleanFrom && cleanUser && cleanFrom === cleanUser) return true;
    if (cleanFrom && cleanFrom.endsWith('@dtsinstruments.com')) return true;
    return false;
  }, [lookupData?.isOutgoing, fromEmail, userEmail]);

  // Guardar correo en CRM
  const handleLogEmail = async () => {
    if (!selectedCompany && !lookupData?.matchedCustomer) {
      setError('Debes seleccionar o asociar una empresa cliente antes de guardar.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const targetClientId = lookupData?.matchedCustomer?.clientId || selectedCompany?.client_id;
    const targetContactId = lookupData?.matchedContact?.id;
    const interlocutor = isOutgoingEmail ? (toEmails[0] || fromEmail) : (fromEmail || toEmails[0]);

    try {
      const result = await logEmailToAddin({
        userEmail,
        exchangeItemId: itemId,
        subject,
        body: bodyText,
        sentDate,
        contactId: targetContactId,
        clientId: targetClientId,
        direction: isOutgoingEmail ? 'OUTGOING' : 'INCOMING',
        interlocutorEmail: interlocutor,
        categoryTag: selectedCategory,
        quoteDocumentNo: selectedQuoteDocNo || undefined,
        cleanBody,
      });

      setSaveSuccess(true);
      setSuccessMessage(result.message || 'Correo registrado correctamente en dTS CRM.');
      
      // Actualizar estado para mostrar ya registrado
      setLookupData(prev => prev ? { ...prev, isAlreadyLogged: true } : null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar el correo en el CRM.');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryOptions = [
    { id: 'GENERAL', label: 'General', icon: Mail, color: 'text-gray-700 dark:text-gray-300' },
    { id: 'ACEPTACION', label: 'Cierre / Aceptación', icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 'TECNICA', label: 'Técnica / Spec', icon: FileText, color: 'text-blue-600' },
    { id: 'NEGOCIACION', label: 'Negociación', icon: Briefcase, color: 'text-amber-600' },
    { id: 'POSTVENTA', label: 'Postventa', icon: AlertCircle, color: 'text-rose-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#071318] text-gray-800 dark:text-gray-100 font-sans p-3 sm:p-4 text-xs select-none">
      {/* Cabecera Corporativa dTS */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#003E51] text-[#00B0B9] flex items-center justify-center font-black text-sm shadow-xs">
            dTS
          </div>
          <div>
            <h1 className="text-xs font-bold text-[#003E51] dark:text-white uppercase tracking-wider flex items-center gap-1">
              dTS Instruments CRM
            </h1>
            <p className="text-[10px] text-gray-400">Complemento Oficial Outlook</p>
          </div>
        </div>

        {!isInsideOutlook && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
            Vista Previa (Web)
          </span>
        )}
      </div>

      {/* Alerta de error si ocurre */}
      {error && (
        <div className="p-2.5 mb-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Estado cargando */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
          <div className="w-6 h-6 border-2 border-[#00B0B9] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] font-medium">Analizando correo y CRM...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tarjeta del Correo Detectado con Indicador Claro de Flujo */}
          <div className="bg-white dark:bg-[#00222C]/60 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {isOutgoingEmail ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                    <Send size={10} /> Correo Enviado (Saliente)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <Inbox size={10} /> Correo Recibido (Entrante)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0 font-medium">
                <Clock size={10} />
                <span>{new Date(sentDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            </div>

            <div className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight text-xs">
              {subject}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-semibold">De (Remitente):</span>
                  {!isOutgoingEmail ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-900/40">
                      Cliente / Contacto
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-medium">
                      dTS Comercial
                    </span>
                  )}
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[170px]" title={fromEmail}>
                  {fromName || fromEmail}
                </span>
              </div>
              {toEmails.length > 0 && (
                <div className="flex items-center justify-between text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-semibold">Para (Destinatario):</span>
                    {isOutgoingEmail ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900/40">
                        Cliente / Contacto
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-medium">
                        dTS Comercial
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 truncate max-w-[170px]" title={toEmails.join(', ')}>
                    {toEmails[0]} {toEmails.length > 1 ? `(+${toEmails.length - 1})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detección de Contacto y Cliente */}
          <div className="bg-white dark:bg-[#00222C]/60 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-2xs space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Interlocutor en dTS CRM</span>
              {lookupData?.matchedContact && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                  <ShieldCheck size={11} /> Identificado
                </span>
              )}
            </div>

            {lookupData?.matchedContact ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-full bg-[#00B0B9]/20 text-[#00B0B9] flex items-center justify-center font-bold">
                    <User size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white truncate">
                      {lookupData.matchedContact.name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {lookupData.matchedContact.jobTitle || lookupData.matchedContact.email}
                    </div>
                  </div>
                </div>

                {lookupData.matchedCustomer && (
                  <div className="flex items-center gap-2 px-2 py-1 text-gray-600 dark:text-gray-300">
                    <Building2 size={12} className="text-[#00B0B9] shrink-0" />
                    <span className="font-medium truncate">{lookupData.matchedCustomer.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-gray-100 dark:bg-white/10 text-gray-500 font-mono">
                      {lookupData.matchedCustomer.clientId}
                    </span>
                  </div>
                )}
              </div>
            ) : lookupData?.matchedCustomer ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-1">
                  <div className="text-blue-900 dark:text-blue-300 text-[11px] font-bold flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#00B0B9] shrink-0" />
                    <span className="truncate">Empresa: {lookupData.matchedCustomer.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-white/10 text-blue-700 dark:text-gray-300 font-mono shrink-0">
                      {lookupData.matchedCustomer.clientId}
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                    El remitente <b>{fromEmail}</b> no figura en los contactos de Business Central. El correo se guardará en la ficha de la empresa.
                  </p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 italic">
                    (Los nuevos contactos se gestionan exclusivamente en Business Central y se sincronizan vía n8n)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/15 text-center">
                  <AlertCircle size={16} className="mx-auto text-amber-500 mb-1" />
                  <p className="text-gray-700 dark:text-gray-200 font-bold text-[11px]">Remitente no registrado</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Asocia este correo al historial de una empresa cliente en dTS CRM.
                  </p>
                </div>

                {!selectedCompany ? (
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar empresa cliente (mín. 2 letras)..."
                        value={companySearchQuery}
                        onChange={(e) => handleCompanySearch(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none focus:border-[#00B0B9]"
                      />
                    </div>

                    {companyResults.length > 0 && (
                      <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#001820] shadow-sm">
                        {companyResults.map((c) => (
                          <div
                            key={c.client_id}
                            onClick={() => {
                              setSelectedCompany(c);
                              setCompanyResults([]);
                              setCompanySearchQuery('');
                            }}
                            className="p-2 hover:bg-[#00B0B9]/15 cursor-pointer text-[11px] flex justify-between items-center transition-colors"
                          >
                            <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">{c.name}</span>
                            <span className="text-[9px] text-gray-400 font-mono ml-2 shrink-0">{c.city || c.client_id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#00B0B9]/10 border border-[#00B0B9]/30 flex justify-between items-center">
                    <div className="truncate">
                      <span className="text-[9px] text-gray-400 block uppercase font-bold">Empresa asignada</span>
                      <span className="font-bold text-[#003E51] dark:text-[#00B0B9] text-xs truncate block">{selectedCompany.name}</span>
                      <span className="text-[10px] text-gray-500 block font-mono">{selectedCompany.client_id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompany(null);
                        setCompanySearchQuery('');
                      }}
                      className="text-xs text-gray-400 hover:text-rose-500 font-bold px-1.5 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Cambiar empresa"
                    >
                      Cambiar
                    </button>
                  </div>
                )}

                <p className="text-[9px] text-gray-400 text-center italic">
                  (Los contactos se gestionan exclusivamente en Business Central)
                </p>
              </div>
            )}
          </div>

          {/* Opciones de Registro */}
          <div className="bg-white dark:bg-[#00222C]/60 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-2xs space-y-3">
            {/* Vinculación a Oferta Comercial */}
            {lookupData?.openQuotes && lookupData.openQuotes.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <FileText size={10} /> Vincular a Oferta Abierta
                </label>
                <select
                  value={selectedQuoteDocNo}
                  onChange={(e) => setSelectedQuoteDocNo(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#00B0B9]"
                >
                  <option value="">(Sin vincular a oferta - Solo ficha cliente)</option>
                  {lookupData.openQuotes.map((q) => (
                    <option key={q.document_no} value={q.document_no}>
                      {q.document_no} — {q.amount ? `${q.amount.toLocaleString('es-ES')} €` : 'S/I'} ({q.estado})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clasificación de Tipología */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tipología del Correo
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {categoryOptions.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#00B0B9] bg-[#00B0B9]/15 text-[#003E51] dark:text-[#00B0B9] shadow-2xs'
                          : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <Icon size={12} className={cat.color} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkbox de limpieza inteligente */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={cleanBody}
                onChange={(e) => setCleanBody(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-[#00B0B9] focus:ring-[#00B0B9]"
              />
              <span className="text-[10px] flex items-center gap-1">
                <Sparkles size={11} className="text-[#00B0B9]" />
                Limpiar avisos legales RGPD y firmas pesadas
              </span>
            </label>
          </div>

          {/* Botón de Acción Principal / Estado */}
          {lookupData?.isAlreadyLogged ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-xs">Ya registrado en dTS CRM</div>
                  <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400">
                    {lookupData.existingActivity?.createdAt
                      ? `Guardado el ${new Date(lookupData.existingActivity.createdAt).toLocaleDateString('es-ES')}`
                      : 'Disponible en el Timeline'}
                  </div>
                </div>
              </div>

              {lookupData.matchedContact && (
                <a
                  href={`/crm/contacts/${lookupData.matchedContact.id}?tab=emails`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1"
                >
                  Ver <ExternalLink size={10} />
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleLogEmail}
                disabled={isSaving || (!lookupData?.matchedCustomer && !selectedCompany)}
                className="w-full py-2.5 px-4 bg-[#003E51] hover:bg-[#002f3d] dark:bg-[#00B0B9] dark:hover:brightness-110 text-white dark:text-[#071318] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white dark:border-[#071318] border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando en dTS CRM...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-[#00B0B9] dark:text-[#071318]" />
                    <span>Guardar Correo en dTS CRM</span>
                  </>
                )}
              </button>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-center font-bold text-[11px] animate-fadeIn">
                  {successMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OutlookAddinPage;

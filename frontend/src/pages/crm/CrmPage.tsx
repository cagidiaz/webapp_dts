import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { CrmCustomers } from './components/CrmCustomers';
import { CrmPipeline } from './components/CrmPipeline';
import { CrmContacts } from './components/CrmContacts';
import { CrmContactDetail } from './components/CrmContactDetail';

import { ExchangeStatusBanner } from './components/ExchangeStatusBanner';

interface CrmPageProps {
  mode: 'customers' | 'pipeline' | 'contacts';
}

export const CrmPage: React.FC<CrmPageProps> = ({ mode }) => {
  const { setPageInfo } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Sync state with URL search parameters
  useEffect(() => {
    const contactId = searchParams.get('contactId');

    if (contactId) {
      setSelectedContactId(contactId);
    } else {
      setSelectedContactId(null);
    }
  }, [searchParams]);

  // Set Page Info in Layout
  useEffect(() => {
    let title = 'CRM - Directorio de empresas';
    if (mode === 'pipeline') {
      title = 'CRM - Embudo de Oportunidades';
    } else if (mode === 'contacts') {
      title = 'CRM - Directorio de Contactos';
    }

    setPageInfo({
      title,
      subtitle: 'Gestión de cuentas comerciales, contactos y pipeline de ventas de dTS Instruments',
      icon: <Briefcase size={20} />,
      infoProps: {
        title: 'CRM Comercial',
        description: 'Permite a los comerciales dar seguimiento a sus cuentas asignadas, personas de contacto, tareas comerciales, notas, emails y oportunidades. Sincronización bidireccional perfecta con Microsoft Exchange y Outlook (eventos, reuniones Teams, emails).',
        objective: 'Centralizar la relación con los clientes para maximizar las oportunidades de venta y retención, integrando el calendario de Outlook y la bandeja de correo en un panel único.',
        source: 'Sincronizado con Navision y Microsoft Exchange / Microsoft Graph API en tiempo real.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo, mode]);

  // Reset selected contact when mode (tab) changes
  useEffect(() => {
    if (searchParams.get('contactId')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('contactId');
      setSearchParams(newParams);
    }
    setSelectedContactId(null);
  }, [mode]);

  const handleSelectContact = (id: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('contactId', id);
    setSearchParams(newParams);
  };

  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('contactId');
    setSearchParams(newParams);
  };

  // If a contact is selected, render the contact detail view
  if (selectedContactId) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <ExchangeStatusBanner />
        <CrmContactDetail 
          contactId={selectedContactId} 
          onBack={handleBack} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ExchangeStatusBanner />
      {/* Conditionally render mode */}
      {mode === 'customers' ? (
        <CrmCustomers />
      ) : mode === 'pipeline' ? (
        <CrmPipeline />
      ) : (
        <CrmContacts 
          onSelectContact={handleSelectContact} 
        />
      )}
    </div>
  );
};

export default CrmPage;

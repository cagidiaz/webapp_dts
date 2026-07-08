import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { CrmCustomers } from './components/CrmCustomers';
import { CrmPipeline } from './components/CrmPipeline';
import { CrmContacts } from './components/CrmContacts';
import { CrmContactDetail } from './components/CrmContactDetail';

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
        description: 'Permite a los comerciales dar seguimiento a sus cuentas asignadas, personas de contacto, tareas comerciales, notas, emails y oportunidades. Soporta vinculación directa de correos electrónicos desde Outlook con su fecha original y tareas comerciales integradas bidireccionalmente con el embudo.',
        objective: 'Centralizar la relación con los clientes para maximizar las oportunidades de venta y retención, facilitando la integración con la bandeja de correo y unificando el seguimiento en un panel único.',
        source: 'Sincronizado con Navision y enriquecido con metadatos CRM locales y actividades registradas con fecha original desde el complemento de Outlook.'
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
      <CrmContactDetail 
        contactId={selectedContactId} 
        onBack={handleBack} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

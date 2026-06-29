import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { CrmCustomers } from './components/CrmCustomers';
import { CrmPipeline } from './components/CrmPipeline';
import { CrmCustomerDetail } from './components/CrmCustomerDetail';
import { CrmContacts } from './components/CrmContacts';

interface CrmPageProps {
  mode: 'customers' | 'pipeline' | 'contacts';
}

export const CrmPage: React.FC<CrmPageProps> = ({ mode }) => {
  const { setPageInfo } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Sync selectedCustomerId with URL search parameter
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId) {
      setSelectedCustomerId(clientId);
    } else {
      setSelectedCustomerId(null);
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
        description: 'Permite a los comerciales dar seguimiento a sus cuentas asignadas, personas de contacto, tareas comerciales, notas, emails y oportunidades. Soporta vinculación directa de correos electrónicos desde Outlook mediante el complemento oficial.',
        objective: 'Centralizar la relación con los clientes para maximizar las oportunidades de venta y retención, facilitando la integración con la bandeja de correo.',
        source: 'Sincronizado con Navision y enriquecido con metadatos CRM locales y actividades registradas desde el complemento de Outlook.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo, mode]);

  // Reset selected customer when mode (tab) changes
  useEffect(() => {
    if (searchParams.get('clientId')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('clientId');
      setSearchParams(newParams);
    }
    setSelectedCustomerId(null);
  }, [mode]);

  const handleSelectCustomer = (id: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('clientId', id);
    setSearchParams(newParams);
  };

  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('clientId');
    setSearchParams(newParams);
  };

  // If a customer is selected, render the full screen detail view
  if (selectedCustomerId) {
    return (
      <CrmCustomerDetail 
        clientId={selectedCustomerId} 
        onBack={handleBack} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Conditionally render mode */}
      {mode === 'customers' ? (
        <CrmCustomers onSelectCustomer={handleSelectCustomer} />
      ) : mode === 'pipeline' ? (
        <CrmPipeline />
      ) : (
        <CrmContacts onSelectCustomer={handleSelectCustomer} />
      )}
    </div>
  );
};

export default CrmPage;

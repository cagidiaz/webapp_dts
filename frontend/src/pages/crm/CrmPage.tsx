import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { CrmCustomers } from './components/CrmCustomers';
import { CrmPipeline } from './components/CrmPipeline';
import { CrmCustomerDetail } from './components/CrmCustomerDetail';

interface CrmPageProps {
  mode: 'customers' | 'pipeline';
}

export const CrmPage: React.FC<CrmPageProps> = ({ mode }) => {
  const { setPageInfo } = useUIStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Set Page Info in Layout
  useEffect(() => {
    setPageInfo({
      title: 'CRM - Directorio de empresas',
      subtitle: 'Gestión de cuentas comerciales, contactos y pipeline de ventas de dTS Instruments',
      icon: <Briefcase size={20} />,
      infoProps: {
        title: 'CRM Comercial',
        description: 'Permite a los comerciales dar seguimiento a sus cuentas asignadas, personas de contacto, tareas comerciales, notas, emails y oportunidades.',
        objective: 'Centralizar la relación con los clientes para maximizar las oportunidades de venta y retención.',
        source: 'Sincronizado con Navision y enriquecido con metadatos CRM locales.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  // Reset selected customer when mode (tab) changes
  useEffect(() => {
    setSelectedCustomerId(null);
  }, [mode]);

  // If a customer is selected, render the full screen detail view
  if (selectedCustomerId) {
    return (
      <CrmCustomerDetail 
        clientId={selectedCustomerId} 
        onBack={() => setSelectedCustomerId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Conditionally render mode */}
      {mode === 'customers' ? (
        <CrmCustomers onSelectCustomer={(id) => setSelectedCustomerId(id)} />
      ) : (
        <CrmPipeline />
      )}
    </div>
  );
};

export default CrmPage;

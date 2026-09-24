import React, { useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { BudgetGeneratorSection } from './components/BudgetGeneratorSection';

export const BudgetGeneratorPage: React.FC = () => {
  const { setPageInfo } = useUIStore();

  useEffect(() => {
    setPageInfo({
      title: 'Generador de Presupuestos',
      subtitle: 'Plantillas oficiales de presupuestos y previsión anual',
      icon: <FileSpreadsheet size={20} />,
      infoProps: {
        title: 'Generador de Presupuestos',
        description: 'Herramienta para consolidar datos de facturación y cartera de pedidos del ejercicio en curso y emitir las plantillas oficiales de presupuestos para el año siguiente.',
        objective: 'Permitir a Administración emitir libros Excel (consolidados o por comercial) con precios calculados para que los comerciales proyecten sus unidades de previsión y objetivos.',
        source: 'Documentos de venta (facturas/abonos) y pedidos en cartera sincronizados desde Business Central.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <BudgetGeneratorSection />
    </div>
  );
};
export default BudgetGeneratorPage;

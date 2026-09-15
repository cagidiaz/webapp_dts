import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution, 
  getTopProducts,
  getWeeklyAgenda,
  openCalendarEventInOutlook,
  getPreferredOutlookClient,
  type CrmActivity
} from '../../../api';
import { formatCurrency, formatNumber } from '../../../api/formatters';
import { 
  TrendingUp, Target, Activity, Users, Package, BarChart2,
  TrendingDown, Euro, Calendar, FileText, CheckSquare, Send, Phone, Clock, MapPin, Video,
  Edit2, Plus, User
} from 'lucide-react';
import { InfoPopover } from '../../../components/ui';
import { CustomerDetailDrawer } from '../../sales/components/CustomerDetailDrawer';
import { CrmActivityReportModal } from '../../crm/components/CrmActivityReportModal';
import { EditActivityModal } from '../../crm/components/EditActivityModal';
import { useUIStore } from '../../../store/uiStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell 
} from 'recharts';
import { useAuthStore } from '../../../store/authStore';

const MONTHS = [
  { val: 1, label: 'Ene' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' },
  { val: 4, label: 'Abr' }, { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' }, { val: 8, label: 'Ago' }, { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dic' }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const monthLabel = MONTHS.find(m => m.val === label)?.label || label;
    return (
      <div className="bg-white dark:bg-[#002A38] p-3 rounded-lg border border-gray-100 dark:border-white/10 shadow-xl">
        <p className="text-xs font-bold text-dts-primary dark:text-white mb-2 uppercase border-b border-gray-100 dark:border-white/10 pb-1">
          {monthLabel} {new Date().getFullYear()}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-[11px] mb-1">
            <span className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }}></div>
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-dts-primary dark:text-white">
              {formatCurrency(entry.value, 0)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const renderCustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload) return null;
  const sortedPayload = [...payload].sort((a) => a.value === 'Ventas Reales' ? -1 : 1);
  return (
    <div className="flex justify-center gap-6 mb-4">
      {sortedPayload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: entry.color }}></div>
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const OutlookIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ minWidth: size, minHeight: size }}
  >
    <path d="M22 6.5v11a2.5 2.5 0 0 1-2.5 2.5H9.5a2.5 2.5 0 0 1-2.5-2.5V17h7.5A2.5 2.5 0 0 0 17 14.5V7h2.5A2.5 2.5 0 0 1 22 6.5z" opacity="0.4" fill="#0078D4"/>
    <path d="M14.5 5H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5.5V5z" fill="#0078D4"/>
    <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h8A2.5 2.5 0 0 1 15 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 2 16.5v-9z" fill="#106EBE"/>
    <circle cx="8.5" cy="12" r="2.5" fill="#FFFFFF"/>
    <circle cx="8.5" cy="12" r="1.3" fill="#106EBE"/>
  </svg>
);


export const SalesDashboard: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const salespersonCode = profile?.code;

  const formatYYYYMMDD = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const { monday, sunday } = React.useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const m = new Date(today.setDate(diffToMonday));
    m.setHours(0, 0, 0, 0);
    const s = new Date(m);
    s.setDate(m.getDate() + 6);
    s.setHours(23, 59, 59, 999);
    return { monday: m, sunday: s };
  }, []);

  const { data: agendaData, isLoading: isLoadingAgenda } = useQuery({
    queryKey: ['crmWeeklyAgenda', formatYYYYMMDD(monday), formatYYYYMMDD(sunday)],
    queryFn: () => getWeeklyAgenda(formatYYYYMMDD(monday), formatYYYYMMDD(sunday))
  });

  const sortedWeeklyActivities = React.useMemo(() => {
    return (agendaData || [])
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.due_date || a.created_at).getTime();
        const dateB = new Date(b.due_date || b.created_at).getTime();
        return dateA - dateB;
      });
  }, [agendaData]);

  React.useEffect(() => {
    setPageInfo({
      title: 'Panel de Control Comercial',
      subtitle: `Resumen comercial ejercicio ${year} (YTD)`,
      icon: <Activity size={20} />,
      infoProps: {
        title: 'Panel de Control Comercial',
        description: 'Dashboard operativo para el seguimiento individual o global de ventas en tiempo real.',
        objective: 'Monitorizar el cumplimiento de objetivos de venta y detectar los principales motores del negocio.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo, year]);

  // Drawer and Modals state
  const [selectedCustCode, setSelectedCustCode] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [activityToEdit, setActivityToEdit] = React.useState<CrmActivity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const preferredOutlook = getPreferredOutlookClient();

  const currentMonth = new Date().getMonth() + 1;
  const initialMonths = React.useMemo(() => Array.from({ length: currentMonth }, (_, i) => i + 1), [currentMonth]);

  const { data: perfData, isLoading: isLoadingPerf } = useQuery({
    queryKey: ['salesDashboardPerf', year, salespersonCode, initialMonths],
    queryFn: () => getSalesBudgetPerformance({ 
      year, 
      months: initialMonths,
      salespersonCode,
      take: 5 
    })
  });

  const { data: topProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['salesDashboardProducts', year, salespersonCode],
    queryFn: () => getTopProducts({ 
      year, 
      salespersonCode,
      take: 5 
    })
  });

  const { data: evolutionData, isLoading: isLoadingEvol } = useQuery({
    queryKey: ['salesDashboardEvol', year, salespersonCode],
    queryFn: () => getSalesBudgetEvolution({ 
      year, 
      salespersonCode 
    })
  });

  // Global Queries (Total Company - Not affected by salesperson profile)
  // We use EXACTLY the same query keys as the Executive Panel to match global data
  const { data: globalPerf, isLoading: isLoadingGlobalPerf } = useQuery({
    queryKey: ['salesPerf', year, initialMonths],
    queryFn: () => getSalesBudgetPerformance({ 
      year, 
      months: initialMonths,
      limitToToday: true 
    })
  });

  const { data: globalEvol, isLoading: isLoadingGlobalEvol } = useQuery({
    queryKey: ['salesEvolution', year],
    queryFn: () => getSalesBudgetEvolution({ year })
  });

  const globalAnnualStats = React.useMemo(() => {
    if (!globalEvol || globalEvol.length === 0) return { totalAnnualBudget: 0, pctAchievement: 0 };
    const totalAnnualBudget = globalEvol.reduce((acc, curr) => acc + (curr.objetivo || 0), 0);
    const currentSales = globalPerf?.kpis?.ventas || 0;
    const pctAchievement = totalAnnualBudget > 0 ? (currentSales / totalAnnualBudget) * 100 : 0;
    return { totalAnnualBudget, pctAchievement };
  }, [globalEvol, globalPerf]);

  const annualTarget = React.useMemo(() => {
    return (evolutionData || []).reduce((acc, curr) => acc + (curr.objetivo || 0), 0);
  }, [evolutionData]);

  const kpis = perfData?.kpis || { 
    ventas: 0, objetivo: 0, desviacionEur: 0, desviacionPct: 0,
    carteraVentas: 0, carteraVentasAccounts: 0,
    enviadosFacturar: 0, enviadosFacturarAccounts: 0,
    enviadosFacturarBruto: 0,
    prepagosDescontadosFacturar: 0,
    facturasOrdinarias: 0,
    prepagosFacturados: 0,
    abonosDevoluciones: 0,
    carteraVentasBruta: 0,
    prepagosDescontadosCartera: 0,
  };
  const topCustomers = perfData?.rows || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <CustomerDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        customerCode={selectedCustCode} 
      />
      
      {/* Global Company KPIs Section */}
      <div className="bg-white dark:bg-surface-card-dark p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">

        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlobalKPICard 
            title="Ventas YTD vs Ppto YTD (Global)" 
            value={globalPerf?.kpis?.ventas || 0} 
            subValue={globalPerf?.kpis?.objetivo || 0}
            deviation={globalPerf?.kpis?.desviacionPct || 0}
            type="currency" 
            icon={Euro} 
            color="blue"
            variant="comparison"
            isLoading={isLoadingGlobalPerf}
            subtext1={globalPerf?.kpis?.prepagosFacturados ? `Incluye ${formatCurrency(globalPerf.kpis.prepagosFacturados, 0)} en prepagos` : undefined}
            infoProps={{
              title: "Ventas YTD vs Presupuesto YTD (Global)",
              description: "Comparativa de facturación real global neta acumulada frente al presupuesto global a fecha de hoy.",
              formulas: "Facturas Ordinarias (FV) + Facturas Prepago (PFV) - Facturas Devolución (AAV)",
              source: "sales_documents (FV + PFV - AAV)",
              breakdown: [
                { label: "Facturas Ordinarias (FV)", value: formatCurrency(globalPerf?.kpis?.facturasOrdinarias || 0), sign: '+', color: 'text-emerald-600 dark:text-emerald-400' },
                { label: "Facturas Prepago (PFV)", value: formatCurrency(globalPerf?.kpis?.prepagosFacturados || 0), sign: '+', color: 'text-cyan-600 dark:text-cyan-400' },
                { label: "Devoluciones y Abonos (AAV)", value: formatCurrency(globalPerf?.kpis?.abonosDevoluciones || 0), sign: '-', color: 'text-red-500' },
                { label: "Total Ventas Netas YTD", value: formatCurrency(globalPerf?.kpis?.ventas || 0), sign: '=', color: 'text-dts-primary dark:text-white font-bold' },
              ]
            }}
          />
          <GlobalKPICard 
            title="Ventas Actual vs Anterior (Global)" 
            value={globalPerf?.kpis?.ventas || 0} 
            subValue={globalPerf?.kpis?.facturacionAnioAnterior || 0}
            deviation={globalPerf?.kpis?.facturacionAnioAnterior && globalPerf.kpis.facturacionAnioAnterior > 0 
              ? ((globalPerf.kpis.ventas - globalPerf.kpis.facturacionAnioAnterior) / globalPerf.kpis.facturacionAnioAnterior) * 100 
              : 0}
            type="currency" 
            icon={BarChart2} 
            color="indigo"
            variant="comparison"
            label1={`${year}:`}
            label2={`${year-1}:`}
            isLoading={isLoadingGlobalPerf}
            subtext1={globalPerf?.kpis?.prepagosFacturados ? `Incluye ${formatCurrency(globalPerf.kpis.prepagosFacturados, 0)} en prepagos` : undefined}
            infoProps={{
              title: "Ventas Actual vs Anterior (Global)",
              description: "Facturación global del ejercicio actual comparada con el mismo periodo del año anterior (hasta hoy).",
              formulas: "Ventas Globales Actuales vs Ventas Globales Año Anterior (Hasta hoy)",
              source: "sales_documents (Facturas + Prepagos - Devoluciones)",
              breakdown: [
                { label: `Facturas Ordinarias (${year})`, value: formatCurrency(globalPerf?.kpis?.facturasOrdinarias || 0), sign: '+', color: 'text-emerald-600 dark:text-emerald-400' },
                { label: `Facturas Prepago (${year})`, value: formatCurrency(globalPerf?.kpis?.prepagosFacturados || 0), sign: '+', color: 'text-cyan-600 dark:text-cyan-400' },
                { label: `Devoluciones/Abonos (${year})`, value: formatCurrency(globalPerf?.kpis?.abonosDevoluciones || 0), sign: '-', color: 'text-red-500' },
                { label: `Total Ventas Netas ${year}`, value: formatCurrency(globalPerf?.kpis?.ventas || 0), sign: '=', color: 'text-dts-primary dark:text-white font-bold' },
              ]
            }}
          />
          
          <GlobalKPICard 
            title="CARTERA DE PEDIDOS" 
            value={globalPerf?.kpis?.carteraVentas || 0} 
            subValue={globalPerf?.kpis?.enviadosFacturar || 0}
            accountValue={globalPerf?.kpis?.carteraVentasAccounts}
            accountSubValue={globalPerf?.kpis?.enviadosFacturarAccounts}
            type="currency" 
            icon={Package} 
            color="emerald"
            variant="comparison"
            label1="CARTE:"
            label2="PEND:"
            isLoading={isLoadingGlobalPerf}
            infoProps={{
              title: "Cartera y Pedidos por Facturar (Global)",
              description: "Resumen de cartera (total pedidos abiertos) y pedidos por facturar a nivel global. El importe de las facturas prepago se descuenta del monto de pedidos por facturar para evitar duplicidades con la facturación anticipada.",
              formulas: "CARTE: Total Pedidos | PEND: Pedidos por facturar - Prepagos Facturados",
              source: "sales_orders menos PFV activos",
              breakdown: [
                { label: "Total Cartera de Pedidos (CARTE)", value: formatCurrency(globalPerf?.kpis?.carteraVentas || 0), sign: 'i', color: 'text-emerald-600 dark:text-emerald-400 font-bold' },
                { label: "Pedidos por facturar brutos", value: formatCurrency(globalPerf?.kpis?.enviadosFacturarBruto || globalPerf?.kpis?.enviadosFacturar || 0), sign: 'i', color: 'text-gray-600 dark:text-gray-300' },
                { label: "Prepagos ya Facturados", value: formatCurrency(globalPerf?.kpis?.prepagosDescontadosFacturar || 0), sign: '-', color: 'text-cyan-600 dark:text-cyan-400' },
                { label: "Total Pend. por Facturar (PEND)", value: formatCurrency(globalPerf?.kpis?.enviadosFacturar || 0), sign: '=', color: 'text-dts-primary dark:text-white font-bold' },
              ]
            }}
          />

          <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group min-h-40">
            {isLoadingGlobalPerf || isLoadingGlobalEvol ? (
              <div className="w-full h-full animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
            ) : (
              <>
                <div className="absolute top-4 left-6 flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Objetivo Facturación Anual</span>
                  <InfoPopover 
                    title="Objetivo Facturación Anual" 
                    description="Porcentaje de consecución del presupuesto total global de ventas para el ejercicio completo."
                    formulas="(Ventas Actuales / Presupuesto Anual) * 100"
                    iconSize={12} 
                  />
                </div>
                <div className="w-full h-24 mt-4">
                  <GaugeChart value={globalAnnualStats.pctAchievement} />
                </div>
                <div className="text-center mt-2">
                  <span className="text-2xl font-light text-dts-primary dark:text-white">{globalAnnualStats.pctAchievement.toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>



      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <KPICard 
          title="Facturación Real" 
          value={kpis.ventas} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoadingPerf}
          subtext={kpis.prepagosFacturados ? `Incluye ${formatCurrency(kpis.prepagosFacturados, 0)} en prepagos` : undefined}
          infoProps={{ 
            title: "Facturación Real Comercial",
            description: "Total de ventas reales acumuladas netas de abonos asignadas al comercial.",
            formulas: "Facturas Ordinarias (FV) + Prepagos (PFV) - Devoluciones (AAV)",
            breakdown: [
              { label: "Facturas Ordinarias", value: formatCurrency(kpis.facturasOrdinarias || 0), sign: '+', color: 'text-emerald-600 dark:text-emerald-400' },
              { label: "Facturas Prepago", value: formatCurrency(kpis.prepagosFacturados || 0), sign: '+', color: 'text-cyan-600 dark:text-cyan-400' },
              { label: "Devoluciones/Abonos", value: formatCurrency(kpis.abonosDevoluciones || 0), sign: '-', color: 'text-red-500' },
              { label: "Total Real Comercial", value: formatCurrency(kpis.ventas || 0), sign: '=', color: 'text-dts-primary dark:text-white font-bold' },
            ]
          }}
        />
        <KPICard 
          title="Objetivo Ventas" 
          value={kpis.objetivo} 
          type="currency" 
          icon={Target} 
          isLoading={isLoadingPerf || isLoadingEvol}
          footerText={annualTarget > 0 ? `Total anual: ${formatCurrency(annualTarget, 0)}` : undefined}
          infoProps={{ 
            title: "Objetivo Ventas Comercial",
            description: "Meta de facturación presupuestada para el periodo acumulado (YTD). En pequeño se muestra el total anual." 
          }}
        />
        <KPICard 
          title="Cumplimiento" 
          value={kpis.desviacionPct} 
          type="percentage" 
          icon={Activity} 
          status={kpis.desviacionPct >= 0 ? 'success' : 'danger'}
          isLoading={isLoadingPerf}
          infoProps={{ 
            title: "Cumplimiento Presupuesto",
            description: "Porcentaje de consecución del objetivo presupuestado.",
            formulas: "(Ventas Reales / Presupuesto) * 100"
          }}
        />
        <KPICard 
          title="Desviación" 
          value={kpis.desviacionEur} 
          type="currency" 
          icon={BarChart2} 
          status={kpis.desviacionEur >= 0 ? 'success' : 'danger'}
          isLoading={isLoadingPerf}
          infoProps={{ 
            title: "Desviación Presupuestaria",
            description: "Diferencia nominal en euros entre las ventas reales y el presupuesto acumulado.",
            formulas: "Ventas Reales - Presupuesto Objetivo"
          }}
        />
        <KPICard 
          title="Cartera de Pedidos" 
          value={kpis.carteraVentas} 
          accountValue={kpis.carteraVentasAccounts}
          type="currency" 
          icon={Package} 
          isLoading={isLoadingPerf}
          infoProps={{ 
            title: "Cartera de Pedidos Comercial",
            description: "Valor total de pedidos abiertos pendientes de procesar para este comercial. El valor entre paréntesis indica la porción de líneas de tipo cuenta.",
            formulas: "Suma Pedidos Abiertos Comercial"
          }}
        />
        <KPICard 
          title="Pend. de Facturar" 
          value={kpis.enviadosFacturar} 
          accountValue={kpis.enviadosFacturarAccounts}
          type="currency" 
          icon={Activity} 
          status="warning"
          isLoading={isLoadingPerf}
          infoProps={{ 
            title: "Pendiente de Facturar (Neto)",
            description: "Mercancía enviada o pedidos pendientes de emitir factura definitiva, descontando el importe de las facturas prepago ya cobradas.",
            formulas: "Pedidos por facturar brutos - Prepagos facturados",
            breakdown: [
              { label: "Pedidos por facturar brutos", value: formatCurrency(kpis.enviadosFacturarBruto || kpis.enviadosFacturar || 0), sign: 'i', color: 'text-gray-600 dark:text-gray-300' },
              { label: "Prepagos facturados descontados", value: formatCurrency(kpis.prepagosDescontadosFacturar || 0), sign: '-', color: 'text-cyan-600 dark:text-cyan-400' },
              { label: "Total Pendiente por Facturar", value: formatCurrency(kpis.enviadosFacturar || 0), sign: '=', color: 'text-dts-primary dark:text-white font-bold' },
            ]
          }}
        />
      </div>

      {/* Grid container for Agenda Semanal (Left) and Top Clients / Products (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Agenda Semanal CRM (Timeline Style) */}
        <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 space-y-6 flex flex-col h-full min-h-115">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 shrink-0 gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-dts-primary dark:text-white">
              <Activity size={16} className="text-dts-secondary" />
              Agenda Semanal CRM
            </h3>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">
                Semana del {monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-white bg-dts-primary hover:bg-dts-primary/90 dark:bg-dts-secondary dark:text-dts-primary-dark dark:hover:bg-dts-secondary/90 dark:hover:brightness-110 dark:hover:text-dts-primary-dark flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                title="Exportar informe de eventos y reuniones en PDF o Excel"
              >
                <FileText size={12} />
                <span>Exportar Informe</span>
              </button>
            </div>
          </div>

          {isLoadingAgenda ? (
            <div className="space-y-4 flex-1">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-16 animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : sortedWeeklyActivities.length === 0 ? (
            <div className="text-xs text-gray-400 dark:text-gray-500 italic py-10 bg-gray-50/50 dark:bg-white/2 border border-dashed border-gray-250 dark:border-white/5 rounded-xl text-center flex-1 flex items-center justify-center">
              No hay actividades comerciales registradas para esta semana.
            </div>
          ) : (
            <div className="relative space-y-4 overflow-y-auto pr-2 scrollbar-thin flex-1 max-h-95">
              {/* Vertical timeline connector line */}
              <div className="absolute left-4 md:left-36 top-2 bottom-4 w-0.5 bg-gray-200 dark:zinc-500"></div>
              
              {sortedWeeklyActivities.map(act => {
                const typeIconMap = {
                  NOTE: FileText,
                  TASK: CheckSquare,
                  EMAIL: Send,
                  EVENT: Calendar,
                  CALL: Phone,
                  REUNION: Users,
                  VIDEOLLAMADA: Video,
                  VISITA: MapPin
                };
                const typeColors: Record<string, { bg: string, color: string }> = {
                  NOTE: { bg: 'bg-amber-100 dark:bg-amber-950/20', color: 'text-amber-600 dark:text-amber-400' },
                  TASK: act.is_completed 
                    ? { bg: 'bg-emerald-100 dark:bg-emerald-950/20', color: 'text-emerald-600 dark:text-emerald-400' }
                    : { bg: 'bg-blue-100 dark:bg-blue-950/20', color: 'text-blue-600 dark:text-blue-400' },
                  EMAIL: { bg: 'bg-purple-100 dark:bg-purple-950/20', color: 'text-purple-600 dark:text-purple-400' },
                  EVENT: { bg: 'bg-rose-100 dark:bg-rose-950/20', color: 'text-rose-600 dark:text-rose-400' },
                  CALL: { bg: 'bg-cyan-100 dark:bg-cyan-950/20', color: 'text-cyan-600 dark:text-cyan-400' },
                  REUNION: { bg: 'bg-teal-100 dark:bg-teal-950/20', color: 'text-teal-600 dark:text-teal-400' },
                  VIDEOLLAMADA: { bg: 'bg-indigo-100 dark:bg-indigo-950/20', color: 'text-indigo-600 dark:text-indigo-400' },
                  VISITA: { bg: 'bg-orange-100 dark:bg-orange-950/20', color: 'text-orange-600 dark:text-orange-400' }
                };
                const typeLabel = {
                  NOTE: 'Nota',
                  TASK: 'Tarea',
                  EMAIL: 'Email',
                  EVENT: 'Evento',
                  CALL: 'Llamada',
                  REUNION: 'Reunión',
                  VIDEOLLAMADA: 'Videollamada',
                  VISITA: 'Visita'
                };

                const IconComponent = typeIconMap[act.type] || FileText;
                const style = typeColors[act.type] || { bg: 'bg-gray-100', color: 'text-gray-600' };
                const actDateStr = act.due_date || act.created_at;
                const isPastDate = (() => {
                  if (!actDateStr) return false;
                  const dateObj = new Date(actDateStr);
                  if (act.time_scheduled) {
                    const [hh, mm] = act.time_scheduled.split(':');
                    dateObj.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
                  } else {
                    dateObj.setHours(23, 59, 59, 999);
                  }
                  return dateObj.getTime() < new Date().getTime();
                })();

                const isFinished = act.is_completed || isPastDate;
                const hasConclusions = Boolean(act.conclusions && act.conclusions.trim());
                const needsConclusions = isFinished && !hasConclusions;

                return (
                  <div key={act.id} className="flex md:flex-row flex-col gap-2 md:gap-4 relative pl-10 md:pl-0 text-xs">
                    <div className="w-full md:w-28 shrink-0 md:text-right pt-0.5 flex md:flex-col items-center md:items-end gap-2 md:gap-0.5">
                      <span className="font-black text-[11px] md:text-[12px] text-dts-secondary uppercase tracking-wider">
                        {new Date(actDateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                      {act.time_scheduled && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-400 font-mono font-bold flex items-center gap-1 justify-end">
                          <Clock size={10} /> {act.time_scheduled.substring(0, 5)}
                        </span>
                      )}
                    </div>

                    <div className="absolute left-0 md:relative md:left-auto flex flex-col items-center w-8 shrink-0">
                      <span className={`p-1.5 rounded-xl ${style.bg} ${style.color} z-10 border-2 border-white dark:border-surface-card-dark shadow-xs flex items-center justify-center`}>
                        <IconComponent size={13} />
                      </span>
                    </div>

                    <div className="flex-1 pb-4">
                      <div 
                        onClick={() => navigate(`/crm/customers?clientId=${act.client_id}`)}
                        className={`group/box p-3.5 rounded-xl border transition-all duration-200 shadow-xs cursor-pointer ${
                          needsConclusions
                            ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-300/80 dark:border-amber-500/40 hover:border-amber-400'
                            : act.is_completed
                            ? 'bg-gray-50/50 dark:bg-white/2 border-gray-200/50 dark:border-white/5 opacity-75'
                            : 'bg-gray-50/50 dark:bg-white/2 border-gray-200/50 dark:border-white/5 hover:border-dts-secondary/35'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold text-xs group-hover/box:text-dts-secondary transition-colors ${
                              act.is_completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {act.title}
                            </span>
                            {isFinished && (
                              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold border ${
                                act.is_completed 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              }`}>
                                {act.is_completed ? 'TERMINADO' : 'VENCIDO'}
                              </span>
                            )}
                            {hasConclusions && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-700 border border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800">
                                Conclusiones
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white dark:bg-white/5 text-gray-400 font-bold border border-gray-100 dark:border-white/5">
                              {typeLabel[act.type]}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCalendarEventInOutlook({ webLink: act.exchange_web_link });
                              }}
                              className="p-1 rounded-md text-gray-400 hover:text-[#0078D4] hover:bg-[#0078D4]/10 dark:hover:bg-[#0078D4]/20 transition-colors cursor-pointer"
                              title={`Abrir en Outlook (${preferredOutlook === 'desktop' ? 'Escritorio' : 'Web'})`}
                            >
                              <OutlookIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivityToEdit(act);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 rounded-md text-gray-400 hover:text-dts-secondary hover:bg-cyan-500/10 dark:hover:bg-cyan-500/20 transition-colors cursor-pointer"
                              title="Editar evento"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </div>
                        
                        {act.description && (
                          <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed text-[11px] whitespace-pre-wrap">
                            {act.description}
                          </p>
                        )}

                        {hasConclusions && (
                          <div className="mt-2 text-[11px] border-l-2 border-teal-500 pl-2.5 py-1 bg-teal-50/40 dark:bg-teal-950/20 rounded-r-md text-gray-700 dark:text-gray-300">
                            <span className="text-teal-700 dark:text-teal-400 font-bold block text-[10px] uppercase tracking-wide">
                              Conclusiones:
                            </span>
                            <p className="whitespace-pre-wrap leading-relaxed mt-0.5">{act.conclusions}</p>
                          </div>
                        )}

                        {needsConclusions && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivityToEdit(act);
                              setIsEditModalOpen(true);
                            }}
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-black text-[10px] rounded-lg border border-amber-300/80 dark:border-amber-500/40 uppercase tracking-wider transition-all cursor-pointer group/btn shadow-2xs"
                          >
                            <Plus size={12} className="stroke-[3] group-hover/btn:rotate-90 transition-transform text-amber-800 dark:text-amber-300" />
                            <span>AGREGAR CONCLUSIONES</span>
                          </button>
                        )}

                        {(act.customer || act.contact) && (
                          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                            {act.customer && (
                              <span className="flex items-center gap-1.5 hover:text-dts-secondary transition-colors" title="Empresa / Cliente">
                                <span>🏢</span>
                                <span className="text-gray-800 dark:text-gray-200 font-bold">
                                  {act.customer.company_name || act.customer.name}
                                </span>
                              </span>
                            )}
                            {act.contact?.name && (
                              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300 font-medium" title="Persona de Contacto">
                                <User size={11} className="text-dts-secondary shrink-0" />
                                <span>{act.contact.name}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Top Customers and Top Products stacked vertically */}
        <div className="flex flex-col gap-6 h-full justify-between">
          {/* Top Customers */}
          <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 flex-1 flex flex-col justify-between min-h-54.25">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-dts-secondary" />
                Top 5 Clientes
              </h3>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {isLoadingPerf ? (
                <div className="h-28 animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
              ) : topCustomers.length === 0 ? (
                <p className="text-center py-4 text-gray-400 text-sm italic">Sin datos de facturación</p>
              ) : (
                topCustomers.map((customer, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedCustCode(customer.customerCode);
                      setIsDrawerOpen(true);
                    }}
                    className="flex flex-col gap-1 border-b border-gray-50 dark:border-white/5 pb-2 last:border-0 last:pb-0 cursor-pointer group/item"
                  >
                    <div className="flex justify-between items-center text-dts-primary dark:text-gray-200 group-hover/item:text-dts-secondary transition-colors">
                      <span className="text-xs font-bold truncate pr-4">{customer.customerName}</span>
                      <span className="text-xs font-mono font-bold text-dts-secondary">{formatCurrency(customer.facturacion, 0)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-dts-secondary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((customer.facturacion / (topCustomers[0]?.facturacion || 1)) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 flex-1 flex flex-col justify-between min-h-54.25">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-dts-secondary" />
                Top 5 Productos
              </h3>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {isLoadingProducts ? (
                <div className="h-28 animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
              ) : !topProducts || topProducts.length === 0 ? (
                <p className="text-center py-4 text-gray-400 text-sm italic">Sin datos de productos</p>
              ) : (
                topProducts.map((product, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-gray-50 dark:border-white/5 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-dts-primary dark:text-gray-200 truncate pr-4">{product.description}</span>
                      <span className="text-xs font-mono font-bold text-dts-secondary">{formatCurrency(product.totalSales, 0)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-dts-secondary h-full rounded-full opacity-80" 
                        style={{ width: `${Math.min((product.totalSales / (topProducts[0]?.totalSales || 1)) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Evolution Chart */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider">Evolución Facturación vs Presupuesto</h3>
          <InfoPopover 
            title="Evolución Temporal" 
            description="Gráfico mensual comparativo entre las ventas reales obtenidas y los objetivos marcados."
            iconSize={16}
          />
        </div>
        <div className="w-full min-w-0 h-75">
          {isLoadingEvol ? (
             <div className="h-full w-full animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={evolutionData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(m) => MONTHS.find(x => x.val === m)?.label || m} 
                  tick={{fontSize: 10}} 
                />
                <YAxis 
                  tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} 
                  tick={{fontSize: 10}} 
                />
                <Tooltip content={<CustomTooltip />} cursor={false}/>
                <Legend verticalAlign="top" content={renderCustomLegend} />
                <Bar dataKey="ventas" name="Ventas Reales" fill="#00B0B9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="objetivo" name="Objetivo (Presupuesto)" fill="#64748B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Modal de Informe Histórico de Eventos PDF / Excel */}
      <CrmActivityReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Modal de Edición de Evento de la Agenda Semanal */}
      <EditActivityModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setActivityToEdit(null);
        }}
        activity={activityToEdit}
      />
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps, accountValue, footerText, infoText, subtext }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  
  const isPositive = value >= 0;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : status === 'warning' ? 'text-amber-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : type === 'percentage' ? `${formatNumber(value, 1)}%` : formatNumber(value, 0);

  return (
    <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{title}</span>
            {infoProps && (
              <InfoPopover 
                title={title} 
                {...infoProps}
                iconSize={12}
                className="text-gray-300 group-hover:text-dts-secondary transition-colors"
              />
            )}
          </div>
          <Icon size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <div className={`text-xl font-black font-mono ${colorClass}`}>{formattedValue}</div>
            {type === 'percentage' && (
              <div className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp size={10} className="inline mr-0.5"/> : <TrendingDown size={10} className="inline mr-0.5"/>}
              </div>
            )}
          </div>
          {subtext && (
            <div className="text-[9px] text-dts-secondary dark:text-cyan-400 font-normal leading-tight mt-0.5">
              {subtext}
            </div>
          )}
          {accountValue !== undefined && accountValue > 0 && (
            <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
              ({formatCurrency(accountValue, 0)}) cuentas
            </div>
          )}
          {footerText && (
            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
              {footerText}
            </div>
          )}
        </div>
      </div>
      {infoText && (
        <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-white/5 flex items-center gap-1 text-[9px] text-gray-400 font-medium">
          <span className="w-1 h-1 rounded-full bg-dts-secondary animate-pulse" />
          <span className="truncate" title={infoText}>{infoText}</span>
        </div>
      )}
    </div>
  );
};

const GlobalKPICard = ({ title, value, subValue, extraValue, accountValue, accountSubValue, deviation, type = 'number', icon: Icon, color, infoProps, variant, label1 = "REAL:", label2 = "PPTO:", label3 = "EXTRA:", suffix = "", isLoading, infoText, subtext1 }: any) => {
  if (isLoading) return <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/10 h-40 animate-pulse" />;

  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
  };

  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : value;
  const formattedSubValue = type === 'currency' ? formatCurrency(subValue, 0) : subValue;

  return (
    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:shadow-card-hover group flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
            {infoProps && <InfoPopover title={title} {...infoProps} iconSize={12} />}
          </div>
          <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 duration-300 ${colorMap[color] || colorMap.blue}`}>
            <Icon size={18} />
          </div>
        </div>
        
        {variant === 'comparison' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-12">{label1}</span>
              <div className="flex flex-col">
                <div className="text-2xl font-light text-dts-primary dark:text-white tracking-tight">
                  {formattedValue}
                </div>
                {subtext1 && (
                  <span className="text-[9px] text-dts-secondary dark:text-cyan-400 font-normal leading-tight">
                    {subtext1}
                  </span>
                )}
                {accountValue !== undefined && accountValue > 0 && (
                  <span className="text-[10px] text-gray-400 italic font-normal -mt-1">
                    ({formatCurrency(accountValue, 0)}) cuentas
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-12">{label2}</span>
              <div className="flex flex-col">
                <div className="text-2xl font-light text-gray-500 dark:text-gray-400 tracking-tight">
                  {label2 === 'TOTAL:' || label2 === 'CANT:' ? `${subValue}${suffix}` : formattedSubValue}
                </div>
                {accountSubValue !== undefined && accountSubValue > 0 && (
                  <span className="text-[10px] text-gray-400 italic font-normal -mt-1">
                    ({formatCurrency(accountSubValue, 0)}) cuentas
                  </span>
                )}
              </div>
            </div>
            {extraValue !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 w-12">{label3}</span>
                <div className="text-2xl font-light text-red-400 tracking-tight">
                  {extraValue}{suffix}
                </div>
              </div>
            )}
            </div>
        ) : (
          <div className="text-3xl font-light text-dts-primary dark:text-white tracking-tight">{formattedValue}</div>
        )}
        
        {deviation !== undefined && (
          <div className="mt-0.5 flex items-center justify-between pt-0">
            {variant !== 'comparison' && (
              <span className="text-[10px] text-gray-400">Ppto: {type === 'currency' ? formatCurrency(subValue) : subValue}</span>
            )}
            <div className={`flex items-center gap-1 text-xl font-light ${deviation >= 0 ? 'text-emerald-500' : 'text-red-500'} ${variant === 'comparison' ? 'ml-auto' : ''}`}>
              {deviation >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {infoText && (
        <div className="mt-3 pt-2 border-t border-gray-200/50 dark:border-white/5 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-dts-secondary animate-pulse" />
          <span className="truncate" title={infoText}>{infoText}</span>
        </div>
      )}
    </div>
  );
};

const GaugeChart = ({ value }: { value: number }) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const data = [
    { value: normalizedValue, color: '#22C55E' },
    { value: 100 - normalizedValue, color: '#E5E7EB' },
  ];
  
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) data[1].color = '#1F2937';

  if (normalizedValue < 40) data[0].color = '#EF4444'; 
  else if (normalizedValue < 75) data[0].color = '#3B82F6'; 
  else data[0].color = '#22C55E'; 

  return (
    <div className="relative w-full h-full">
      <div 
        className="absolute left-1/2 -translate-x-1/2 aspect-square h-[170%] border border-gray-200 dark:border-white/20 rounded-full pointer-events-none z-0"
        style={{ 
          bottom: '-85%',
          clipPath: 'inset(0 0 50% 0)' 
        }}
      />

      {[0, 25, 50, 75, 100].map((tick) => (
        <div 
          key={tick}
          className="absolute bottom-0 left-1/2 w-px h-[85%] origin-bottom pointer-events-none z-10"
          style={{ transform: `translateX(-50%) rotate(${(tick * 1.8) - 90}deg)` }}
        >
          <div className="w-full h-1 bg-gray-400 dark:bg-gray-500 opacity-50" />
          <div 
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-gray-500 dark:text-gray-400"
            style={{ transform: `translateX(-50%) rotate(${-( (tick * 1.8) - 90 )}deg)` }}
          >
            {tick}%
          </div>
        </div>
      ))}

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="65%"
            outerRadius="100%"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      <div 
        className="absolute bottom-0 left-1/2 w-4 h-[85%] origin-bottom transition-transform duration-1000 ease-out z-20"
        style={{ 
          transform: `translateX(-50%) rotate(${(normalizedValue * 1.8) - 90}deg)`,
        }}
      >
        <div 
          className="w-full h-full bg-dts-primary dark:bg-dts-secondary shadow-lg"
          style={{ 
            clipPath: 'polygon(50% 0%, 35% 100%, 65% 100%)' 
          }}
        />
      </div>
      
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-dts-primary dark:bg-white rounded-full border-2 border-white dark:border-surface-dark shadow-lg z-10" />
    </div>
  );
};

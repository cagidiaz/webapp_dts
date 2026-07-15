import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution, 
  getTopProducts,
  getWeeklyAgenda
} from '../../../api';
import { formatCurrency, formatNumber } from '../../../api/formatters';
import { 
  TrendingUp, Target, Activity, Users, Package, BarChart2,
  TrendingDown, Euro, Calendar, FileText, CheckSquare, Send, Phone, Clock, MapPin, Video
} from 'lucide-react';
import { InfoPopover } from '../../../components/ui';
import { CustomerDetailDrawer } from '../../sales/components/CustomerDetailDrawer';
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

  // Drawer state
  const [selectedCustCode, setSelectedCustCode] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

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
    enviadosFacturar: 0, enviadosFacturarAccounts: 0
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
            title="Ventas TTD vs Ppto YTD (Global)" 
            value={globalPerf?.kpis?.ventas || 0} 
            subValue={globalPerf?.kpis?.objetivo || 0}
            deviation={globalPerf?.kpis?.desviacionPct || 0}
            type="currency" 
            icon={Euro} 
            color="blue"
            variant="comparison"
            isLoading={isLoadingGlobalPerf}
            infoProps={{
              description: "Comparativa de facturación real global acumulada frente al presupuesto global a fecha de hoy.",
              formulas: "Ventas YTD Global vs Presupuesto YTD Global"
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
            infoProps={{
              description: "Facturación global del ejercicio actual comparada con el mismo periodo del año anterior.",
              formulas: "Ventas Globales Actuales vs Ventas Globales Año Anterior (Hasta hoy)"
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
              description: "Resumen de cartera (pedidos abiertos) y mercancía enviada no facturada (Pendientes) a nivel global de la compañía. Valoración basada en precio neto efectivo (incluye descuentos) y excluyendo líneas a cero. El valor entre paréntesis indica el total correspondiente a líneas de cuentas contables.",
              formulas: "Suma(Cantidad * (Importe Neto / Cantidad Total))"
            }}
          />

          <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group min-h-[160px]">
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
          infoProps={{ description: "Total de ventas reales acumuladas netas de abonos." }}
        />
        <KPICard 
          title="Objetivo Ventas" 
          value={kpis.objetivo} 
          type="currency" 
          icon={Target} 
          isLoading={isLoadingPerf || isLoadingEvol}
          footerText={annualTarget > 0 ? `Total anual: ${formatCurrency(annualTarget, 0)}` : undefined}
          infoProps={{ description: "Meta de facturación presupuestada para el periodo acumulado (YTD). En pequeño se muestra el total anual." }}
        />
        <KPICard 
          title="Cumplimiento" 
          value={kpis.desviacionPct} 
          type="percentage" 
          icon={Activity} 
          status={kpis.desviacionPct >= 0 ? 'success' : 'danger'}
          isLoading={isLoadingPerf}
          infoProps={{ description: "Porcentaje de consecución del objetivo presupuestado." }}
        />
        <KPICard 
          title="Desviación" 
          value={kpis.desviacionEur} 
          type="currency" 
          icon={BarChart2} 
          status={kpis.desviacionEur >= 0 ? 'success' : 'danger'}
          isLoading={isLoadingPerf}
          infoProps={{ description: "Diferencia nominal entre ventas reales y presupuesto." }}
        />
        <KPICard 
          title="Cartera de Pedidos" 
          value={kpis.carteraVentas} 
          accountValue={kpis.carteraVentasAccounts}
          type="currency" 
          icon={Package} 
          isLoading={isLoadingPerf}
          infoProps={{ description: "Valor de los pedidos abiertos pendientes de procesar. El valor entre paréntesis indica la porción de líneas de tipo cuenta." }}
        />
        <KPICard 
          title="Pend. de Facturar" 
          value={kpis.enviadosFacturar} 
          accountValue={kpis.enviadosFacturarAccounts}
          type="currency" 
          icon={Activity} 
          status="warning"
          isLoading={isLoadingPerf}
          infoProps={{ description: "Mercancía enviada pendiente de factura. El valor entre paréntesis indica la porción de líneas de tipo cuenta." }}
        />
      </div>

      {/* Grid container for Agenda Semanal (Left) and Top Clients / Products (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Agenda Semanal CRM (Timeline Style) */}
        <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 space-y-6 flex flex-col h-full min-h-[460px]">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-dts-primary dark:text-white">
              <Activity size={16} className="text-dts-secondary" />
              Agenda Semanal CRM
            </h3>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">
              Semana del {monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
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
            <div className="relative space-y-4 overflow-y-auto pr-2 scrollbar-thin flex-1 max-h-[380px]">
              {/* Vertical timeline connector line */}
              <div className="absolute left-[16px] md:left-[144px] top-2 bottom-4 w-0.5 bg-gray-150 dark:bg-white/10"></div>
              
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
                        className={`group/box bg-gray-50/50 dark:bg-white/2 p-3.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:border-dts-secondary/35 transition-all duration-200 shadow-xs cursor-pointer ${
                          act.is_completed ? 'opacity-65' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className={`font-bold text-xs group-hover/box:text-dts-secondary transition-colors ${
                            act.is_completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {act.title}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white dark:bg-white/5 text-gray-400 font-bold border border-gray-100 dark:border-white/5">
                            {typeLabel[act.type]}
                          </span>
                        </div>
                        
                        {act.description && (
                          <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed text-[11px] whitespace-pre-wrap">
                            {act.description}
                          </p>
                        )}

                        {act.customer && (
                          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
                            <span>🏢</span>
                            <span className="hover:text-dts-secondary transition-colors">
                              {act.customer.company_name} ({act.customer.client_id})
                            </span>
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
          <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 flex-1 flex flex-col justify-between min-h-[217px]">
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
          <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 flex-1 flex flex-col justify-between min-h-[217px]">
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
        <div className="w-full min-w-0 h-[300px]">
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
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps, accountValue, footerText }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  
  const isPositive = value >= 0;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : status === 'warning' ? 'text-amber-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : type === 'percentage' ? `${formatNumber(value, 1)}%` : formatNumber(value, 0);

  return (
    <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{title}</span>
          {infoProps && (
            <InfoPopover 
              title={title} 
              description={infoProps.description} 
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
        {accountValue !== undefined && accountValue > 0 && (
          <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
            ({formatCurrency(accountValue, 0)})
          </div>
        )}
        {footerText && (
          <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
            {footerText}
          </div>
        )}
      </div>
    </div>
  );
};

const GlobalKPICard = ({ title, value, subValue, extraValue, accountValue, accountSubValue, deviation, type = 'number', icon: Icon, color, infoProps, variant, label1 = "REAL:", label2 = "PPTO:", label3 = "EXTRA:", suffix = "", isLoading }: any) => {
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
    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:shadow-card-hover group">
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
              {accountValue !== undefined && accountValue > 0 && (
                <span className="text-[10px] text-gray-400 italic font-normal -mt-1">
                  ({formatCurrency(accountValue, 0)})
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
                  ({formatCurrency(accountSubValue, 0)})
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

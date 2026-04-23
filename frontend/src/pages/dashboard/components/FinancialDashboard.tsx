import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getIncomeStatementData, 
  getBudgetsData, 
  groupDataByYear, 
  groupBudgetsByYear 
} from '../../../api/finance';
import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution 
} from '../../../api/salesBudget';
import { formatCurrency } from '../../../api/formatters';
import { 
  TrendingUp, TrendingDown, BarChart2, 
  Package, Euro, Clock, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { InfoPopover } from '../../../components/ui/InfoPopover';
import { useUIStore } from '../../../store/uiStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

export const FinancialDashboard: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const currentYear = new Date().getFullYear();

  // 1. Fetch Finance Data (for EBITDA)
  const { data: incomeRows, isLoading: iLoading } = useQuery({ 
    queryKey: ['incomeData'], 
    queryFn: getIncomeStatementData 
  });
  const { data: budgetRows, isLoading: bLoading } = useQuery({ 
    queryKey: ['budgetData'], 
    queryFn: getBudgetsData 
  });

  // 2. Fetch Sales Performance (for Sales, Backlog, Shipped not Invoiced)
  const { data: salesPerf, isLoading: pLoading } = useQuery({
    queryKey: ['salesPerf', currentYear],
    queryFn: () => getSalesBudgetPerformance({ year: currentYear })
  });

  // 3. Fetch Sales Evolution (for the chart)
  const { data: evolution, isLoading: eLoading } = useQuery({
    queryKey: ['salesEvolution', currentYear],
    queryFn: () => getSalesBudgetEvolution({ year: currentYear })
  });

  React.useEffect(() => {
    setPageInfo({
      title: 'Panel de Mando Ejecutivo',
      subtitle: `Visión 360º del negocio — Ejercicio ${currentYear}`,
      icon: <BarChart2 size={20} />,
      infoProps: {
        title: 'Panel de Mando Ejecutivo',
        description: 'Dashboard integral que combina datos financieros, comerciales y de operaciones para facilitar la toma de decisiones gerenciales.',
        objective: 'Monitorizar la salud global de la empresa: Ventas, Rentabilidad y Cartera de Pedidos.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo, currentYear]);

  // Financial Metrics calculation (EBITDA)
  const financialMetrics = useMemo(() => {
    if (!incomeRows || !budgetRows) return null;

    const incomes = groupDataByYear(incomeRows);
    const budgets = groupBudgetsByYear(budgetRows);

    const currentIncome = incomes.find(d => d.year === currentYear) as any || {};
    const currentBudget = budgets.find(d => d.year === currentYear) as any || {};

    const realEbitda = currentIncome['A.1.TOT'] || 0;
    const budgetEbitda = (currentBudget['A.1'] || 0) 
                       - Math.abs((currentBudget['A.4'] || 0) + (currentBudget['A.7'] || 0)) 
                       - Math.abs(currentBudget['A.6'] || 0);
    const ebitdaDeviation = budgetEbitda !== 0 ? ((realEbitda / budgetEbitda) - 1) * 100 : 0;

    return { realEbitda, budgetEbitda, ebitdaDeviation };
  }, [incomeRows, budgetRows, currentYear]);

  // Chart Data Formatting
  const chartData = useMemo(() => {
    if (!evolution) return [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return evolution.map(item => ({
      name: monthNames[item.month - 1],
      Ventas: item.ventas,
      Objetivo: item.objetivo
    }));
  }, [evolution]);

  const isLoading = iLoading || bLoading || pLoading || eLoading;

  if (isLoading) return (
    <div className="flex flex-col gap-6 p-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>)}
      </div>
      <div className="h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl w-full"></div>
    </div>
  );

  const kpis = salesPerf?.kpis;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* Top KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Ventas YTD vs Ppto" 
          value={kpis?.ventas || 0} 
          subValue={kpis?.objetivo || 0}
          deviation={kpis?.desviacionPct || 0}
          type="currency" 
          icon={Euro} 
          color="blue"
          infoProps={{
            description: "Facturación real acumulada en el año actual frente al presupuesto total anual.",
            formulas: "Real YTD vs Presupuesto Total"
          }}
        />
        <KPICard 
          title="Cartera de Pedidos" 
          value={kpis?.carteraVentas || 0} 
          accountValue={kpis?.carteraVentasAccounts || 0}
          type="currency" 
          icon={Package} 
          color="emerald"
          infoProps={{
            description: "Valor total de los pedidos abiertos pendientes de procesar. El valor entre paréntesis indica la porción de líneas de tipo cuenta.",
            formulas: "Suma(Cantidad Pendiente * Precio Unitario)"
          }}
        />
        <KPICard 
          title="Pend. de Facturar" 
          value={kpis?.enviadosFacturar || 0} 
          accountValue={kpis?.enviadosFacturarAccounts || 0}
          type="currency" 
          icon={Clock} 
          color="amber"
          infoProps={{
            description: "Mercancía que ya ha sido enviada al cliente pero que aún no ha sido facturada oficialmente. El valor entre paréntesis indica la porción de líneas de tipo cuenta.",
            formulas: "Suma(Cant. Enviada No Facturada * Precio Unitario)"
          }}
        />
        <KPICard 
          title="EBITDA Est." 
          value={financialMetrics?.realEbitda || 0} 
          subValue={financialMetrics?.budgetEbitda || 0}
          deviation={financialMetrics?.ebitdaDeviation || 0}
          type="currency" 
          icon={TrendingUp} 
          color="indigo"
          infoProps={{
            description: "Resultado operativo estimado (extrapolado) antes de intereses, impuestos y amortizaciones.",
            formulas: "Margen Bruto - Gastos de Personal - Otros Gastos Explotación"
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-dts-primary dark:text-white">Evolución de Ventas vs Presupuesto</h3>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">Comparativa mensual acumulada (€)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> <span>Real</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700"></span> <span>Ppto</span></div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#002A38', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(value: any) => [formatCurrency(Number(value || 0)), '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="Ventas" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="Objetivo" 
                  stroke="#9CA3AF" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive Insights & Status */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="text-md font-bold text-dts-primary dark:text-white mb-6 flex items-center gap-2">
              <AlertCircle size={18} className="text-dts-secondary" />
              Estado y Alertas
            </h3>
            <div className="space-y-5">
              <InsightItem 
                title="Cumplimiento de Ventas" 
                status={kpis?.desviacionPct && kpis.desviacionPct >= 0 ? 'success' : 'warning'}
                message={kpis?.desviacionPct && kpis.desviacionPct >= 0 
                  ? `Estamos superando el presupuesto anual en un ${kpis.desviacionPct.toFixed(1)}%.`
                  : `Existe una desviación negativa del ${Math.abs(kpis?.desviacionPct || 0).toFixed(1)}% respecto al objetivo.`}
              />
              <InsightItem 
                title="Cartera de Pedidos" 
                status="info"
                message={`Disponemos de ${formatCurrency(kpis?.carteraVentas || 0)} en cartera pendientes de procesar.`}
              />
              <InsightItem 
                title="Eficiencia Operativa" 
                status={financialMetrics?.ebitdaDeviation && financialMetrics.ebitdaDeviation >= 0 ? 'success' : 'danger'}
                message={`El EBITDA proyectado está un ${Math.abs(financialMetrics?.ebitdaDeviation || 0).toFixed(1)}% ${financialMetrics?.ebitdaDeviation && financialMetrics.ebitdaDeviation >= 0 ? 'por encima' : 'por debajo'} de lo esperado.`}
              />
            </div>
          </div>

          <div className="bg-dts-primary dark:bg-dts-primary-dark p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-1">Previsión Cierre</h3>
              <div className="text-3xl font-black mb-4">
                {formatCurrency((kpis?.ventas || 0) + (kpis?.carteraVentas || 0))}
              </div>
              <p className="text-xs opacity-80 leading-relaxed">
                Considerando la facturación actual YTD y la cartera de pedidos abierta, la proyección mínima de cierre se sitúa en este valor.
              </p>
            </div>
            <Euro size={120} className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subValue, accountValue, deviation, type = 'number', icon: Icon, color, infoProps }: any) => {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
  };

  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : value;

  return (
    <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
          <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
          {infoProps && <InfoPopover title={title} {...infoProps} iconSize={12} />}
        </div>
        <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 duration-300 ${colorMap[color] || colorMap.blue}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-light text-dts-primary dark:text-white tracking-tight">{formattedValue}</div>
      
      {accountValue !== undefined && accountValue > 0 && (
        <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
          ({formatCurrency(accountValue, 0)})
        </div>
      )}

      {deviation !== undefined && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-3">
          <span className="text-[10px] text-gray-400">Ppto: {type === 'currency' ? formatCurrency(subValue) : subValue}</span>
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${deviation >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {deviation >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
};

const InsightItem = ({ title, message, status }: { title: string, message: string, status: 'success' | 'warning' | 'danger' | 'info' }) => {
  const iconMap = {
    success: <CheckCircle2 size={16} className="text-emerald-500" />,
    warning: <AlertCircle size={16} className="text-amber-500" />,
    danger: <AlertCircle size={16} className="text-red-500" />,
    info: <BarChart2 size={16} className="text-blue-500" />
  };

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">{iconMap[status]}</div>
      <div>
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-0.5">{title}</h4>
        <p className="text-[11px] text-gray-400 leading-normal">{message}</p>
      </div>
    </div>
  );
};


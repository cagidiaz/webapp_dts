import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution 
} from '../../../api/salesBudget';
import { formatCurrency } from '../../../api/formatters';
import { 
  TrendingUp, TrendingDown, BarChart2,
  Package, Euro, AlertCircle, CheckCircle2, UserPlus 
} from 'lucide-react';
import { InfoPopover } from '../../../components/ui/InfoPopover';
import { useUIStore } from '../../../store/uiStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

export const FinancialDashboard: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const currentYear = new Date().getFullYear();

  // 1. Fetch Finance Data (for EBITDA)


  const currentMonths = useMemo(() => Array.from({ length: new Date().getMonth() + 1 }, (_, i) => i + 1), []);
  
  // 2. Fetch Sales Performance (for Sales, Backlog, Shipped not Invoiced)
  const { data: salesPerf, isLoading: pLoading } = useQuery({
    queryKey: ['salesPerf', currentYear, currentMonths],
    queryFn: () => getSalesBudgetPerformance({ 
      year: currentYear, 
      months: currentMonths,
      limitToToday: true 
    })
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

  // Chart Data Formatting (Accumulated YTD)
  const chartData = useMemo(() => {
    if (!evolution) return [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth() + 1;
    
    let accVentas = 0;
    let accObjetivo = 0;
    let accVentasAnterior = 0;

    return evolution.map(item => {
      accObjetivo += item.objetivo;
      accVentasAnterior += (item.ventasAnterior || 0);
      
      // Solo acumulamos ventas actuales hasta el mes actual
      if (item.month <= currentMonth) {
        accVentas += item.ventas;
      }

      return {
        name: monthNames[item.month - 1],
        Ventas: item.month <= currentMonth ? accVentas : null,
        'Año Anterior': accVentasAnterior,
        Objetivo: accObjetivo
      };
    });
  }, [evolution]);

  const annualStats = useMemo(() => {
    if (!chartData || chartData.length === 0) return { totalAnnualBudget: 0, pctAchievement: 0 };
    const lastItem = chartData[chartData.length - 1];
    const totalAnnualBudget = lastItem.Objetivo;
    const currentSales = salesPerf?.kpis?.ventas || 0;
    const pctAchievement = totalAnnualBudget > 0 ? (currentSales / totalAnnualBudget) * 100 : 0;
    return { totalAnnualBudget, pctAchievement };
  }, [chartData, salesPerf]);

  const isLoading = pLoading || eLoading;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <KPICard 
          title="Ventas YTD vs Ppto YTD" 
          value={kpis?.ventas || 0} 
          subValue={kpis?.objetivo || 0}
          deviation={kpis?.desviacionPct || 0}
          type="currency" 
          icon={Euro} 
          color="blue"
          variant="comparison"
          infoProps={{
            description: "Comparativa de facturación real acumulada frente al presupuesto acumulado a fecha de hoy.",
            formulas: "Ventas YTD vs Presupuesto YTD"
          }}
        />
        <KPICard 
          title="VENTAS ACTUAL VS ANTERIOR" 
          value={kpis?.ventas || 0} 
          subValue={kpis?.facturacionAnioAnterior || 0}
          deviation={kpis?.facturacionAnioAnterior && kpis.facturacionAnioAnterior > 0 
            ? ((kpis.ventas - kpis.facturacionAnioAnterior) / kpis.facturacionAnioAnterior) * 100 
            : 0}
          type="currency" 
          icon={BarChart2} 
          color="indigo"
          variant="comparison"
          label1="2026:"
          label2="2025:"
          infoProps={{
            description: "Comparativa de facturación acumulada (YTD) frente al mismo periodo del año anterior.",
            formulas: "Ventas Actuales vs Ventas Año Anterior (Mismo periodo)"
          }}
        />
        
        {/* Speedometer KPI */}
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-4 left-6 flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Objetivo Facturación Anual</span>
          </div>
          <div className="w-full h-24 mt-4">
            <GaugeChart value={annualStats.pctAchievement} />
          </div>
          <div className="text-center mt-2">
            <span className="text-2xl font-light text-dts-primary dark:text-white">{annualStats.pctAchievement.toFixed(1)}%</span>
          </div>
        </div>

        <KPICard 
          title="CARTERA DE PEDIDOS" 
          value={kpis?.carteraVentas || 0} 
          subValue={kpis?.enviadosFacturar || 0}
          type="currency" 
          icon={Package} 
          color="emerald"
          variant="comparison"
          label1="CARTE:"
          label2="PEND:"
          infoProps={{
            description: "Resumen de cartera (pedidos abiertos) y pendientes de facturar (mercancía ya enviada).",
            formulas: "Suma(Cartera) | Suma(Pendientes Factura)"
          }}
        />
        <KPICard 
          title="CLIENTES NUEVOS" 
          value={kpis?.facturacionNuevos || 0} 
          subValue={kpis?.countNuevos || 0}
          extraValue={kpis?.countNuevosSinVenta || 0}
          suffix=" clientes"
          type="currency" 
          icon={UserPlus} 
          color="indigo"
          variant="comparison"
          label1="FACT:"
          label2="TOTAL:"
          label3="S/VTA:"
          infoProps={{
            description: "Facturación acumulada de clientes creados en el ejercicio actual, número total de dichos clientes y cuántos de ellos aún no han realizado compras.",
            formulas: "Suma(Ventas Clientes Nuevos) | Contar(Clientes Nuevos) | Clientes sin Venta"
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
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span> <span>Actual</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-300"></span> <span>Anterior</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700"></span> <span>Ppto</span></div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
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
                  formatter={(value: any, name: any) => [formatCurrency(Number(value || 0)), String(name || '')]}
                />
                <Area 
                  type="monotone" 
                  dataKey="Año Anterior" 
                  stroke="#818CF8" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorPrev)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="Ventas" 
                  name="Año Actual"
                  stroke="#22C55E" 
                  strokeWidth={2} 
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
                title="Nuevos Clientes" 
                status="info"
                message={`Se han incorporado ${kpis?.countNuevos || 0} clientes nuevos este año, aportando ${formatCurrency(kpis?.facturacionNuevos || 0)}.`}
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

const KPICard = ({ title, value, subValue, extraValue, accountValue, deviation, type = 'number', icon: Icon, color, infoProps, variant, label1 = "REAL:", label2 = "PPTO:", label3 = "EXTRA:", suffix = "" }: any) => {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
  };

  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : value;
  const formattedSubValue = type === 'currency' ? formatCurrency(subValue, 0) : subValue;

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
      
      {variant === 'comparison' ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 w-12">{label1}</span>
            <div className="text-2xl font-light text-dts-primary dark:text-white tracking-tight">{formattedValue}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 w-12">{label2}</span>
            <div className="text-2xl font-light text-gray-500 dark:text-gray-400 tracking-tight">
              {label2 === 'TOTAL:' || label2 === 'CANT:' ? `${subValue}${suffix}` : formattedSubValue}
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
      
      {accountValue !== undefined && accountValue > 0 && (
        <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
          ({formatCurrency(accountValue, 0)})
        </div>
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
  
  // En modo oscuro usamos un gris más oscuro para el fondo del gauge
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) data[1].color = '#1F2937';

  // Determinamos el color según el porcentaje
  if (normalizedValue < 40) data[0].color = '#EF4444'; // Rojo
  else if (normalizedValue < 75) data[0].color = '#3B82F6'; // Azul
  else data[0].color = '#22C55E'; // Verde

  return (
    <div className="relative w-full h-full">
      {/* Semicircle Track for Ticks */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 aspect-square h-[170%] border border-gray-200 dark:border-white/20 rounded-full pointer-events-none z-0"
        style={{ 
          bottom: '-85%',
          clipPath: 'inset(0 0 50% 0)' 
        }}
      />

      {/* Ticks and Labels */}
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
      
      {/* Needle Indicator (Arrow Shape) */}
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
      
      {/* Center dot */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-dts-primary dark:bg-white rounded-full border-2 border-white dark:border-surface-dark shadow-lg z-10" />
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


import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution, 
  getTopProducts 
} from '../../../api';
import { formatCurrency, formatNumber } from '../../../api/formatters';
import { 
  TrendingUp, Target, Activity, Users, Package, BarChart2,
  TrendingDown
} from 'lucide-react';
import { InfoPopover } from '../../../components/ui';
import { CustomerDetailDrawer } from '../../sales/components/CustomerDetailDrawer';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { useAuthStore } from '../../../store/authStore';

const MONTHS = [
  { val: 1, label: 'Ene' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' },
  { val: 4, label: 'Abr' }, { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' }, { val: 8, label: 'Ago' }, { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dic' }
];

export const SalesDashboard: React.FC = () => {
  const { profile } = useAuthStore();
  const year = new Date().getFullYear();
  const salespersonCode = profile?.code;

  // Drawer state
  const [selectedCustCode, setSelectedCustCode] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const { data: perfData, isLoading: isLoadingPerf } = useQuery({
    queryKey: ['salesDashboardPerf', year, salespersonCode],
    queryFn: () => getSalesBudgetPerformance({ 
      year, 
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

  const kpis = perfData?.kpis || { ventas: 0, objetivo: 0, desviacionEur: 0, desviacionPct: 0 };
  const topCustomers = perfData?.rows || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <CustomerDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        customerCode={selectedCustCode} 
      />
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-surface-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Panel de Control de Ventas</h1>
            <InfoPopover 
              title="Panel Comercial" 
              description="Vista consolidada del rendimiento comercial, comparativa de objetivos y rankings de actividad."
              objective="Monitorizar el cumplimiento de objetivos de venta y detectar los principales motores del negocio (clientes y productos)."
              iconSize={20}
            />
          </div>
          <p className="text-sm text-gray-500">Resumen comercial ejercicio {year} (YTD)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          isLoading={isLoadingPerf}
          infoProps={{ description: "Meta de facturación presupuestada para el periodo actual." }}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-dts-secondary" />
              Top 5 Clientes
            </h3>
          </div>
          <div className="space-y-4">
            {isLoadingPerf ? (
              <div className="h-40 animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
            ) : topCustomers.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm italic">Sin datos de facturación</p>
            ) : (
              topCustomers.map((customer, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedCustCode(customer.customerCode);
                    setIsDrawerOpen(true);
                  }}
                  className="flex flex-col gap-1 border-b border-gray-50 dark:border-white/5 pb-3 last:border-0 last:pb-0 cursor-pointer group/item"
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
        <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-dts-secondary" />
              Top 5 Productos
            </h3>
          </div>
          <div className="space-y-4">
            {isLoadingProducts ? (
              <div className="h-40 animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
            ) : !topProducts || topProducts.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm italic">Sin datos de productos</p>
            ) : (
              topProducts.map((product, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b border-gray-50 dark:border-white/5 pb-3 last:border-0 last:pb-0">
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
        <div className="h-80 w-full min-w-0">
          {isLoadingEvol ? (
             <div className="h-full w-full animate-pulse bg-gray-50 dark:bg-white/5 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" aspect={2.5}>
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
                <RechartsTooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#003E51', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#00B0B9' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                <Bar dataKey="ventas" name="Ventas Reales" fill="#00B0B9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="objetivo" name="Ppto" fill="#003E51" radius={[4, 4, 0, 0]} opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  
  const isPositive = value >= 0;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
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
      <div className="flex items-baseline gap-2">
        <div className={`text-2xl font-black font-mono ${colorClass}`}>{formattedValue}</div>
        {type === 'percentage' && (
          <div className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp size={10} className="inline mr-0.5"/> : <TrendingDown size={10} className="inline mr-0.5"/>}
          </div>
        )}
      </div>
    </div>
  );
};

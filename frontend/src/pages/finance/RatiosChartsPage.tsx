import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalanceData, getIncomeStatementData, getBudgetsData, groupDataByYear } from '../../api/finance';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Legend 
} from 'recharts';
import { BarChart3, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { InfoPopover } from '../../components/ui/InfoPopover';
import { useUIStore } from '../../store/uiStore';

interface FinancialData {
  year: number;
  [key: string]: any;
}

// Helper to detect dark mode
const isSystemDark = () => document.documentElement.classList.contains('dark');

export const RatiosChartsPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const { data: balanceRows, isLoading: bLoading } = useQuery({ queryKey: ['balanceData'], queryFn: getBalanceData });
  const { data: incomeRows, isLoading: iLoading } = useQuery({ queryKey: ['incomeData'], queryFn: getIncomeStatementData });
  const { data: budgetRows, isLoading: budLoading } = useQuery({ queryKey: ['budgetData'], queryFn: getBudgetsData });
  
  const isDark = isSystemDark();

  React.useEffect(() => {
    setPageInfo({
      title: 'Evolución de Ratios Clave',
      subtitle: 'Tendencias históricas de Rentabilidad, Solvencia y Márgenes Operativos',
      icon: <BarChart3 size={20} />,
      infoProps: {
        title: 'Evolución de Ratios',
        description: 'Gráficas históricas de los ratios más críticos para analizar tendencias a medio/largo plazo en rentabilidad, eficiencia operativa y solvencia patrimonial.',
        objective: 'Visualizar la trayectoria financiera de la empresa para la toma de decisiones estratégicas basadas en tendencias.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  const data = useMemo(() => {
    if (!balanceRows || !incomeRows) return [];
    
    const balances = groupDataByYear(balanceRows, true, budgetRows, incomeRows) as FinancialData[];
    const incomes = groupDataByYear(incomeRows, false, budgetRows) as FinancialData[];
    
    const allYears = Array.from(new Set([...balances.map(b => b.year), ...incomes.map(i => i.year)])).sort((a,b) => a-b);
    
    return allYears.map(year => {
      const b = balances.find(d => d.year === year) || { year };
      const i = incomes.find(d => d.year === year) || { year };
      
      const annualSales = Math.abs(i['A.1'] || i['A.1_REAL'] || 1);
      const annualPurchases = Math.abs(i['A.4'] || i['A.4_REAL'] || 1);
      
      const rotacion = annualSales / Math.abs(b['1.TOT'] || 1);
      const dso = (Math.abs(b['1.B.III'] || 0) / annualSales) * 365;
      const dpo = (Math.abs(b['2.C.V.1'] || 0) / annualPurchases) * 365;
      const pmm = dso + 30;

      // Calculations for charts
      return {
        year,
        isEstimate: (b as any).isEstimate || (i as any).isEstimate,
        // Rentabilidad
        roe: (i['A.5.TOT'] / (b['2.A'] || 1)) * 100,
        roa: (i['A.1.TOT'] / (b['1.TOT'] || 1)) * 100,
        // Márgenes
        margenNeto: (i['A.5.TOT'] / (i['A.1'] || 1)) * 100,
        margenEbit: (i['A.1.TOT'] / (i['A.1'] || 1)) * 100,
        // Liquidez
        liquidez: b['1.B'] / (b['2.C'] || 1),
        pruebaAcida: (b['1.B'] - b['1.B.II']) / (b['2.C'] || 1),
        // Actividad
        rotacion,
        dso,
        dpo,
        pmm,
        // Solvencia
        endeudamiento: (b['2.B'] + b['2.C']) / (b['2.A'] || 1),
        solvencia: b['1.TOT'] / ((b['2.B'] + b['2.C']) || 1)
      };
    });
  }, [balanceRows, incomeRows, budgetRows]);

  if (bLoading || iLoading || budLoading) return <div className="p-8 text-center text-gray-500">Generando gráficos financieros...</div>;

  const tooltipStyles = {
    contentStyle: { 
      backgroundColor: isDark ? '#1e293b' : '#ffffff', 
      borderRadius: '12px', 
      border: 'none', 
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      fontSize: '12px'
    },
    itemStyle: { color: isDark ? '#f1f5f9' : '#1e293b' },
    labelStyle: { color: isDark ? '#00B0B9' : '#003E51', fontWeight: 'bold', marginBottom: '4px' },
    cursor: { stroke: isDark ? '#475569' : '#e2e8f0', strokeWidth: 2 }
  };

  const axisStyles = {
    tick: { fill: isDark ? '#CBD5E1' : '#94A3B8', fontSize: 12 },
    gridStroke: isDark ? '#475569' : '#E2E8F0'
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      {/* Header Info Banner */}
      <div className="bg-dts-primary/5 dark:bg-white/5 px-4 py-2 rounded-lg border border-dts-primary/10 dark:border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
        Periodo: {data.length > 0 ? `${Math.min(...data.map(d => d.year))} — ${Math.max(...data.map(d => d.year))}` : '---'}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Rentabilidad (ROE vs ROA) */}
        <ChartCard 
          title="RENTABILIDAD" 
          subtitle="Comparativa ROE vs ROA (%)"
          icon={<TrendingUp className="w-5 h-5 text-dts-secondary" />}
          infoDesc="Mide la rentabilidad generada tanto por los activos totales (ROA) como por el capital propio de los socios (ROE)."
          infoFormulas={["ROE = Res. Ejercicio / Patrimonio Neto", "ROA = EBIT / Activo Total"]}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRoe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B0B9" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#00B0B9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisStyles.gridStroke} opacity={isDark ? 0.3 : 0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisStyles.tick} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={axisStyles.tick} unit="%" />
              <Tooltip 
                {...tooltipStyles}
                formatter={(val: any, name: any) => [parseFloat(val).toFixed(2) + '%', name]}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area name="ROE (Fina.)" type="monotone" dataKey="roe" stroke="#00B0B9" strokeWidth={3} fillOpacity={1} fill="url(#colorRoe)" />
              <Area name="ROA (Econ.)" type="monotone" dataKey="roa" stroke={isDark ? '#7DD3FC' : '#003E51'} strokeWidth={3} fillOpacity={isDark ? 0.1 : 0.05} fill={isDark ? '#7DD3FC' : '#003E51'} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Márgenes */}
        <ChartCard 
          title="EFICIENCIA OPERATIVA" 
          subtitle="Margen Neto vs Margen de Explotación (%)"
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          infoDesc="Analiza cuánto beneficio real retiene la empresa en relación a lo que factura, tanto a nivel operativo (EBIT) como de beneficio final neto."
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisStyles.gridStroke} opacity={isDark ? 0.3 : 0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisStyles.tick} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={axisStyles.tick} unit="%" />
              <Tooltip {...tooltipStyles} formatter={(val: any, name: any) => [parseFloat(val).toFixed(2) + '%', name]} />
              <Legend verticalAlign="top" height={36}/>
              <Line name="Margen Neto" type="monotone" dataKey="margenNeto" stroke="#F43F5E" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} />
              <Line name="Margen EBIT" type="monotone" dataKey="margenEbit" stroke="#10B981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Liquidez */}
        <ChartCard 
          title="RATIOS DE TESORERÍA" 
          subtitle="Evolución de la Liquidez y Prueba Ácida"
          icon={<BarChart3 className="w-5 h-5 text-indigo-500" />}
          infoDesc="Muestra la capacidad de la empresa para hacer frente a sus pagos a corto plazo con los activos circulantes y sin depender totalmente de las existencias (Prueba Ácida)."
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisStyles.gridStroke} opacity={isDark ? 0.3 : 0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisStyles.tick} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={axisStyles.tick} />
              <Tooltip {...tooltipStyles} formatter={(val: any, name: any) => [parseFloat(val).toFixed(2), name]} />
              <Legend verticalAlign="top" height={36}/>
              <Line name="Liquidez Corriente" type="stepAfter" dataKey="liquidez" stroke="#8B5CF6" strokeWidth={3} />
              <Line name="Prueba Ácida" type="stepAfter" dataKey="pruebaAcida" stroke={isDark ? '#94A3B8' : '#4B5563'} strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Solvencia */}
        <ChartCard 
          title="SOLVENCIA E INDEPENDENCIA" 
          subtitle="Ratio de Garantía Patrimonial"
          icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
          infoDesc="Visualiza la estructura financiera global. El Ratio de Solvencia superior a 1 garantiza que hay activos suficientes para pagar todas las deudas, mientras que el nivel de endeudamiento debe equilibrarse con la rentabilidad."
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={axisStyles.gridStroke} opacity={isDark ? 0.3 : 0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisStyles.tick} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={axisStyles.tick} />
              <Tooltip {...tooltipStyles} formatter={(val: any, name: any) => [parseFloat(val).toFixed(2), name]} />
              <Legend verticalAlign="top" height={36}/>
              <Area name="Ratio Solvencia" type="basis" dataKey="solvencia" stroke="#FB923C" fill="#FB923C" fillOpacity={0.1} strokeWidth={3} />
              <Area name="Ratio Endeudamiento" type="basis" dataKey="endeudamiento" stroke="#6366F1" fill="#6366F1" fillOpacity={0.05} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

// UI Component for Chart Container
const ChartCard = ({ title, subtitle, icon, infoDesc, infoFormulas, children }: any) => (
  <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-3 mb-6 justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
            {title}
          </h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      {infoDesc && (
        <InfoPopover title={title} description={infoDesc} formulas={infoFormulas} />
      )}
    </div>
    <div className="flex-1 min-h-[300px]">
      {children}
    </div>
  </div>
);

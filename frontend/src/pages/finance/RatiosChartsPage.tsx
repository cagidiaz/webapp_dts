import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalanceData, getIncomeStatementData, groupDataByYear } from '../../api/finance';
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

interface FinancialData {
  year: number;
  [key: string]: any;
}

export const RatiosChartsPage: React.FC = () => {
  const { data: balanceRows, isLoading: bLoading } = useQuery({ queryKey: ['balanceData'], queryFn: getBalanceData });
  const { data: incomeRows, isLoading: iLoading } = useQuery({ queryKey: ['incomeData'], queryFn: getIncomeStatementData });

  const data = useMemo(() => {
    if (!balanceRows || !incomeRows) return [];
    
    const balances = groupDataByYear(balanceRows) as FinancialData[];
    const incomes = groupDataByYear(incomeRows) as FinancialData[];
    
    const allYears = Array.from(new Set([...balances.map(b => b.year), ...incomes.map(i => i.year)])).sort((a,b) => a-b);
    
    return allYears.map(year => {
      const b = balances.find(d => d.year === year) || { year };
      const i = incomes.find(d => d.year === year) || { year };
      
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
        // Solvencia
        endeudamiento: (b['2.B'] + b['2.C']) / (b['2.A'] || 1),
        solvencia: b['1.TOT'] / ((b['2.B'] + b['2.C']) || 1)
      };
    });
  }, [balanceRows, incomeRows]);

  if (bLoading || iLoading) return <div className="p-8">Generando gráficos financieros...</div>;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">EVOLUCIÓN DE RATIOS CLAVE ({Math.min(...data.map(d => d.year))}-{Math.max(...data.map(d => d.year))})</h1>
        <p className="text-sm text-gray-500 italic">Tendencias históricas de Rentabilidad, Solvencia y Márgenes Operativos</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Rentabilidad (ROE vs ROA) */}
        <ChartCard 
          title="RENTABILIDAD COMPARTIDA" 
          subtitle="Comparativa ROE vs ROA (%)"
          icon={<TrendingUp className="w-5 h-5 text-dts-secondary" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRoe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B0B9" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#00B0B9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} unit="%" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: any) => [parseFloat(val).toFixed(2) + '%', '']}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area name="ROE (Fina.)" type="monotone" dataKey="roe" stroke="#00B0B9" strokeWidth={3} fillOpacity={1} fill="url(#colorRoe)" />
              <Area name="ROA (Econ.)" type="monotone" dataKey="roa" stroke="#003E51" strokeWidth={3} fillOpacity={0.05} fill="#003E51" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Márgenes */}
        <ChartCard 
          title="EFICIENCIA OPERATIVA" 
          subtitle="Margen Neto vs Margen de Explotación (%)"
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} unit="%" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" height={36}/>
              <Line name="Liquidez Corriente" type="stepAfter" dataKey="liquidez" stroke="#8B5CF6" strokeWidth={3} />
              <Line name="Prueba Ácida" type="stepAfter" dataKey="pruebaAcida" stroke="#4B5563" strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Solvencia */}
        <ChartCard 
          title="SOLVENCIA E INDEPENDENCIA" 
          subtitle="Ratio de Garantía Patrimonial"
          icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} tickFormatter={(val) => data.find(d => d.year === val)?.isEstimate ? `${val} (Est.)` : val} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
const ChartCard = ({ title, subtitle, icon, children }: any) => (
  <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
    <div className="flex-1 min-h-[300px]">
      {children}
    </div>
  </div>
);

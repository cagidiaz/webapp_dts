import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getBalanceData, 
  getIncomeStatementData, 
  getBudgetsData,
  groupDataByYear,
  groupBudgetsByYear
} from '../../api/finance';
import { formatCurrency, formatPercent } from '../../api/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { 
  Calculator, 
  Info, 
  Layers
} from 'lucide-react';

interface FinancialData {
  year: number;
  [key: string]: any;
}

export const SimulationsPage: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: balanceRows, isLoading: isBLoading } = useQuery({ queryKey: ['balanceData'], queryFn: getBalanceData });
  const { data: incomeRows, isLoading: isILoading } = useQuery({ queryKey: ['incomeData'], queryFn: getIncomeStatementData });
  const { data: budgetRows, isLoading: isBudLoading } = useQuery({ queryKey: ['budgetData'], queryFn: getBudgetsData });

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulation State
  const [salesGrowth, setSalesGrowth] = useState(10); // +10%
  const [costVariation, setCostVariation] = useState(-5);  // Default: reduction of 5%
  const [baselineMode, setBaselineMode] = useState<'historical' | 'budget'>('budget');
  const PURCHASE_RATIO_2026 = 0.6744;

  // Link costs to sales for Budget 2026
  React.useEffect(() => {
    if (baselineMode === 'budget') {
      const autoCost = Math.round(salesGrowth * PURCHASE_RATIO_2026);
      setCostVariation(autoCost);
    }
  }, [salesGrowth, baselineMode]);

  // Base year for simulation (projection based on previous year)
  const currentYear = new Date().getFullYear();
  const selectedYear = currentYear - 1; // For historical base

  const baseData = useMemo(() => {
    if (!balanceRows || !incomeRows) return null;
    const balances = groupDataByYear(balanceRows, true) as FinancialData[];
    const incomes = groupDataByYear(incomeRows, false) as FinancialData[];
    
    const b = balances.find(d => d.year === selectedYear) || { year: selectedYear };
    const i = incomes.find(d => d.year === selectedYear) || { year: selectedYear };
    
    return { ...b, ...i } as FinancialData;
  }, [balanceRows, incomeRows, selectedYear]);

  // Fetch current year's budget
  const budgetData = useMemo(() => {
    if (!budgetRows) return null;
    const grouped = groupBudgetsByYear(budgetRows);
    return grouped.find((d: any) => d.year === currentYear);
  }, [budgetRows, currentYear]);

  // Totals Calculation (Annual)
  const totals = useMemo(() => {
    const dataSource: any = baselineMode === 'historical' ? baseData : budgetData;
    
    // Debug log to confirm if data arrives at the simulation engine
    if (dataSource) {
      console.log(`Simulating with ${baselineMode}:`, { 
        A1: dataSource['A.1'], 
        A4: dataSource['A.4'], 
        A6: dataSource['A.6'], 
        A7: dataSource['A.7'] 
      });
    }

    if (!dataSource) return null;

    const salesMod = 1 + (salesGrowth / 100);
    const costMod = 1 + (costVariation / 100);

    const annualBaseSales = (baselineMode === 'budget' && !dataSource['A.1'])
      ? (baseData?.['A.1'] || 0)
      : (dataSource['A.1'] || 0);

    const annualBaseCosts = 
      Math.abs(dataSource['A.4'] || 0) + 
      Math.abs(dataSource['A.7'] || 0) + 
      Math.abs(dataSource['A.8'] || 0) + 
      Math.abs(dataSource['A.13'] || 0);
      
    const annualBasePersonnel = Math.abs(dataSource['A.6'] || 0);
    
    // Use manual calculation for historical EBITDA too, to match the budget methodology
    const baseEbitda = annualBaseSales - annualBaseCosts - annualBasePersonnel;

    const projectedSales = annualBaseSales * salesMod;
    const projectedCosts = annualBaseCosts * costMod;
    const projectedEbitda = projectedSales - projectedCosts - annualBasePersonnel;
    
    return {
      baseName: baselineMode === 'historical' ? `Real ${selectedYear}` : `Presupuesto ${currentYear}`,
      sales: projectedSales,
      baseSales: annualBaseSales,
      costs: projectedCosts,
      baseCosts: annualBaseCosts,
      basePersonnel: annualBasePersonnel,
      ebitda: projectedEbitda,
      realEbitda: baseEbitda,
      margin: (projectedEbitda / (projectedSales || 1)) * 100,
      improvement: ((projectedEbitda / (baseEbitda || 1)) - 1) * 100
    };
  }, [baseData, budgetData, baselineMode, salesGrowth, costVariation, currentYear, selectedYear]);

  const isLoading = (isBLoading || isILoading || isBudLoading || !isMounted);
  if (isLoading) return <div className="p-8">Cargando simulador...</div>;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="text-dts-secondary" size={24} />
          <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Motor de Simulación</h1>
        </div>
        <p className="text-sm text-gray-500 font-medium">Modelado dinámico de escenarios financieros para {currentYear}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-medium mb-8 flex items-center gap-2 text-dts-primary dark:text-white">
              <Layers className="text-dts-secondary" size={20} />
              Ajustes
            </h3>
            <div className="space-y-10">
              <div>
                <div className="flex justify-between mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                  <label>Crecimiento Ventas</label>
                  <span className={salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>{salesGrowth > 0 ? '+' : ''}{salesGrowth}%</span>
                </div>
                <input type="range" min="-50" max="100" value={salesGrowth} onChange={(e) => setSalesGrowth(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-dts-secondary" />
                <div className="flex justify-between mt-2 px-1 text-xs font-mono text-gray-500">
                   <span className="font-medium">Ventas Sim.:</span>
                   <span className="text-dts-primary dark:text-dts-secondary text-sm">{formatCurrency(totals?.sales || 0)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                  <label>Variación de Costes</label>
                  <span className={costVariation > 0 ? 'text-red-500' : 'text-green-600'}>
                    {costVariation > 0 ? '+' : ''}{costVariation}%
                    {baselineMode === 'budget' && (
                      <span className="ml-2 text-[10px] bg-dts-secondary/10 px-1.5 py-0.5 rounded text-dts-secondary border border-dts-secondary/20">
                        LINKED (67.4%)
                      </span>
                    )}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={costVariation} 
                  onChange={(e) => setCostVariation(parseInt(e.target.value))} 
                  disabled={baselineMode === 'budget'}
                  className={`w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-not-allowed accent-dts-primary-light ${baselineMode === 'budget' ? 'opacity-50' : 'cursor-pointer'}`} 
                />
                <div className="flex justify-between mt-2 px-1 text-xs font-mono text-gray-500">
                   <span className="font-medium">Gastos Sim.:</span>
                   <span className={`${costVariation > 0 ? 'text-red-400' : 'text-green-500'} text-sm`}>
                     {formatCurrency((totals?.costs || 0) + (totals?.basePersonnel || 0))}
                   </span>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-50 dark:border-gray-800 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Usar escenario base:</label>
                  <select 
                    value={baselineMode}
                    onChange={(e) => setBaselineMode(e.target.value as 'historical' | 'budget')}
                    className="w-full bg-gray-50 dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-dts-secondary focus:border-dts-secondary block p-2.5 outline-none"
                  >
                    <option value="historical">Historicos Cierre {selectedYear}</option>
                    <option value="budget">Presupuesto {currentYear}</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 flex gap-2"><Info size={14} className="shrink-0 text-dts-secondary" /> Modela tus variaciones en base al objetivo seleccionado.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
             <h3 className="text-lg font-medium mb-8 text-dts-primary dark:text-white">Comparativa Anual Proyectada</h3>
             <div style={{ height: 400, width: '100%' }}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={[
                    { name: 'Ventas', [totals?.baseName || 'Base']: totals?.baseSales || 0, 'Simulado': totals?.sales || 0 },
                    { name: 'EBITDA', [totals?.baseName || 'Base']: totals?.realEbitda || 0, 'Simulado': totals?.ebitda || 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={false} 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#1e293b',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                      labelStyle={{ marginBottom: '8px', fontWeight: 600, color: '#f8fafc' }}
                      formatter={(value: any) => formatCurrency(value as number)}
                    />
                    <Legend />
                    <Bar dataKey={totals?.baseName || 'Base'} fill="#64748b" radius={[4, 4, 0, 0]} barSize={50} />
                    <Bar dataKey="Simulado" fill="#00B0B9" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dts-primary-dark p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
               <span className="text-xs uppercase tracking-widest text-dts-secondary-light font-medium">EBITDA Proyectado</span>
               <div className="text-3xl font-light mt-2">{formatCurrency(totals?.ebitda)}</div>
               <div className="text-sm mt-2 text-green-400 font-medium">+{formatPercent((totals?.improvement || 0) / 100)} vs Real</div>
            </div>
            <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg">
               <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Margen Bruto</span>
               <div className="text-3xl font-light text-dts-primary dark:text-white">{formatPercent((totals?.margin || 0) / 100)}</div>
            </div>
            <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg font-medium text-green-600">
               <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Tesorería (Est.)</span>
               <div className="text-3xl font-light mt-2">+{formatCurrency((totals?.ebitda||0) * 0.85)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

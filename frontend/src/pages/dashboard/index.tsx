import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIncomeStatementData, getBudgetsData, groupDataByYear, groupBudgetsByYear } from '../../api/finance';
import { formatCurrency, formatPercent } from '../../api/formatters';
import { TrendingUp, TrendingDown, Target, BarChart2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data: incomeRows, isLoading: iLoading } = useQuery({ queryKey: ['incomeData'], queryFn: getIncomeStatementData });
  const { data: budgetRows, isLoading: bLoading } = useQuery({ queryKey: ['budgetData'], queryFn: getBudgetsData });

  const currentYear = new Date().getFullYear();

  const metrics = useMemo(() => {
    if (!incomeRows || !budgetRows) return null;

    const incomes = groupDataByYear(incomeRows);
    const budgets = groupBudgetsByYear(budgetRows);

    const currentIncome = incomes.find(d => d.year === currentYear) as any || {};
    const currentBudget = budgets.find(d => d.year === currentYear) as any || {};

    const realSales = currentIncome['A.1'] || 0;
    const budgetSales = currentBudget['A.1'] || 0;
    const salesDeviation = budgetSales > 0 ? ((realSales / budgetSales) - 1) * 100 : 0;

    const realEbitda = currentIncome['A.1.TOT'] || 0;
    const budgetEbitda = (currentBudget['A.1'] || 0) 
                       - Math.abs((currentBudget['A.4'] || 0) + (currentBudget['A.7'] || 0)) 
                       - Math.abs(currentBudget['A.6'] || 0);
    const ebitdaDeviation = budgetEbitda !== 0 ? ((realEbitda / budgetEbitda) - 1) * 100 : 0;

    // Calculate raw (non-extrapolated) YTD sales for attainment metric
    const rawYtdSales = incomeRows
      .filter((row: any) => row.year === currentYear && row.account_id === 'A.1')
      .reduce((sum: number, row: any) => sum + row.amount, 0);

    const salesAttainment = budgetSales > 0 ? (rawYtdSales / budgetSales) * 100 : 0;

    return {
      realSales, budgetSales, salesDeviation,
      realEbitda, budgetEbitda, ebitdaDeviation,
      rawYtdSales, salesAttainment
    };
  }, [incomeRows, budgetRows, currentYear]);

  if (iLoading || bLoading) return <div className="p-8">Cargando métricas...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-surface-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Dashboard Contable</h1>
          <p className="text-sm text-gray-500">Monitorización de cumplimiento presupuestario {currentYear} (YTD Est.)</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
           <div className="flex justify-between items-start mb-4">
             <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Ventas Cierre Est.</p>
             <div className={`p-2 rounded-lg ${metrics && metrics.salesDeviation >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
               {metrics && metrics.salesDeviation >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
             </div>
           </div>
           <h3 className="text-3xl font-light text-dts-primary dark:text-white">{formatCurrency(metrics?.realSales || 0)}</h3>
           <div className="mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-3">
              <span className="text-xs text-gray-400 flex items-center gap-1"><Target size={12}/> Ppto: {formatCurrency(metrics?.budgetSales || 0)}</span>
              <span className={`text-xs font-medium ${metrics && metrics.salesDeviation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics && metrics.salesDeviation > 0 ? '+' : ''}{metrics?.salesDeviation.toFixed(1)}%
              </span>
           </div>
        </div>

        {/* EBITDA Card */}
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
           <div className="flex justify-between items-start mb-4">
             <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">EBITDA Cierre Est.</p>
             <div className={`p-2 rounded-lg ${metrics && metrics.ebitdaDeviation >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
               {metrics && metrics.ebitdaDeviation >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
             </div>
           </div>
           <h3 className="text-3xl font-light text-dts-primary dark:text-white">{formatCurrency(metrics?.realEbitda || 0)}</h3>
           <div className="mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-3">
              <span className="text-xs text-gray-400 flex items-center gap-1"><Target size={12}/> Ppto: {formatCurrency(metrics?.budgetEbitda || 0)}</span>
              <span className={`text-xs font-medium ${metrics && metrics.ebitdaDeviation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics && metrics.ebitdaDeviation > 0 ? '+' : ''}{metrics?.ebitdaDeviation.toFixed(1)}%
              </span>
           </div>
        </div>

        {/* Attainment Card */}
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
           <div className="flex justify-between items-start mb-4">
             <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Consecución Ventas</p>
             <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
               <BarChart2 size={16} />
             </div>
           </div>
           <h3 className="text-3xl font-light text-dts-primary dark:text-white">{formatPercent((metrics?.salesAttainment || 0) / 100)}</h3>
           <div className="mt-4 border-t border-gray-50 dark:border-gray-800 pt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-medium">
                 <span>REAL YTD: {formatCurrency(metrics?.rawYtdSales || 0)}</span>
                 <span>Ppto Anual</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                 <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(metrics?.salesAttainment || 0, 100)}%` }}></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

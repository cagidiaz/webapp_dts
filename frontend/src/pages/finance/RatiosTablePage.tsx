import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalanceData, getIncomeStatementData, getBudgetsData, groupDataByYear } from '../../api/finance';
import { formatCurrency, formatNumber, formatPercent } from '../../api/formatters';
import { InfoPopover } from '../../components/ui/InfoPopover';

export const RatiosTablePage: React.FC = () => {
  const { data: balanceRows, isLoading: bLoading } = useQuery({ queryKey: ['balanceData'], queryFn: getBalanceData });
  const { data: incomeRows, isLoading: iLoading } = useQuery({ queryKey: ['incomeData'], queryFn: getIncomeStatementData });
  const { data: budgetRows, isLoading: budLoading } = useQuery({ queryKey: ['budgetData'], queryFn: getBudgetsData });

  if (bLoading || iLoading || budLoading) return <div className="p-8">Calculando ratios...</div>;

  const balances = groupDataByYear(balanceRows || [], true, budgetRows, incomeRows);
  const incomes = groupDataByYear(incomeRows || [], false, budgetRows);

  const years = Array.from(new Set([...balances.map(b => b.year), ...incomes.map(i => i.year)])).sort((a, b) => b - a);

  // Combine data by year
  const combined = years.map(year => {
    const b = balances.find(d => d.year === year) || {};
    const i = incomes.find(d => d.year === year) || {};
    return { year, ...b, ...i };
  });

  const getRatio = (year: number, formula: (d: any) => number) => {
    const d = combined.find(c => c.year === year);
    if (!d) return 0;
    return formula(d);
  };

  const categories = [
    {
      name: 'LIQUIDEZ',
      ratios: [
        { label: 'Liquidez Corriente', hint: 'Indica la solvencia a corto plazo.', formulaStr: 'Activo Corriente / Pasivo Corriente', formula: (d: any) => d['1.B'] / d['2.C'], type: 'decimal' },
        { label: 'Prueba Ácida (Acid Test)', hint: 'Mide la liquidez sin contar existencias.', formulaStr: '(Act. Corr - Existencias) / Pas. Corr', formula: (d: any) => (d['1.B'] - d['1.B.II']) / d['2.C'], type: 'decimal' },
        { label: 'Disponibilidad Inmediata', hint: 'Efectivo disponible frente a deudas CP.', formulaStr: 'Efectivo / Pasivo Corriente', formula: (d: any) => d['1.B.VII'] / d['2.C'], type: 'decimal' },
        { label: 'Fondo de Maniobra', hint: 'Margen de seguridad financiera.', formulaStr: 'Activo Corr - Pasivo Corr', formula: (d: any) => d['1.B'] - d['2.C'], type: 'currency' },
      ]
    },
    {
      name: 'SOLVENCIA',
      ratios: [
        { label: 'Solvencia (Garantía)', hint: 'Garantía frente a terceros.', formulaStr: 'Total Activo / Total Deudas', formula: (d: any) => d['1.TOT'] / (d['2.B'] + d['2.C']), type: 'decimal' },
        { label: 'Calidad de la Deuda', hint: 'Peso de la deuda a corto plazo.', formulaStr: 'P. Corriente / Pasivo Total', formula: (d: any) => d['2.C'] / (d['2.B'] + d['2.C']), type: 'percent' },
        { label: 'Cobertura de Intereses', hint: 'Capacidad de pago de gastos financieros.', formulaStr: 'EBIT / Gastos Financieros', formula: (d: any) => d['A.1.TOT'] / Math.abs(d['A.13'] || 1), type: 'decimal' },
      ]
    },
    {
      name: 'ENDEUDAMIENTO y autonomía',
      ratios: [
        { label: 'Endeudamiento', hint: 'Proporción de deuda frente a capital propio. Ideal: < 1', formulaStr: 'Total Deudas / Patrimonio Neto', formula: (d: any) => (d['2.B'] + d['2.C']) / d['2.A'], type: 'decimal' },
        { label: 'Endeudamiento Corto Plazo', hint: 'Exigibilidad inmediata frente a fondos propios.', formulaStr: 'Deudas CP / Patrimonio Neto', formula: (d: any) => d['2.C'] / d['2.A'], type: 'decimal' },
        { label: 'Autonomía', hint: 'Grado de independencia de financiación externa.', formulaStr: 'Patrimonio Neto / Total Deudas', formula: (d: any) => d['2.A'] / (d['2.B'] + d['2.C']), type: 'decimal' },
      ]
    },
    {
      name: 'GESTIÓN Y ACTIVIDAD',
      ratios: [
        { label: 'Rotación de Activo', hint: 'Eficiencia en el uso de activos.', formulaStr: 'Ventas / Activo Total', formula: (d: any) => Math.abs(d['A.1'] || d['A.1_REAL'] || 1) / Math.abs(d['1.TOT'] || 1), type: 'decimal' },
        { label: 'Días de Cobro (DSO)', hint: 'Tiempo medio de cobro a clientes.', formulaStr: '(Clientes / Ventas) * 365', formula: (d: any) => (Math.abs(d['1.B.III'] || 0) / Math.abs(d['A.1'] || d['A.1_REAL'] || 1)) * 365, type: 'days' },
        { label: 'Días de Pago (DPO)', hint: 'Tiempo medio de pago a proveedores.', formulaStr: '(Prov / Compras) * 365', formula: (d: any) => (Math.abs(d['2.C.V.1'] || 0) / Math.abs(d['A.4'] || d['A.4_REAL'] || 1)) * 365, type: 'days' },
        { label: 'Periodo Medio Maduración', hint: 'Ciclo completo de explotación.', formulaStr: 'Ciclo de explotación (Aprox)', formula: (d: any) => ((Math.abs(d['1.B.III'] || 0) / Math.abs(d['A.1'] || d['A.1_REAL'] || 1)) * 365) + 30, type: 'days' },
      ]
    },
    {
      name: 'RENTABILIDAD',
      ratios: [
        { label: 'ROE (Rent. Financiera)', hint: 'Beneficio generado por el capital propio.', formulaStr: 'Res. Ejercicio / Patr. Neto', formula: (d: any) => d['A.5.TOT'] / d['2.A'], type: 'percent' },
        { label: 'ROA (Rent. Económica)', hint: 'Rentabilidad de los activos totales.', formulaStr: 'EBIT / Activo Total', formula: (d: any) => d['A.1.TOT'] / d['1.TOT'], type: 'percent' },
        { label: 'Margen de Explotación', hint: 'Rentabilidad del negocio principal.', formulaStr: 'Res. Explotación / Ventas', formula: (d: any) => d['A.1.TOT'] / d['A.1'], type: 'percent' },
        { label: 'Margen Neto', hint: 'Beneficio final por cada euro vendido.', formulaStr: 'Res. Ejercicio / Ventas', formula: (d: any) => d['A.5.TOT'] / d['A.1'], type: 'percent' },
        { label: 'Coste Personal s/ Ventas', hint: 'Peso de la estructura de personal.', formulaStr: 'Gtos Personal / Ventas', formula: (d: any) => Math.abs(d['A.6']) / d['A.1'], type: 'percent' },
        { label: 'EBITDA / Ventas', hint: 'Capacidad de generación de caja operativa.', formulaStr: '(EBIT + Amort) / Ventas', formula: (d: any) => (d['A.1.TOT'] + Math.abs(d['A.8'] || 0)) / d['A.1'], type: 'percent' },
        { label: 'Punto de Equilibrio Operativo (Aprox)', hint: 'Umbral de rentabilidad operativa.', formulaStr: 'Ventas mínimas sin considerar intereses', formula: (d: any) => Math.abs(d['A.6'] + d['A.7']) / (1 - (Math.abs(d['A.4']) / d['A.1'])), type: 'currency' },
        { label: 'Punto de Equilibrio Total (Aprox)', hint: 'Umbral de rentabilidad total.', formulaStr: 'Ventas mínimas para EBIT + Fin. = 0', formula: (d: any) => Math.abs(d['A.6'] + d['A.7'] + d['A.13']) / (1 - (Math.abs(d['A.4']) / d['A.1'])), type: 'currency' },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">CUADRO DE MANDO: 20 RATIOS</h1>
            <InfoPopover 
              title="Cuadro de 20 Ratios" 
              description="Análisis detallado de la salud financiera mediante ratios agrupados por actividad, rentabilidad y solvencia. En la columna de estimación (año actual), los ratios de actividad (DSO/DPO) se calculan usando ventas reales anualizadas para mantener la coherencia con el balance."
              objective="Evaluar la eficiencia, rentabilidad y capacidad de pago de dTS Instruments a lo largo del tiempo."
              source="Cálculos derivados de 'income_statements' y 'financial_balances'."
              iconSize={20}
            />
          </div>
          <p className="text-sm text-gray-500">Análisis comparativo multianual de indicadores financieros</p>
        </div>
        <div className="flex gap-2">
           <div className="px-3 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-100">Dato Real</div>
           <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">Auditoría OK</div>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-dts-primary text-white">
              <tr>
                <th className="px-6 py-4 font-medium border-r border-white/10 w-80">INDICADOR FINANCIERO</th>
                <th className="px-4 py-4 font-normal text-[10px] italic border-r border-white/10 max-w-xs">DEFINICIÓN / OBJETIVO</th>
                {years.map(y => {
                  const isEst = (combined.find((d: any) => d.year === y) as any)?.isEstimate;
                  return (
                    <th key={y} className="px-4 py-4 text-center font-medium text-lg border-r border-white/10 last:border-0">
                      {y} {isEst && <span className="text-[12px] text-white opacity-80 font-normal ml-1">(Est.)</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {categories.map((cat) => (
                <React.Fragment key={cat.name}>
                  <tr className="bg-gray-100/80 dark:bg-dts-primary-dark/50">
                    <td colSpan={2 + years.length} className="px-6 py-2.5 font-medium text-dts-primary dark:text-dts-secondary uppercase tracking-widest text-xs">
                       {cat.name}
                    </td>
                  </tr>
                  {cat.ratios.map((ratio) => (
                    <tr key={ratio.label} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-200">{ratio.label}</td>
                      <td className="px-4 py-3 max-w-xs transition-colors group-hover:bg-transparent">
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 italic mb-0.5">
                          {ratio.hint}
                        </div>
                        <div className="text-[9px] text-gray-500 dark:text-gray-400 font-mono uppercase tracking-tighter">
                          {ratio.formulaStr}
                        </div>
                      </td>
                      {years.map(y => {
                        const val = getRatio(y, ratio.formula);
                        return (
                          <td key={y} className="px-4 py-3 text-center border-l dark:border-gray-800 font-mono">
                            <RatioValue value={val} type={ratio.type} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const RatioValue = ({ value, type }: { value: number, type: string }) => {
  if (isNaN(value) || !isFinite(value)) return <span className="text-gray-300">---</span>;
  
  let formatted = '';
  let color = 'text-gray-900 dark:text-gray-100';

  if (type === 'percent') {
    formatted = formatPercent(value);
    color = value > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600';
  } else if (type === 'currency') {
    formatted = formatCurrency(value);
    color = value > 0 ? 'text-dts-secondary' : 'text-red-500';
  } else if (type === 'days') {
    formatted = formatNumber(value) + ' d';
  } else {
    formatted = formatNumber(value);
  }

  return <span className={`font-medium ${color}`}>{formatted}</span>;
};

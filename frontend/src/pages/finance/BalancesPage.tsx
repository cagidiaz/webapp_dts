import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalanceData, groupDataByYear } from '../../api/finance';
import { formatCurrency, formatNumber, formatPercent } from '../../api/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { Scale, Calendar } from 'lucide-react';
import { InfoPopover } from '../../components/ui/InfoPopover';
import { useUIStore } from '../../store/uiStore';

export const BalancesPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const { data: rawRows, isLoading, error } = useQuery({
    queryKey: ['balanceData'],
    queryFn: getBalanceData,
  });

  React.useEffect(() => {
    setIsMounted(true);
    setPageInfo({
      title: 'Análisis de Balances',
      subtitle: 'Desglose estructural y comparativa multianual de situación patrimonial',
      icon: <Scale size={20} />,
      infoProps: {
        title: 'Análisis de Balances',
        description: 'Representación estructurada del Balance de Situación de la empresa (Activo, Pasivo y Patrimonio Neto).',
        objective: 'Evaluar la solidez patrimonial y estudiar el peso vertical estadístico de cada masa patrimonial sobre el total de inversiones (Activo) y su método de financiación.',
        source: "Tabla: 'financial_balances' extraída contablemente mensualmente."
      }
    });
  }, [setPageInfo]);

  if (isLoading || !isMounted) return <div className="p-8">Cargando datos...</div>;
  if (error) return <div className="p-8 text-red-500">Error al cargar datos.</div>;

  const data = groupDataByYear(rawRows || [], true);
  const years = data.map(d => d.year).sort((a, b) => b - a);
  const minYear = years.length > 0 ? Math.min(...years) : 0;
  const maxYear = years.length > 0 ? Math.max(...years) : 0; // For the table columns (Descending)

  const getAmount = (year: number, code: string) => {
    const yearData = data.find(d => d.year === year) as any;
    return yearData ? (yearData[code] || 0) : 0;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Metrics Bar */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5 uppercase tracking-wider">
           <Calendar size={12} className="text-dts-secondary" />
           Período: {minYear} — {maxYear}
        </div>
      </div>

      {/* Tables Section */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="overflow-x-auto shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-dts-primary text-white">
              <tr>
                <th className="px-6 py-3 font-medium uppercase tracking-wider">BALANCE DE SITUACIÓN</th>
                {years.map(y => {
                  const isEst = data.find(d => d.year === y)?.isEstimate;
                  return (
                    <th key={y} className="px-4 py-3 text-right font-medium w-32">
                      {y} {isEst && <span className="text-[10px] text-dts-secondary ml-1">(Est.)</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* ACTIVO Section */}
              <tr className="bg-gray-50 dark:bg-dts-primary-dark/40 font-medium">
                <td className="px-6 py-2 text-dts-primary dark:text-dts-secondary italic">ACTIVO</td>
                {years.map(y => <td key={y} className="px-4 py-2 text-right"></td>)}
              </tr>
              <tr className="font-medium border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent">
                <td className="px-6 py-3 dark:text-white text-dts-primary font-bold">
                   TOTAL ACTIVO
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-3 text-right text-dts-primary dark:text-dts-secondary font-bold text-lg">
                    {formatNumber(getAmount(y, '1.TOT'))}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-8 py-3 text-gray-700 dark:text-gray-200">
                   <div className="font-medium">Activo FIJO (No Corriente)</div>
                   <div className="text-[10px] text-gray-400 italic font-normal">% s/ Total Activo</div>
                </td>
                {years.map(y => {
                   const amt = getAmount(y, '1.A');
                   const tot = getAmount(y, '1.TOT');
                   return (
                    <td key={y} className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">
                      <div className="font-medium">{formatNumber(amt)}</div>
                      <div className="text-[10px] text-gray-400 italic font-normal">{formatPercent(amt / tot)}</div>
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-gray-50/50 dark:bg-white/5 font-medium border-b border-gray-100 dark:border-gray-800">
                <td className="px-8 py-3 text-gray-700 dark:text-gray-200">
                   <div className="font-medium">Activo CIRCULANTE</div>
                   <div className="text-[10px] text-gray-400 italic font-normal">% s/ Total Activo</div>
                </td>
                {years.map(y => {
                   const amt = getAmount(y, '1.B');
                   const tot = getAmount(y, '1.TOT');
                   return (
                    <td key={y} className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">
                      <div className="font-medium">{formatNumber(amt)}</div>
                      <div className="text-[10px] text-gray-400 italic font-normal">{formatPercent(amt / tot)}</div>
                    </td>
                   );
                })}
              </tr>
              <tr className="border-b border-gray-50 dark:border-gray-800/50">
                <td className="px-12 py-2 text-xs text-gray-500 dark:text-gray-400">
                   <div>Existencias</div>
                   <div className="text-[9px] italic">% s/ Total</div>
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>{formatNumber(getAmount(y, '1.B.II'))}</div>
                    <div className="text-[9px] italic">{formatPercent(getAmount(y, '1.B.II') / getAmount(y, '1.TOT'))}</div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-50 dark:border-gray-800/50">
                <td className="px-12 py-2 text-xs text-gray-500 dark:text-gray-400">
                   <div>Realizable (Deudores)</div>
                   <div className="text-[9px] italic">% s/ Total</div>
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>{formatNumber(getAmount(y, '1.B.III'))}</div>
                    <div className="text-[9px] italic">{formatPercent(getAmount(y, '1.B.III') / getAmount(y, '1.TOT'))}</div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-50 dark:border-gray-800/50">
                <td className="px-12 py-2 text-xs text-gray-500 dark:text-gray-400">
                   <div>Disponible (Efectivo)</div>
                   <div className="text-[9px] italic">% s/ Total</div>
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>{formatNumber(getAmount(y, '1.B.VII'))}</div>
                    <div className="text-[9px] italic">{formatPercent(getAmount(y, '1.B.VII') / getAmount(y, '1.TOT'))}</div>
                  </td>
                ))}
              </tr>

              {/* PN Y PASIVO Section */}
              <tr className="bg-gray-50 dark:bg-dts-primary-dark/40 font-medium">
                <td className="px-6 py-2 text-dts-primary dark:text-dts-secondary italic">PATRIMONIO NETO Y PASIVO</td>
                {years.map(y => <td key={y} className="px-4 py-2 text-right"></td>)}
              </tr>
              <tr className="font-medium border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent">
                <td className="px-6 py-3 dark:text-white text-dts-primary font-bold">
                   TOTAL PN Y PASIVO
                </td>
                {years.map(y => (
                  <td key={y} className="px-4 py-3 text-right text-dts-primary dark:text-dts-secondary font-bold text-lg">
                    {formatNumber(getAmount(y, '2.TOT'))}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-8 py-3 text-gray-700 dark:text-gray-200">
                   <div className="font-medium">PATRIMONIO NETO</div>
                   <div className="text-[10px] text-gray-400 italic font-normal">% s/ Total P+PN</div>
                </td>
                {years.map(y => {
                   const amt = getAmount(y, '2.A');
                   const tot = getAmount(y, '2.TOT');
                   return (
                    <td key={y} className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">
                      <div className="font-medium">{formatNumber(amt)}</div>
                      <div className="text-[10px] text-gray-400 italic font-normal">{formatPercent(amt/tot)}</div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-8 py-3 text-gray-700 dark:text-gray-200">
                   <div className="font-medium">Pasivo LARGO PLAZO</div>
                   <div className="text-[10px] text-gray-400 italic font-normal">% s/ Total P+PN</div>
                </td>
                {years.map(y => {
                   const amt = getAmount(y, '2.B');
                   const tot = getAmount(y, '2.TOT');
                   return (
                    <td key={y} className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">
                      <div className="font-medium">{formatNumber(amt)}</div>
                      <div className="text-[10px] text-gray-400 italic font-normal">{formatPercent(amt/tot)}</div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-8 py-3 text-gray-700 dark:text-gray-200">
                   <div className="font-medium">Pasivo CORTO PLAZO</div>
                   <div className="text-[10px] text-gray-400 italic font-normal">% s/ Total P+PN</div>
                </td>
                {years.map(y => {
                   const amt = getAmount(y, '2.C');
                   const tot = getAmount(y, '2.TOT');
                   return (
                    <td key={y} className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">
                      <div className="font-medium">{formatNumber(amt)}</div>
                      <div className="text-[10px] text-gray-400 italic font-normal">{formatPercent(amt/tot)}</div>
                    </td>
                  );
                })}
              </tr>
            </tbody>

          </table>
        </div>
      </div>

      {/* NEW: Variation Table */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-700">
         <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-transparent">
            <div className="flex items-center gap-2">
               <span className="text-lg">📉</span>
               <h3 className="text-sm font-bold text-dts-primary dark:text-dts-secondary uppercase tracking-tight">Variación Anual (%)</h3>
            </div>
            <InfoPopover 
               title="Variación Interanual"
               description="Estudio de la tasa de crecimiento o decremento porcentual de cada masa patrimonial respecto al ejercicio anterior."
               objective="Identificar tendencias de crecimiento, desinversiones o incrementos significativos de deuda de un año a otro de forma rápida."
               iconSize={18}
            />
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-dts-primary text-white">
                  <tr>
                     <th className="px-6 py-3 font-medium uppercase tracking-wider">MÉTRICA / CUENTA</th>
                     {years.map(y => {
                        const isEst = data.find(d => d.year === y)?.isEstimate;
                        return (
                          <th key={y} className="px-4 py-3 text-right font-medium w-32 bg-dts-primary-dark/20">
                            {y} {isEst && <span className="text-[10px] text-white ml-1 opacity-80">(Est.)</span>}
                          </th>
                        );
                     })}
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: 'TOTAL ACTIVO', code: '1.TOT', isTotal: true },
                    { label: 'Activo FIJO', code: '1.A', isTotal: false },
                    { label: 'Activo CIRCULANTE', code: '1.B', isTotal: false },
                    { label: 'Existencias', code: '1.B.II', isTotal: false, indent: true },
                    { label: 'Realizable', code: '1.B.III', isTotal: false, indent: true },
                    { label: 'Disponible', code: '1.B.VII', isTotal: false, indent: true },
                    { label: 'TOTAL PN Y PASIVO', code: '2.TOT', isTotal: true },
                    { label: 'PATRIMONIO NETO', code: '2.A', isTotal: false },
                    { label: 'Pasivo LARGO PLAZO', code: '2.B', isTotal: false },
                    { label: 'Pasivo CORTO PLAZO', code: '2.C', isTotal: false },
                  ].map((row) => (
                    <tr key={row.label} className={row.isTotal ? 'bg-gray-50/50 dark:bg-white/5 font-bold' : 'hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'}>
                      <td className={`px-6 py-3 ${row.indent ? 'pl-12 text-xs italic text-gray-400' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                        {row.label}
                      </td>
                      {years.map(y => {
                        const current = getAmount(y, row.code);
                        const prevYear = years[years.indexOf(y) + 1]; // Next in the DESC array is previous year
                        const previous = prevYear ? getAmount(prevYear, row.code) : 0;
                        const variation = previous ? (current / previous) - 1 : null;
                        
                        return (
                          <td key={y} className="px-4 py-3 text-right font-mono font-medium">
                            {variation !== null ? (
                              <span className={variation > 0 ? 'text-green-600 dark:text-green-400' : variation < 0 ? 'text-red-500' : 'text-gray-400'}>
                                {variation > 0 ? '+' : ''}{formatPercent(variation)}
                              </span>
                            ) : (
                              <span className="text-gray-300">---</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: ACTIVO */}
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-center gap-2 mb-6 uppercase tracking-wider relative">
            <h3 className="text-lg font-medium text-gray-700 dark:text-white">ACTIVO</h3>
            <div className="absolute right-0">
              <InfoPopover 
                title="Distribución del Activo"
                description="Representación visual de la composición de la inversión (donde está el dinero). Clasifica los activos según su liquidez."
                objective="Visualizar rápidamente qué parte de la empresa está inmovilizada (Activo Fijo) frente a la que tiene capacidad de convertirse en dinero (Existencias, Clientes y Caja)."
                iconSize={18}
              />
            </div>
          </div>
          <div style={{ height: 320, width: '100%' }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={[...data].reverse()} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isSystemDark() ? '#003E51' : '#E2E8F0'} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94A3B8', fontSize: 10}} 
                  tickFormatter={(val) => val.toLocaleString('de-DE')}
                />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => Number(value).toLocaleString('de-DE') + ' €'}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="Activo FIJO" dataKey="1.A" stackId="a" fill="#003E51" />
                <Bar name="Existencias" dataKey="1.B.II" stackId="a" fill="#2D5A27" />
                <Bar name="Realizable" dataKey="1.B.III" stackId="a" fill="#4CAF50" />
                <Bar name="Disponible" dataKey="1.B.VII" stackId="a" fill="#C8E6C9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: PN y PASIVO */}
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-center gap-2 mb-6 uppercase tracking-wider relative">
            <h3 className="text-lg font-medium text-gray-700 dark:text-white">PATRIMONIO NETO y PASIVO</h3>
            <div className="absolute right-0">
              <InfoPopover 
                title="Estructura de Financiación"
                description="Muestra la proporción entre fondos propios (Patrimonio Neto) y deudas (Pasivo), clasificadas por su exigibilidad (corto o largo plazo)."
                objective="Analizar la dependencia de financiación externa y la solvencia a largo plazo de la estructura financiera global."
                iconSize={18}
              />
            </div>
          </div>
          <div style={{ height: 320, width: '100%' }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={[...data].reverse()} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isSystemDark() ? '#003E51' : '#E2E8F0'} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94A3B8', fontSize: 10}} 
                   tickFormatter={(val) => formatNumber(val, 0)}
                />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="PATRIMONIO NETO" dataKey="2.A" stackId="b" fill="#003E51" />
                <Bar name="Pasivo LARGO PLAZO" dataKey="2.B" stackId="b" fill="#FFB74D" />
                <Bar name="Pasivo CORTO PLAZO" dataKey="2.C" stackId="b" fill="#EF5350" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for dark mode colors in charts
const isSystemDark = () => document.documentElement.className === 'dark';

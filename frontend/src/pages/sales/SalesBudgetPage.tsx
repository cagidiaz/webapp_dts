import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { 
  getSalesBudgetPerformance, 
  getSalesBudgetEvolution, 
  getSalesReps,
} from '../../api';
import { getProductFamilies } from '../../api/products';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Target, DollarSign, Activity, Loader2, Filter, X,
  PieChart as PieChartIcon,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { InfoPopover } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useUIStore } from '../../store/uiStore';

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
export const SalesBudgetPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const { profile } = useAuthStore();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [subfamilyFilter, setSubfamilyFilter] = useState<string>('');
  const isSalesperson = Boolean(profile?.code);
  const [salespersonFilter, setSalespersonFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('customerName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Ventas vs Presupuestos',
      subtitle: 'Análisis y cumplimiento comercial (Seguimiento de Objetivos)',
      icon: <PieChartIcon size={20} />,
      infoProps: {
        title: 'Ventas vs Presupuestos',
        description: 'Comparativa en tiempo real de la facturación real frente a los objetivos presupuestados.',
        objective: 'Analizar el grado de cumplimiento de los objetivos comerciales y detectar desviaciones por familias o vendedores de forma proactiva.',
        source: 'Basado en facturas de venta, abonos y presupuestos cargados en el sistema.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  const { 
    data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage,
    isLoading: isLoadingPerf 
  } = useInfiniteQuery({
    queryKey: ['salesBudgetPerf', year, selectedMonths, salespersonFilter, familyFilter, subfamilyFilter, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getSalesBudgetPerformance({ 
      year, months: selectedMonths,
      salespersonCode: isSalesperson ? profile?.code : (salespersonFilter || undefined),
      familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      sortBy, sortDir, take: pageSize, skip: pageParam as number
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { tableData, performanceKPIs } = useMemo(() => {
    const allRows = infiniteData?.pages.flatMap(page => page.rows || []) || [];
    const kpis = infiniteData?.pages[0]?.kpis || { ventas: 0, objetivo: 0, desviacionEur: 0, desviacionPct: 0 };
    return { tableData: allRows, performanceKPIs: kpis };
  }, [infiniteData]);

  const selectionTotals = useMemo(() => {
    return tableData.reduce((acc: any, curr: any) => {
      if (!curr) return acc;
      return {
        facturacion: (acc.facturacion || 0) + (curr.facturacion || 0),
        objetivo: (acc.objetivo || 0) + (curr.objetivo || 0),
      };
    }, { facturacion: 0, objetivo: 0 });
  }, [tableData]);

  const { data: evolutionData } = useQuery({
    queryKey: ['salesEvol', year, familyFilter, subfamilyFilter, salespersonFilter],
    queryFn: () => getSalesBudgetEvolution({
      year, familyCode: familyFilter || undefined, subfamilyCode: subfamilyFilter || undefined,
      salespersonCode: isSalesperson ? profile?.code : (salespersonFilter || undefined)
    }),
  });

  const { data: categories = [] } = useQuery({ queryKey: ['prodCats'], queryFn: getProductFamilies });
  const { data: salespersons = [] } = useQuery({
    queryKey: ['salesReps'], queryFn: getSalesReps, enabled: !isSalesperson
  });

  const familyOptions = useMemo(() => {
    const uniqueFamilies = new Map();
    categories.forEach(c => { if (c.family_code) uniqueFamilies.set(c.family_code, c.family_name); });
    return Array.from(uniqueFamilies.entries()).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));
  }, [categories]);

  const subfamilyOptions = useMemo(() => {
    let filtered = categories;
    if (familyFilter) filtered = filtered.filter(s => s.family_code === familyFilter);
    const uniqueSubfamilies = new Map();
    filtered.forEach(c => { if (c.subfamily_code) uniqueSubfamilies.set(c.subfamily_code, c.subfamily_name); });
    return Array.from(uniqueSubfamilies.entries()).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));
  }, [categories, familyFilter]);

  const salespersonOptions = useMemo(() => salespersons.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` })), [salespersons]);

  const toggleMonth = (m: number) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>a-b));
  };

  const clearFilters = () => {
    setSelectedMonths([]); setFamilyFilter(''); setSubfamilyFilter(''); setSalespersonFilter('');
    setYear(new Date().getFullYear());
  };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  const selectionDesv = selectionTotals.facturacion - selectionTotals.objetivo;
  const selectionPct = selectionTotals.objetivo > 0 ? (selectionDesv / selectionTotals.objetivo) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Compact Secondary Header */}
      <div className="flex justify-end bg-gray-50/50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ejercicio:</label>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark text-dts-primary dark:text-white font-bold rounded-md px-3 py-1 text-sm outline-none font-mono shadow-sm"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Facturación" 
          value={performanceKPIs.ventas} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoadingPerf} 
          infoProps={{
            description: "Total de ventas reales acumuladas (Facturas - Abonos) para el periodo y filtros actuales.",
            formulas: "Sumatorio(Value Entries) donde Document Type = Invoice | Credit Memo"
          }}
        />
        <KPICard 
          title="Objetivo" 
          value={performanceKPIs.objetivo} 
          type="currency" 
          icon={Target} 
          isLoading={isLoadingPerf} 
          infoProps={{
            description: "Cifra de ventas presupuestada como objetivo para el periodo y filtros seleccionados.",
            objective: "Indica la meta comercial a alcanzar."
          }}
        />
        <KPICard 
          title="Desviación" 
          value={performanceKPIs.desviacionEur} 
          type="currency" 
          icon={DollarSign} 
          status={performanceKPIs.desviacionEur >= 0 ? 'success' : 'danger'} 
          isLoading={isLoadingPerf} 
          infoProps={{
            description: "Diferencia absoluta entre la facturación real y el objetivo.",
            formulas: "Ventas Reales - Objetivo Presupuestado"
          }}
        />
        <KPICard 
          title="Cumplimiento" 
          value={performanceKPIs.desviacionPct} 
          type="percentage" 
          icon={Activity} 
          status={performanceKPIs.desviacionPct >= 0 ? 'success' : 'danger'} 
          isLoading={isLoadingPerf} 
          infoProps={{
            description: "Tasa de cumplimiento del objetivo en porcentaje.",
            formulas: "(Ventas Reales / Objetivo) * 100"
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-surface-card-dark border border-gray-100 dark:border-gray-800 rounded-xl p-5 h-fit shadow-card space-y-6 text-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
             <div className="flex items-center gap-2">
               <Filter size={16} className="text-gray-400" />
               <span className="font-bold uppercase text-xs">FILTROS</span>
               <InfoPopover 
                  title="Filtros de Análisis" 
                  description="Permite segmentar los resultados por periodo temporal, estructura de productos o asignación comercial." 
                  iconSize={14}
               />
             </div>
             {(selectedMonths.length > 0 || familyFilter || subfamilyFilter || salespersonFilter) && <button onClick={clearFilters} className="text-dts-secondary hover:bg-dts-secondary/10 p-1 rounded transition-colors"><X size={16} /></button>}
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Meses</span>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map(m => (
                <button key={m.val} onClick={() => toggleMonth(m.val)} className={`h-8 font-bold rounded text-[10px] transition-all ${selectedMonths.includes(m.val) ? 'bg-dts-secondary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div><span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Familia</span><SearchableSelect options={familyOptions} value={familyFilter} onChange={setFamilyFilter} placeholder="Todas..." /></div>
            <div><span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subfamilia</span><SearchableSelect options={subfamilyOptions} value={subfamilyFilter} onChange={setSubfamilyFilter} placeholder="Todas..." /></div>
            {!isSalesperson && <div><span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Vendedor</span><SearchableSelect options={salespersonOptions} value={salespersonFilter} onChange={setSalespersonFilter} placeholder="Todos..." /></div>}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[500px] relative">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10" onClick={() => handleSort('customerName')}><div className="flex items-center">Cliente {getSortIcon('customerName')}</div></th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('facturacion')}><div className="flex items-center justify-end">Facturación {getSortIcon('facturacion')}</div></th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('objetivo')}><div className="flex items-center justify-end">Objetivo {getSortIcon('objetivo')}</div></th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacion')}><div className="flex items-center justify-end">Desv. {getSortIcon('desviacion')}</div></th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-center cursor-pointer group hover:bg-white/10" onClick={() => handleSort('desviacionPorcentaje')}><div className="flex items-center justify-center">% {getSortIcon('desviacionPorcentaje')}</div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {isLoadingPerf ? (
                    <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-dts-secondary" /></td></tr>
                  ) : tableData.length === 0 ? (
                    <tr><td colSpan={5} className="py-20 text-center text-gray-400">Sin datos</td></tr>
                  ) : (
                    tableData.map((row, idx) => (
                      <tr key={idx} className={`transition-colors ${row.isNew ? 'bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                        <td className="px-6 py-3 font-medium">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span>{row.customerName}</span>
                              {row.isNew && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 animate-pulse uppercase">Nuevo</span>}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">{row.customerCode}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(row.facturacion, 0)}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(row.objetivo, 0)}</td>
                        <td className={`px-6 py-3 text-right font-mono ${row.desviacion < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>{row.desviacion > 0 ? '+' : ''}{formatCurrency(row.desviacion, 0)}</td>
                        <td className={`px-6 py-3 text-center font-mono font-bold ${row.desviacionPorcentaje < 0 ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>{row.desviacionPorcentaje > 0 ? '+' : ''}{formatNumber(row.desviacionPorcentaje, 1)}%</td>
                      </tr>
                    ))
                  )}
                  <tr ref={observerTarget}><td colSpan={5} className="py-8 text-center text-gray-400 text-xs">{isFetchingNextPage ? 'Cargando más...' : hasNextPage ? 'Desplázate para cargar más' : ''}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Fixed Totals Footer - Decoupled from scroll for perfect clipping */}
            {tableData.length > 0 && (
              <div className="bg-dts-primary text-white shadow-[0_-10px_20px_rgba(0,0,0,0.15)] border-t border-white/10 z-30">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <tbody>
                    <tr className="font-bold text-xs uppercase">
                      <td className="px-6 py-4 text-[10px] tracking-widest w-[25%] lg:w-auto">TOTALES SELECCIÓN</td>
                      <td className="px-6 py-4 text-right font-mono w-[18%] lg:w-auto">{formatCurrency(selectionTotals.facturacion, 0)}</td>
                      <td className="px-6 py-4 text-right font-mono w-[18%] lg:w-auto">{formatCurrency(selectionTotals.objetivo, 0)}</td>
                      <td className={`px-6 py-4 text-right font-mono w-[18%] lg:w-auto ${selectionDesv < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{selectionDesv > 0 ? '+' : ''}{formatCurrency(selectionDesv, 0)}</td>
                      <td className={`px-6 py-4 text-center font-mono text-[11px] w-[21%] lg:w-auto ${selectionPct < 0 ? 'text-red-400 bg-red-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>{selectionPct > 0 ? '+' : ''}{formatNumber(selectionPct, 1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider">Evolución Comercial {year}</h3>
              <InfoPopover 
                title="Evolución Mensual" 
                description="Comparativa temporal de la facturación frente al presupuesto mes a mes." 
                objective="Detectar meses de estacionalidad o desviaciones recurrentes en el cumplimiento del presupuesto anual."
                iconSize={16}
              />
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(evolutionData || []).filter(d => selectedMonths.length === 0 || selectedMonths.includes(d.month))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="month" tickFormatter={(m) => MONTHS.find(x => x.val === m)?.label || m} tick={{fontSize: 10}} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{fontSize: 10}} />
                  <Tooltip content={<CustomTooltip />} cursor={false}/>
                  <Legend verticalAlign="top" content={renderCustomLegend} />
                  <Bar dataKey="ventas" name="Ventas Reales" fill="#00B0B9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="objetivo" name="Objetivo (Presupuesto)" fill="#64748B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, decimalPlaces = 0, infoProps }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, decimalPlaces) : type === 'percentage' ? `${formatNumber(value, 1)}%` : formatNumber(value, decimalPlaces);

  return (
    <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{title}</span>
          {infoProps && (
            <InfoPopover 
              title={title} 
              description={infoProps.description} 
              formulas={infoProps.formulas} 
              objective={infoProps.objective}
              iconSize={12}
              className="text-gray-300 group-hover:text-dts-secondary transition-colors"
            />
          )}
        </div>
        <Icon size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
      </div>
      <div className={`text-2xl font-black font-mono ${colorClass}`}>{formattedValue}</div>
    </div>
  );
};

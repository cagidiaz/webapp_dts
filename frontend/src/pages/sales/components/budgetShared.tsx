import React from 'react';
import { 
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, 
  Tooltip, Legend, Bar, Line 
} from 'recharts';
import { formatCurrency, formatNumber } from '../../../api/formatters';
import { InfoPopover } from '../../../components/ui/InfoPopover';

export const MONTHS = [
  { val: 1, label: 'Ene' },
  { val: 2, label: 'Feb' },
  { val: 3, label: 'Mar' },
  { val: 4, label: 'Abr' },
  { val: 5, label: 'May' },
  { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' },
  { val: 8, label: 'Ago' },
  { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' },
  { val: 11, label: 'Nov' },
  { val: 12, label: 'Dic' },
];

export const formatKpiValue = (val: number, type: 'currency' | 'percentage' | 'number', decimals: number = 0): string => {
  if (type === 'currency') return formatCurrency(val, decimals);
  if (type === 'percentage') return `${formatNumber(val, decimals)}%`;
  return formatNumber(val, decimals);
};

export interface InfoBreakdownItem {
  label: string;
  value: string;
  sign?: '+' | '-' | '=' | 'i';
  color?: string;
}

export interface KPICardProps {
  title: string;
  value: number;
  type?: 'currency' | 'percentage' | 'number';
  icon: any;
  isLoading?: boolean;
  status?: 'success' | 'danger' | 'warning';
  decimalPlaces?: number;
  infoProps?: {
    title?: string;
    description: string;
    formulas?: string;
    objective?: string;
    source?: string;
    breakdown?: InfoBreakdownItem[];
  };
  accountValue?: number;
  infoText?: string;
  subtext?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, value, type = 'number', icon: Icon, isLoading, status, 
  decimalPlaces = 0, infoProps, accountValue, infoText, subtext 
}) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse" />;
  
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = formatKpiValue(value, type, decimalPlaces);

  return (
    <div className="bg-white dark:bg-surface-card-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-card-hover group flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{title}</span>
            {infoProps && (
              <InfoPopover 
                title={infoProps.title || title} 
                description={infoProps.description} 
                formulas={infoProps.formulas} 
                objective={infoProps.objective}
                source={infoProps.source}
                breakdown={infoProps.breakdown}
                iconSize={12}
                className="text-gray-300 group-hover:text-dts-secondary transition-colors"
              />
            )}
          </div>
          <Icon size={18} className="text-gray-400 group-hover:text-dts-secondary transition-colors" />
        </div>
        <div className={`text-xl font-medium font-mono ${colorClass}`}>{formattedValue}</div>
        {subtext && (
          <div className="text-[9px] text-dts-secondary dark:text-cyan-400 font-normal leading-tight mt-0.5">
            {subtext}
          </div>
        )}
        {accountValue !== undefined && accountValue > 0 && (
          <div className="text-[10px] text-gray-400 mt-1 italic font-medium">
            ({formatCurrency(accountValue, 0)}) cuentas
          </div>
        )}
      </div>
      {infoText && (
        <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-white/5 flex items-center gap-1 text-[9px] text-gray-400 font-medium">
          <span className="w-1 h-1 rounded-full bg-dts-secondary animate-pulse" />
          <span className="truncate" title={infoText}>{infoText}</span>
        </div>
      )}
    </div>
  );
};

export const CustomTooltip = ({ active, payload, label, year }: any) => {
  if (active && payload && payload.length) {
    const monthLabel = MONTHS.find(m => m.val === label)?.label || label;
    return (
      <div className="bg-white dark:bg-[#002A38] p-3 rounded-lg border border-gray-100 dark:border-white/10 shadow-xl">
        <p className="text-xs font-bold text-dts-primary dark:text-white mb-2 uppercase border-b border-gray-100 dark:border-white/10 pb-1">
          {monthLabel} {year || new Date().getFullYear()}
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

export const RenderCustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload) return null;
  const sortedPayload = [...payload].sort((a) => a.value === 'Ventas Año en Curso' ? -1 : 1);
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

export interface BudgetEvolutionChartProps {
  year: number;
  data: Array<{ month: number; ventas: number; objetivo: number; ventasAnterior?: number }>;
  selectedMonths?: number[];
  title?: string;
}

export const BudgetEvolutionChart: React.FC<BudgetEvolutionChartProps> = ({ year, data, selectedMonths = [], title }) => {
  const filteredData = (data || []).filter(d => selectedMonths.length === 0 || selectedMonths.includes(d.month));

  return (
    <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-6 h-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider">{title || `Evolución Comercial ${year}`}</h3>
        <InfoPopover 
          title="Evolución Mensual" 
          description="Comparativa temporal de la facturación frente al presupuesto mes a mes." 
          objective="Detectar meses de estacionalidad o desviaciones recurrentes en el cumplimiento del presupuesto anual." 
          iconSize={16} 
        />
      </div>
      <div className="flex-1 w-full min-h-75">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis dataKey="month" tickFormatter={(m) => MONTHS.find(x => x.val === m)?.label || m} tick={{fontSize: 10}} />
            <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{fontSize: 10}} />
            <Tooltip content={<CustomTooltip year={year} />} cursor={false}/>
            <Legend verticalAlign="top" content={RenderCustomLegend} />
            <Bar dataKey="ventas" name="Ventas Año en Curso" fill="#00B0B9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="objetivo" name="Objetivo (Presupuesto)" fill="#64748B" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="ventasAnterior" name="Ventas Año Anterior" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={1.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

import { createPortal } from 'react-dom';
import { budgetTableControlsClass } from './budgetShared';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { formatCurrency, formatNumber } from '../../../api/formatters';
import { ExportButton } from '../../../components/ui';
import { MultiSearchableSelect } from '../../../components/ui/MultiSearchableSelect';
import { exportMultiSheetToXlsx } from '../../../utils/exportToXlsx';

interface SegmentEntry {
  segment: string;
  month: number;
  sales: number;
  previous_sales: number;
  budget: number;
}

interface SegmentResponse {
  options: { value: string; label: string }[];
  result: SegmentEntry[];
}

interface Props {
  view: 'sales' | 'product';
  year: number;
  months: number[];
  salespersonCode?: string;
  pmCode?: string;
  familyCode: string;
  subfamilyCodes: string[];
  productCode?: string;
  search: string;
  segmentCodes: string[];
  exportTarget?: HTMLDivElement | null;
  onSegmentChange: (codes: string[]) => void;
  onSearchChange: (text: string) => void;
  inputSearch: string;
}

const ratio = (sales: number, budget: number) => budget > 0 ? sales / budget : null;

export function BudgetSegmentsPanel(props: Props) {
  const { view, year, months, salespersonCode, pmCode, familyCode, subfamilyCodes,
    productCode, search, segmentCodes, onSegmentChange, onSearchChange, inputSearch } = props;
  const params = {
    view, year, months: months.join(','), salespersonCode, pmCode, familyCode,
    subfamilyCode: subfamilyCodes.join(','), productCode, search, segmentCode: segmentCodes.join(','),
  };
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['budget-segments', params],
    queryFn: async ({ signal }) => (await apiClient.get<SegmentResponse>('/sales/budget-segments', { params, signal })).data,
  });

  const segmentEntries = new Map<string, { sales: number; previous: number; budget: number }>();
  const totals = { label: 'Totales filtrados', sales: 0, previous: 0, budget: 0 };
  for (const entry of data?.result ?? []) {
    const segment = segmentEntries.get(entry.segment) ?? { sales: 0, previous: 0, budget: 0 };
    segment.sales += entry.sales;
    segment.previous += entry.previous_sales;
    segment.budget += entry.budget;
    segmentEntries.set(entry.segment, segment);


    totals.sales += entry.sales;
    totals.previous += entry.previous_sales;
    totals.budget += entry.budget;
  }
  const labels = new Map(data?.options.map(option => [option.value, option.label]));
  const positions = new Map(data?.options.map((option, index) => [option.value, index]));
  const rows = Array.from(segmentEntries, ([code, values]) => ({
    code,
    label: labels.get(code) ?? code,
    ...values,
  })).sort((a, b) => (positions.get(a.code) ?? Infinity) - (positions.get(b.code) ?? Infinity));

  const decorate = (row: typeof totals) => ({
    ...row, difference: row.sales - row.budget, compliance: ratio(row.sales, row.budget),
  });
  const columns = [
    { key: 'label', label: 'Segmento' },
    { key: 'sales', label: `Ventas ${year}` },
    { key: 'budget', label: `Presupuesto ${year}` },
    { key: 'difference', label: 'Desviación' },
    { key: 'compliance', label: 'Cumplimiento' },
    { key: 'previous', label: `Ventas ${year - 1}` },
  ].map(column => ({ ...column, numFmt: column.key === 'label' ? undefined : column.key === 'compliance' ? '0.0%' : '#,##0.00 "€"' }));

  const exportSegments = async () => {
    exportMultiSheetToXlsx([{
      sheetName: 'Por segmentos',
      rows: rows.map(decorate),
      columns,
      totalsRow: decorate(totals),
    }], `${view === 'product' ? 'presupuesto_pm' : 'ventas_presupuesto'}_segmentos_${year}`);
  };

  const cells = (row: typeof totals, isTotal = false) => {
    const { difference, compliance } = decorate(row);
    const padding = isTotal ? "px-4 py-1" : "px-4 py-3";
    return <>
      <th scope="row" className={`${padding} text-left`}>{row.label}</th>
      <td className={padding}>{formatCurrency(row.sales, 2)}</td>
      <td className={padding}>{formatCurrency(row.budget, 2)}</td>
      <td className={`${padding} ${difference < 0 ? (isTotal ? 'text-red-300' : 'text-red-600 dark:text-red-400') : ''}`}>{formatCurrency(difference, 2)}</td>
      <td className={padding}>{compliance === null ? '—' : `${formatNumber(compliance * 100, 1)} %`}</td>
      <td className={padding}>{formatCurrency(row.previous, 2)}</td>
    </>;
  };

  const exportButton = <ExportButton onExport={exportSegments} disabled={!data || search !== inputSearch.trim()} />;

  return (
    <section aria-label="Presupuesto por segmentos" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={`${budgetTableControlsClass} !justify-start`}>
        <div className="w-full max-w-xs">
          <span className="mb-1 block text-xs font-semibold">Segmento</span>
          <MultiSearchableSelect options={data?.options ?? []} value={segmentCodes} onChange={onSegmentChange} placeholder="Todos los segmentos" isFetching={isPending} />
        </div>
        <label className="w-full max-w-xs text-xs font-semibold">
          Cliente
          <input aria-label="Buscar cliente" value={inputSearch} onChange={event => onSearchChange(event.target.value)} placeholder="Nombre o código de cliente" className="block min-h-7.5 w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs dark:bg-dts-primary-dark dark:border-gray-700" />
        </label>
      </div>
      {props.exportTarget && createPortal(exportButton, props.exportTarget)}
      {isPending && <p className="p-5 text-sm" role="status">Cargando segmentos…</p>}
      {isError && <p className="p-5 text-sm" role="alert">Error al cargar los segmentos. <button type="button" className="underline" onClick={() => void refetch()}>Reintentar</button></p>}
      {data && rows.length === 0 && <p className="p-5 text-sm">No hay datos para los filtros seleccionados.</p>}
      {data && rows.length > 0 && <div className="relative min-h-0 flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-separate border-spacing-0 whitespace-nowrap text-right text-sm tabular-nums">
          <thead className="sticky top-0 z-20 bg-dts-primary text-white shadow-lg">
            <tr>{columns.map(column => <th scope="col" key={column.key} className={`px-4 py-4 text-[10px] font-bold uppercase tracking-wider ${column.key === 'label' ? 'text-left' : ''}`}>{column.label}</th>)}</tr>
          </thead>
          <tbody className="text-xs text-dts-primary dark:text-gray-300">
            {rows.map(row => <tr key={row.code} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/5 [&>*]:border-b [&>*]:border-gray-100 dark:[&>*]:border-gray-800">{cells(row)}</tr>)}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-dts-primary text-[10px] font-bold leading-tight text-white shadow-lg"><tr className="h-10">{cells(totals, true)}</tr></tfoot>
        </table>
      </div>}
    </section>
  );
}

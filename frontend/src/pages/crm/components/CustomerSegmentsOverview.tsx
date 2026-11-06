import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Download, Euro, Search, Target } from 'lucide-react';
import apiClient from '../../../api/apiClient';
import { InfoPopover } from '../../../components/ui/InfoPopover';
import { formatCurrency } from '../../../api/formatters';
import { CustomerDetailDrawer } from '../../sales/components/CustomerDetailDrawer';
import { exportToXlsx } from '../../../utils/exportToXlsx';

interface SegmentRow { client_id: string; client_name: string; salesperson_code: string | null; segment_code: string; potential_amount: string | null; billing_amount: string; product_no?:string | null; product_name?:string | null }
interface SegmentResponse { rows: SegmentRow[]; unclassified: {client_id:string; client_name:string; salesperson_code:string | null; product_no:string | null; product_name:string | null; family_code:string | null; subfamily_code:string | null; line_count:number; amount:string}[]; catalog: {value:string; label:string}[]; global:boolean }
const currency = (value: number) => formatCurrency(value, 2);
const selectClass = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark px-3 py-2 text-xs text-gray-700 dark:text-gray-200';
const familyOrder = ['dTSTemp', 'dTSFlow', 'dTSPres', 'dTSLevel', 'dTSCal', 'dTSSens'];

export function CustomerSegmentsOverview({ profileId }: {profileId?: string}) {
  const [salesperson, setSalesperson] = useState('');
  const [segment, setSegment] = useState('');
  const [family, setFamily] = useState('');
  const [state, setState] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const {data, isLoading, isError, refetch} = useQuery({ queryKey:['customer-segments-overview',profileId], queryFn:async () => (await apiClient.get<SegmentResponse>('/crm/customer-segments')).data, enabled:!!profileId });
  const labels = useMemo(() => new Map((data?.catalog || []).map(item => [item.value,item.label])),[data]);
  const sellers = useMemo(() => [...new Set([...(data?.rows || []), ...(data?.unclassified || [])].map(row => row.salesperson_code).filter((v):v is string => !!v))].sort(),[data]);
  const families = useMemo(() => [...new Set((data?.catalog || []).map(item => item.label.split(' → ')[0]))].sort(),[data]);
  const rows = useMemo(() => (data?.rows || []).filter(row => {
    const label = labels.get(row.segment_code) || row.segment_code;
    return (!salesperson || row.salesperson_code === salesperson) && (!segment || row.segment_code === segment)
      && (!family || label.split(' → ')[0] === family) && (!state || (state === 'pending' ? row.potential_amount === null : row.potential_amount !== null))
      && (!search.trim() || `${row.client_name} ${row.client_id}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  }),[data,labels,salesperson,segment,family,state,search]);
  const summary = useMemo(() => {
    const groups = new Map<string, {code:string; label:string; family:string; billing:number; potential:number; estimated:number; pending:number}>();
    for (const row of rows) {
      const label = labels.get(row.segment_code) || row.segment_code;
      const item = groups.get(row.segment_code) || {code:row.segment_code,label,family:label.split(' → ')[0],billing:0,potential:0,estimated:0,pending:0};
      item.billing += Number(row.billing_amount || 0);
      if (row.potential_amount === null) item.pending++; else { item.estimated++; item.potential += Number(row.potential_amount); }
      groups.set(row.segment_code,item);
    }
    return [...groups.values()].sort((x,y)=>x.label.localeCompare(y.label));
  },[rows,labels]);
  const familySummary = useMemo(() => {
    const groups = new Map<string, typeof summary>();
    for (const item of summary) groups.set(item.family, [...(groups.get(item.family) || []), item]);
    return [...groups.entries()].sort(([a], [b]) => {
      const aIndex = familyOrder.indexOf(a);
      const bIndex = familyOrder.indexOf(b);
      return (aIndex < 0 ? familyOrder.length : aIndex) - (bIndex < 0 ? familyOrder.length : bIndex) || a.localeCompare(b);
    });
  },[summary]);
  const chooseSegment = (code:string) => {setSegment(current=>current===code?'':code);setLimit(100)};
  const unresolved = (data?.unclassified || []).filter(row => (!salesperson || row.salesperson_code === salesperson) && (!search.trim() || `${row.client_name} ${row.client_id}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))));
  const unresolvedLines = unresolved.reduce((sum,row)=>sum+row.line_count,0);
  const showUnclassified = segment === '__unclassified__';
  const displayRows = showUnclassified ? unresolved.map(row => ({ client_id:row.client_id, client_name:row.client_name, salesperson_code:row.salesperson_code, segment_code:'__unclassified__', potential_amount:null, billing_amount:row.amount, product_no:row.product_no, product_name:row.product_name, family_code:row.family_code, subfamily_code:row.subfamily_code })) : rows;
  useEffect(() => {
    const target = observerTarget.current;
    const root = scrollRef.current;
    if (!target || !root || limit >= displayRows.length) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) setLimit(current => Math.min(current + 100, displayRows.length));
    }, { root, rootMargin: '100px 0px', threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isLoading, isError, limit, displayRows.length]);
  const tableBilling = displayRows.reduce((sum,row)=>sum+Number(row.billing_amount||0),0);
  const unclassifiedBilling = unresolved.reduce((sum,row)=>sum+Number(row.amount||0),0);
  const totalPotential = rows.reduce((sum,row)=>sum+Number(row.potential_amount||0),0);
  if(isLoading) return <p className="p-4 text-sm text-gray-500">Cargando segmentos…</p>;
  if(isError) return <div role="alert" className="p-4 text-sm text-amber-700">No se pudieron cargar los segmentos. <button onClick={()=>refetch()} className="underline">Reintentar</button></div>;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="min-w-0 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-card-dark p-3 sm:p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Facturación del año <span className="normal-case font-normal tracking-normal">(ventas items sin IVA)</span></span><div className="flex items-center gap-2"><InfoPopover title="Facturación del año" description="Importe neto del año de las filas seleccionadas, sin IVA ni cuentas. El importe mostrado aparte con + corresponde a las líneas sin clasificar y solo responde a los filtros de vendedor y cliente; puede tener un alcance diferente al de las filas clasificadas." formulas="Suma de líneas de facturas − suma de líneas de abonos" iconSize={14} /><Euro size={16} className="shrink-0 text-dts-secondary" /></div></div><div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="break-words text-sm sm:text-lg font-bold text-dts-primary dark:text-white">{currency(tableBilling)}</span>{!showUnclassified && <span className="text-xs text-amber-600 dark:text-amber-400">+ {currency(unclassifiedBilling)} sin clasificar (vendedor y cliente)</span>}</div></div>
      <div className="min-w-0 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-card-dark p-3 sm:p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Potencialidad anual</span><div className="flex items-center gap-2"><InfoPopover title="Potencialidad anual" description="Suma de las estimaciones anuales introducidas en la ficha para las filas filtradas. Las estimaciones pendientes no se incluyen; si ninguna está registrada se muestra Pendiente." formulas="Suma de potencialidades anuales informadas por cliente y segmento" iconSize={14} /><Target size={16} className="shrink-0 text-dts-secondary" /></div></div><div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="break-words text-sm sm:text-lg font-bold text-dts-primary dark:text-white">{rows.some(row=>row.potential_amount !== null) ? currency(totalPotential) : 'Pendiente'}</span><span className="text-[10px] text-gray-400">Estimaciones registradas</span></div></div>
      <div role="status" className="min-w-0 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-card-dark p-3 sm:p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sin clasificar</span><div className="flex items-center gap-2"><InfoPopover title="Líneas sin clasificar" description="Líneas de producto del año que no tienen segmento asignable. Se filtran por vendedor y cliente; no pueden filtrarse por familia, segmento o estado de potencialidad. El importe neto queda fuera del total por segmento." formulas={["Líneas = número de líneas de producto sin segmento", "Importe neto = líneas de factura sin clasificar − líneas de abono sin clasificar"]} iconSize={14} /><AlertCircle size={16} className="shrink-0 text-amber-500" /></div></div><div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="break-words text-sm sm:text-lg font-bold text-dts-primary dark:text-white">{unresolvedLines} líneas</span><span className="text-[10px] text-gray-400">{currency(unresolved.reduce((sum,row)=>sum+Number(row.amount||0),0))} netos · filtros de vendedor y cliente</span></div></div>
    </div>
    <section aria-label="Resumen por familia" className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-[minmax(150px,1fr)] gap-3">{familySummary.map(([name,items]) => {const hasSubfamilies=(data?.catalog || []).some(item=>item.label.startsWith(name + ' → '));const billed=items.reduce((n,item)=>n+item.billing,0);const estimated=items.reduce((n,item)=>n+item.estimated,0);const potential=items.reduce((n,item)=>n+item.potential,0);const pending=items.reduce((n,item)=>n+item.pending,0);return <div key={name} className="relative rounded-xl border border-gray-200/60 dark:border-white/10 bg-white dark:bg-surface-card-dark shadow-sm overflow-hidden"><div className="absolute top-4 right-9 z-10"><InfoPopover title={name} description="Resumen de los segmentos visibles de esta familia. Facturación es el acumulado del año; potencialidad es la estimación anual registrada. Las cifras respetan los filtros y las estimaciones pendientes no se suman." formulas={["Facturación = suma de facturas de producto − suma de abonos de producto", "Potencial anual = suma de estimaciones informadas", "Pendientes = filas cliente-segmento sin estimación"]} iconSize={14} /></div><button type="button" disabled={!hasSubfamilies} aria-expanded={hasSubfamilies ? expanded===name : undefined} onClick={()=>setExpanded(expanded===name?null:name)} className="w-full p-4 text-left"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-dts-primary dark:text-white">{name}</span>{hasSubfamilies && <ChevronDown size={15} className={expanded===name?'rotate-180 text-dts-secondary':'text-gray-400'}/>}</div><div className="mt-3 flex justify-between gap-3 text-xs"><span className="text-gray-500">Facturación<br/><span className="text-dts-primary dark:text-white">{currency(billed)}</span></span><span className="text-right text-gray-500">Potencial anual<br/><span className="text-dts-primary dark:text-white">{estimated?currency(potential):'Pendiente'}</span></span></div>{pending>0 && <p className="mt-2 text-[10px] text-amber-600">{pending} estimación(es) pendiente(s)</p>}</button>{hasSubfamilies && expanded===name && <div className="border-t border-gray-100 dark:border-white/10 px-4 py-2 space-y-1">{items.map(item=><button type="button" key={item.code} onClick={()=>chooseSegment(item.code)} className="w-full flex justify-between gap-2 py-1.5 text-left text-xs hover:text-dts-secondary"><span>{item.label.split(' → ')[1] || item.label}</span><span>{currency(item.billing)} / {item.estimated?currency(item.potential):'Pendiente'}</span></button>)}</div>}</div>})}</div>
    </section>
    <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-200/60 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-400px)] min-h-60"><div className="p-4 shrink-0 border-b border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-800/10 flex flex-wrap items-center gap-3"><div className="relative w-full sm:w-auto sm:min-w-48 sm:flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input aria-label="Buscar cliente" placeholder="Buscar por cliente o código..." value={search} onChange={e=>{setSearch(e.target.value);setLimit(100)}} className={selectClass + ' w-full pl-9'} /></div><div className="flex flex-wrap items-center gap-2">      {data?.global && <select aria-label="Vendedor" value={salesperson} onChange={e=>{setSalesperson(e.target.value);setLimit(100)}} className={selectClass}><option value="">Todos los vendedores</option>{sellers.map(code=><option key={code} value={code}>{code}</option>)}</select>}
      <select aria-label="Familia" disabled={showUnclassified} value={family} onChange={e=>{setFamily(e.target.value);setLimit(100)}} className={selectClass}><option value="">Todas las familias</option>{families.map(name=><option key={name}>{name}</option>)}</select>
      <select aria-label="Segmento" value={segment} onChange={e=>{setSegment(e.target.value);if(e.target.value==='__unclassified__'){setFamily('');setState('')}setLimit(100)}} className={selectClass}><option value="">Todos los segmentos</option><option value="__unclassified__">Sin segmento</option>{data?.catalog.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <select aria-label="Potencialidad" disabled={showUnclassified} value={state} onChange={e=>{setState(e.target.value);setLimit(100)}} className={selectClass}><option value="">Todas las potencialidades</option><option value="estimated">Estimada</option><option value="pending">Pendiente</option></select>
<button type="button" onClick={()=>exportToXlsx(displayRows.map(row => ({cliente:row.client_name,codigo:row.client_id,vendedor:row.salesperson_code || '',segmento:showUnclassified?'Sin segmento':(labels.get(row.segment_code)||row.segment_code),producto:row.product_no || '',descripcion:row.product_name || '',potencialidad:row.potential_amount === null ? null : Number(row.potential_amount),facturacion:Number(row.billing_amount)})),[{key:'codigo',label:'Código cliente'},{key:'cliente',label:'Cliente'},{key:'vendedor',label:'Vendedor'},{key:'segmento',label:'Segmento'},...(showUnclassified?[{key:'producto',label:'Código producto'},{key:'descripcion',label:'Producto'}]:[]),{key:'potencialidad',label:'Potencialidad anual (€)'},{key:'facturacion',label:'Facturación año (€)'}],'segmentos_y_potencial')} className="flex items-center gap-1 text-xs font-bold text-dts-secondary hover:underline"><Download size={14} />Excel</button><button type="button" onClick={()=>{setSalesperson('');setFamily('');setSegment('');setState('');setSearch('');setLimit(100)}} className="text-xs font-bold text-dts-secondary">Restablecer filtros</button></div></div><div ref={scrollRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar"><table className="w-full text-xs text-left"><thead className="sticky top-0 z-20 bg-dts-primary text-white text-[10px] uppercase tracking-wider shadow-lg"><tr>{(showUnclassified ? ['Cliente','Vendedor','Segmento','Producto','Potencialidad anual','Facturación del año'] : ['Cliente','Vendedor','Segmento','Potencialidad anual','Facturación del año']).map((title,index,all)=><th key={title} className={`px-4 py-4 font-bold tracking-wider ${index >= all.length-2 ? 'text-right' : 'text-left'}`}>{title}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/10">{displayRows.slice(0,limit).map(row=><tr key={`${row.client_id}|${row.segment_code}|${row.product_no || ''}`} ><td className="p-3"><button className="text-dts-secondary hover:underline text-left" onClick={()=>setSelectedClient(row.client_id)}>{row.client_name || row.client_id}</button></td><td className="p-3">{row.salesperson_code || '—'}</td><td className="p-3">{showUnclassified ? 'Sin segmento' : labels.get(row.segment_code)||row.segment_code}</td>{showUnclassified && <td className="p-3">{`${row.product_no || 'Sin código'} · ${row.product_name || 'Sin descripción'}`}</td>}<td className="p-3 text-right whitespace-nowrap">{row.potential_amount === null ? 'Pendiente' : currency(Number(row.potential_amount))}</td><td className="p-3 text-right whitespace-nowrap">{currency(Number(row.billing_amount))}</td></tr>)}{limit < displayRows.length && <tr ref={observerTarget} aria-hidden="true"><td colSpan={showUnclassified ? 6 : 5} className="h-px p-0" /></tr>}</tbody><tfoot className="bg-dts-primary text-white sticky bottom-0 z-20 shadow-lg font-bold text-xs uppercase border-t-2 border-dts-secondary"><tr className="divide-x divide-white/10"><th className="px-4 py-3.5 tracking-wider text-left" colSpan={showUnclassified ? 4 : 3}>Totales <span className="text-[11px] text-gray-200 lowercase font-medium">({displayRows.length} filas)</span></th><td className="px-4 py-3.5 text-right font-mono font-black text-xs text-white whitespace-nowrap">{!showUnclassified && rows.some(row=>row.potential_amount !== null) ? currency(totalPotential) : 'Pendiente'}</td><td className="px-4 py-3.5 text-right font-mono font-black text-xs text-white whitespace-nowrap">{currency(tableBilling)}</td></tr></tfoot></table></div>
    </div>
    <CustomerDetailDrawer isOpen={!!selectedClient} onClose={()=>{setSelectedClient(null);refetch()}} customerCode={selectedClient}/>
  </div>;
}


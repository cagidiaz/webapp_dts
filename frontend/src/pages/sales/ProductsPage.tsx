import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { 
  getAllProducts, 
  getProductFamilies, 
  getProductVendors 
} from '../../api';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, Package, Boxes, TrendingUp, Filter,
  Loader2, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton, SearchableSelect } from '../../components/ui';
import { useUIStore } from '../../store/uiStore';

export const ProductsPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(false);
  const [hideBlocked, setHideBlocked] = useState(false);
  const [sortBy, setSortBy] = useState<string>('item_no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  useEffect(() => {
    setPageInfo({
      title: 'Catálogo de Productos',
      subtitle: 'Gestión integral de referencias, stocks y precios',
      icon: <Package size={20} />,
      infoProps: {
        title: 'Productos y Stock',
        description: 'Visión general del inventario, precios y márgenes de los productos.',
        objective: 'Controlar la disponibilidad de referencias y analizar la rentabilidad por producto.',
        source: 'Maestro de productos de Business Central.'
      }
    });
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['products', debouncedSearch, familyFilter, vendorFilter, showOnlyWithStock, hideBlocked, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllProducts({ 
      take: pageSize, skip: pageParam as number, search: debouncedSearch,
      family: familyFilter, vendor: vendorFilter, withStock: showOnlyWithStock,
      isBlocked: hideBlocked ? false : undefined, sortBy, sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  const { data: families = [] } = useQuery({ queryKey: ['productFamilies'], queryFn: getProductFamilies });
  const { data: vendors = [] } = useQuery({ queryKey: ['productVendors'], queryFn: getProductVendors });

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { products, totalProducts, globalStock, globalAvgPrice } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalStock: 0, avgPrice: 0 };
    return { products: allItems, totalProducts: totalCount, globalStock: summary.totalStock, globalAvgPrice: summary.avgPrice };
  }, [data]);

  const familyOptions = useMemo(() => families.map(f => ({ value: f.subfamily_code || '', label: f.subfamily_name || f.subfamily_code || '' })), [families]);
  const vendorOptions = useMemo(() => vendors.map(v => ({ value: v, label: v })), [vendors]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  if (isLoading) return (
    <div className="space-y-8 pb-10">
      <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[550px]"><TableSkeleton rows={15} columns={9} /></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Total Referencias" 
          value={totalProducts} 
          type="number" 
          icon={Package} 
          isLoading={isLoading} 
          infoProps={{
            description: "Número total de productos únicos en el catálogo según filtros."
          }}
        />
        <KPICard 
          title="Stock Total" 
          value={globalStock} 
          type="number" 
          icon={Boxes} 
          status={globalStock > 0 ? 'success' : 'danger'} 
          isLoading={isLoading} 
          infoProps={{
            description: "Sumatorio de las existencias físicas de todos los productos en todos los almacenes."
          }}
        />
        <KPICard 
          title="PVP Medio" 
          value={globalAvgPrice} 
          type="currency" 
          icon={TrendingUp} 
          isLoading={isLoading} 
          infoProps={{
            description: "Precio de Venta al Público promedio ponderado de las referencias mostradas.",
            formulas: "Sum(Precio) / Total Referencias"
          }}
        />
      </div>

      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[500px]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="w-full lg:max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search className="h-4 w-4" /></div>
              <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Filter size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase">Filtros:</span>
            <SearchableSelect options={familyOptions} value={familyFilter} onChange={setFamilyFilter} placeholder="Familias" />
            <SearchableSelect options={vendorOptions} value={vendorFilter} onChange={setVendorFilter} placeholder="Proveedores" />
            
            <div className="flex items-center gap-4 ml-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={showOnlyWithStock} onChange={(e) => setShowOnlyWithStock(e.target.checked)} className="rounded border-gray-300 text-dts-secondary focus:ring-dts-secondary" />
                <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-dts-primary transition-colors">Con Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={hideBlocked} onChange={(e) => setHideBlocked(e.target.checked)} className="rounded border-gray-300 text-dts-secondary focus:ring-dts-secondary" />
                <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-dts-primary transition-colors">Ocultar Bloq.</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-20 shadow-lg">
              <tr>
                {[{label: 'Código', key: 'item_no'}, {label: 'Descripción', key: 'description'}, {label: 'Familia', key: 'subfamily_code'}, {label: 'Stock', key: 'inventory_qty', align:'right'}, {label: 'P.V.P.', key: 'unit_price', align:'right'}, {label: 'Margen %', key: 'profit_margin_pct', align:'center'}].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} className={`px-6 py-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:bg-white/10 transition-colors ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>{col.label}{getSortIcon(col.key)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-3 font-bold font-mono text-dts-primary dark:text-dts-secondary">{product.item_no}</td>
                  <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-200">{product.description || '---'}{product.is_blocked && <span className="ml-2 px-1 rounded text-[8px] bg-red-100 text-red-700 uppercase font-bold">Bloq.</span>}</td>
                  <td className="px-6 py-3 text-gray-500"><div className="flex flex-col"><span className="text-gray-700 dark:text-gray-300 font-medium">{product.category?.subfamily_name || '---'}</span><span className="text-[10px] font-mono">{product.subfamily_code}</span></div></td>
                  <td className={`px-6 py-3 text-right font-mono font-bold ${Number(product.inventory_qty) > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-red-500'}`}>{Number(product.inventory_qty).toLocaleString('de-DE')}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold">{formatCurrency(Number(product.unit_price), 0)}</td>
                  <td className={`px-6 py-3 text-center font-mono font-bold ${Number(product.profit_margin_pct) >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>{Number(product.profit_margin_pct).toFixed(1)}%</td>
                </tr>
              ))}
              <tr ref={observerTarget}><td colSpan={6} className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">{isFetchingNextPage ? <div className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /><span>Cargando más...</span></div> : hasNextPage ? 'Baja para cargar más' : 'Fin del catálogo'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, type = 'number', icon: Icon, isLoading, status, infoProps }: any) => {
  if (isLoading) return <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 h-28 animate-pulse"></div>;
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'danger' ? 'text-red-500' : 'text-dts-primary dark:text-white';
  const formattedValue = type === 'currency' ? formatCurrency(value, 0) : formatNumber(value, 0);
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

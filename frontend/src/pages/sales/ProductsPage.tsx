import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { 
  getAllProducts, 
  getProductFamilies, 
  getProductVendors 
} from '../../api';
import { formatCurrency, formatNumber } from '../../api/formatters';
import { 
  Search, 
  Package, 
  Boxes, 
  TrendingUp, 
  AlertCircle, 
  Filter,
  X,
  Loader2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { InfoPopover, KPISkeleton, TableSkeleton } from '../../components/ui';

export const ProductsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(false);
  const [hideBlocked, setHideBlocked] = useState(false);
  
  // Sort State
  const [sortBy, setSortBy] = useState<string>('item_no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const observerTarget = useRef<HTMLTableRowElement>(null);
  const pageSize = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    isFetching
  } = useInfiniteQuery({
    queryKey: ['products', debouncedSearch, familyFilter, vendorFilter, showOnlyWithStock, hideBlocked, sortBy, sortDir],
    queryFn: ({ pageParam = 0 }) => getAllProducts({ 
      take: pageSize, 
      skip: pageParam, 
      search: debouncedSearch,
      family: familyFilter,
      vendor: vendorFilter,
      withStock: showOnlyWithStock,
      isBlocked: hideBlocked ? false : undefined,
      sortBy,
      sortDir
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextSkip = allPages.length * pageSize;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
  });

  // Fetch unique filter values from server
  const { data: families = [] } = useQuery({ queryKey: ['productFamilies'], queryFn: getProductFamilies });
  const { data: vendors = [] } = useQuery({ queryKey: ['productVendors'], queryFn: getProductVendors });

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Derived data
  const { products, totalProducts, globalStock, globalAvgPrice } = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.data) || [];
    const totalCount = data?.pages[0]?.total || 0;
    const summary = data?.pages[0]?.summary || { totalStock: 0, avgPrice: 0 };
    return { 
      products: allItems, 
      totalProducts: totalCount,
      globalStock: summary.totalStock,
      globalAvgPrice: summary.avgPrice
    };
  }, [data]);

  const isFiltered = debouncedSearch !== '' || familyFilter !== '' || vendorFilter !== '' || showOnlyWithStock || hideBlocked || sortBy !== 'item_no' || sortDir !== 'asc';

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    return sortDir === 'asc' 
      ? <ChevronUp size={12} className="ml-1 text-dts-secondary" /> 
      : <ChevronDown size={12} className="ml-1 text-dts-secondary" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-28 bg-white dark:bg-surface-card-dark rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </div>
        <div className="bg-white dark:bg-surface-card-dark rounded-xl h-[550px]">
          <TableSkeleton rows={15} columns={9} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">
              Error al cargar el catálogo de productos: {(error as Error)?.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="text-dts-secondary" size={24} />
            <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Catálogo de Productos</h1>
            <InfoPopover 
              title="Catálogo de Productos"
              description="Inventario completo de productos sincronizado desde el ERP, incluyendo niveles de stock y precios actuales."
              objective="Consultar disponibilidad, costes, márgenes y códigos de subfamilia de forma ágil."
              source="Tabla: 'products' (Datos BC)."
              iconSize={20}
            />
          </div>
          <p className="text-sm text-gray-500 font-medium">Gestión integral de referencias y stocks (Scroll Infinito)</p>
        </div>
        <div className="flex flex-col items-end">
           <div className="text-xs text-gray-400 bg-gray-100 dark:bg-dts-primary-dark/30 px-3 py-1.5 rounded-full font-medium border border-gray-200/50 dark:border-white/5">
              Total referencias: {formatNumber(totalProducts, 0)}
           </div>
           <div className="text-[10px] text-gray-400 mt-1 italic">
              Visualizando: {products.length}
           </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-dts-primary dark:text-dts-secondary rounded-lg group-hover:bg-dts-secondary/10 transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Referencias{isFiltered ? ' (Filtrado)' : ''}
              </p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatNumber(totalProducts || 0, 0)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-500/10 transition-colors">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Stock Total{isFiltered ? ' (Filtrado)' : ''}
              </p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatNumber(globalStock, 2)} <span className="text-xs font-normal text-gray-400 uppercase ml-1">uds</span>
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                PVP Medio Total{isFiltered ? ' (Filtrado)' : ''}
              </p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatCurrency(globalAvgPrice)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Table & Filters Area */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[500px]">
        
        {/* Advanced Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-transparent space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="w-full lg:max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-dts-secondary transition-colors">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 sm:text-sm transition-all"
                placeholder="Buscar por código, descripción, familia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isFetching && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 text-dts-secondary" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {(searchTerm || familyFilter || vendorFilter || showOnlyWithStock || hideBlocked || sortBy !== 'item_no' || sortDir !== 'asc') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFamilyFilter('');
                    setVendorFilter('');
                    setShowOnlyWithStock(false);
                    setHideBlocked(false);
                    setSortBy('item_no');
                    setSortDir('asc');
                  }}
                  className="text-xs flex items-center gap-1.5 text-dts-secondary hover:text-dts-secondary-dark font-semibold uppercase tracking-wider transition-colors"
                >
                  <X size={12} /> Limpiar Filtros y Orden
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Filtros:</span>
            </div>
            
            <select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark dark:text-gray-200 rounded-md py-1 border focus:ring-dts-secondary focus:border-dts-secondary outline-none pr-8"
            >
              <option value="">Todas las Familias</option>
              {families.map(sf => (
                <option key={sf} value={sf}>{sf}</option>
              ))}
            </select>

            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark dark:text-gray-200 rounded-md py-1 border focus:ring-dts-secondary focus:border-dts-secondary outline-none pr-8"
            >
              <option value="">Todos los Proveedores</option>
              {vendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

            <label className="inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" className="hidden" checked={showOnlyWithStock} onChange={() => setShowOnlyWithStock(!showOnlyWithStock)} />
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${showOnlyWithStock ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-white dark:bg-transparent text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                Solo con Stock
              </span>
            </label>

            <label className="inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" className="hidden" checked={hideBlocked} onChange={() => setHideBlocked(!hideBlocked)} />
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${hideBlocked ? 'bg-red-100 text-red-700 border-red-200 shadow-sm' : 'bg-white dark:bg-transparent text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                Ocultar Bloqueados
              </span>
            </label>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-10 shadow-sm">
              <tr>
                {[
                  { label: 'Código', key: 'item_no', align: 'left', width: '150px' },
                  { label: 'Descripción', key: 'description', align: 'left' },
                  { label: 'Familia', key: 'subfamily_code', align: 'left', width: '100px' },
                  { label: 'Stock', key: 'inventory_qty', align: 'right', width: '100px' },
                  { label: 'Coste Unit.', key: 'unit_cost', align: 'right', width: '120px' },
                  { label: 'P.V.P.', key: 'unit_price', align: 'right', width: '120px' },
                  { label: 'Margen %', key: 'profit_margin_pct', align: 'right', width: '100px' },
                  { label: 'Proveedor', key: 'vendor_no', align: 'left', width: '120px' },
                ].map((col) => (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-6 py-3 font-medium uppercase tracking-wider border-b border-dts-primary-light/10 whitespace-nowrap text-[11px] cursor-pointer group hover:bg-dts-primary-light/10 transition-colors ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    style={{ width: col.width }}
                  >
                    <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-3 font-bold text-dts-primary dark:text-dts-secondary text-xs font-mono">
                    {product.item_no}
                  </td>
                   <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                    <div className="flex items-center gap-2 font-medium">
                      <p className="line-clamp-1" title={product.description || ''}>
                        {product.description || '---'}
                      </p>
                      {product.is_blocked && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs">
                    <span className="bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded text-gray-500">
                      {product.subfamily_code || '---'}
                    </span>
                  </td>
                  <td className={`px-6 py-3 text-right font-mono font-bold ${Number(product.inventory_qty) > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-rose-500'}`}>
                    {Number(product.inventory_qty).toLocaleString('de-DE')}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {formatCurrency(Number(product.unit_cost))}
                  </td>
                  <td className="px-6 py-3 text-right text-dts-primary dark:text-white font-mono font-bold">
                    {formatCurrency(Number(product.unit_price))}
                  </td>
                  <td className={`px-6 py-3 text-right font-mono font-bold text-xs ${Number(product.profit_margin_pct) >= 30 ? 'text-emerald-600' : Number(product.profit_margin_pct) > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {Number(product.profit_margin_pct).toFixed(1)}%
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {product.vendor_no || '---'}
                  </td>
                </tr>
              ))}
              
              <tr ref={observerTarget}>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4 text-dts-secondary" />
                      <span className="text-xs uppercase font-bold tracking-widest">Cargando productos...</span>
                    </div>
                  ) : hasNextPage ? (
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Cargar más productos</span>
                  ) : products.length > 0 ? (
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Catálogo completo cargado</span>
                  ) : !isLoading && (
                    <div className="flex flex-col items-center justify-center py-10">
                       <p className="text-sm font-medium">No se han encontrado productos</p>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

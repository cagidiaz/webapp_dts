import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllCustomers, type CustomerDataRow } from '../../api';
import { formatCurrency } from '../../api/formatters';
import { Search, Users, Euro, TrendingUp, AlertCircle, FileSpreadsheet, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { InfoPopover } from '../../components/ui/InfoPopover';

type SortKey = keyof CustomerDataRow;

export const CustomersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  // Fetch data
  const { data: customers = [], isLoading, isError, error } = useQuery<CustomerDataRow[]>({
    queryKey: ['customers'],
    queryFn: getAllCustomers,
  });

  // Calculate KPIs
  const { totalCustomers, totalBalance, totalSales } = useMemo(() => {
    let totalBalance = 0;
    let totalSales = 0;
    
    customers.forEach(c => {
      totalBalance += Number(c.balance_due_lcy) || 0;
      totalSales += Number(c.total_sales) || 0;
    });

    return {
      totalCustomers: customers.length,
      totalBalance,
      totalSales
    };
  }, [customers]);

  // Request sort function
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and Sort Data
  const filteredCustomers = useMemo(() => {
    let processed = [...customers];

    // Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      processed = processed.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) || 
        (c.client_id && c.client_id.toLowerCase().includes(term))
      );
    }

    // Sort
    if (sortConfig) {
      processed.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Numeric sort for decimals/numbers
        if (typeof valA === 'number' || !isNaN(Number(valA)) && typeof valA !== 'string') {
          return sortConfig.direction === 'asc' 
            ? Number(valA) - Number(valB)
            : Number(valB) - Number(valA);
        }

        // String sort
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processed;
  }, [customers, searchTerm, sortConfig]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dts-secondary"></div>
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
              Error al cargar la lista de clientes: {(error as Error)?.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-dts-secondary" size={24} />
            <h1 className="text-2xl font-medium text-dts-primary dark:text-white uppercase tracking-tight">Catálogo de Clientes</h1>
            <InfoPopover 
              title="Catálogo de Clientes"
              description="Listado completo de clientes sincronizado directamente desde el ERP Business Central."
              objective="Consultar información comercial, estados de bloqueo y saldos pendientes de cobro de forma rápida y centralizada."
              source="Tabla: 'customers' sincronizada vía API."
              iconSize={20}
            />
          </div>
          <p className="text-sm text-gray-500 font-medium">Información comercial y contable estructurada para gestión de ventas</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 dark:bg-dts-primary-dark/30 px-3 py-1.5 rounded-full font-medium border border-gray-200/50 dark:border-white/5">
           Entidades activas: {totalCustomers}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-dts-primary dark:text-dts-secondary rounded-lg group-hover:bg-dts-secondary/10 transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clientes</p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {totalCustomers.toLocaleString('de-DE')}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 transition-all hover:shadow-card-hover group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-dts-primary-dark/50 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-500/10 transition-colors">
              <Euro className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Deuda Acumulada</p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatCurrency(totalBalance)}
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ventas Totales Histórico</p>
              <h3 className="text-2xl font-bold text-dts-primary dark:text-white">
                {formatCurrency(totalSales)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-surface-card-dark rounded-xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[calc(100vh-320px)] min-h-[450px]">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30 dark:bg-transparent">
          <div className="w-full max-w-md relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-dts-secondary text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-dts-primary-dark text-gray-900 dark:text-text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dts-secondary/50 focus:border-dts-secondary sm:text-sm transition-all shadow-sm"
              placeholder="Buscar por nombre o número de cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs text-gray-400 font-medium bg-gray-100 dark:bg-dts-primary-dark/30 px-3 py-1.5 rounded-full border border-gray-200/50 dark:border-white/5">
            {filteredCustomers.length} Resultados encontrados
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-dts-primary text-white sticky top-0 z-10 shadow-sm">
              <tr>
                {[
                  { label: 'Cód. Cliente', key: 'client_id', align: 'left' },
                  { label: 'Nombre Razón Social', key: 'name', align: 'left' },
                  { label: 'Saldo Deuda', key: 'balance_due_lcy', align: 'right' },
                  { label: 'Ventas Acumuladas', key: 'total_sales', align: 'right' },
                  { label: 'Gestor (Comercial)', key: 'salesperson_code', align: 'left' },
                  { label: 'Ciudad/País', key: 'city', align: 'left' },
                ].map((col) => (
                  <th 
                    key={col.key}
                    className={`px-6 py-4 font-medium uppercase tracking-wider border-b border-dts-primary-light/10 cursor-pointer hover:bg-dts-primary-dark/50 transition-colors select-none whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''}`}
                    onClick={() => requestSort(col.key as SortKey)}
                  >
                    <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      {col.label}
                      <span className="text-dts-secondary-light">
                        {sortConfig?.key === col.key ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full mb-4">
                        <FileSpreadsheet className="h-8 w-8 opacity-20" />
                      </div>
                      <p className="text-sm">No se han encontrado registros de clientes</p>
                      <p className="text-xs opacity-60">Prueba con otros criterios de búsqueda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="transition-colors">
                    <td className="px-6 py-3 font-semibold text-dts-primary dark:text-dts-secondary">
                      {customer.client_id}
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        {customer.name}
                        {customer.blocked && customer.blocked.trim() !== '' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-3 text-right font-mono font-medium ${Number(customer.balance_due_lcy) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                      {formatCurrency(Number(customer.balance_due_lcy))}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-200 font-mono font-medium">
                      {formatCurrency(Number(customer.total_sales))}
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      <span className="bg-gray-50 dark:bg-white/5 px-2 py-1 rounded text-xs">
                        {customer.salesperson_code || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {customer.city ? `${customer.city}, ${customer.country_reg_code || ''}` : '---'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

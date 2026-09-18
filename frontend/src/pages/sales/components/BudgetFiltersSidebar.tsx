import React, { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { InfoPopover } from '../../../components/ui/InfoPopover';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { MONTHS } from './budgetShared';
import type { ProductCategory } from '../../../api/products';

export interface BudgetFiltersSidebarProps {
  year: number;
  onYearChange: (year: number) => void;
  selectedMonths: number[];
  onToggleMonth: (month: number) => void;
  
  // Categorías de productos
  categories: ProductCategory[];
  familyFilter: string;
  onFamilyChange: (family: string) => void;
  subfamilyFilter: string;
  onSubfamilyChange: (subfamily: string) => void;

  // Filtro Vendedor (opcional)
  showSalesperson?: boolean;
  salespersonFilter?: string;
  onSalespersonChange?: (salesperson: string) => void;
  salespersonOptions?: { value: string; label: string }[];
  isSalesperson?: boolean;

  // Filtro Product Manager (opcional)
  pmCodes?: { code: string; name: string }[];
  pmFilter?: string;
  onPmChange?: (pm: string) => void;
  isProductManager?: boolean;

  // Filtro Código de Producto / SKU (opcional)
  productCodeFilter?: string;
  onProductCodeChange?: (productCode: string) => void;

  // Control general
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  sidebarRef?: React.RefObject<HTMLDivElement | null>;
}

export const BudgetFiltersSidebar: React.FC<BudgetFiltersSidebarProps> = ({
  year,
  onYearChange,
  selectedMonths,
  onToggleMonth,
  categories,
  familyFilter,
  onFamilyChange,
  subfamilyFilter,
  onSubfamilyChange,
  showSalesperson = true,
  salespersonFilter = '',
  onSalespersonChange,
  salespersonOptions = [],
  isSalesperson = false,
  pmCodes = [],
  pmFilter = '',
  onPmChange,
  isProductManager = false,
  productCodeFilter,
  onProductCodeChange,
  onClearFilters,
  hasActiveFilters,
  sidebarRef,
}) => {
  // Opciones de familia deduplicadas
  const familyOptions = useMemo(() => {
    const uniqueFamilies = new Map<string, string>();
    categories.forEach(c => {
      if (c.family_code) uniqueFamilies.set(c.family_code, c.family_name || c.family_code);
    });
    return Array.from(uniqueFamilies.entries()).map(([code, name]) => ({
      value: code,
      label: `${code} - ${name}`,
    }));
  }, [categories]);

  // Opciones de subfamilia filtradas por la familia seleccionada (si la hay)
  const subfamilyOptions = useMemo(() => {
    let filtered = categories;
    if (familyFilter) {
      filtered = filtered.filter(s => s.family_code === familyFilter);
    }
    const uniqueSubfamilies = new Map<string, string>();
    filtered.forEach(c => {
      if (c.subfamily_code) uniqueSubfamilies.set(c.subfamily_code, c.subfamily_name || c.subfamily_code);
    });
    return Array.from(uniqueSubfamilies.entries()).map(([code, name]) => ({
      value: code,
      label: `${code} - ${name}`,
    }));
  }, [categories, familyFilter]);

  // Manejadores sincronizados de familia y subfamilia
  const handleFamilyChange = (val: string) => {
    onFamilyChange(val);
    onSubfamilyChange('');
  };

  const handleSubfamilyChange = (val: string) => {
    onSubfamilyChange(val);
    if (val && !familyFilter) {
      const match = categories.find(c => c.subfamily_code === val);
      if (match?.family_code) {
        onFamilyChange(match.family_code);
      }
    }
  };

  return (
    <div
      ref={sidebarRef}
      className="lg:col-span-1 bg-white dark:bg-surface-card-dark rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-5 space-y-6 h-fit"
    >
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-dts-primary dark:text-white" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Filtros</h2>
          <InfoPopover
            title="Filtros de Análisis"
            description="Permite segmentar los resultados por periodo temporal, estructura de productos o asignación comercial."
            iconSize={14}
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-dts-secondary hover:bg-dts-secondary/10 p-1 rounded transition-colors"
            title="Limpiar filtros"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Selector de Ejercicio */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Ejercicio</span>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark text-dts-primary dark:text-white font-bold rounded-md px-3 py-2 text-xs outline-none font-mono shadow-sm"
        >
          {[2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Selector de PM (solo para vista de Product Manager y usuarios que no son PM únicos) */}
      {!isProductManager && pmCodes.length > 0 && onPmChange && (
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Product Manager</span>
          <div className="grid grid-cols-3 gap-2">
            {pmCodes.map(pm => (
              <button
                key={pm.code}
                type="button"
                onClick={() => onPmChange(pmFilter === pm.code ? '' : pm.code)}
                title={pm.name}
                className={`h-8 font-bold rounded text-[10px] transition-all ${
                  pmFilter === pm.code
                    ? 'bg-dts-secondary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {pm.code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selector de Meses */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Meses</span>
        <div className="grid grid-cols-4 gap-2">
          {MONTHS.map(m => {
            const isSelected = selectedMonths.includes(m.val);
            return (
              <button
                key={m.val}
                type="button"
                onClick={() => onToggleMonth(m.val)}
                className={`h-8 font-bold rounded text-[10px] transition-all ${
                  isSelected
                    ? 'bg-dts-secondary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros desplegables y de producto */}
      <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        {showSalesperson && onSalespersonChange && !isSalesperson && (
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Vendedor</span>
            <SearchableSelect
              options={salespersonOptions}
              value={salespersonFilter}
              onChange={onSalespersonChange}
              placeholder="Todos..."
            />
          </div>
        )}

        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Familia</span>
          <SearchableSelect
            options={familyOptions}
            value={familyFilter}
            onChange={handleFamilyChange}
            placeholder="Todas..."
          />
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subfamilia</span>
          <SearchableSelect
            options={subfamilyOptions}
            value={subfamilyFilter}
            onChange={handleSubfamilyChange}
            placeholder="Todas..."
          />
        </div>

        {onProductCodeChange && (
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Código Producto</span>
            <input
              type="text"
              value={productCodeFilter || ''}
              onChange={(e) => onProductCodeChange(e.target.value)}
              placeholder="Filtrar por SKU/Código..."
              className="block w-full px-3 py-1.5 text-xs text-gray-900 dark:text-gray-200 bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-dts-secondary focus:border-dts-secondary transition-all outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

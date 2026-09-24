import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search, X, Loader2 } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSearchableSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  isFetching?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const MultiSearchableSelect: React.FC<MultiSearchableSelectProps> = ({
  options,
  value = [],
  onChange,
  placeholder = 'Todas...',
  isFetching = false,
  showIcon = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Opciones filtradas por búsqueda
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const selectAll = () => {
    const allFilteredVals = filteredOptions.map(o => o.value);
    const combined = Array.from(new Set([...value, ...allFilteredVals]));
    onChange(combined);
  };

  const deselectAll = () => {
    onChange([]);
  };

  // Texto o etiqueta a mostrar en el trigger
  const triggerLabel = useMemo(() => {
    if (value.length === 0) return null;
    if (value.length === 1) {
      const match = options.find(o => o.value === value[0]);
      return match ? match.label : value[0];
    }
    return `${value.length} seleccionadas`;
  }, [value, options]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-900 dark:text-gray-200 bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-dts-secondary focus:border-dts-secondary transition-all cursor-pointer select-none group min-h-[30px]"
      >
        <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
          {showIcon && (
            <div className="text-gray-400 shrink-0">
              {isFetching ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            </div>
          )}
          {value.length === 0 ? (
            <span className="text-gray-400 truncate">{placeholder}</span>
          ) : value.length === 1 ? (
            <span className="truncate font-medium">{triggerLabel}</span>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-dts-primary dark:text-white truncate">
                {triggerLabel}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-dts-secondary/15 text-dts-secondary border border-dts-secondary/30 shrink-0 font-mono">
                {value.length}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {value.length > 0 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deselectAll();
                }}
                className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors shadow-xs"
                title="Limpiar selección"
              >
                <X size={11} strokeWidth={2.5} />
              </button>
              <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
            </>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-dts-secondary' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] max-w-sm rounded-xl bg-white dark:bg-dts-primary-dark shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          {/* Header con Buscador */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-white/5 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar subfamilia..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-dts-secondary focus:border-dts-secondary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center justify-between text-[10px] font-bold px-1">
              <button
                type="button"
                onClick={selectAll}
                className="text-dts-secondary hover:underline transition-all"
              >
                Marcar todas ({filteredOptions.length})
              </button>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-rose-500 hover:underline transition-all"
                >
                  Desmarcar todas
                </button>
              )}
            </div>
          </div>

          {/* Opciones con Checkbox */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 divide-y divide-gray-50 dark:divide-white/5">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 italic">
                No se encontraron subfamilias
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs select-none ${
                      isSelected
                        ? 'bg-dts-secondary/10 text-dts-primary dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {/* Checkbox Cuadrado estilizado */}
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        isSelected
                          ? 'bg-dts-secondary border-dts-secondary text-white shadow-sm'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <span className="truncate flex-1" title={opt.label}>
                      {opt.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer de contador */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 text-[10px] text-gray-400 flex items-center justify-between">
            <span>{value.length} de {options.length} seleccionadas</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-dts-primary dark:bg-dts-primary-dark text-white hover:bg-dts-primary/90 transition-colors shadow-sm"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

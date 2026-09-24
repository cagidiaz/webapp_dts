import React, { useState } from 'react';
import { 
  Combobox, 
  ComboboxButton,
  ComboboxInput, 
  ComboboxOption, 
  ComboboxOptions, 
  Transition 
} from '@headlessui/react';
import { Check, ChevronDown, Search, Loader2, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isFetching?: boolean;
  showIcon?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder,
  isFetching = false,
  showIcon = true
}) => {
  const [query, setQuery] = useState('');

  const filteredOptions = query === '' 
    ? options 
    : options.filter((opt) => 
        opt.label.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div className="relative w-full lg:max-w-xs">
      <Combobox 
        value={value} 
        onChange={(val: string | null) => onChange(val || '')}
        // Headless UI 2.0+ handles virtual search better
        onClose={() => setQuery('')}
      >
        <div className="relative">
          {showIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
               {isFetching ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            </div>
          )}
          
          <ComboboxInput
            className={`block w-full pr-16 py-1.5 text-xs text-gray-900 dark:text-gray-200 bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-dts-secondary focus:border-dts-secondary transition-all outline-none ${showIcon ? 'pl-9' : 'pl-3'}`}
            displayValue={(val: string) => options.find(o => o.value === val)?.label || ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
            {value && (
              <>
                <button
                  type="button"
                  className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors shadow-xs z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  title="Limpiar filtro"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
                <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
              </>
            )}
            <ComboboxButton className="flex items-center h-full px-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </ComboboxButton>
          </div>
        </div>

        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white/95 dark:bg-dts-primary-dark/95 backdrop-blur-md py-1 border border-gray-100 dark:border-white/10 shadow-xl focus:outline-none scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
            {value && (
              <ComboboxOption
                key="__clear__"
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-3 pr-4 transition-colors text-xs text-rose-600 dark:text-rose-400 font-semibold border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 ${
                    focus ? 'bg-rose-50 dark:bg-rose-950/30' : ''
                  }`
                }
                value=""
              >
                <X size={12} strokeWidth={2.5} />
                <span>Quitar filtro</span>
              </ComboboxOption>
            )}
            {filteredOptions.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none py-4 px-4 text-center">
                <p className="text-xs font-medium text-gray-500 italic">No se han encontrado coincidencias</p>
              </div>
            ) : (
              filteredOptions.map((option) => (
                <ComboboxOption
                  key={option.value}
                  className={({ focus }) =>
                    `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors text-xs ${
                      focus ? 'bg-dts-secondary/10 text-dts-primary dark:text-dts-secondary font-semibold' : 'text-gray-700 dark:text-gray-300'
                    }`
                  }
                  value={option.value}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-bold text-dts-primary dark:text-dts-secondary' : 'font-normal'}`}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-dts-secondary">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </Transition>
      </Combobox>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Combobox, 
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
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder,
  isFetching = false
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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
             {isFetching ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          </div>
          
          <ComboboxInput
            className="block w-full pl-9 pr-10 py-1.5 text-xs text-gray-900 dark:text-gray-200 bg-white dark:bg-dts-primary-dark border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-dts-secondary focus:border-dts-secondary transition-all outline-none"
            displayValue={(val: string) => options.find(o => o.value === val)?.label || ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {value && (
              <button
                type="button"
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              >
                <X className="h-3 w-3 text-gray-400 hover:text-dts-secondary" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </div>

        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white/95 dark:bg-dts-primary-dark/95 backdrop-blur-md py-1 border border-gray-100 dark:border-white/10 shadow-xl focus:outline-none scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
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

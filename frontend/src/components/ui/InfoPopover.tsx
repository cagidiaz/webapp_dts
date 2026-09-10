import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Info, X } from 'lucide-react';

export interface InfoBreakdownItem {
  label: string;
  value: string;
  sign?: '+' | '-' | '=' | 'i';
  color?: string;
}

interface InfoPopoverProps {
  title: string;
  description: React.ReactNode;
  source?: string;
  formulas?: string | string[];
  objective?: string;
  breakdown?: InfoBreakdownItem[];
  iconSize?: number;
  className?: string; // Additional classes for the button
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  title,
  description,
  source,
  formulas,
  objective,
  breakdown,
  iconSize = 18,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className={`text-gray-400 hover:text-dts-primary dark:hover:text-white focus:outline-none transition-colors ${className}`}
      >
        <Info size={iconSize} />
      </button>

      <Transition show={isOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <TransitionChild
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 md:bg-black/40 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-surface-card-dark p-6 text-left align-middle shadow-2xl transition-all border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <DialogTitle as="h3" className="text-lg font-bold text-dts-primary dark:text-white flex items-center gap-2">
                       <Info className="text-dts-secondary" size={20} />
                       {title}
                    </DialogTitle>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none"
                      onClick={() => setIsOpen(false)}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {description}
                    </div>
                    
                    {objective && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/50">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Objetivo</span>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{objective}</p>
                      </div>
                    )}

                    {source && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/50">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fuente de Datos</span>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded-md break-all border border-blue-100 dark:border-blue-800/30">
                          {source}
                        </p>
                      </div>
                    )}

                    {formulas && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/50">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fórmula(s)</span>
                        <div className="space-y-1.5">
                          {Array.isArray(formulas) ? (
                            formulas.map((f, i) => (
                              <code key={i} className="block text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-md border border-green-100 dark:border-green-800/30 shadow-sm">
                                {f}
                              </code>
                            ))
                          ) : (
                            <code className="block text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-md border border-green-100 dark:border-green-800/30 shadow-sm">
                              {formulas}
                            </code>
                          )}
                        </div>
                      </div>
                    )}

                    {breakdown && breakdown.length > 0 && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/50">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Desglose de Importes</span>
                        <div className="space-y-1.5 bg-gray-50 dark:bg-black/20 p-2.5 rounded-xl border border-gray-150 dark:border-gray-800">
                          {breakdown.map((item, idx) => (
                            <div key={idx} className={`flex items-center justify-between text-xs py-0.5 ${item.sign === '=' ? 'font-bold border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1 text-dts-primary dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                              <div className="flex items-center gap-1.5">
                                {item.sign && (
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                                    item.sign === '+' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                                    item.sign === '-' ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400' :
                                    item.sign === '=' ? 'bg-dts-secondary/20 text-dts-secondary' :
                                    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {item.sign}
                                  </span>
                                )}
                                <span>{item.label}</span>
                              </div>
                              <span className={`font-mono font-medium ${item.color || ''}`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

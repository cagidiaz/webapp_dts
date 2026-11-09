import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Maximize2, X } from 'lucide-react';

/** Amplía el borrador; aplicar solo modifica el formulario que lo contiene. */
export function ExpandConclusionsButton({ value, onApply, maxLength }: { value: string; onApply: (value: string) => void; maxLength?: number }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  return <>
    <button type="button" aria-label="Ampliar conclusiones" title="Ampliar conclusiones" onClick={() => { setDraft(value); setOpen(true); }} className="inline-flex items-center gap-1 text-xs font-semibold text-dts-secondary hover:underline cursor-pointer"><Maximize2 size={14} /> Ampliar</button>
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-[200]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-3xl rounded-2xl bg-white dark:bg-surface-card-dark p-5 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3 mb-4"><DialogTitle className="text-base font-bold text-dts-primary dark:text-white">Conclusiones / Resultado</DialogTitle><button type="button" aria-label="Cerrar sin aplicar" onClick={() => setOpen(false)} className="text-gray-500 hover:text-dts-secondary"><X size={18} /></button></div>
          <textarea autoFocus aria-label="Conclusiones ampliadas" value={draft} onChange={e => setDraft(e.target.value)} maxLength={maxLength} rows={14} className="w-full min-h-64 max-h-[60vh] resize-y rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dts-primary-dark p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dts-secondary/50" />
          <p className="mt-2 text-xs text-gray-500">El texto se guardará al guardar el evento.</p>
          <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300">Cancelar</button><button type="button" onClick={() => { onApply(draft); setOpen(false); }} className="rounded-lg bg-dts-secondary px-4 py-2 text-xs font-bold text-white">Aplicar</button></div>
        </DialogPanel>
      </div>
    </Dialog>
  </>;
}

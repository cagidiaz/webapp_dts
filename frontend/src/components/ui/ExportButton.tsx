import React from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  /** Async function that triggers the export; shown as loading while running */
  onExport: () => Promise<void>;
  /** Controlled loading state (optional – button manages internally if not provided) */
  isLoading?: boolean;
  /** Button label */
  label?: string;
  /** Extra Tailwind classes */
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable export-to-xlsx button with loading state.
 * Place it in any table toolbar.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  isLoading: controlledLoading,
  label = 'Exportar XLSX',
  className = '',
  disabled = false,
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = controlledLoading ?? internalLoading;

  const handleClick = async () => {
    if (loading || disabled) return;
    setInternalLoading(true);
    try {
      await onExport();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <button
      id="export-xlsx-btn"
      onClick={handleClick}
      disabled={loading || disabled}
      title="Descargar tabla como Excel (.xlsx)"
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
        text-[10px] font-bold uppercase tracking-wider transition-all
        ${
          loading || disabled
            ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
            : 'border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-600 active:scale-95'
        }
        ${className}
      `}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin shrink-0" />
      ) : (
        <Download size={12} className="shrink-0" />
      )}
      <span>{loading ? 'Generando...' : label}</span>
    </button>
  );
};

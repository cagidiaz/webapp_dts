import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  resetKey: unknown;
  onClose: () => void;
  children: ReactNode;
}

/** A new notice gets its own timer; opening Outlook continues independently. */
export function FloatingOutlookNotice({ resetKey, onClose, children }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 10_000);
    return () => window.clearTimeout(timer);
  }, [resetKey, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <section role="status" aria-live="polite" aria-label="Aviso de Outlook"
      className="fixed bottom-4 left-4 right-4 z-[60] max-h-[50dvh] overflow-y-auto overscroll-contain rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-gray-700 shadow-xl break-words sm:left-auto sm:w-[440px] dark:border-blue-800 dark:bg-surface-card-dark dark:text-gray-200 space-y-2">
      {children}
    </section>,
    document.body,
  );
}

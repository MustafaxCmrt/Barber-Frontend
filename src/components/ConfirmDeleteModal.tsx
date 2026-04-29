import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";

/**
 * Generic onay modalı — silme/iptal gibi geri alınamaz işlemler için.
 * `isOpen` ile açılır, `onConfirm` async/sync olabilir; pending durumunda
 * kapanış disable.
 */

interface Props {
  isOpen: boolean;
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Silmek istediğinden emin misin?",
  description,
  confirmLabel = "Evet, sil",
  cancelLabel = "Vazgeç",
  isPending = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isPending, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              if (!isPending) onClose();
            }}
            className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-card-hover border border-charcoal-100 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statusBusy/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle
                    className="w-5 h-5 text-statusBusy"
                    aria-hidden="true"
                  />
                </div>
                <h2
                  id="confirm-delete-title"
                  className="font-display text-xl text-charcoal-900"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="p-1.5 rounded-lg text-charcoal-300 hover:text-charcoal-900 hover:bg-charcoal-50 disabled:opacity-40 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <div className="text-sm text-charcoal-500">{description}</div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-statusBusy/30 bg-statusBusy/5 px-3 py-2 text-sm text-statusBusy"
                >
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2.5 rounded-lg border border-charcoal-100 text-charcoal-500 hover:text-charcoal-900 hover:border-charcoal-200 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-statusBusy hover:bg-statusBusy/90 text-white disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-statusBusy/40"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

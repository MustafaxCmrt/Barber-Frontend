import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, Phone, X } from "lucide-react";
import { useCancelAppointmentMutation } from "@/features/public/queries";
import {
  formatLongLocalDateTime,
  formatMoney,
} from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import { ErrorCode } from "@/api/errorCodes";
import type { AppointmentLookupItemDto } from "@/api/types";

/**
 * FAZ 4 — Cancel onay modalı (Bölüm 8.2[4-6]).
 *
 * Inline hata yönetimi:
 *  - 422 CANCEL_WINDOW_PASSED  → "2 saatten az kaldı, iptal edilemez"
 *  - 422 INVALID_STATUS_TRANSITION → "Bu randevu zaten ... durumda"
 *  - 404                        → "Bilgiler eşleşmiyor" (enumeration koruması)
 *  - Diğer                      → fallback mesaj
 *
 * Başarı: toast.success + onConfirmed() — parent re-lookup yapar.
 */

interface Props {
  appointment: AppointmentLookupItemDto | null;
  phone: string;
  onClose: () => void;
  onConfirmed: () => void;
}

export function CancelModal({
  appointment,
  phone,
  onClose,
  onConfirmed,
}: Props) {
  const [inlineError, setInlineError] = useState<string | null>(null);
  const mutation = useCancelAppointmentMutation();

  const isOpen = !!appointment;

  // Modal kapandığında / açıldığında local state'i temizle
  useEffect(() => {
    if (!isOpen) {
      setInlineError(null);
      mutation.reset();
    }
    // mutation.reset stable değil — dependency'e koymuyoruz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape ile kapama
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, mutation.isPending, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (!appointment) return;
    setInlineError(null);
    mutation.mutate(
      { id: appointment.id, body: { phone } },
      {
        onSuccess: () => {
          notify.success("Randevu başarıyla iptal edildi.");
          onConfirmed();
          onClose();
        },
        onError: (err) => {
          if (!isApiError(err)) {
            setInlineError("Bir hata oluştu, lütfen tekrar deneyin.");
            return;
          }

          if (err.status === 422 && err.code === ErrorCode.CANCEL_WINDOW_PASSED) {
            setInlineError(
              "Randevu başlangıcına 2 saatten az kaldığı için iptal edilemez.",
            );
            return;
          }

          if (
            err.status === 422 &&
            err.code === ErrorCode.INVALID_STATUS_TRANSITION
          ) {
            setInlineError(
              "Bu randevu zaten son durumunda — iptal edilemez.",
            );
            return;
          }

          if (err.status === 404) {
            setInlineError(
              "Bilgiler eşleşmiyor. Telefon numaranızı kontrol edin.",
            );
            return;
          }

          if (err.status === 429) {
            // Interceptor zaten toast attı; modal'ı kapatmaya gerek yok ama
            // tekrar denemesin diye inline mesaj koyalım.
            setInlineError(
              "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin.",
            );
            return;
          }

          setInlineError(err.message);
        },
      },
    );
  };

  return (
    <AnimatePresence>
      {isOpen && appointment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              if (!mutation.isPending) onClose();
            }}
            className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm"
          />

          {/* Dialog */}
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
                <div>
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-statusBusy">
                    İptal
                  </p>
                  <h2
                    id="cancel-modal-title"
                    className="font-display text-xl text-charcoal-900"
                  >
                    Randevuyu iptal et
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={mutation.isPending}
                className="p-1.5 rounded-lg text-charcoal-300 hover:text-charcoal-900 hover:bg-charcoal-50 disabled:opacity-40 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-charcoal-500">
                Bu randevuyu iptal etmek istediğine emin misin? Bu işlem geri
                alınamaz.
              </p>

              <div className="rounded-xl bg-charcoal-50/60 border border-charcoal-100 p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-charcoal-300">Berber</span>
                  <span className="text-charcoal-900 font-medium text-right">
                    {appointment.barberName}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-charcoal-300">Tarih & Saat</span>
                  <span className="text-charcoal-900 text-right">
                    {formatLongLocalDateTime(appointment.startTime)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-charcoal-300">Toplam</span>
                  <span className="text-charcoal-900 font-medium">
                    {formatMoney(appointment.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-charcoal-100 p-4 flex items-center gap-3">
                <Phone className="w-4 h-4 text-charcoal-300 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-charcoal-300">Onay telefonu</p>
                  <p className="text-charcoal-900 font-mono text-sm">
                    {phone}
                  </p>
                </div>
              </div>

              {inlineError && (
                <div
                  role="alert"
                  className="rounded-lg border border-statusBusy/30 bg-statusBusy/5 px-3 py-2 text-sm text-statusBusy"
                >
                  {inlineError}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={mutation.isPending}
                className="px-4 py-2.5 rounded-lg border border-charcoal-100 text-charcoal-500 hover:text-charcoal-900 hover:border-charcoal-200 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-statusBusy hover:bg-statusBusy/90 text-white disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-statusBusy/40"
              >
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Evet, iptal et
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

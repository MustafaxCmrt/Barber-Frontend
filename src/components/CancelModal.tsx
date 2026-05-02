import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, KeyRound, Loader2, Phone, X } from "lucide-react";
import { useCancelAppointmentMutation } from "@/features/public/queries";
import {
  formatLongLocalDateTime,
  formatMoney,
} from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import { ErrorCode } from "@/api/errorCodes";
import {
  cancelAppointmentSchema,
  type CancelAppointmentFormValues,
} from "@/lib/schemas";
import type { AppointmentLookupItemDto } from "@/api/types";

/**
 * Pre-prod sözleşmesi (Bölüm 1.2) — Cancel onay modalı.
 *
 * Yeni input: 6 haneli iptal kodu (CreateAppointmentResultDto.cancellationCode).
 * Müşteri kodu kaybetmişse iptal edemez → backend 422 APPOINTMENT_CANCEL_NO_CODE
 * veya APPOINTMENT_CANCEL_INVALID_CODE döner.
 *
 * Inline hata yönetimi:
 *  - 422 CANCEL_WINDOW_PASSED              → "2 saatten az kaldı, iptal edilemez"
 *  - 422 INVALID_STATUS_TRANSITION         → "Bu randevu zaten ... durumda"
 *  - 422 APPOINTMENT_CANCEL_LOCKED         → "1 saat sonra tekrar deneyin"
 *  - 422 APPOINTMENT_CANCEL_NO_CODE        → "Berberle iletişime geçin"
 *  - 422 APPOINTMENT_CANCEL_INVALID_CODE   → "Geçersiz kod"
 *  - 404                                   → "Bilgiler eşleşmiyor" (enumeration koruması)
 *  - Diğer                                 → fallback mesaj + traceId
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
  const [errorTraceId, setErrorTraceId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const mutation = useCancelAppointmentMutation();

  const isOpen = !!appointment;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CancelAppointmentFormValues>({
    resolver: zodResolver(cancelAppointmentSchema),
    mode: "onBlur",
    defaultValues: { code: "" },
  });

  // Modal kapandığında / açıldığında local state'i temizle
  useEffect(() => {
    if (!isOpen) {
      setInlineError(null);
      setErrorTraceId(null);
      setLocked(false);
      reset({ code: "" });
      mutation.reset();
    }
    // mutation.reset/reset stable değil — dependency'e koymuyoruz
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

  const onSubmit = (values: CancelAppointmentFormValues) => {
    if (!appointment) return;
    setInlineError(null);
    setErrorTraceId(null);
    mutation.mutate(
      { id: appointment.id, body: { phone, code: values.code } },
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

          setErrorTraceId(err.correlationId ?? null);

          if (err.status === 422) {
            switch (err.code) {
              case ErrorCode.CANCEL_WINDOW_PASSED:
                setInlineError(
                  "Randevu başlangıcına 2 saatten az kaldığı için iptal edilemez.",
                );
                return;
              case ErrorCode.INVALID_STATUS_TRANSITION:
                setInlineError(
                  "Bu randevu zaten son durumunda — iptal edilemez.",
                );
                return;
              case ErrorCode.APPOINTMENT_CANCEL_LOCKED:
                setLocked(true);
                setInlineError(
                  "Çok fazla yanlış deneme. Lütfen 1 saat sonra tekrar deneyin.",
                );
                return;
              case ErrorCode.APPOINTMENT_CANCEL_NO_CODE:
                setLocked(true);
                setInlineError(
                  "Bu randevu telefondan iptal edilemiyor. Lütfen berberle iletişime geçin.",
                );
                return;
              case ErrorCode.APPOINTMENT_CANCEL_INVALID_CODE:
                setInlineError(
                  "Geçersiz iptal kodu. Lütfen kodu kontrol edip tekrar deneyin.",
                );
                return;
              default:
                setInlineError(err.message);
                return;
            }
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

  const submitDisabled = mutation.isPending || locked;

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
          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit(onSubmit)}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-card-hover border border-charcoal-100 overflow-hidden"
            noValidate
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
                Bu randevuyu iptal etmek istediğine emin misin? Randevu
                oluştururken sana verilen <strong>6 haneli iptal kodunu</strong>{" "}
                gir.
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

              <div>
                <label
                  htmlFor="cancel-code"
                  className="block text-sm font-medium text-charcoal-500 mb-1.5"
                >
                  İptal kodu
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
                    aria-hidden="true"
                  />
                  <input
                    id="cancel-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="6 haneli kod"
                    disabled={submitDisabled}
                    aria-invalid={!!errors.code}
                    aria-describedby={
                      errors.code ? "cancel-code-error" : undefined
                    }
                    {...register("code")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-charcoal-100
                               focus:outline-none focus:ring-2 focus:ring-oldGold-500/40 focus:border-oldGold-500
                               disabled:bg-charcoal-50 disabled:text-charcoal-300
                               text-charcoal-900 placeholder:text-charcoal-200 font-mono tracking-widest
                               transition-colors"
                  />
                </div>
                {errors.code && (
                  <p
                    id="cancel-code-error"
                    role="alert"
                    className="mt-1.5 text-xs text-statusBusy"
                  >
                    {errors.code.message}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-charcoal-300">
                  Randevu oluşturulduğunda sana 6 haneli bir iptal kodu
                  verildi. Kodu kaybettiysen berberle iletişime geç.
                </p>
              </div>

              {inlineError && (
                <div
                  role="alert"
                  className="rounded-lg border border-statusBusy/30 bg-statusBusy/5 px-3 py-2 text-sm text-statusBusy space-y-1"
                >
                  <p>{inlineError}</p>
                  {errorTraceId && (
                    <p className="text-[11px] font-mono text-statusBusy/70 break-all">
                      Destek kodu: {errorTraceId}
                    </p>
                  )}
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
                type="submit"
                disabled={submitDisabled}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-statusBusy hover:bg-statusBusy/90 text-white disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-statusBusy/40"
              >
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Evet, iptal et
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

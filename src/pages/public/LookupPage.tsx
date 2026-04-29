import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2, Phone, Search, Sparkles } from "lucide-react";

import { useAppointmentLookupMutation } from "@/features/public/queries";
import { EmptyState } from "@/components/EmptyState";
import { AppointmentLookupCard } from "@/components/AppointmentLookupCard";
import { CancelModal } from "@/components/CancelModal";
import {
  lookupPhoneSchema,
  type LookupPhoneFormValues,
} from "@/lib/schemas";
import { isApiError } from "@/api/client";
import { ErrorCode } from "@/api/errorCodes";
import type { AppointmentLookupItemDto } from "@/api/types";

/**
 * FAZ 4 — Randevumu Bul (Bölüm 6.7, 6.8, 8.2).
 *
 * Akış:
 *  1) Telefon formu → POST /api/public/appointments/lookup
 *  2) [] → "Randevu bulunamadı" (404 değil — enumeration koruması)
 *     [items] → AppointmentLookupCard listesi
 *  3) "İptal Et" → CancelModal → POST /api/public/appointments/{id}/cancel
 *  4) İptal başarılı → re-lookup ile listeyi yenile (server truth)
 *
 * Rate limit (422 LOOKUP_RATE_LIMIT): form 60sn disabled + sayaç.
 * 429 (genel rate limit) interceptor tarafında zaten toast'lanıyor.
 */

const LOOKUP_LOCKOUT_SECONDS = 60;

export function LookupPage() {
  const [searchParams] = useSearchParams();
  const incomingId = searchParams.get("id");

  const [submittedPhone, setSubmittedPhone] = useState<string | null>(null);
  const [results, setResults] = useState<AppointmentLookupItemDto[] | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] =
    useState<AppointmentLookupItemDto | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const lockoutTimerRef = useRef<number | null>(null);
  const mutation = useAppointmentLookupMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupPhoneFormValues>({
    resolver: zodResolver(lookupPhoneSchema),
    mode: "onBlur",
    defaultValues: { phone: "" },
  });

  // Lockout sayacı
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (lockoutTimerRef.current) {
        window.clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
      return;
    }
    lockoutTimerRef.current = window.setInterval(() => {
      setLockoutSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (lockoutTimerRef.current) {
        window.clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
    };
  }, [lockoutSeconds]);

  const runLookup = useCallback(
    (phone: string) => {
      mutation.mutate(
        { phone },
        {
          onSuccess: (data) => {
            setResults(data);
            setSubmittedPhone(phone);
          },
          onError: (err) => {
            if (
              isApiError(err) &&
              err.status === 422 &&
              err.code === ErrorCode.LOOKUP_RATE_LIMIT
            ) {
              setLockoutSeconds(LOOKUP_LOCKOUT_SECONDS);
              return;
            }
            // 429 (header rate limit) — interceptor toast attı, retryAfter
            // varsa onu kullanalım; yoksa 60sn varsayılan.
            if (isApiError(err) && err.status === 429) {
              setLockoutSeconds(err.retryAfterSeconds ?? LOOKUP_LOCKOUT_SECONDS);
              return;
            }
            // Diğer hatalar — interceptor zaten ele aldı (5xx toast vs.).
          },
        },
      );
    },
    [mutation],
  );

  const onSubmit = (values: LookupPhoneFormValues) => {
    if (lockoutSeconds > 0 || mutation.isPending) return;
    runLookup(values.phone);
  };

  const handleCancelConfirmed = useCallback(() => {
    // Backend artık Cancelled yaptı; güncel listeyi server'dan çek.
    if (submittedPhone) {
      runLookup(submittedPhone);
    }
  }, [submittedPhone, runLookup]);

  const inputDisabled = mutation.isPending || lockoutSeconds > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <p className="font-body text-xs tracking-[0.4em] uppercase text-oldGold-600 mb-2">
          Randevumu Bul
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-charcoal-900 mb-3">
          Telefonunla randevularını sorgula
        </h1>
        <p className="text-charcoal-300 max-w-lg mx-auto">
          Randevu alırken kullandığın telefon numarası ile gelecekteki
          randevularını görebilir, gerekirse iptal edebilirsin.
        </p>
      </motion.header>

      {incomingId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 rounded-xl border border-oldGold-200 bg-oldGold-50/60 px-4 py-3 flex items-start gap-3 text-sm"
          role="status"
        >
          <Sparkles className="w-4 h-4 text-oldGold-600 mt-0.5 flex-shrink-0" />
          <p className="text-charcoal-500">
            Az önce oluşturduğun randevuyu görmek için telefonunu gir. Randevu
            no:{" "}
            <span className="font-mono text-charcoal-900 break-all">
              {incomingId}
            </span>
          </p>
        </motion.div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 md:p-6"
        noValidate
      >
        <label
          htmlFor="lookup-phone"
          className="block text-sm font-medium text-charcoal-500 mb-2"
        >
          Telefon
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
              aria-hidden="true"
            />
            <input
              id="lookup-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="05XXXXXXXXX"
              maxLength={11}
              disabled={inputDisabled}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "lookup-phone-error" : undefined}
              {...register("phone")}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-charcoal-100
                         focus:outline-none focus:ring-2 focus:ring-oldGold-500/40 focus:border-oldGold-500
                         disabled:bg-charcoal-50 disabled:text-charcoal-300
                         text-charcoal-900 placeholder:text-charcoal-200
                         transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={inputDisabled}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                       bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition-colors focus:outline-none focus:ring-2 focus:ring-oldGold-500/40"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {lockoutSeconds > 0 ? `${lockoutSeconds} sn` : "Sorgula"}
          </button>
        </div>

        {errors.phone && (
          <p
            id="lookup-phone-error"
            role="alert"
            className="mt-2 text-sm text-statusBusy"
          >
            {errors.phone.message}
          </p>
        )}

        {lockoutSeconds > 0 && !errors.phone && (
          <p className="mt-2 text-sm text-charcoal-300">
            Çok fazla sorgu yaptınız. {lockoutSeconds} saniye sonra tekrar
            deneyin.
          </p>
        )}
      </motion.form>

      <section className="mt-8 space-y-4" aria-live="polite">
        {mutation.isPending && (
          <div className="rounded-2xl border border-dashed border-charcoal-100 bg-white py-12 flex items-center justify-center text-charcoal-300 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Aranıyor…
          </div>
        )}

        {!mutation.isPending && results !== null && results.length === 0 && (
          <EmptyState
            title="Randevu bulunamadı"
            description="Bu telefon numarasına ait gelecekteki bir randevu yok. Telefonunu kontrol et veya yeni randevu al."
          />
        )}

        {!mutation.isPending && results && results.length > 0 && (
          <div className="space-y-4">
            {results.map((appointment) => (
              <AppointmentLookupCard
                key={appointment.id}
                appointment={appointment}
                onCancelClick={setCancelTarget}
              />
            ))}
          </div>
        )}
      </section>

      <CancelModal
        appointment={cancelTarget}
        phone={submittedPhone ?? ""}
        onClose={() => setCancelTarget(null)}
        onConfirmed={handleCancelConfirmed}
      />
    </div>
  );
}

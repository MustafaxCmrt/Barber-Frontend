import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UserMinus, X } from "lucide-react";

import { useCreateBarberLeaveMutation } from "@/features/admin/barbersQueries";
import {
  createLeaveSchema,
  type CreateLeaveFormValues,
} from "@/lib/schemas";
import { isApiError } from "@/api/client";
import { notify } from "@/lib/toast";

/**
 * FAZ 8 / M2 — İzin günü ekleme modalı (Bölüm 7.1).
 *
 * Backend kuralları:
 *  - date: bugün veya sonrası
 *  - reason: ≤200 (opsiyonel)
 *  - 409 ConflictException: bu tarih için izin zaten var → inline
 */

interface Props {
  isOpen: boolean;
  barberId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddLeaveModal({
  isOpen,
  barberId,
  onClose,
  onCreated,
}: Props) {
  const mutation = useCreateBarberLeaveMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const todayStr = useMemo_todayStr();

  const form = useForm<CreateLeaveFormValues>({
    resolver: zodResolver(createLeaveSchema),
    mode: "onBlur",
    defaultValues: { date: "", reason: "" },
  });

  // Modal açıldığında local state'i resetle
  useEffect(() => {
    if (isOpen) {
      form.reset({ date: "", reason: "" });
      setTopError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Esc + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, mutation.isPending, onClose]);

  const onSubmit = (values: CreateLeaveFormValues) => {
    setTopError(null);
    mutation.mutate(
      {
        id: barberId,
        body: {
          date: values.date,
          reason:
            values.reason && values.reason.trim().length > 0
              ? values.reason.trim()
              : undefined,
        },
      },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "İzin günü eklendi.");
          onCreated();
          onClose();
        },
        onError: (err) => {
          if (!isApiError(err)) {
            setTopError("Beklenmeyen bir hata oluştu.");
            return;
          }
          if (err.status === 409) {
            form.setError("date", {
              message: "Bu tarih için izin zaten var.",
            });
            return;
          }
          if (err.status === 400 && err.fieldErrors) {
            for (const [key, messages] of Object.entries(err.fieldErrors)) {
              const k = key.toLowerCase();
              if (k === "date" && messages[0])
                form.setError("date", { message: messages[0] });
              if (k === "reason" && messages[0])
                form.setError("reason", { message: messages[0] });
            }
            return;
          }
          setTopError(err.message);
        },
      },
    );
  };

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
          aria-labelledby="add-leave-title"
        >
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              if (!mutation.isPending) onClose();
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
            <header className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center flex-shrink-0">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-oldGold-600">
                    İzin
                  </p>
                  <h2
                    id="add-leave-title"
                    className="font-display text-xl text-charcoal-900"
                  >
                    İzin Günü Ekle
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
            </header>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="px-6 py-5 space-y-4"
            >
              {topError && (
                <div
                  role="alert"
                  className="rounded-lg border border-statusBusy/30 bg-statusBusy/5 px-3 py-2 text-sm text-statusBusy"
                >
                  {topError}
                </div>
              )}

              <div>
                <label
                  htmlFor="leave-date"
                  className="block text-sm font-medium text-charcoal-500 mb-1.5"
                >
                  Tarih <span className="text-statusBusy">*</span>
                </label>
                <input
                  id="leave-date"
                  type="date"
                  min={todayStr}
                  disabled={mutation.isPending}
                  {...form.register("date")}
                  className="w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 disabled:opacity-60 transition-colors"
                />
                {form.formState.errors.date && (
                  <p className="text-statusBusy text-xs mt-1.5">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="leave-reason"
                  className="block text-sm font-medium text-charcoal-500 mb-1.5"
                >
                  Sebep
                </label>
                <input
                  id="leave-reason"
                  type="text"
                  maxLength={200}
                  disabled={mutation.isPending}
                  placeholder="Yıllık izin, sağlık, …"
                  {...form.register("reason")}
                  className="w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-200 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 disabled:opacity-60 transition-colors"
                />
                {form.formState.errors.reason && (
                  <p className="text-statusBusy text-xs mt-1.5">
                    {form.formState.errors.reason.message}
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
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
                  disabled={mutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {mutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Ekle
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useMemo_todayStr(): string {
  const today = new Date();
  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}

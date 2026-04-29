import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Save,
  Scissors,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from "@/features/admin/servicesQueries";
import {
  createServiceSchema,
  type CreateServiceFormValues,
  updateServiceSchema,
  type UpdateServiceFormValues,
} from "@/lib/schemas";
import { isApiError } from "@/api/client";
import { notify } from "@/lib/toast";
import type {
  CreateServiceDto,
  ServiceSummaryDto,
  UpdateServiceDto,
} from "@/api/types";

/**
 * FAZ 9 — Hizmet create/edit modalı (Bölüm 7.2).
 *
 * `service` prop null ise create, dolu ise edit modu. isActive switch
 * sadece edit modunda görünür.
 *
 * 400 → fieldErrors form'a bind. 404 (edit) → toast.
 */

interface Props {
  isOpen: boolean;
  service: ServiceSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceFormModal({ isOpen, service, onClose, onSaved }: Props) {
  const isEdit = !!service;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={service?.id ?? "create"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-form-title"
        >
          {isEdit && service ? (
            <EditDialog
              service={service}
              onClose={onClose}
              onSaved={onSaved}
            />
          ) : (
            <CreateDialog onClose={onClose} onSaved={onSaved} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Create
// ============================================================

function CreateDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const mutation = useCreateServiceMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<CreateServiceFormValues>({
    resolver: zodResolver(createServiceSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      price: 0,
      durationMinutes: 30,
    },
  });

  useModalEffects(onClose, mutation.isPending);

  const onSubmit = (values: CreateServiceFormValues) => {
    setTopError(null);
    const body: CreateServiceDto = {
      name: values.name.trim(),
      price: values.price,
      durationMinutes: values.durationMinutes,
    };
    mutation.mutate(body, {
      onSuccess: (res) => {
        notify.success(res.message ?? "Hizmet oluşturuldu.");
        onSaved();
        onClose();
      },
      onError: (err) => {
        if (!isApiError(err)) {
          setTopError("Beklenmeyen bir hata oluştu.");
          return;
        }
        bindFieldErrors(
          err,
          form as unknown as ReturnType<typeof useForm>,
          setTopError,
        );
      },
    });
  };

  return (
    <DialogShell
      title="Yeni Hizmet"
      submitting={mutation.isPending}
      onClose={onClose}
    >
      <FormBody
        form={form as unknown as ReturnType<typeof useForm<UpdateServiceFormValues>>}
        topError={topError}
        submitting={mutation.isPending}
        onSubmit={onSubmit as never}
        onCancel={onClose}
        submitLabel="Hizmeti Oluştur"
      />
    </DialogShell>
  );
}

// ============================================================
// Edit
// ============================================================

function EditDialog({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceSummaryDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mutation = useUpdateServiceMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<UpdateServiceFormValues>({
    resolver: zodResolver(updateServiceSchema),
    mode: "onBlur",
    defaultValues: {
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
    },
  });

  useModalEffects(onClose, mutation.isPending);

  const onSubmit = (values: UpdateServiceFormValues) => {
    setTopError(null);
    const body: UpdateServiceDto = {
      name: values.name.trim(),
      price: values.price,
      durationMinutes: values.durationMinutes,
      isActive: values.isActive,
    };
    mutation.mutate(
      { id: service.id, body },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "Hizmet güncellendi.");
          onSaved();
          onClose();
        },
        onError: (err) => {
          if (!isApiError(err)) {
            setTopError("Beklenmeyen bir hata oluştu.");
            return;
          }
          if (err.status === 404) {
            setTopError("Hizmet bulunamadı (silinmiş olabilir).");
            return;
          }
          bindFieldErrors(
            err,
            form as unknown as ReturnType<typeof useForm>,
            setTopError,
          );
        },
      },
    );
  };

  return (
    <DialogShell
      title={`Düzenle: ${service.name}`}
      submitting={mutation.isPending}
      onClose={onClose}
    >
      <FormBody
        form={form}
        topError={topError}
        submitting={mutation.isPending}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitLabel="Kaydet"
        showIsActive
      />
    </DialogShell>
  );
}

// ============================================================
// Shared dialog shell
// ============================================================

function DialogShell({
  title,
  onClose,
  submitting,
  children,
}: {
  title: string;
  onClose: () => void;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => {
          if (!submitting) onClose();
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center flex-shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs tracking-[0.2em] uppercase text-oldGold-600">
                Hizmet
              </p>
              <h2
                id="service-form-title"
                className="font-display text-xl text-charcoal-900 truncate"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-charcoal-300 hover:text-charcoal-900 hover:bg-charcoal-50 disabled:opacity-40 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {children}
      </motion.div>
    </>
  );
}

// ============================================================
// Shared form body
// ============================================================

interface FormBodyProps {
  form: ReturnType<typeof useForm<UpdateServiceFormValues>>;
  topError: string | null;
  submitting: boolean;
  onSubmit: (values: UpdateServiceFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  showIsActive?: boolean;
}

function FormBody({
  form,
  topError,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
  showIsActive = false,
}: FormBodyProps) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="px-6 py-5 space-y-4"
    >
      {topError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-statusBusy/40 bg-statusBusy/5 px-3 py-2 text-sm text-statusBusy"
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{topError}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="service-name"
          className="block text-sm font-medium text-charcoal-500 mb-1.5"
        >
          Hizmet Adı <span className="text-statusBusy">*</span>
        </label>
        <input
          id="service-name"
          type="text"
          maxLength={200}
          disabled={submitting}
          placeholder="Saç Kesimi, Sakal Tıraşı, …"
          {...form.register("name")}
          className={inputClass}
        />
        {form.formState.errors.name && (
          <p className="text-statusBusy text-xs mt-1.5">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="service-price"
            className="block text-sm font-medium text-charcoal-500 mb-1.5"
          >
            Fiyat (₺) <span className="text-statusBusy">*</span>
          </label>
          <input
            id="service-price"
            type="number"
            step="0.01"
            min={0}
            max={10000}
            disabled={submitting}
            {...form.register("price", { valueAsNumber: true })}
            className={inputClass}
          />
          {form.formState.errors.price && (
            <p className="text-statusBusy text-xs mt-1.5">
              {form.formState.errors.price.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="service-duration"
            className="block text-sm font-medium text-charcoal-500 mb-1.5"
          >
            Süre (dk) <span className="text-statusBusy">*</span>
          </label>
          <input
            id="service-duration"
            type="number"
            step="1"
            min={5}
            max={480}
            disabled={submitting}
            {...form.register("durationMinutes", { valueAsNumber: true })}
            className={inputClass}
          />
          {form.formState.errors.durationMinutes && (
            <p className="text-statusBusy text-xs mt-1.5">
              {form.formState.errors.durationMinutes.message}
            </p>
          )}
        </div>
      </div>

      {showIsActive && (
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/40 p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-charcoal-900">Aktif</p>
            <p className="text-xs text-charcoal-300">
              Pasif hizmet müşteri tarafında ve berber atamasında görünmez.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              disabled={submitting}
              {...form.register("isActive")}
            />
            <span className="w-11 h-6 bg-charcoal-100 rounded-full peer peer-checked:bg-oldGold-500 transition-colors" />
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      )}

      <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg border border-charcoal-100 text-charcoal-500 hover:text-charcoal-900 hover:border-charcoal-200 disabled:opacity-40 text-sm font-medium transition-colors"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-200 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

// ============================================================
// Helpers
// ============================================================

function useModalEffects(onClose: () => void, isPending: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isPending, onClose]);
}

function bindFieldErrors(
  err: import("@/api/client").ApiError,
  form: ReturnType<typeof useForm>,
  setTopError: (msg: string | null) => void,
) {
  if (err.status === 400 && err.fieldErrors) {
    let bound = false;
    for (const [key, messages] of Object.entries(err.fieldErrors)) {
      const f = mapField(key);
      if (f && messages[0]) {
        form.setError(f as never, { message: messages[0] });
        bound = true;
      }
    }
    if (!bound) setTopError(err.message);
    return;
  }
  setTopError(err.message);
}

function mapField(
  key: string,
):
  | "name"
  | "price"
  | "durationMinutes"
  | "isActive"
  | null {
  const k = key.toLowerCase();
  if (k === "name") return "name";
  if (k === "price") return "price";
  if (k === "durationminutes") return "durationMinutes";
  if (k === "isactive") return "isActive";
  return null;
}

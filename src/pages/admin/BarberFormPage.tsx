import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Save,
  ShieldAlert,
} from "lucide-react";

import {
  useAdminBarberDetail,
  useCreateBarberMutation,
  useUpdateBarberMutation,
} from "@/features/admin/barbersQueries";
import { Skeleton } from "@/components/Skeleton";
import {
  createBarberSchema,
  type CreateBarberFormValues,
  type UpdateBarberFormValues,
  updateBarberSchema,
} from "@/lib/schemas";
import { isApiError, type ApiError } from "@/api/client";
import { notify } from "@/lib/toast";
import {
  getBarberPhoto,
  getBarberPhotoOnError,
} from "@/lib/imageFallbacks";
import type {
  CreateBarberDto,
  UpdateBarberDto,
} from "@/api/types";

/**
 * FAZ 8 / M1 — Berber create / edit (Bölüm 7.1).
 *
 * Mode:
 *  - /admin/barbers/new       → create (POST /api/Barbers/create)
 *  - /admin/barbers/:id/edit  → update (PUT /api/Barbers/{id}/update)
 *
 * 400 → form.setError (fieldErrors); 404 → "berber bulunamadı".
 */

export function BarberFormPage() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  return isEdit ? <EditBarberForm id={params.id!} /> : <CreateBarberForm />;
}

// ============================================================
// Create
// ============================================================

function CreateBarberForm() {
  const navigate = useNavigate();
  const mutation = useCreateBarberMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<CreateBarberFormValues>({
    resolver: zodResolver(createBarberSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      specialty: "",
      photoUrl: "",
      bio: "",
    },
  });

  const onSubmit = (values: CreateBarberFormValues) => {
    setTopError(null);
    const body: CreateBarberDto = {
      fullName: values.fullName,
      specialty: emptyToUndefined(values.specialty),
      photoUrl: emptyToNull(values.photoUrl),
      bio: emptyToUndefined(values.bio),
    };
    mutation.mutate(body, {
      onSuccess: (res) => {
        notify.success(res.message ?? "Berber oluşturuldu.");
        navigate(`/admin/barbers/${res.id}`, { replace: true });
      },
      onError: (err) => {
        if (!isApiError(err)) {
          setTopError("Beklenmeyen bir hata oluştu.");
          return;
        }
        bindFieldErrors(err, form, setTopError);
      },
    });
  };

  return (
    <FormShell
      title="Yeni Berber"
      subtitle="Berber bilgilerini gir."
      backHref="/admin/barbers"
    >
      <BarberFormFields
        form={form}
        topError={topError}
        submitting={mutation.isPending}
        onSubmit={onSubmit}
        submitLabel="Berberi Oluştur"
      />
    </FormShell>
  );
}

// ============================================================
// Edit
// ============================================================

function EditBarberForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const detail = useAdminBarberDetail(id);
  const mutation = useUpdateBarberMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<UpdateBarberFormValues>({
    resolver: zodResolver(updateBarberSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      specialty: "",
      photoUrl: "",
      bio: "",
      isActive: true,
    },
  });

  // Detail yüklendiğinde formu doldur
  useEffect(() => {
    if (!detail.data) return;
    form.reset({
      fullName: detail.data.fullName,
      specialty: detail.data.specialty ?? "",
      photoUrl: detail.data.photoUrl ?? "",
      bio: detail.data.bio ?? "",
      isActive: detail.data.isActive,
    });
  }, [detail.data, form]);

  const onSubmit = (values: UpdateBarberFormValues) => {
    setTopError(null);
    const body: UpdateBarberDto = {
      fullName: values.fullName,
      specialty: emptyToNull(values.specialty),
      photoUrl: emptyToNull(values.photoUrl),
      bio: emptyToNull(values.bio),
      isActive: values.isActive,
    };
    mutation.mutate(
      { id, body },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "Berber güncellendi.");
          navigate(`/admin/barbers/${id}`);
        },
        onError: (err) => {
          if (!isApiError(err)) {
            setTopError("Beklenmeyen bir hata oluştu.");
            return;
          }
          if (err.status === 404) {
            setTopError("Berber bulunamadı.");
            return;
          }
          bindFieldErrors(err, form, setTopError);
        },
      },
    );
  };

  if (detail.isLoading) {
    return (
      <FormShell
        title="Berber Düzenle"
        subtitle="Yükleniyor…"
        backHref={`/admin/barbers/${id}`}
      >
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </FormShell>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <FormShell
        title="Berber Düzenle"
        subtitle="Hata"
        backHref="/admin/barbers"
      >
        <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5" />
          <div>
            <p className="text-sm font-medium text-charcoal-900">
              Berber yüklenemedi
            </p>
            <p className="text-xs text-charcoal-300 mt-1">
              {detail.error?.message ?? "Lütfen tekrar deneyin."}
            </p>
            <button
              type="button"
              onClick={() => detail.refetch()}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell
      title={`Düzenle: ${detail.data.fullName}`}
      subtitle="Berber bilgilerini güncelle."
      backHref={`/admin/barbers/${id}`}
    >
      <BarberFormFields
        form={form}
        topError={topError}
        submitting={mutation.isPending}
        onSubmit={onSubmit}
        submitLabel="Değişiklikleri Kaydet"
        showIsActive
      />
    </FormShell>
  );
}

// ============================================================
// Shared form
// ============================================================

interface BarberFormFieldsProps<
  T extends CreateBarberFormValues | UpdateBarberFormValues,
> {
  form: ReturnType<typeof useForm<T>>;
  topError: string | null;
  submitting: boolean;
  onSubmit: (values: T) => void;
  submitLabel: string;
  showIsActive?: boolean;
}

function BarberFormFields<
  T extends CreateBarberFormValues | UpdateBarberFormValues,
>({
  form,
  topError,
  submitting,
  onSubmit,
  submitLabel,
  showIsActive = false,
}: BarberFormFieldsProps<T>) {
  // Generic'lik için cast (RHF tipleri zaten validated)
  const f = form as unknown as ReturnType<
    typeof useForm<UpdateBarberFormValues>
  >;
  const photoUrl = f.watch("photoUrl");

  return (
    <form
      onSubmit={f.handleSubmit(onSubmit as never)}
      className="space-y-5"
      noValidate
    >
      {topError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-statusBusy/40 bg-statusBusy/5 px-4 py-3 text-sm text-statusBusy"
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{topError}</p>
        </div>
      )}

      <Field
        label="Ad Soyad"
        required
        error={f.formState.errors.fullName?.message}
      >
        <input
          type="text"
          autoComplete="name"
          maxLength={50}
          disabled={submitting}
          {...f.register("fullName")}
          className={inputClass}
        />
      </Field>

      <Field label="Uzmanlık" error={f.formState.errors.specialty?.message}>
        <input
          type="text"
          maxLength={200}
          disabled={submitting}
          placeholder="Sakal & Tıraş, Modern Kesim, …"
          {...f.register("specialty")}
          className={inputClass}
        />
      </Field>

      <Field
        label="Foto URL"
        error={f.formState.errors.photoUrl?.message}
        hint="Boş bırakılırsa fotoğraf eklenmez."
      >
        <div className="flex items-start gap-4">
          <input
            type="url"
            maxLength={500}
            disabled={submitting}
            placeholder="https://…"
            {...f.register("photoUrl")}
            className={inputClass}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <img
            src={getBarberPhoto(photoUrl ?? null, "preview")}
            alt="Önizleme"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback) return;
              img.dataset.fallback = "1";
              img.src = getBarberPhotoOnError("preview");
            }}
            className="w-16 h-16 rounded-full object-cover bg-charcoal-100"
          />
          <span className="text-xs text-charcoal-300">Önizleme</span>
        </div>
      </Field>

      <Field label="Biyografi" error={f.formState.errors.bio?.message}>
        <textarea
          rows={4}
          maxLength={500}
          disabled={submitting}
          placeholder="Kısa tanıtım…"
          {...f.register("bio")}
          className={`${inputClass} resize-none`}
        />
      </Field>

      {showIsActive && (
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/40 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-charcoal-900">Aktif</p>
            <p className="text-xs text-charcoal-300">
              Pasif berber müşteri tarafında görünmez.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              disabled={submitting}
              {...f.register("isActive")}
            />
            <span className="w-11 h-6 bg-charcoal-100 rounded-full peer peer-checked:bg-oldGold-500 transition-colors" />
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal-500 mb-1.5">
        {label}
        {required && <span className="text-statusBusy ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-statusBusy text-xs mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-charcoal-300 text-xs mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

interface FormShellProps {
  title: string;
  subtitle: string;
  backHref: string;
  children: React.ReactNode;
}

function FormShell({ title, subtitle, backHref, children }: FormShellProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-oldGold-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Geri
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 md:p-8"
      >
        <header className="mb-6">
          <h1 className="font-display text-2xl text-charcoal-900">{title}</h1>
          <p className="text-sm text-charcoal-300 mt-1">{subtitle}</p>
        </header>
        {children}
      </motion.div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function emptyToUndefined(v: string | undefined): string | undefined {
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function emptyToNull(v: string | undefined): string | null {
  return v && v.trim().length > 0 ? v.trim() : null;
}

function bindFieldErrors<
  T extends CreateBarberFormValues | UpdateBarberFormValues,
>(
  err: ApiError,
  form: ReturnType<typeof useForm<T>>,
  setTopError: (msg: string | null) => void,
) {
  if (err.status === 400 && err.fieldErrors) {
    let bound = false;
    for (const [key, messages] of Object.entries(err.fieldErrors)) {
      const f = mapField(key);
      if (f && messages[0]) {
        (form as unknown as ReturnType<typeof useForm>).setError(f, {
          message: messages[0],
        });
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
  | "fullName"
  | "specialty"
  | "photoUrl"
  | "bio"
  | "isActive"
  | null {
  const k = key.toLowerCase();
  if (k === "fullname") return "fullName";
  if (k === "specialty") return "specialty";
  if (k === "photourl") return "photoUrl";
  if (k === "bio") return "bio";
  if (k === "isactive") return "isActive";
  return null;
}

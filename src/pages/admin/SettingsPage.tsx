import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
} from "lucide-react";

import {
  useShopSettings,
  useUpdateShopSettingsMutation,
} from "@/features/admin/settingsQueries";
import { Skeleton } from "@/components/Skeleton";
import { isApiError, type ApiError } from "@/api/client";
import type { DayOfWeek, UpdateShopSettingsDto } from "@/api/types";
import { DAY_OF_WEEK_TR_LONG } from "@/lib/formatters";
import {
  shopSettingsSchema,
  type ShopSettingsFormValues,
} from "@/lib/schemas";
import { notify } from "@/lib/toast";

/**
 * FAZ 10 — Admin Salon Ayarları (Bölüm 7.4).
 *
 * Form backend validation ile aynı kuralları uygular:
 * - defaultOpenTime < defaultCloseTime
 * - closedDays distinct (.NET DayOfWeek: 0=Pazar ... 6=Cumartesi)
 * - slotMinutes 5-120
 * - maxAppointmentsPerPhonePerDay 1-20
 * - minCancellationHoursBefore 0-72
 */

const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_VALUES: ShopSettingsFormValues = {
  defaultOpenTime: "09:00",
  defaultCloseTime: "20:00",
  closedDays: [],
  slotMinutes: 15,
  maxAppointmentsPerPhonePerDay: 3,
  minCancellationHoursBefore: 2,
};

function normalizeTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.length >= 5 ? time.substring(0, 5) : time;
}

function toBackendTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function SettingsPage() {
  const settingsQuery = useShopSettings();
  const mutation = useUpdateShopSettingsMutation();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<ShopSettingsFormValues>({
    resolver: zodResolver(shopSettingsSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    form.reset({
      defaultOpenTime: normalizeTime(settingsQuery.data.defaultOpenTime),
      defaultCloseTime: normalizeTime(settingsQuery.data.defaultCloseTime),
      closedDays: [...settingsQuery.data.closedDays],
      slotMinutes: settingsQuery.data.slotMinutes,
      maxAppointmentsPerPhonePerDay:
        settingsQuery.data.maxAppointmentsPerPhonePerDay,
      minCancellationHoursBefore:
        settingsQuery.data.minCancellationHoursBefore,
    });
    setTopError(null);
  }, [settingsQuery.data, form]);

  const closedDays = form.watch("closedDays");
  const submitting = mutation.isPending;
  const isDirty = form.formState.isDirty;

  const closedSummary = useMemo(() => {
    if (closedDays.length === 0) return "Kapalı gün yok";
    return DAY_ORDER.filter((d) => closedDays.includes(d))
      .map((d) => DAY_OF_WEEK_TR_LONG[d])
      .join(", ");
  }, [closedDays]);

  const toggleClosedDay = (day: DayOfWeek) => {
    const next = closedDays.includes(day)
      ? closedDays.filter((d) => d !== day)
      : [...closedDays, day];
    form.setValue("closedDays", next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleReset = () => {
    setTopError(null);
    if (settingsQuery.data) {
      form.reset({
        defaultOpenTime: normalizeTime(settingsQuery.data.defaultOpenTime),
        defaultCloseTime: normalizeTime(settingsQuery.data.defaultCloseTime),
        closedDays: [...settingsQuery.data.closedDays],
        slotMinutes: settingsQuery.data.slotMinutes,
        maxAppointmentsPerPhonePerDay:
          settingsQuery.data.maxAppointmentsPerPhonePerDay,
        minCancellationHoursBefore:
          settingsQuery.data.minCancellationHoursBefore,
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  };

  const onSubmit = (values: ShopSettingsFormValues) => {
    setTopError(null);
    const body: UpdateShopSettingsDto = {
      defaultOpenTime: toBackendTime(values.defaultOpenTime),
      defaultCloseTime: toBackendTime(values.defaultCloseTime),
      closedDays: [...values.closedDays].sort((a, b) => a - b),
      slotMinutes: values.slotMinutes,
      maxAppointmentsPerPhonePerDay: values.maxAppointmentsPerPhonePerDay,
      minCancellationHoursBefore: values.minCancellationHoursBefore,
    };

    mutation.mutate(body, {
      onSuccess: (res) => {
        notify.success(res.message ?? "Salon ayarları güncellendi.");
        form.reset({
          ...values,
          closedDays: body.closedDays,
        });
      },
      onError: (err) => {
        if (isApiError(err)) {
          bindFieldErrors(err, form, setTopError);
        } else {
          setTopError("Beklenmeyen bir hata oluştu.");
        }
      },
    });
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-statusBusy/30 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-charcoal-900">
            Salon ayarları yüklenemedi
          </p>
          <p className="text-xs text-charcoal-300 mt-1">
            {settingsQuery.error?.message ?? "Lütfen tekrar deneyin."}
          </p>
          <button
            type="button"
            onClick={() => settingsQuery.refetch()}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-charcoal-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-oldGold-600" />
            Salon Ayarları
          </h1>
          <p className="text-sm text-charcoal-300 mt-1">
            Çalışma saatleri, kapalı günler, slot süresi ve randevu limitleri.
          </p>
        </div>

        <button
          type="button"
          onClick={() => settingsQuery.refetch()}
          disabled={settingsQuery.isFetching || submitting}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${settingsQuery.isFetching ? "animate-spin" : ""}`}
          />
          Yenile
        </button>
      </header>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl text-charcoal-900">
              Genel Çalışma Kuralları
            </h2>
            <p className="text-sm text-charcoal-300 mt-0.5">
              Berbere özel takvim yoksa bu ayarlar slot hesaplamasında fallback
              olarak kullanılır.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {topError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-statusBusy/30 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{topError}</p>
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TimeField
              id="defaultOpenTime"
              label="Varsayılan Açılış Saati"
              disabled={submitting}
              register={form.register("defaultOpenTime")}
              error={form.formState.errors.defaultOpenTime?.message}
            />
            <TimeField
              id="defaultCloseTime"
              label="Varsayılan Kapanış Saati"
              disabled={submitting}
              register={form.register("defaultCloseTime")}
              error={form.formState.errors.defaultCloseTime?.message}
            />
          </section>

          <section>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-medium text-charcoal-900">
                  Kapalı Günler
                </h3>
                <p className="text-xs text-charcoal-300 mt-0.5">
                  {closedSummary}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {DAY_ORDER.map((day) => {
                const active = closedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={submitting}
                    onClick={() => toggleClosedDay(day)}
                    aria-pressed={active}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      active
                        ? "bg-charcoal-900 border-charcoal-900 text-white"
                        : "bg-white border-charcoal-100 text-charcoal-500 hover:border-oldGold-400 hover:text-oldGold-600"
                    }`}
                  >
                    {DAY_OF_WEEK_TR_LONG[day]}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.closedDays && (
              <p className="text-statusBusy text-xs mt-2">
                {form.formState.errors.closedDays.message}
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField
              id="slotMinutes"
              label="Slot Süresi (dk)"
              min={5}
              max={120}
              disabled={submitting}
              register={form.register("slotMinutes", { valueAsNumber: true })}
              error={form.formState.errors.slotMinutes?.message}
              hint="5-120 dakika"
            />
            <NumberField
              id="maxAppointmentsPerPhonePerDay"
              label="Telefon Başına Günlük Limit"
              min={1}
              max={20}
              disabled={submitting}
              register={form.register("maxAppointmentsPerPhonePerDay", {
                valueAsNumber: true,
              })}
              error={
                form.formState.errors.maxAppointmentsPerPhonePerDay?.message
              }
              hint="1-20 randevu"
            />
            <NumberField
              id="minCancellationHoursBefore"
              label="Minimum İptal Süresi (saat)"
              min={0}
              max={72}
              disabled={submitting}
              register={form.register("minCancellationHoursBefore", {
                valueAsNumber: true,
              })}
              error={
                form.formState.errors.minCancellationHoursBefore?.message
              }
              hint="0-72 saat"
            />
          </section>
        </div>

        <footer className="px-6 py-4 border-t border-charcoal-100 bg-charcoal-50/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-charcoal-300">
            {isDirty
              ? "Kaydedilmemiş değişiklik var."
              : "Tüm değişiklikler kaydedildi."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:text-charcoal-900 hover:border-charcoal-200 disabled:opacity-40 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Sıfırla
            </button>
            <button
              type="submit"
              disabled={!isDirty || submitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet
            </button>
          </div>
        </footer>
      </motion.form>
    </div>
  );
}

interface TimeFieldProps {
  id: keyof Pick<
    ShopSettingsFormValues,
    "defaultOpenTime" | "defaultCloseTime"
  >;
  label: string;
  disabled: boolean;
  register: ReturnType<
    ReturnType<typeof useForm<ShopSettingsFormValues>>["register"]
  >;
  error?: string;
}

function TimeField({ id, label, disabled, register, error }: TimeFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-charcoal-500 mb-1.5"
      >
        {label} <span className="text-statusBusy">*</span>
      </label>
      <input
        id={id}
        type="time"
        disabled={disabled}
        {...register}
        className={inputClass}
      />
      {error && <p className="text-statusBusy text-xs mt-1.5">{error}</p>}
    </div>
  );
}

interface NumberFieldProps {
  id: keyof Pick<
    ShopSettingsFormValues,
    | "slotMinutes"
    | "maxAppointmentsPerPhonePerDay"
    | "minCancellationHoursBefore"
  >;
  label: string;
  min: number;
  max: number;
  disabled: boolean;
  register: ReturnType<
    ReturnType<typeof useForm<ShopSettingsFormValues>>["register"]
  >;
  error?: string;
  hint: string;
}

function NumberField({
  id,
  label,
  min,
  max,
  disabled,
  register,
  error,
  hint,
}: NumberFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-charcoal-500 mb-1.5"
      >
        {label} <span className="text-statusBusy">*</span>
      </label>
      <input
        id={id}
        type="number"
        step="1"
        min={min}
        max={max}
        disabled={disabled}
        {...register}
        className={inputClass}
      />
      {error ? (
        <p className="text-statusBusy text-xs mt-1.5">{error}</p>
      ) : (
        <p className="text-charcoal-300 text-xs mt-1.5">{hint}</p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-200 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

function bindFieldErrors(
  err: ApiError,
  form: ReturnType<typeof useForm<ShopSettingsFormValues>>,
  setTopError: (msg: string | null) => void,
) {
  if (err.status === 400 && err.fieldErrors) {
    let bound = false;
    for (const [key, messages] of Object.entries(err.fieldErrors)) {
      const f = mapField(key);
      if (f && messages[0]) {
        form.setError(f, { message: messages[0] });
        bound = true;
      }
    }
    if (!bound) setTopError(err.message);
    return;
  }
  setTopError(err.message);
}

function mapField(key: string): keyof ShopSettingsFormValues | null {
  const k = key.toLowerCase();
  if (k === "defaultopentime") return "defaultOpenTime";
  if (k === "defaultclosetime") return "defaultCloseTime";
  if (k === "closeddays") return "closedDays";
  if (k === "slotminutes") return "slotMinutes";
  if (k === "maxappointmentsperphoneperday")
    return "maxAppointmentsPerPhonePerDay";
  if (k === "mincancellationhoursbefore")
    return "minCancellationHoursBefore";
  return null;
}

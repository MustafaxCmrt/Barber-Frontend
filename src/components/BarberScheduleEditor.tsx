import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";

import {
  useBarberSchedule,
  useUpdateBarberScheduleMutation,
} from "@/features/admin/barbersQueries";
import { Skeleton } from "@/components/Skeleton";
import { DAY_OF_WEEK_TR_LONG } from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import type {
  BarberScheduleDayDto,
  DayOfWeek,
} from "@/api/types";

/**
 * FAZ 8 / M2 — Berber Çalışma Takvimi (Bölüm 7.1).
 *
 * 7 gün, her gün isWorking switch + start/end time pickers.
 * Backend validation:
 *  - 7 gün distinct
 *  - isWorking=true ise startTime + endTime zorunlu, startTime < endTime
 *
 * UI bunları submit'ten önce doğrular; hata satır altında inline.
 *
 * Display order: Pazartesi → Pazar (1..6, 0). DayOfWeek .NET enum: 0=Pazar.
 */

const DISPLAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  barberId: string;
}

interface DayRowState {
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime: string; // "HH:mm" or ""
  endTime: string;
}

function normalizeTime(time: string | null): string {
  if (!time) return "";
  // Backend "HH:mm:ss" veya "HH:mm" döndürebilir — <input type="time"> "HH:mm" ister
  return time.length >= 5 ? time.substring(0, 5) : time;
}

/**
 * "HH:mm" → "HH:mm:ss". Backend System.TimeOnly deserializer'ı saniyesiz
 * formatı reddediyor ("could not be converted to System.TimeOnly").
 * GET response saniyeli/saniyesiz ikisi de gelebiliyor (asimetrik), input'ta
 * HH:mm gösteriyoruz, çıkışta HH:mm:ss'e çeviriyoruz.
 */
function toBackendTime(time: string): string {
  if (!time) return time;
  return time.length === 5 ? `${time}:00` : time;
}

function dayMapToRows(days: BarberScheduleDayDto[]): DayRowState[] {
  const map = new Map<DayOfWeek, BarberScheduleDayDto>();
  for (const d of days) map.set(d.dayOfWeek, d);
  return DISPLAY_ORDER.map((dow) => {
    const d = map.get(dow);
    return {
      dayOfWeek: dow,
      isWorking: d?.isWorking ?? false,
      startTime: normalizeTime(d?.startTime ?? null),
      endTime: normalizeTime(d?.endTime ?? null),
    };
  });
}

function rowsToBackend(rows: DayRowState[]): BarberScheduleDayDto[] {
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    isWorking: r.isWorking,
    startTime: r.isWorking ? toBackendTime(r.startTime) : null,
    endTime: r.isWorking ? toBackendTime(r.endTime) : null,
  }));
}

function rowError(r: DayRowState): string | null {
  if (!r.isWorking) return null;
  if (!r.startTime || !r.endTime) return "Başlangıç ve bitiş zorunlu";
  if (r.startTime >= r.endTime)
    return "Başlangıç bitişten önce olmalı";
  return null;
}

export function BarberScheduleEditor({ barberId }: Props) {
  const scheduleQuery = useBarberSchedule(barberId);
  const mutation = useUpdateBarberScheduleMutation();

  const [rows, setRows] = useState<DayRowState[] | null>(null);

  // İlk yükte ve refetch sonrası state'i sync et
  useEffect(() => {
    if (scheduleQuery.data) {
      setRows(dayMapToRows(scheduleQuery.data.days));
    }
  }, [scheduleQuery.data]);

  const initialRows = useMemo(
    () =>
      scheduleQuery.data
        ? dayMapToRows(scheduleQuery.data.days)
        : null,
    [scheduleQuery.data],
  );

  const isDirty = useMemo(() => {
    if (!rows || !initialRows) return false;
    return JSON.stringify(rows) !== JSON.stringify(initialRows);
  }, [rows, initialRows]);

  const errors = useMemo(
    () => (rows ? rows.map(rowError) : []),
    [rows],
  );
  const hasErrors = errors.some((e) => e !== null);

  const updateRow = (
    dow: DayOfWeek,
    patch: Partial<Omit<DayRowState, "dayOfWeek">>,
  ) => {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.dayOfWeek === dow ? { ...r, ...patch } : r))
        : prev,
    );
  };

  const handleReset = () => {
    if (initialRows) setRows(initialRows);
  };

  const handleSave = () => {
    if (!rows || hasErrors) return;
    mutation.mutate(
      { id: barberId, body: { days: rowsToBackend(rows) } },
      {
        onSuccess: (res) => {
          notify.success(res.message ?? "Çalışma takvimi güncellendi.");
        },
        onError: (err) => {
          notify.error(
            isApiError(err) ? err.message : "Takvim güncellenemedi.",
          );
        },
      },
    );
  };

  if (scheduleQuery.isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-6 space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (scheduleQuery.isError || !scheduleQuery.data || !rows) {
    return (
      <div className="rounded-2xl bg-white border border-statusBusy/30 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-charcoal-900">
            Çalışma takvimi yüklenemedi
          </p>
          <p className="text-xs text-charcoal-300 mt-1">
            {scheduleQuery.error?.message ?? "Lütfen tekrar deneyin."}
          </p>
          <button
            type="button"
            onClick={() => scheduleQuery.refetch()}
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden"
    >
      <header className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-oldGold-600" />
          Çalışma Takvimi
        </h2>
        <p className="text-xs text-charcoal-300">
          Pasif gün → kapalı sayılır. Çalışma saati değişikliği müsait slotları
          anında etkiler.
        </p>
      </header>

      <div className="divide-y divide-charcoal-100">
        {rows.map((r, idx) => {
          const err = errors[idx];
          return (
            <div
              key={r.dayOfWeek}
              className="px-6 py-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
            >
              <div className="sm:col-span-3 flex items-center gap-3">
                <span className="font-medium text-charcoal-900 w-28">
                  {DAY_OF_WEEK_TR_LONG[r.dayOfWeek]}
                </span>
                <ToggleSwitch
                  checked={r.isWorking}
                  disabled={mutation.isPending}
                  onChange={(v) => updateRow(r.dayOfWeek, { isWorking: v })}
                  label={r.isWorking ? "Açık" : "Kapalı"}
                />
              </div>

              <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TimeField
                  label="Başlangıç"
                  value={r.startTime}
                  disabled={!r.isWorking || mutation.isPending}
                  onChange={(v) => updateRow(r.dayOfWeek, { startTime: v })}
                />
                <TimeField
                  label="Bitiş"
                  value={r.endTime}
                  disabled={!r.isWorking || mutation.isPending}
                  onChange={(v) => updateRow(r.dayOfWeek, { endTime: v })}
                />
              </div>

              {err && (
                <p className="sm:col-span-12 text-xs text-statusBusy">
                  {err}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <footer className="px-6 py-4 border-t border-charcoal-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-charcoal-300">
          {isDirty
            ? "Kaydedilmemiş değişiklik var."
            : "Tüm değişiklikler kaydedildi."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || mutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:text-charcoal-900 hover:border-charcoal-200 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Sıfırla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || hasErrors || mutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-oldGold-500 hover:bg-oldGold-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Kaydet
          </button>
        </div>
      </footer>
    </motion.div>
  );
}

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function ToggleSwitch({ checked, disabled, onChange, label }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="w-10 h-5 bg-charcoal-100 rounded-full peer peer-checked:bg-oldGold-500 peer-disabled:opacity-50 transition-colors" />
        <span
          className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
      <span
        className={`text-xs font-medium ${
          checked ? "text-oldGold-600" : "text-charcoal-300"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

interface TimeFieldProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}

function TimeField({ label, value, disabled, onChange }: TimeFieldProps) {
  return (
    <label className="text-xs text-charcoal-300">
      {label}
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full px-3 py-2 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-900 focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30 disabled:bg-charcoal-50 disabled:text-charcoal-300 disabled:cursor-not-allowed transition-colors"
      />
    </label>
  );
}

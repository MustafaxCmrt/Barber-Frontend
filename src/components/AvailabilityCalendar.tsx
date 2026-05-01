import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAvailability } from "@/features/public/queries";
import type { AvailabilityDayDto } from "@/api/types";
import { isApiError } from "@/api/client";
import { ErrorCode } from "@/api/errorCodes";

/**
 * Müşteri randevu akışında "Tarih & Saat" adımının takvim bileşeni.
 *
 * Aylık grid; backend `availability` endpoint'i her gün için kapalı / dolu /
 * müsait bilgisini tek istekte döner. Spec:
 *  - !isOpen                       → "closed"    (gri, "Kapalı / izinli")
 *  - isOpen && !hasFreeSlot        → "full"      (gri, "Tüm randevular dolu")
 *  - isOpen && hasFreeSlot         → "available" (tıklanabilir)
 *
 * Frontend ek kuralları:
 *  - Bugünden önceki günler ve `maxDate`'ten sonrası tıklanamaz (range dışı).
 *  - Backend aralığı 31 günü geçemediği için her ay için ayrı istek atılır.
 *  - Polling yok — saat listesi (SlotGrid) için zaten tazeleme var.
 */

type DayState = "closed" | "full" | "available" | "outside";

interface AvailabilityCalendarProps {
  barberId: string;
  serviceIds: string[];
  /** Seçili gün — "YYYY-MM-DD". Yoksa boş string. */
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** Bugün, "YYYY-MM-DD". Geçmiş günler tıklanamaz. */
  minDate: string;
  /** Bugünden 60 gün ileri (booking flow sınırı), "YYYY-MM-DD". */
  maxDate: string;
}

export function AvailabilityCalendar({
  barberId,
  serviceIds,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
}: AvailabilityCalendarProps) {
  // Görüntülenen ayın ilk günü (state). Default: seçili gün varsa onun ayı,
  // yoksa bugünkü ay.
  const [viewMonth, setViewMonth] = useState<string>(() => {
    const seed = selectedDate || minDate;
    return dayjs(seed).startOf("month").format("YYYY-MM-DD");
  });

  const monthStart = dayjs(viewMonth).startOf("month");
  const monthEnd = monthStart.endOf("month");

  // Endpoint aralığı: ayın min(monthStart, today) ile max(monthEnd, today+60)
  // kesişimi. 31 gün sınırı doğal olarak ay sınırından daha sıkı değil.
  const rangeFrom =
    monthStart.format("YYYY-MM-DD") < minDate
      ? minDate
      : monthStart.format("YYYY-MM-DD");
  const rangeTo =
    monthEnd.format("YYYY-MM-DD") > maxDate
      ? maxDate
      : monthEnd.format("YYYY-MM-DD");

  const hasValidRange = rangeFrom <= rangeTo;

  const query = useAvailability(
    {
      barberId,
      serviceIds,
      from: rangeFrom,
      to: rangeTo,
    },
    { enabled: hasValidRange },
  );

  // Backend günlerini date map'ine çevir.
  const dayMap = useMemo(() => {
    const map = new Map<string, AvailabilityDayDto>();
    for (const d of query.data?.days ?? []) {
      map.set(d.date, d);
    }
    return map;
  }, [query.data]);

  // 6 hafta × 7 gün grid — TR locale (formatters.ts'te set edildi) Pazartesi
  // başlar.
  const gridDays = useMemo(() => {
    const start = monthStart.startOf("week");
    return Array.from({ length: 42 }, (_, i) =>
      start.add(i, "day").format("YYYY-MM-DD"),
    );
  }, [monthStart]);

  const monthLabel = monthStart.format("MMMM YYYY");

  const canPrev = monthStart.subtract(1, "month").endOf("month").format("YYYY-MM-DD") >= minDate;
  const canNext = monthStart.add(1, "month").format("YYYY-MM-DD") <= maxDate;

  const goPrev = () => {
    if (!canPrev) return;
    setViewMonth(monthStart.subtract(1, "month").format("YYYY-MM-DD"));
  };
  const goNext = () => {
    if (!canNext) return;
    setViewMonth(monthStart.add(1, "month").format("YYYY-MM-DD"));
  };

  return (
    <div className="rounded-2xl border border-charcoal-100 bg-white p-4 sm:p-5 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label="Önceki ay"
          className="p-2 rounded-lg text-charcoal-500 hover:text-oldGold-600 hover:bg-charcoal-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-display text-lg text-charcoal-900 capitalize">
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          aria-label="Sonraki ay"
          className="p-2 rounded-lg text-charcoal-500 hover:text-oldGold-600 hover:bg-charcoal-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </header>

      <div
        className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-charcoal-300 text-center"
        aria-hidden="true"
      >
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {query.isError ? (
        <CalendarError
          onRetry={() => query.refetch()}
          error={query.error}
        />
      ) : (
        <div
          className="grid grid-cols-7 gap-1"
          role="grid"
          aria-label="Müsait günler takvimi"
        >
          {gridDays.map((iso, index) => {
            const isCurrentMonth = dayjs(iso).isSame(monthStart, "month");
            const state = computeDayState({
              iso,
              minDate,
              maxDate,
              isCurrentMonth,
              dayInfo: dayMap.get(iso),
              loading: query.isLoading,
            });
            const isSelected = state === "available" && selectedDate === iso;

            return (
              <motion.div
                key={iso}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.15,
                  delay: Math.min(index * 0.005, 0.1),
                }}
              >
                <DayButton
                  iso={iso}
                  state={state}
                  selected={isSelected}
                  onClick={
                    state === "available" ? () => onSelectDate(iso) : undefined
                  }
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {query.isLoading && (
        <p className="flex items-center justify-center gap-2 text-xs text-charcoal-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          Takvim yükleniyor…
        </p>
      )}

      {!query.isLoading && !query.isError && (
        <CalendarLegend />
      )}
    </div>
  );
}

interface DayButtonProps {
  iso: string;
  state: DayState;
  selected: boolean;
  onClick?: () => void;
}

function DayButton({ iso, state, selected, onClick }: DayButtonProps) {
  const day = dayjs(iso);
  const dayLabel = day.format("D");
  const fullLabel = day.format("D MMMM YYYY");

  const tooltip =
    state === "available"
      ? `${fullLabel} — Müsait günler var`
      : state === "full"
        ? `${fullLabel} — Tüm randevular dolu`
        : state === "closed"
          ? `${fullLabel} — Kapalı / izinli`
          : "";

  const stateClass =
    state === "available"
      ? "bg-white text-charcoal-900 border border-charcoal-100 hover:border-oldGold-500 hover:bg-oldGold-50 cursor-pointer"
      : state === "full"
        ? "bg-charcoal-50 text-charcoal-300 border border-charcoal-100 cursor-not-allowed"
        : state === "closed"
          ? "bg-charcoal-50 text-charcoal-300 border border-charcoal-100 cursor-not-allowed"
          : "bg-transparent text-charcoal-100 border border-transparent cursor-not-allowed";

  const selectedClass = selected
    ? "ring-2 ring-offset-1 ring-oldGold-500 bg-oldGold-50 border-oldGold-500"
    : "";

  return (
    <button
      type="button"
      disabled={state !== "available"}
      onClick={state === "available" ? onClick : undefined}
      aria-label={tooltip || dayLabel}
      aria-pressed={state === "available" ? selected : undefined}
      title={tooltip || undefined}
      className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${stateClass} ${selectedClass}`}
    >
      {state === "outside" ? "" : dayLabel}
    </button>
  );
}

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500 pt-2 border-t border-charcoal-100">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded border border-charcoal-100 bg-white" />
        Müsait
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded border border-charcoal-100 bg-charcoal-50" />
        Kapalı / Dolu
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded border border-oldGold-500 bg-oldGold-50 ring-1 ring-oldGold-500" />
        Seçili
      </span>
    </div>
  );
}

interface CalendarErrorProps {
  error: unknown;
  onRetry: () => void;
}

function CalendarError({ error, onRetry }: CalendarErrorProps) {
  const message = friendlyAvailabilityError(error);
  return (
    <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-charcoal-900 font-medium">Takvim yüklenemedi</p>
        <p className="text-xs text-charcoal-500 mt-1">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}

interface ComputeDayStateArgs {
  iso: string;
  minDate: string;
  maxDate: string;
  isCurrentMonth: boolean;
  dayInfo: AvailabilityDayDto | undefined;
  loading: boolean;
}

function computeDayState({
  iso,
  minDate,
  maxDate,
  isCurrentMonth,
  dayInfo,
  loading,
}: ComputeDayStateArgs): DayState {
  // Görüntülenen ayın dışında → "outside" (boş hücre).
  if (!isCurrentMonth) return "outside";
  // Range dışı (geçmiş veya 60 gün ötesi) → outside.
  if (iso < minDate || iso > maxDate) return "outside";
  // Loading sırasında bilgisi gelmemiş → tıklanamaz, hala yer tutsun.
  if (loading || !dayInfo) return "closed";
  if (!dayInfo.isOpen) return "closed";
  if (!dayInfo.hasFreeSlot) return "full";
  return "available";
}

/**
 * Spec'in error handling stratejisi — kullanıcı odaklı mesajlar.
 * 429 zaten interceptor'da global toast alıyor; burada gösterilen mesaj banner.
 */
function friendlyAvailabilityError(error: unknown): string {
  if (!isApiError(error)) return "Bir sorun oluştu, lütfen tekrar deneyin.";
  switch (error.status) {
    case 400: {
      const fields = error.fieldErrors;
      if (fields) {
        const flat = Object.values(fields).flat();
        if (flat.length > 0) return flat.join(" ");
      }
      return error.message || "Geçersiz istek.";
    }
    case 404:
      return "Seçtiğin berber artık mevcut değil. Lütfen önceki adıma dönüp tekrar berber seç.";
    case 422:
      if (error.code === ErrorCode.SERVICE_NOT_OFFERED) {
        return "Seçtiğin hizmetlerden biri artık sunulmuyor. Lütfen hizmet seçimini güncelle.";
      }
      return error.message || "İşlem yapılamadı.";
    case 429:
      return "Çok hızlı istek attın, biraz bekle ve tekrar dene.";
    default:
      return "Bir sorun oluştu, lütfen tekrar deneyin.";
  }
}

import { motion } from "framer-motion";
import dayjs from "dayjs";
import { AlertCircle, CalendarOff, Loader2 } from "lucide-react";
import { useAvailableSlots } from "@/features/public/queries";
import { Skeleton } from "@/components/Skeleton";

/**
 * Bölüm 10.3 — Slot Grid (KRİTİK).
 *
 * Backend `available-slots` artık çalışma penceresini de döndürüyor:
 *   { isWorking, openTime, closeTime, slotMinutes, slots }
 *
 * Algoritma:
 *  1. POST /api/public/appointments/available-slots → tüm pencere bilgisi + AVAILABLE listesi
 *  2. Pencere içinde slotMinutes ile tüm grid'i üret (open ≤ slot < close)
 *  3. Her slot için state hesapla:
 *      - !isWorking            → CLOSED
 *      - past today            → CLOSED
 *      - in slots (backend'den)→ AVAILABLE (yeşil-tıklanabilir)
 *      - else                  → BUSY (kırmızı-disabled)
 *  4. BUSY/CLOSED slot'lar `disabled` ve onClick almaz
 *
 * Çalışma penceresi, salon kapalı/leave/schedule cascade'i dahil tek kaynak
 * olarak backend'den geliyor — frontend artık varsayım yapmaz.
 */

type SlotState = "AVAILABLE" | "BUSY" | "CLOSED";

interface SlotGridProps {
  barberId: string;
  /** "YYYY-MM-DD" */
  date: string;
  serviceIds: string[];
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}

export function SlotGrid({
  barberId,
  date,
  serviceIds,
  selectedSlot,
  onSelect,
}: SlotGridProps) {
  const query = useAvailableSlots(
    { barberId, date, serviceIds },
    { enabled: !!barberId && !!date && serviceIds.length > 0 },
  );

  if (!barberId || !date || serviceIds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-charcoal-100 bg-white p-8 text-center text-sm text-charcoal-300">
        Önce hizmet, berber ve tarih seçin.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-2xl border border-statusBusy/30 bg-red-50 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-charcoal-900 font-medium">
            Slotlar yüklenemedi
          </p>
          <p className="text-xs text-charcoal-300 mt-1">
            Lütfen tekrar deneyin veya başka bir tarih seçin.
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const { isWorking, openTime, closeTime, slotMinutes, slots } = query.data;

  // ---- Salon o gün kapalı / berber izinli → tek mesaj, grid yok ----
  if (!isWorking) {
    return (
      <div className="rounded-2xl border border-charcoal-100 bg-charcoal-50 p-8 flex flex-col items-center text-center gap-2">
        <CalendarOff className="w-8 h-8 text-charcoal-300" aria-hidden="true" />
        <p className="text-sm text-charcoal-900 font-medium">
          Bu gün için randevu alınamaz
        </p>
        <p className="text-xs text-charcoal-300 max-w-sm">
          Berber bu tarihte çalışmıyor veya salon kapalı. Lütfen başka bir tarih
          seçin.
        </p>
      </div>
    );
  }

  // Backend TimeOnly "HH:mm:ss" / "HH:mm" → "HH:mm" normalize.
  const open = normalizeHHmm(openTime);
  const close = normalizeHHmm(closeTime);
  const step = slotMinutes > 0 ? slotMinutes : 15;
  const availableSet = new Set(slots.map(normalizeHHmm));
  const allSlots = generateTimeGrid(open, close, step);

  const now = dayjs();
  const isToday = dayjs(date).isSame(now, "day");
  const isPastDate = dayjs(date).isBefore(now, "day");
  const currentHHmm = isToday ? now.format("HH:mm") : null;

  const noAvailable = availableSet.size === 0;

  return (
    <div className="space-y-4">
      {noAvailable && !isPastDate && (
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-4 text-center text-sm text-charcoal-500">
          Bu gün tüm saatler dolu. Lütfen başka bir tarih seçin.
        </div>
      )}

      <div
        className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
        role="list"
        aria-label="Saat slotları"
      >
        {allSlots.map((slot, index) => {
          const state = computeSlotState({
            slot,
            availableSet,
            isPastDate,
            isToday,
            currentHHmm,
          });

          const isSelected = state === "AVAILABLE" && selectedSlot === slot;

          return (
            <motion.div
              key={slot}
              role="listitem"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <SlotButton
                time={slot}
                state={state}
                selected={isSelected}
                onClick={
                  state === "AVAILABLE" ? () => onSelect(slot) : undefined
                }
              />
            </motion.div>
          );
        })}
      </div>

      {query.isFetching && !query.isLoading && (
        <p className="flex items-center justify-center gap-2 text-xs text-charcoal-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          Slotlar yenileniyor…
        </p>
      )}
    </div>
  );
}

interface SlotButtonProps {
  time: string;
  state: SlotState;
  selected: boolean;
  onClick?: () => void;
}

function SlotButton({ time, state, selected, onClick }: SlotButtonProps) {
  // Bölüm 10.3'teki class string'leri BİREBİR.
  const stateClass =
    state === "AVAILABLE"
      ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
      : state === "BUSY"
        ? "bg-red-600 text-white cursor-not-allowed opacity-90 line-through"
        : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60";

  const ariaLabel = `${time} - ${
    state === "AVAILABLE" ? "Müsait" : state === "BUSY" ? "Dolu" : "Kapalı"
  }`;

  return (
    <button
      type="button"
      disabled={state !== "AVAILABLE"}
      onClick={state === "AVAILABLE" ? onClick : undefined}
      aria-label={ariaLabel}
      aria-pressed={state === "AVAILABLE" ? selected : undefined}
      className={`w-full px-3 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${stateClass} ${
        state === "AVAILABLE" ? "hover:scale-105 hover:shadow-md active:scale-95" : ""
      } ${
        selected
          ? "ring-2 ring-offset-2 ring-oldGold-500 shadow-md"
          : ""
      }`}
    >
      {time}
    </button>
  );
}

interface ComputeSlotStateArgs {
  slot: string;
  availableSet: Set<string>;
  isPastDate: boolean;
  isToday: boolean;
  currentHHmm: string | null;
}

function computeSlotState({
  slot,
  availableSet,
  isPastDate,
  isToday,
  currentHHmm,
}: ComputeSlotStateArgs): SlotState {
  if (isPastDate) return "CLOSED";
  if (isToday && currentHHmm && slot < currentHHmm) return "CLOSED";
  if (availableSet.has(slot)) return "AVAILABLE";
  return "BUSY";
}

/**
 * "09:00" / "09:00:00" → "09:00".
 * Backend TimeOnly default serializasyonu "HH:mm:ss" döndürdüğü için defansif.
 */
function normalizeHHmm(value: string): string {
  if (typeof value !== "string") return value;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

function generateTimeGrid(
  startHHmm: string,
  endHHmm: string,
  slotMinutes: number,
): string[] {
  const [sh, sm] = startHHmm.split(":").map(Number);
  const [eh, em] = endHHmm.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const out: string[] = [];
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return out;
  }
  for (let t = start; t < end; t += slotMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  }
  return out;
}

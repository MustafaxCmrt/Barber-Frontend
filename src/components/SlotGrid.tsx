import { motion } from "framer-motion";
import { CalendarOff, Loader2 } from "lucide-react";
import { useAvailableSlots } from "@/features/public/queries";
import { Skeleton } from "@/components/Skeleton";
import { SLOT_STATUS, type SlotStatusValue } from "@/api/types";

interface SlotGridProps {
  barberId: string;
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
        <Loader2 className="w-5 h-5 text-statusBusy mt-0.5 shrink-0" />
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

  const { isWorking, slots } = query.data;

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

  const hasAvailable = slots.some((s) => s.status === 0);

  return (
    <div className="space-y-4">
      {!hasAvailable && (
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-4 text-center text-sm text-charcoal-500">
          Bu gün tüm saatler dolu. Lütfen başka bir tarih seçin.
        </div>
      )}

      <div
        className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
        role="list"
        aria-label="Saat slotları"
      >
        {slots.map((slot, index) => {
          const cfg = SLOT_STATUS[slot.status as SlotStatusValue];
          const timeHHmm = normalizeHHmm(slot.time);
          const isSelected = cfg.selectable && selectedSlot === timeHHmm;

          return (
            <motion.div
              key={slot.time}
              role="listitem"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <SlotButton
                time={timeHHmm}
                statusKey={cfg.key}
                label={cfg.label}
                color={cfg.color}
                selectable={cfg.selectable}
                selected={isSelected}
                onClick={cfg.selectable ? () => onSelect(timeHHmm) : undefined}
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
  statusKey: string;
  label: string;
  color: "green" | "red" | "gray";
  selectable: boolean;
  selected: boolean;
  onClick?: () => void;
}

function SlotButton({
  time,
  statusKey,
  label,
  color,
  selectable,
  selected,
  onClick,
}: SlotButtonProps) {
  const colorClass =
    color === "green"
      ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
      : color === "red"
        ? "bg-red-600 text-white cursor-not-allowed opacity-90 line-through"
        : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60";

  const ariaLabel = `${time} - ${label}`;

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={selectable ? onClick : undefined}
      aria-label={ariaLabel}
      aria-pressed={selectable ? selected : undefined}
      className={`w-full px-3 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${colorClass} ${
        selectable ? "hover:scale-105 hover:shadow-md active:scale-95" : ""
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

function normalizeHHmm(value: string): string {
  if (typeof value !== "string") return value;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

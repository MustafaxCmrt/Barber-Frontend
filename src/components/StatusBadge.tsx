import {
  APPOINTMENT_STATUS_NAMES,
  APPOINTMENT_STATUS_TR,
  type AppointmentStatusName,
  type AppointmentStatusValue,
} from "@/api/types";

interface StatusBadgeProps {
  /** Hem int (admin) hem string (lookup) status formatını kabul eder. */
  status: AppointmentStatusValue | AppointmentStatusName;
  size?: "sm" | "md";
}

/**
 * Bölüm 10.2 + 7.3 — randevu durumu için 5 renkli badge.
 *  - Pending   → yellow-500
 *  - Confirmed → blue-600
 *  - Cancelled → neutral-400
 *  - Completed → green-600
 *  - NoShow    → red-600
 */
export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const name: AppointmentStatusName =
    typeof status === "number"
      ? APPOINTMENT_STATUS_NAMES[status]
      : status;

  const tr = APPOINTMENT_STATUS_TR[name] ?? name;

  const styleByStatus: Record<AppointmentStatusName, string> = {
    Pending: "bg-statusPending/15 text-yellow-600 ring-statusPending/30",
    Confirmed: "bg-statusConfirmed/15 text-blue-600 ring-statusConfirmed/30",
    Cancelled: "bg-charcoal-100 text-charcoal-300 ring-charcoal-200/40",
    Completed: "bg-statusAvailable/15 text-green-700 ring-statusAvailable/30",
    NoShow: "bg-statusBusy/15 text-red-600 ring-statusBusy/30",
  };

  const sizeClass =
    size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 font-medium tracking-wide
                  ${styleByStatus[name]} ${sizeClass}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor[name]}`}
        aria-hidden="true"
      />
      {tr}
    </span>
  );
}

const dotColor: Record<AppointmentStatusName, string> = {
  Pending: "bg-statusPending",
  Confirmed: "bg-statusConfirmed",
  Cancelled: "bg-charcoal-200",
  Completed: "bg-statusAvailable",
  NoShow: "bg-statusBusy",
};

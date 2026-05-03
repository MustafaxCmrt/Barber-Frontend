import { motion } from "framer-motion";
import { CalendarDays, Clock, Scissors, X } from "lucide-react";
import {
  formatDuration,
  formatLocalDateTime,
  formatTime,
  formatMoney,
  isCancelable,
} from "@/lib/formatters";
import {
  APPOINTMENT_STATUS_TR,
  type AppointmentLookupItemDto,
  type AppointmentStatusName,
} from "@/api/types";

/**
 * FAZ 4 — Lookup sonuç kartı (Bölüm 8.2).
 *
 * Status badge renkleri (Bölüm 10.2):
 *  Pending=sarı, Confirmed=mavi, Cancelled=gri, Completed=yeşil, NoShow=kırmızı.
 *
 * "İptal Et" butonu:
 *  - Sadece Pending / Confirmed için aktif
 *  - Başlangıca 2 saatten az kaldıysa (isCancelable false) disabled
 *    — backend de zorlar (Bölüm 6.8) ama UX için ön-engelleme.
 */

const STATUS_BADGE_CLASS: Record<AppointmentStatusName, string> = {
  Pending: "bg-statusPending/10 text-statusPending border-statusPending/20",
  Confirmed:
    "bg-statusConfirmed/10 text-statusConfirmed border-statusConfirmed/20",
  Cancelled: "bg-charcoal-100 text-charcoal-300 border-charcoal-100",
  Completed:
    "bg-statusAvailable/10 text-statusAvailable border-statusAvailable/20",
  NoShow: "bg-statusBusy/10 text-statusBusy border-statusBusy/20",
};

const CANCELABLE_STATUSES: AppointmentStatusName[] = ["Pending", "Confirmed"];

interface Props {
  appointment: AppointmentLookupItemDto;
  onCancelClick: (appointment: AppointmentLookupItemDto) => void;
}

export function AppointmentLookupCard({ appointment, onCancelClick }: Props) {
  const {
    barberName,
    startTime,
    endTime,
    totalPrice,
    totalDurationMinutes,
    status,
    serviceNames,
  } = appointment;

  const statusActive = CANCELABLE_STATUSES.includes(status);
  const withinWindow = isCancelable(startTime, 2);
  const cancelDisabled = !statusActive || !withinWindow;

  const cancelTitle = !statusActive
    ? `Bu randevu zaten ${APPOINTMENT_STATUS_TR[status]} durumunda`
    : !withinWindow
      ? "Başlangıca 2 saatten az kaldığı için iptal edilemez"
      : "Randevuyu iptal et";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 md:p-6 space-y-4"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-oldGold-600">
            Berber
          </p>
          <h3 className="font-display text-xl text-charcoal-900">
            {barberName}
          </h3>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
        >
          {APPOINTMENT_STATUS_TR[status]}
        </span>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <CalendarDays className="w-4 h-4 mt-0.5 text-charcoal-300 flex-shrink-0" />
          <div>
            <dt className="text-xs text-charcoal-300">Tarih & Saat</dt>
            <dd className="text-charcoal-900">
              {formatLocalDateTime(startTime)} – {formatTime(endTime)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 text-charcoal-300 flex-shrink-0" />
          <div>
            <dt className="text-xs text-charcoal-300">Süre</dt>
            <dd className="text-charcoal-900">
              {formatDuration(totalDurationMinutes)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2 sm:col-span-2">
          <Scissors className="w-4 h-4 mt-0.5 text-charcoal-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <dt className="text-xs text-charcoal-300">Hizmetler</dt>
            <dd className="text-charcoal-900 break-words">
              {serviceNames.length > 0 ? serviceNames.join(", ") : "—"}
            </dd>
          </div>
        </div>
      </dl>

      <footer className="flex items-end justify-between gap-3 pt-3 border-t border-charcoal-100">
        <div>
          <p className="text-xs text-charcoal-300">Toplam</p>
          <p className="font-display text-2xl text-oldGold-600">
            {formatMoney(totalPrice)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onCancelClick(appointment)}
          disabled={cancelDisabled}
          title={cancelTitle}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                     border border-statusBusy/40 text-statusBusy
                     hover:bg-statusBusy/5 hover:border-statusBusy
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-statusBusy/40
                     text-sm font-medium transition-colors
                     focus:outline-none focus:ring-2 focus:ring-statusBusy/30"
        >
          <X className="w-4 h-4" />
          İptal Et
        </button>
      </footer>
    </motion.article>
  );
}

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Phone,
  Scissors,
  User,
  UserX,
  X,
} from "lucide-react";
import {
  useAdminAppointmentDetail,
  useUpdateAppointmentStatusMutation,
} from "@/features/admin/appointmentsQueries";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import {
  formatDuration,
  formatLongLocalDateTime,
  formatMoney,
} from "@/lib/formatters";
import { notify } from "@/lib/toast";
import { isApiError } from "@/api/client";
import { ErrorCode } from "@/api/errorCodes";
import {
  ALLOWED_STATUS_TRANSITIONS,
  APPOINTMENT_STATUS_NAMES,
  APPOINTMENT_STATUS_TR,
  AppointmentStatus,
  type AppointmentStatusName,
  type AppointmentStatusValue,
} from "@/api/types";

/**
 * FAZ 7 — Admin Randevu Detay & Status Update modalı (Bölüm 7.3 + 8.4).
 *
 * Status butonları ALLOWED_STATUS_TRANSITIONS map'inden render edilir;
 * izinsiz geçişler hiç gösterilmez. 422 INVALID_STATUS_TRANSITION backend
 * safety net — UI zaten disable etmiş olmalı.
 */

interface Props {
  id: string | null;
  onClose: () => void;
}

interface ButtonConfig {
  label: string;
  icon: typeof Check;
  variant: "primary" | "danger" | "warning";
}

const BUTTON_CONFIG: Record<AppointmentStatusName, ButtonConfig> = {
  Confirmed: { label: "Onayla", icon: Check, variant: "primary" },
  Completed: { label: "Tamamla", icon: Check, variant: "primary" },
  Cancelled: { label: "İptal Et", icon: X, variant: "danger" },
  NoShow: { label: "Gelmedi", icon: UserX, variant: "warning" },
  // Pending'e geri dönüş yok ama tip tamlığı için tanım
  Pending: { label: "Beklemede", icon: Clock, variant: "primary" },
};

const VARIANT_CLASS: Record<ButtonConfig["variant"], string> = {
  primary:
    "bg-oldGold-500 hover:bg-oldGold-600 text-white border-transparent focus:ring-oldGold-500/40",
  danger:
    "bg-white hover:bg-statusBusy/5 text-statusBusy border-statusBusy/40 hover:border-statusBusy focus:ring-statusBusy/30",
  warning:
    "bg-white hover:bg-statusPending/10 text-yellow-700 border-statusPending/40 hover:border-statusPending focus:ring-statusPending/30",
};

export function AppointmentDetailModal({ id, onClose }: Props) {
  const isOpen = !!id;
  const detailQuery = useAdminAppointmentDetail(id);
  const mutation = useUpdateAppointmentStatusMutation();

  // Esc ile kapama
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, mutation.isPending, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleStatusChange = (target: AppointmentStatusValue) => {
    if (!id) return;
    mutation.mutate(
      { id, body: { status: target } },
      {
        onSuccess: () => {
          notify.success("Randevu durumu güncellendi.");
          // Modal açık kalır; query invalidation yeni status'u getirir.
        },
        onError: (err) => {
          if (
            isApiError(err) &&
            err.status === 422 &&
            err.code === ErrorCode.INVALID_STATUS_TRANSITION
          ) {
            notify.error("Bu geçiş yapılamaz.");
            return;
          }
          if (isApiError(err)) {
            notify.error(err.message);
            return;
          }
          notify.error("Durum güncellenemedi.");
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
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-detail-title"
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
            className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl bg-white shadow-card-hover border border-charcoal-100"
          >
            <header className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-oldGold-600">
                    Randevu Detayı
                  </p>
                  <h2
                    id="appointment-detail-title"
                    className="font-display text-xl text-charcoal-900 truncate"
                  >
                    {detailQuery.data?.customerFullName ?? "Yükleniyor…"}
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

            <div className="px-6 py-5">
              {detailQuery.isLoading ? (
                <DetailSkeleton />
              ) : detailQuery.isError || !detailQuery.data ? (
                <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal-900">
                      Randevu detayı yüklenemedi
                    </p>
                    <p className="text-xs text-charcoal-300 mt-1">
                      {detailQuery.error?.message ?? "Lütfen tekrar deneyin."}
                    </p>
                    <button
                      type="button"
                      onClick={() => detailQuery.refetch()}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                </div>
              ) : (
                <DetailBody
                  detail={detailQuery.data}
                  isFetching={detailQuery.isFetching}
                  mutationPending={mutation.isPending}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface DetailBodyProps {
  detail: import("@/api/types").AppointmentDetailDto;
  isFetching: boolean;
  mutationPending: boolean;
  onStatusChange: (target: AppointmentStatusValue) => void;
}

function DetailBody({
  detail,
  isFetching,
  mutationPending,
  onStatusChange,
}: DetailBodyProps) {
  const currentStatusName = APPOINTMENT_STATUS_NAMES[detail.status];
  const allowedTargets = ALLOWED_STATUS_TRANSITIONS[currentStatusName];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={detail.status} />
        {isFetching && (
          <span className="inline-flex items-center gap-1 text-xs text-charcoal-300">
            <Loader2 className="w-3 h-3 animate-spin" /> Yenileniyor
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field
          icon={CalendarDays}
          label="Tarih & Saat"
          value={`${formatLongLocalDateTime(detail.startTime)} – ${detail.endTime.slice(11, 16)}`}
        />
        <Field
          icon={Clock}
          label="Süre"
          value={formatDuration(detail.totalDurationMinutes)}
        />
        <Field icon={User} label="Berber" value={detail.barberFullName} />
        <Field
          icon={Phone}
          label="Müşteri Telefonu"
          value={detail.customerPhone}
          mono
        />
      </dl>

      {detail.notes && (
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1">
            Müşteri Notu
          </p>
          <p className="text-sm text-charcoal-900 whitespace-pre-wrap">
            {detail.notes}
          </p>
        </div>
      )}

      <section>
        <h3 className="font-display text-lg text-charcoal-900 flex items-center gap-2 mb-3">
          <Scissors className="w-4 h-4 text-oldGold-600" />
          Hizmetler
        </h3>
        <div className="rounded-xl border border-charcoal-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-charcoal-50/60 text-charcoal-300 text-xs uppercase tracking-[0.15em]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Hizmet</th>
                <th className="text-right px-4 py-2.5 font-medium">Süre</th>
                <th className="text-right px-4 py-2.5 font-medium">Fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {detail.services.map((s) => (
                <tr key={s.serviceId}>
                  <td className="px-4 py-2.5 text-charcoal-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-right text-charcoal-500 tabular-nums">
                    {formatDuration(s.durationAtBookingMinutes)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-charcoal-900 tabular-nums">
                    {formatMoney(s.priceAtBooking)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-charcoal-50/60 font-medium">
                <td className="px-4 py-2.5 text-charcoal-500" colSpan={2}>
                  Toplam
                </td>
                <td className="px-4 py-2.5 text-right font-display text-oldGold-600 tabular-nums">
                  {formatMoney(detail.totalPrice)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-charcoal-300">
          Snapshot: hizmet fiyat/süresi randevu oluştuğu andaki değerlerdir.
        </p>
      </section>

      <section className="pt-4 border-t border-charcoal-100">
        <h3 className="font-display text-lg text-charcoal-900 mb-3">
          Durum Değiştir
        </h3>

        {allowedTargets.length === 0 ? (
          <div className="rounded-lg border border-charcoal-100 bg-charcoal-50/60 px-4 py-3 text-sm text-charcoal-500">
            Bu randevu{" "}
            <strong className="text-charcoal-900">
              {APPOINTMENT_STATUS_TR[currentStatusName]}
            </strong>{" "}
            durumunda — başka bir duruma geçilemez.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowedTargets.map((target) => {
              const cfg = BUTTON_CONFIG[target];
              const Icon = cfg.icon;
              const value = AppointmentStatus[target];
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => onStatusChange(value)}
                  disabled={mutationPending}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${VARIANT_CLASS[cfg.variant]}`}
                >
                  {mutationPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

interface FieldProps {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  mono?: boolean;
}

function Field({ icon: Icon, label, value, mono }: FieldProps) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 text-charcoal-300 flex-shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-charcoal-300">{label}</dt>
        <dd
          className={`text-charcoal-900 break-words ${mono ? "font-mono text-sm" : ""}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-10 w-48" />
    </div>
  );
}

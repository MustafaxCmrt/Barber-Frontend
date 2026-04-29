import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarRange,
  Eye,
  FilterX,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { useAdminAppointments } from "@/features/admin/appointmentsQueries";
import { usePublicBarbers } from "@/features/public/queries";
import { AppointmentDetailModal } from "@/components/AppointmentDetailModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import {
  formatLongLocalDateTime,
  formatMoney,
  formatTime,
} from "@/lib/formatters";
import {
  AppointmentStatus,
  APPOINTMENT_STATUS_TR,
  type AdminAppointmentsQuery,
  type AppointmentStatusName,
  type AppointmentStatusValue,
} from "@/api/types";

/**
 * FAZ 7 — Admin Randevu Yönetimi (Bölüm 7.3 + 8.4).
 *
 * Filtreler: BarberId / DateFrom / DateTo / Status / CustomerPhone (debounced).
 * Tablo: saat-müşteri-berber-tutar-durum + Detay butonu.
 * Detail modal status update yapar; mutation list + dashboard cache'lerini
 * invalidate eder (queries.ts içinde).
 *
 * Berber dropdown'u şimdilik public endpoint kullanıyor (sadece aktifleri
 * verir). FAZ 8'de admin /api/Barbers endpoint'i geldiğinde ona geçirilebilir.
 */

const PAGE_SIZE = 10;
const STATUS_OPTIONS: AppointmentStatusName[] = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Completed",
  "NoShow",
];

interface FilterState {
  barberId: string;
  status: AppointmentStatusValue | "";
  dateFrom: string;
  dateTo: string;
  customerPhone: string;
}

const INITIAL_FILTERS: FilterState = {
  barberId: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  customerPhone: "",
};

export function AppointmentsPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedPhone = useDebounce(filters.customerPhone.trim(), 400);

  // Filtre değişince sayfa 1'e dön
  useEffect(() => {
    setPage(1);
  }, [
    filters.barberId,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    debouncedPhone,
  ]);

  const query: AdminAppointmentsQuery = useMemo(() => {
    const q: AdminAppointmentsQuery = {
      Page: page,
      PageSize: PAGE_SIZE,
    };
    if (filters.barberId) q.BarberId = filters.barberId;
    if (filters.status !== "") q.Status = filters.status;
    if (filters.dateFrom) q.DateFrom = `${filters.dateFrom}T00:00:00`;
    if (filters.dateTo) q.DateTo = `${filters.dateTo}T23:59:59`;
    if (debouncedPhone) q.CustomerPhone = debouncedPhone;
    return q;
  }, [page, filters, debouncedPhone]);

  const appointments = useAdminAppointments(query);
  const barbers = usePublicBarbers({ Page: 1, PageSize: 50 });

  const isFiltered =
    !!filters.barberId ||
    filters.status !== "" ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!debouncedPhone;

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const items = appointments.data?.items ?? [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-charcoal-900 flex items-center gap-2">
            <CalendarRange className="w-7 h-7 text-oldGold-600" />
            Randevular
          </h1>
          <p className="text-sm text-charcoal-300 mt-1">
            Tüm randevular — filtrele, detayını gör, durumu değiştir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => appointments.refetch()}
          disabled={appointments.isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 disabled:opacity-60 text-sm transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${appointments.isFetching ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Yenile</span>
        </button>
      </header>

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        barbers={
          barbers.data?.items.map((b) => ({
            id: b.id,
            fullName: b.fullName,
          })) ?? []
        }
        barbersLoading={barbers.isLoading}
        isFiltered={isFiltered}
        onReset={handleResetFilters}
      />

      <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden">
        <header className="px-5 md:px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3">
          <div className="text-sm text-charcoal-300">
            {appointments.data ? (
              <>
                Toplam{" "}
                <span className="text-charcoal-900 font-medium">
                  {appointments.data.totalCount}
                </span>{" "}
                randevu
              </>
            ) : (
              "Yükleniyor…"
            )}
          </div>
          {appointments.isFetching && !appointments.isLoading && (
            <span className="inline-flex items-center gap-2 text-xs text-charcoal-300">
              <Loader2 className="w-3 h-3 animate-spin" /> Yenileniyor
            </span>
          )}
        </header>

        {appointments.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : appointments.isError ? (
          <div className="p-6">
            <div className="rounded-xl border border-statusBusy/30 bg-red-50 p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal-900">
                  Randevular yüklenemedi
                </p>
                <p className="text-xs text-charcoal-300 mt-1">
                  {appointments.error?.message ?? "Lütfen tekrar deneyin."}
                </p>
                <button
                  type="button"
                  onClick={() => appointments.refetch()}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekrar Dene
                </button>
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                isFiltered ? "Filtrelere uyan randevu yok" : "Henüz randevu yok"
              }
              description={
                isFiltered
                  ? "Filtreleri gevşetmeyi veya temizlemeyi deneyin."
                  : "Yeni randevular geldikçe burada görünecek."
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-charcoal-50/60 text-charcoal-300 text-xs uppercase tracking-[0.15em]">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">
                      Tarih & Saat
                    </th>
                    <th className="text-left px-5 py-3 font-medium">Müşteri</th>
                    <th className="text-left px-5 py-3 font-medium">Berber</th>
                    <th className="text-right px-5 py-3 font-medium">Tutar</th>
                    <th className="text-left px-5 py-3 font-medium">Durum</th>
                    <th className="text-right px-5 py-3 font-medium">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100">
                  {items.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-charcoal-50/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-charcoal-900 whitespace-nowrap">
                        <div>{formatLongLocalDateTime(a.startTime)}</div>
                        <div className="text-xs text-charcoal-300">
                          – {formatTime(a.endTime)}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-charcoal-900">
                          {a.customerFullName}
                        </div>
                        <div className="text-xs text-charcoal-300 font-mono">
                          {a.customerPhone}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-charcoal-500">
                        {a.barberFullName}
                      </td>
                      <td className="px-5 py-3 text-right font-display text-charcoal-900 tabular-nums">
                        {formatMoney(a.totalPrice)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={a.status} size="sm" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedId(a.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-charcoal-100 hover:border-oldGold-500 hover:text-oldGold-600 text-charcoal-500 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-charcoal-100">
              {items.map((a) => (
                <li key={a.id} className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className="w-full text-left space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-charcoal-900">
                        {formatLongLocalDateTime(a.startTime)}
                      </span>
                      <StatusBadge status={a.status} size="sm" />
                    </div>
                    <div>
                      <p className="text-charcoal-900">{a.customerFullName}</p>
                      <p className="text-xs text-charcoal-300 font-mono">
                        {a.customerPhone}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-charcoal-500">
                        {a.barberFullName}
                      </span>
                      <span className="font-display text-charcoal-900">
                        {formatMoney(a.totalPrice)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {appointments.data && (
              <div className="px-5 md:px-6 py-4 border-t border-charcoal-100">
                <Pagination
                  page={appointments.data.page}
                  pageSize={appointments.data.pageSize}
                  totalPages={appointments.data.totalPages}
                  totalCount={appointments.data.totalCount}
                  hasNext={appointments.data.hasNext}
                  hasPrevious={appointments.data.hasPrevious}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <AppointmentDetailModal
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

// ============================================================
// Filter panel
// ============================================================

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  barbers: { id: string; fullName: string }[];
  barbersLoading: boolean;
  isFiltered: boolean;
  onReset: () => void;
}

function FilterPanel({
  filters,
  onChange,
  barbers,
  barbersLoading,
  isFiltered,
  onReset,
}: FilterPanelProps) {
  const set = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-4 md:p-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-1">
          <label className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1.5">
            Berber
          </label>
          <select
            value={filters.barberId}
            onChange={(e) => set("barberId", e.target.value)}
            disabled={barbersLoading}
            className="w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-500
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                       disabled:opacity-60 transition-colors"
          >
            <option value="">Tümü</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1.5">
            Durum
          </label>
          <select
            value={filters.status === "" ? "" : String(filters.status)}
            onChange={(e) =>
              set(
                "status",
                e.target.value === ""
                  ? ""
                  : (Number(e.target.value) as AppointmentStatusValue),
              )
            }
            className="w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-500
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                       transition-colors"
          >
            <option value="">Tümü</option>
            {STATUS_OPTIONS.map((name) => (
              <option key={name} value={AppointmentStatus[name]}>
                {APPOINTMENT_STATUS_TR[name]}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1.5">
            Başlangıç
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => set("dateFrom", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-500
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                       transition-colors"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1.5">
            Bitiş
          </label>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => set("dateTo", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-charcoal-100 bg-white text-sm text-charcoal-500
                       focus:outline-none focus:border-oldGold-500 focus:ring-2 focus:ring-oldGold-500/30
                       transition-colors"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs uppercase tracking-[0.15em] text-charcoal-300 mb-1.5">
            Telefon
          </label>
          <SearchInput
            value={filters.customerPhone}
            onChange={(v) => set("customerPhone", v)}
            placeholder="05XXXXXXXXX"
            ariaLabel="Telefon ile ara"
          />
        </div>
      </div>

      {isFiltered && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-statusBusy/40 hover:text-statusBusy text-xs font-medium transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            Filtreleri Temizle
          </button>
        </div>
      )}
    </motion.div>
  );
}

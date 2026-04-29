import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  CalendarCheck,
  Loader2,
  RefreshCw,
  Scissors,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import dayjs from "dayjs";

import {
  useDashboardSummary,
  useRevenueTrend,
  useTodayAppointments,
  useTopServices,
} from "@/features/admin/dashboardQueries";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDuration,
  formatMoney,
  formatTime,
} from "@/lib/formatters";
import type {
  DashboardSummaryDto,
  RevenueTrendItemDto,
  TodayAppointmentItemDto,
  TopServiceItemDto,
} from "@/api/types";

/**
 * FAZ 6 — Admin Anasayfa (Bölüm 7.5).
 *
 * 4 bölüm:
 *  A) Summary cards (4 kart)
 *  B) Today appointments tablosu (sadece okunur — status updates FAZ 7)
 *  C) Revenue trend LineChart (Recharts)
 *  D) Top services BarChart (Recharts)
 *
 * Üstte global "son N gün" filtresi (7/30/90) revenue + top services'i kontrol eder.
 * Summary + today appointments filtresizdir.
 */

const DAYS_OPTIONS = [7, 30, 90] as const;
const TOP_SERVICES_LIMIT = 5;

type DaysOption = (typeof DAYS_OPTIONS)[number];

export function DashboardPage() {
  const [days, setDays] = useState<DaysOption>(30);

  const summary = useDashboardSummary();
  const todayAppointments = useTodayAppointments();
  const revenueTrend = useRevenueTrend(days);
  const topServices = useTopServices(TOP_SERVICES_LIMIT, days);

  const refreshAll = () => {
    summary.refetch();
    todayAppointments.refetch();
    revenueTrend.refetch();
    topServices.refetch();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-charcoal-900">
            Anasayfa
          </h1>
          <p className="text-sm text-charcoal-300 mt-1">
            Günlük özet, bugünkü randevular ve son {days} günün performansı.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DaysFilter value={days} onChange={setDays} />
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-charcoal-100 text-charcoal-500 hover:border-oldGold-300 hover:text-oldGold-600 text-sm transition-colors"
            aria-label="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Yenile</span>
          </button>
        </div>
      </header>

      <SummaryCards
        data={summary.data}
        isLoading={summary.isLoading}
        isError={summary.isError}
        onRetry={() => summary.refetch()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueTrendCard
          days={days}
          data={revenueTrend.data ?? []}
          isLoading={revenueTrend.isLoading}
          isError={revenueTrend.isError}
          onRetry={() => revenueTrend.refetch()}
        />
        <TopServicesCard
          days={days}
          data={topServices.data ?? []}
          isLoading={topServices.isLoading}
          isError={topServices.isError}
          onRetry={() => topServices.refetch()}
        />
      </div>

      <TodayAppointmentsTable
        data={todayAppointments.data ?? []}
        isLoading={todayAppointments.isLoading}
        isError={todayAppointments.isError}
        isFetching={todayAppointments.isFetching}
        onRetry={() => todayAppointments.refetch()}
      />
    </div>
  );
}

// ============================================================
// Days filter
// ============================================================

function DaysFilter({
  value,
  onChange,
}: {
  value: DaysOption;
  onChange: (v: DaysOption) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Zaman aralığı"
      className="inline-flex bg-white rounded-lg border border-charcoal-100 p-1 shadow-card"
    >
      {DAYS_OPTIONS.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
              active
                ? "bg-charcoal-900 text-white"
                : "text-charcoal-500 hover:text-oldGold-600"
            }`}
          >
            Son {d} Gün
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Summary cards
// ============================================================

interface SummaryCardsProps {
  data: DashboardSummaryDto | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function SummaryCards({ data, isLoading, isError, onRetry }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        title="Özet bilgileri yüklenemedi"
        onRetry={onRetry}
        compact
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={CalendarCheck}
        label="Bugünkü Randevu"
        value={data.todayAppointmentCount.toString()}
        breakdown={[
          { label: "Bekliyor", value: data.todayPendingCount, tone: "yellow" },
          {
            label: "Onaylı",
            value: data.todayConfirmedCount,
            tone: "blue",
          },
          {
            label: "Tamam",
            value: data.todayCompletedCount,
            tone: "green",
          },
        ]}
      />
      <SummaryCard
        icon={Wallet}
        label="Bu Ay Ciro"
        value={formatMoney(data.thisMonthRevenue)}
        sublabel={`${data.thisMonthCompletedCount} tamamlanan randevu`}
      />
      <SummaryCard
        icon={Users}
        label="Aktif Berber"
        value={data.activeBarberCount.toString()}
        sublabel="şu anda hizmette"
      />
      <SummaryCard
        icon={Scissors}
        label="Aktif Hizmet"
        value={data.activeServiceCount.toString()}
        sublabel="kataloğunuzda"
      />
    </div>
  );
}

interface SummaryCardProps {
  icon: typeof CalendarCheck;
  label: string;
  value: string;
  sublabel?: string;
  breakdown?: { label: string; value: number; tone: "yellow" | "blue" | "green" }[];
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sublabel,
  breakdown,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-charcoal-300">
            {label}
          </p>
          <p className="font-display text-3xl text-charcoal-900 mt-1.5">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-charcoal-300 mt-1">{sublabel}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-oldGold-50 text-oldGold-600 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {breakdown && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-charcoal-100">
          {breakdown.map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${toneClass(b.tone)}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${toneDot(b.tone)}`} />
              {b.label}: {b.value}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function toneClass(tone: "yellow" | "blue" | "green"): string {
  switch (tone) {
    case "yellow":
      return "bg-statusPending/15 text-yellow-700";
    case "blue":
      return "bg-statusConfirmed/15 text-blue-700";
    case "green":
      return "bg-statusAvailable/15 text-green-700";
  }
}
function toneDot(tone: "yellow" | "blue" | "green"): string {
  switch (tone) {
    case "yellow":
      return "bg-statusPending";
    case "blue":
      return "bg-statusConfirmed";
    case "green":
      return "bg-statusAvailable";
  }
}

// ============================================================
// Revenue trend
// ============================================================

interface RevenueTrendCardProps {
  days: number;
  data: RevenueTrendItemDto[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function RevenueTrendCard({
  days,
  data,
  isLoading,
  isError,
  onRetry,
}: RevenueTrendCardProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        label: dayjs(d.date).format("DD.MM"),
        revenue: d.revenue,
        count: d.completedCount,
      })),
    [data],
  );

  return (
    <div className="lg:col-span-2 rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 md:p-6">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-oldGold-600" />
            Ciro Trendi
          </h2>
          <p className="text-xs text-charcoal-300 mt-0.5">
            Son {days} günün tamamlanan randevu cirosu
          </p>
        </div>
      </header>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : isError ? (
        <ErrorBlock title="Ciro trendi yüklenemedi" onRetry={onRetry} />
      ) : data.length === 0 ? (
        <EmptyState
          title="Veri yok"
          description="Bu aralıkta tamamlanan randevu yok."
        />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${Math.round(v / 100) / 10}k` : v.toString()
                }
              />
              <Tooltip
                cursor={{ stroke: "#D4AF37", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  border: "1px solid #E5E5E5",
                  borderRadius: 12,
                  fontSize: 12,
                  fontFamily: "Montserrat, system-ui, sans-serif",
                }}
                formatter={
                  ((value: number, name: string): [string, string] =>
                    name === "revenue"
                      ? [formatMoney(value), "Ciro"]
                      : [`${value}`, "Tamamlanan"]) as never
                }
                labelFormatter={(label: unknown, payload?: unknown) => {
                  const arr = payload as
                    | { payload?: { date?: string } }[]
                    | undefined;
                  const date = arr?.[0]?.payload?.date;
                  return date
                    ? dayjs(date).format("DD MMMM YYYY")
                    : String(label ?? "");
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#D4AF37"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#D4AF37" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Top services
// ============================================================

interface TopServicesCardProps {
  days: number;
  data: TopServiceItemDto[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function TopServicesCard({
  days,
  data,
  isLoading,
  isError,
  onRetry,
}: TopServicesCardProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.serviceName,
        bookingCount: d.bookingCount,
        totalRevenue: d.totalRevenue,
      })),
    [data],
  );

  return (
    <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card p-5 md:p-6">
      <header className="mb-4">
        <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-oldGold-600" />
          Popüler Hizmetler
        </h2>
        <p className="text-xs text-charcoal-300 mt-0.5">
          Son {days} günün ilk {TOP_SERVICES_LIMIT}'i
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : isError ? (
        <ErrorBlock title="Popüler hizmetler yüklenemedi" onRetry={onRetry} />
      ) : data.length === 0 ? (
        <EmptyState title="Veri yok" description="Bu aralıkta randevu yok." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#404040" }}
                width={120}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
              />
              <Tooltip
                cursor={{ fill: "#FAF0CC", opacity: 0.4 }}
                contentStyle={{
                  border: "1px solid #E5E5E5",
                  borderRadius: 12,
                  fontSize: 12,
                  fontFamily: "Montserrat, system-ui, sans-serif",
                }}
                formatter={(value: number, name: string, item) => {
                  const payload = (item?.payload ?? {}) as {
                    totalRevenue?: number;
                  };
                  if (name === "bookingCount") {
                    return [
                      `${value} randevu · ${formatMoney(payload.totalRevenue ?? 0)}`,
                      "Toplam",
                    ];
                  }
                  return [value, name];
                }}
              />
              <Bar
                dataKey="bookingCount"
                fill="#D4AF37"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Today appointments
// ============================================================

interface TodayAppointmentsProps {
  data: TodayAppointmentItemDto[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
}

function TodayAppointmentsTable({
  data,
  isLoading,
  isError,
  isFetching,
  onRetry,
}: TodayAppointmentsProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [data],
  );

  return (
    <div className="rounded-2xl bg-white border border-charcoal-100 shadow-card overflow-hidden">
      <header className="px-5 md:px-6 py-4 border-b border-charcoal-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-charcoal-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-oldGold-600" />
            Bugünkü Randevular
          </h2>
          <p className="text-xs text-charcoal-300 mt-0.5">
            Saate göre sıralanmış · {sorted.length} randevu
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="inline-flex items-center gap-2 text-xs text-charcoal-300">
            <Loader2 className="w-3 h-3 animate-spin" /> Yenileniyor…
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6">
          <ErrorBlock
            title="Bugünkü randevular yüklenemedi"
            onRetry={onRetry}
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Bugün için randevu yok"
            description="Yeni randevular geldikçe burada görünür."
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-50/60 text-charcoal-300 text-xs uppercase tracking-[0.15em]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Saat</th>
                  <th className="text-left px-5 py-3 font-medium">Müşteri</th>
                  <th className="text-left px-5 py-3 font-medium">Berber</th>
                  <th className="text-left px-5 py-3 font-medium">Süre</th>
                  <th className="text-right px-5 py-3 font-medium">Tutar</th>
                  <th className="text-left px-5 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {sorted.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-charcoal-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-charcoal-900 tabular-nums">
                      {formatTime(a.startTime)}
                      <span className="text-charcoal-300">
                        {" "}— {formatTime(a.endTime)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-charcoal-900">
                        {a.customerFullName}
                      </div>
                      <div className="text-xs text-charcoal-300">
                        {a.customerPhone}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-charcoal-500">
                      {a.barberFullName}
                    </td>
                    <td className="px-5 py-3 text-charcoal-500">
                      {formatDuration(a.totalDurationMinutes)}
                    </td>
                    <td className="px-5 py-3 text-right font-display text-charcoal-900 tabular-nums">
                      {formatMoney(a.totalPrice)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden divide-y divide-charcoal-100">
            {sorted.map((a) => (
              <li key={a.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-charcoal-900 tabular-nums">
                    {formatTime(a.startTime)} — {formatTime(a.endTime)}
                  </span>
                  <StatusBadge status={a.status} size="sm" />
                </div>
                <div>
                  <p className="text-charcoal-900">{a.customerFullName}</p>
                  <p className="text-xs text-charcoal-300">{a.customerPhone}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-500">{a.barberFullName}</span>
                  <span className="font-display text-charcoal-900">
                    {formatMoney(a.totalPrice)}
                  </span>
                </div>
                <p className="text-xs text-charcoal-300">
                  {formatDuration(a.totalDurationMinutes)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ============================================================
// Shared Error block
// ============================================================

function ErrorBlock({
  title,
  onRetry,
  compact = false,
}: {
  title: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-statusBusy/30 bg-red-50 flex items-start gap-3 ${compact ? "p-4" : "p-6"}`}
    >
      <AlertCircle className="w-5 h-5 text-statusBusy mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-charcoal-900 font-medium">{title}</p>
        <p className="text-xs text-charcoal-300 mt-1">
          Lütfen tekrar deneyin veya birazdan yeniden bakın.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-charcoal-700 text-white text-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
